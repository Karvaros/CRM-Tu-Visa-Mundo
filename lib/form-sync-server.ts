import "server-only";
import { createBaserowReader } from "./baserow";
import { createActiveCampaignOptOut } from "./activecampaign-optout";
import { createFormRegistration } from "./form-registration";
import { createStudyStore } from "./study-store";
import { baserowTables, studyTableIds } from "./study-config";

export function createConfiguredFormSync(registeredAt?: Date) {
  const store = createStudyStore({ token: process.env.BASEROW_TOKEN ?? "", ids: studyTableIds() });
  const apiUrl = new URL(process.env.ACTIVE_CAMPAIGN_API_URL ?? "");
  if (apiUrl.protocol !== "https:") throw new Error("ActiveCampaign requiere HTTPS.");
  const reader = createBaserowReader({ token: process.env.BASEROW_TOKEN ?? "", tables: baserowTables() });
  const headers = { "Api-Token": process.env.ACTIVE_CAMPAIGN_API_KEY ?? "" };
  return {
    async contact(contactId: string) {
      const response = await fetch(`${apiUrl.origin}/api/3/contacts/${contactId}`, { headers, cache: "no-store" });
      if (!response.ok) throw new Error(`No se pudo leer contacto de ActiveCampaign (HTTP ${response.status}).`);
      const data = await response.json() as { contact?: { id: string; email: string; firstName: string; lastName: string; phone: string; cdate?: string } };
      if (!data.contact || String(data.contact.id) !== contactId) throw new Error("Contacto inválido.");
      return data.contact;
    },
    sync: createFormRegistration({
      store,
      async readDestination(contactId) {
        const response = await fetch(`${apiUrl.origin}/api/3/contacts/${contactId}/fieldValues`, { headers, cache: "no-store" });
        if (!response.ok) throw new Error(`No se pudo leer destino de ActiveCampaign (HTTP ${response.status}).`);
        const data = await response.json() as { fieldValues?: { field: string; value: string }[] };
        return data.fieldValues?.find((item) => item.field === process.env.AC_FIELD_DESTINATION_ID)?.value;
      },
      async findFirstMessage(sequence) {
        const data = await reader.load();
        const message = data.mensajes.find((item) => item.secuenciaId === sequence && item.orden === 1 && item.segmento.includes("SIN_ESTUDIO"));
        return message ? Number(message.id) : undefined;
      },
      keepClosed: (email) => createActiveCampaignOptOut({
        apiUrl: process.env.ACTIVE_CAMPAIGN_API_URL ?? "",
        apiKey: process.env.ACTIVE_CAMPAIGN_API_KEY ?? "",
      }).stopMarketing(email),
      now: registeredAt ? () => registeredAt : undefined,
    }),
  };
}
