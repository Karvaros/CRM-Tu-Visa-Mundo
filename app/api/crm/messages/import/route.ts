import { auth } from "@/auth";
import { createConfiguredBaserowReader } from "@/lib/baserow-server";
import { crmAuthEnabled, findCrmUser } from "@/lib/crm-users";
import { missingMessageRows } from "@/lib/import-messages";
import { baserowTables } from "@/lib/study-config";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!crmAuthEnabled()) return new Response(null, { status: 403 });
  const session = await auth();
  const user = session?.user?.id ? findCrmUser(session.user.id) : null;
  if (user?.role !== "admin") return new Response(null, { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  try {
    const data = await createConfiguredBaserowReader().load();
    const items = missingMessageRows(data.mensajes);
    if (!items.length) return Response.json({ imported: 0 });
    const response = await fetch(`https://api.baserow.io/api/database/rows/table/${baserowTables().mensajes}/batch/?user_field_names=true`, {
      method: "POST", headers: { Authorization: `Token ${process.env.BASEROW_TOKEN ?? ""}`, "Content-Type": "application/json" },
      body: JSON.stringify({ items }), cache: "no-store",
    });
    if (!response.ok) throw new Error(`Baserow devolvió HTTP ${response.status}.`);
    return Response.json({ imported: items.length });
  } catch (error) {
    console.error("message-import", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudieron cargar las plantillas." }, { status: 503 });
  }
}
