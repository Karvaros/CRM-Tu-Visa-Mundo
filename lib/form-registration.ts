import { createHmac, timingSafeEqual } from "node:crypto";
import type { createStudyStore } from "./study-store";

type Store = ReturnType<typeof createStudyStore>;
export type FormRegistration = {
  formId: "1" | "3";
  contactId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  destination?: string;
};

export function validWebhookSignature(body: string, signature: string | null, secret: string): boolean {
  if (!secret || !signature) return false;
  const actual = signature.replace(/^sha256=/i, "").trim();
  if (!/^[0-9a-f]{64}$/i.test(actual)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(actual, "hex"));
}

export function parseFormWebhook(body: string, destinationFieldId?: string): FormRegistration | null {
  const values = new URLSearchParams(body);
  if (values.get("type") !== "subscribe") return null;
  const formId = values.get("form[id]");
  if (formId !== "1" && formId !== "3") return null;
  const email = (values.get("contact[email]") ?? "").trim().toLowerCase();
  const contactId = (values.get("contact[id]") ?? "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d+$/.test(contactId)) {
    throw new Error("ActiveCampaign envió un registro incompleto.");
  }
  return {
    formId, email, contactId,
    firstName: (values.get("contact[first_name]") ?? "").trim(),
    lastName: (values.get("contact[last_name]") ?? "").trim(),
    phone: (values.get("contact[phone]") ?? "").trim(),
    destination: destinationFieldId ? values.get(`contact[fields][${destinationFieldId}]`) ?? undefined : undefined,
  };
}

export function countryForForm(formId: "1" | "3", destination?: string): { name: string; slug: string } {
  if (formId === "3") return { name: "Estados Unidos", slug: "eeuu" };
  const key = (destination ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  if (key === "canada") return { name: "Canadá", slug: "canada" };
  if (key === "australia") return { name: "Australia", slug: "australia" };
  if (["uk", "reinounido", "inglaterra"].includes(key)) return { name: "Reino Unido", slug: "uk" };
  throw new Error("El formulario CAN/AU/UK no indicó un destino válido.");
}

export function createFormRegistration(options: {
  store: Store;
  readDestination: (contactId: string) => Promise<string | undefined>;
  findFirstMessage: (sequence: string) => Promise<number | undefined>;
  keepClosed?: (email: string) => Promise<void>;
  now?: () => Date;
}) {
  const { store, readDestination, findFirstMessage, keepClosed, now = () => new Date() } = options;
  return async (registration: FormRegistration): Promise<"created" | "existing"> => {
    const existing = await store.findLead(registration.email);
    // A later form submission must never erase a study, a conversation or a closed lead.
    if (existing) {
      if (existing.AC_SYNC_STATUS === "OPTED_OUT") await keepClosed?.(registration.email);
      return "existing";
    }
    const destination = registration.formId === "3"
      ? countryForForm("3")
      : countryForForm("1", registration.destination || await readDestination(registration.contactId));
    const sequence = `sin-estudio-${destination.slug}`;
    const firstMessageId = await findFirstMessage(sequence);
    const createdAt = now();
    const dueAt = new Date(createdAt.getTime() + 30 * 60_000);
    const lead = await store.createLead({
      NOMBRE: [registration.firstName, registration.lastName].filter(Boolean).join(" ") || registration.email,
      EMAIL: registration.email,
      WHATSAPP: registration.phone,
      DESTINO: destination.name,
      TIPO_VISA: "Turismo",
      ORIGEN: registration.formId === "3" ? "FORM_AC_EEUU" : "FORM_AC_CAN_AU_UK",
      SEGMENTO: "SIN_ESTUDIO",
      TIPO_ESTUDIO: "NINGUNO",
      AC_CONTACT_ID: registration.contactId,
      SECUENCIA_ID: sequence,
      ESTADO: "NUEVO",
      FECHA_INGRESO: createdAt.toISOString(),
      PROXIMO_CONTACTO: dueAt.toISOString(),
      PROXIMA_ACCION: "Contactar por WhatsApp si no completa el Estudio de Perfil",
      SEGUIMIENTO_MANUAL: false,
      SECUENCIA_PAUSADA: false,
      VERSION: 1,
      ...(firstMessageId ? { PROXIMO_MENSAJE: [firstMessageId] } : {}),
    });
    return lead.EMAIL === registration.email && String(lead.ORIGEN).startsWith("FORM_AC_") ? "created" : "existing";
  };
}
