import { auth } from "@/auth";
import { createConfiguredBaserowReader } from "@/lib/baserow-server";
import { createBaserowMessageWriter } from "@/lib/baserow-message-writer";
import { crmAuthEnabled, findCrmUser } from "@/lib/crm-users";
import { validMessageEdit } from "@/lib/message-edit";
import { baserowTables } from "@/lib/study-config";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  if (!crmAuthEnabled()) return Response.json({ error: "Acceso no autorizado." }, { status: 403 });
  const session = await auth();
  const user = session?.user?.id ? findCrmUser(session.user.id) : null;
  if (user?.role !== "admin") return Response.json({ error: "Solo una cuenta administradora puede editar mensajes." }, { status: 403 });
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Origen no autorizado." }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length")) > 10000) throw new Error("Solicitud demasiado grande.");
    const edit: unknown = await request.json();
    if (!validMessageEdit(edit)) throw new Error("Edición de mensaje inválida.");
    const reader = createConfiguredBaserowReader();
    const writer = createBaserowMessageWriter({
      token: process.env.BASEROW_TOKEN ?? "",
      table: baserowTables().mensajes,
      load: () => reader.load(),
    });
    return Response.json(await writer.save(edit), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "No se pudo guardar el mensaje." }, { status: 400 });
  }
}

