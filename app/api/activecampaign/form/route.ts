import { parseFormWebhook, validWebhookSignature } from "@/lib/form-registration";
import { createConfiguredFormSync } from "@/lib/form-sync-server";

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
    const status = await createConfiguredFormSync().sync(registration);
    return Response.json({ status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("ac-form-sync", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo sincronizar el registro." }, { status: 503 });
  }
}
