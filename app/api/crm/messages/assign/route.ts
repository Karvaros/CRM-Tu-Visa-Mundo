import { auth } from "@/auth";
import { createConfiguredBaserowReader } from "@/lib/baserow-server";
import { crmAuthEnabled, findCrmUser } from "@/lib/crm-users";
import { baserowTables } from "@/lib/study-config";
import { initialStudyContactRepairs } from "@/lib/message-sequences";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!crmAuthEnabled()) return new Response(null, { status: 403 });
  const session = await auth();
  const user = session?.user?.id ? findCrmUser(session.user.id) : null;
  if (user?.role !== "admin" || request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }
  try {
    const data = await createConfiguredBaserowReader().load();
    const repairs = initialStudyContactRepairs(data);
    let assigned = 0;
    for (const { lead, message, sequence } of repairs) {
      const response = await fetch(`https://api.baserow.io/api/database/rows/table/${baserowTables().leads}/${lead.id}/?user_field_names=true`, {
        method: "PATCH", headers: { Authorization: `Token ${process.env.BASEROW_TOKEN ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ SECUENCIA_ID: sequence, PROXIMO_MENSAJE: [Number(message.id)],
          PROXIMO_CONTACTO: new Date().toISOString(), PROXIMA_ACCION: message.titulo,
          SECUENCIA_PAUSADA: false, SEGUIMIENTO_MANUAL: false, VERSION: lead.version + 1 }), cache: "no-store",
      });
      if (!response.ok) throw new Error(`Baserow devolvió HTTP ${response.status}.`);
      assigned++;
    }
    return Response.json({ assigned });
  } catch (error) {
    console.error("message-assign", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudieron asignar los mensajes." }, { status: 503 });
  }
}
