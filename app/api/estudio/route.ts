import { createActiveCampaign } from "@/lib/activecampaign";
import { createStudyStore } from "@/lib/study-store";
import { createStudySubmission } from "@/lib/study-submission";
import { studyAutomations, studyFields, studyTableIds } from "@/lib/study-config";
import { createConfiguredBaserowReader } from "@/lib/baserow-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (process.env.STUDY_SUBMISSION_ENABLED !== "true") {
    return Response.json({ error: "El envío del estudio aún no está disponible." }, { status: 503 });
  }
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }
  if (Number(request.headers.get("content-length") ?? 0) > 8192) {
    return Response.json({ error: "El formulario es demasiado grande." }, { status: 413 });
  }
  let payload: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 8192) {
      return Response.json({ error: "El formulario es demasiado grande." }, { status: 413 });
    }
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Formulario inválido." }, { status: 400 });
  }
  if (payload && typeof payload === "object" && "website" in payload && payload.website) {
    return Response.json({ error: "Formulario inválido." }, { status: 400 });
  }
  try {
    const store = createStudyStore({ token: process.env.BASEROW_TOKEN ?? "", ids: studyTableIds() });
    const campaign = createActiveCampaign({
      apiUrl: process.env.ACTIVE_CAMPAIGN_API_URL ?? "",
      apiKey: process.env.ACTIVE_CAMPAIGN_API_KEY ?? "",
      automations: studyAutomations(), fields: studyFields(),
    });
    const submit = createStudySubmission({ store, campaign,
      async selectWhatsApp(destination, profile) {
        // Solo Canadá tiene textos posestudio aprobados en este momento.
        if (!/^(Canadá|Canada)$/i.test(destination) || !["A", "B", "C"].includes(profile)) return undefined;
        const data = await createConfiguredBaserowReader().load();
        return data.mensajes.find((message) => message.secuenciaId === "estudio-canada" &&
          message.orden === 2 && message.segmento.includes(`ESTUDIO_${profile}` as "ESTUDIO_A" | "ESTUDIO_B" | "ESTUDIO_C"));
      },
    });
    const result = await submit(payload);
    return Response.json(result, {
      status: result.status === "PROCESSING" ? 202 : result.status === "ERROR" ? 503 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo procesar el estudio.";
    const isValidation = /respuesta|respuestas|datos de contacto|nombre completo|correo válido|teléfono válido|Selecciona/i.test(message);
    if (!isValidation) console.error("study-submission", message);
    return Response.json({ error: isValidation ? message : "No pudimos enviar el estudio. Inténtalo de nuevo más tarde." }, {
      status: isValidation ? 400 : 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
