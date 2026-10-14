import { auth } from "@/auth";
import { crmAuthEnabled, findCrmUser } from "@/lib/crm-users";
import { createConfiguredBaserowReader } from "@/lib/baserow-server";
import { createConfiguredBaserowCrmWriter } from "@/lib/baserow-crm-writer";
import { statusReconciliation } from "@/lib/commercial-status";

export const runtime = "nodejs";
export const maxDuration = 120;
async function administrator() {
  if (!crmAuthEnabled()) return null;
  const session = await auth();
  const user = session?.user?.id ? findCrmUser(session.user.id) : null;
  return user?.role === "admin" ? user : null;
}
export async function GET() {
  if (!(await administrator())) return new Response(null, { status: 403 });
  const data = await createConfiguredBaserowReader().load();
  return Response.json({ changes: data.leads.flatMap((lead) => {
    const estado = statusReconciliation(data, lead);
    return estado ? [{ leadId: lead.id, nombre: `${lead.nombre} ${lead.apellido ?? ""}`.trim(), anterior: lead.estado, estado }] : [];
  }) }, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  const user = await administrator();
  if (!user || request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  try {
    let data = await createConfiguredBaserowReader().load();
    const ids = data.leads.filter((lead) => statusReconciliation(data, lead)).map((lead) => lead.id);
    const writer = createConfiguredBaserowCrmWriter();
    const updated: string[] = [];
    for (const id of ids) {
      const lead = data.leads.find((item) => item.id === id);
      if (!lead || !statusReconciliation(data, lead)) continue;
      data = await writer.execute({ type: "reconcileStatus", leadId: id, version: lead.version }, user.displayName);
      updated.push(`${lead.nombre} ${lead.apellido ?? ""}`.trim());
    }
    return Response.json({ updated }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "No se completó la actualización. Recarga para revisar qué registros siguen pendientes." }, { status: 409 });
  }
}
