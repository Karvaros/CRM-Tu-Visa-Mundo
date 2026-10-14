import { auth } from "@/auth";
import { crmAuthEnabled, findCrmUser } from "@/lib/crm-users";
import { createConfiguredBaserowReader } from "@/lib/baserow-server";
import { createStudyStore } from "@/lib/study-store";
import { createActiveCampaign } from "@/lib/activecampaign";
import { studyTableIds, studyAutomations, studyFields } from "@/lib/study-config";
import { createStudyReview } from "@/lib/study-review";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!crmAuthEnabled()) return new Response(null, { status: 403 });
  const session = await auth();
  const user = session?.user?.id ? findCrmUser(session.user.id) : null;
  if (user?.role !== "admin" || request.headers.get("origin") !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 1024) throw new Error("Solicitud demasiado grande.");
    const body = JSON.parse(raw);
    if (!/^\d+$/.test(body.leadId) || !Number.isSafeInteger(body.version)) throw new Error("Acción inválida.");
    const reader = createConfiguredBaserowReader();
    const resolve = createStudyReview({
      store: createStudyStore({ token: process.env.BASEROW_TOKEN ?? "", ids: studyTableIds() }),
      campaign: createActiveCampaign({ apiUrl: process.env.ACTIVE_CAMPAIGN_API_URL ?? "",
        apiKey: process.env.ACTIVE_CAMPAIGN_API_KEY ?? "", automations: studyAutomations(), fields: studyFields() }),
      load: () => reader.load(),
    });
    return Response.json(await resolve(String(body.leadId), body.version, user.displayName), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("study-review", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo completar la revisión. Recarga la ficha antes de reintentar." }, { status: 409 });
  }
}
