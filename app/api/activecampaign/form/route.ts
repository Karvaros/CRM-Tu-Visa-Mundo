import { createBaserowReader } from "@/lib/baserow";
import { countryForForm, createFormRegistration, parseFormWebhook, validWebhookSignature } from "@/lib/form-registration";
import { createStudyStore } from "@/lib/study-store";
import { baserowTables, studyTableIds } from "@/lib/study-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.AC_FORM_SYNC_ENABLED !== "true") return new Response(null, { status: 503 });
  const secret = process.env.AC_WEBHOOK_SECRET ?? "";
  if (Number(request.headers.get("content-length") ?? 0) > 16384) return new Response(null, { status: 413 });
  const raw = await request.text();
  if (raw.length > 16384) return new Response(null, { status: 413 });
  if (!validWebhookSignature(raw, request.headers.get("x-tvm-signature"), secret)) {
    return new Response(null, { status: 401 });
  }
  try {
    const registration = parseFormWebhook(raw, process.env.AC_FIELD_DESTINATION_ID);
    if (!registration) return Response.json({ ignored: true });
    const store = createStudyStore({ token: process.env.BASEROW_TOKEN ?? "", ids: studyTableIds() });
    const apiUrl = new URL(process.env.ACTIVE_CAMPAIGN_API_URL ?? "");
    if (apiUrl.protocol !== "https:") throw new Error("ActiveCampaign requiere HTTPS.");
    const reader = createBaserowReader({ token: process.env.BASEROW_TOKEN ?? "", tables: baserowTables() });
    const sync = createFormRegistration({
      store,
      async readDestination(contactId) {
        const response = await fetch(`${apiUrl.origin}/api/3/contacts/${contactId}/fieldValues`, {
          headers: { "Api-Token": process.env.ACTIVE_CAMPAIGN_API_KEY ?? "" }, cache: "no-store",
        });
        if (!response.ok) throw new Error(`No se pudo leer destino de ActiveCampaign (HTTP ${response.status}).`);
        const data = await response.json() as { fieldValues?: { field: string; value: string }[] };
        return data.fieldValues?.find((item) => item.field === process.env.AC_FIELD_DESTINATION_ID)?.value;
      },
      async findFirstMessage(sequence) {
        const data = await reader.load();
        const message = data.mensajes.find((item) => item.secuenciaId === sequence && item.orden === 1 && item.segmento.includes("SIN_ESTUDIO"));
        return message ? Number(message.id) : undefined;
      },
    });
    // Validate the form's destination before any write, including existing contacts.
    if (registration.formId === "3") countryForForm("3");
    const status = await sync(registration);
    return Response.json({ status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("ac-form-sync", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo sincronizar el registro." }, { status: 503 });
  }
}
