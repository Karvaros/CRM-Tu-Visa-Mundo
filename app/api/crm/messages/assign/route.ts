import { auth } from "@/auth";
import { createConfiguredBaserowReader } from "@/lib/baserow-server";
import { crmAuthEnabled, findCrmUser } from "@/lib/crm-users";
import { baserowTables } from "@/lib/study-config";

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
    const leads = data.leads.filter((lead) => lead.tipoEstudio === "GRATUITO" &&
      ["A", "B", "C"].includes(lead.perfilEstudio ?? "") && lead.destino === "Canadá" &&
      lead.estado === "ESTUDIO_GRATUITO" && lead.seguimientoManual &&
      lead.secuenciaPausada && !lead.ultimoMensajeId && !lead.proximoMensajeId &&
      lead.proximaAccion === "Revisar estudio y continuar desde el último WhatsApp enviado");
    let assigned = 0;
    for (const lead of leads) {
      const message = data.mensajes.find((item) => item.secuenciaId === "estudio-canada" &&
        item.orden === 2 && item.segmento.includes(`ESTUDIO_${lead.perfilEstudio}` as "ESTUDIO_A" | "ESTUDIO_B" | "ESTUDIO_C") &&
        !item.requiereRevision);
      if (!message) continue;
      const response = await fetch(`https://api.baserow.io/api/database/rows/table/${baserowTables().leads}/${lead.id}/?user_field_names=true`, {
        method: "PATCH", headers: { Authorization: `Token ${process.env.BASEROW_TOKEN ?? ""}`, "Content-Type": "application/json" },
        body: JSON.stringify({ SECUENCIA_ID: message.secuenciaId, PROXIMO_MENSAJE: [Number(message.id)],
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
