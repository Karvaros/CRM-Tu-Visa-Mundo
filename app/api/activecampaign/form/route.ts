import { parseFormWebhook, validWebhookSignature } from "@/lib/form-registration";
import { createConfiguredFormSync } from "@/lib/form-sync-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.AC_FORM_SYNC_ENABLED !== "true") return new Response(null, { status: 503 });
  const secret = process.env.AC_WEBHOOK_SECRET ?? "";
  if (Number(request.headers.get("content-length") ?? 0) > 16384) return new Response(null, { status: 413 });
  const raw = await request.text();
  if (raw.length > 16384) return new Response(null, { status: 413 });
  const signature = request.headers.get("x-tvm-signature");
  if (!validWebhookSignature(raw, signature, secret)) {
    // Diagnostics never contain contact details, signature bytes, or secrets.
    console.warn("ac-form-signature-rejected", {
      present: Boolean(signature),
      length: signature?.length ?? 0,
      format: signature && /^[0-9a-f]{64}$/i.test(signature) ? "hex" : signature && /^[A-Za-z0-9+/]{43}=$/.test(signature) ? "base64" : "other",
    });
    return new Response(null, { status: 401 });
  }
  try {
    const registration = parseFormWebhook(raw, process.env.AC_FIELD_DESTINATION_ID);
    if (!registration) return Response.json({ ignored: true });
    const status = await createConfiguredFormSync().sync(registration);
    return Response.json({ status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("ac-form-sync", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo sincronizar el registro." }, { status: 503 });
  }
}
