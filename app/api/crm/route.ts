import { auth } from "@/auth";
import { createConfiguredBaserowReader } from "@/lib/baserow-server";
import { createConfiguredBaserowCrmWriter } from "@/lib/baserow-crm-writer";
import { crmAuthEnabled, findCrmUser } from "@/lib/crm-users";
import { leadStatuses, type LeadCommand } from "@/lib/types";

export const dynamic = "force-dynamic";

async function currentUser() {
  if (!crmAuthEnabled()) return null;
  const session = await auth();
  return session?.user?.id ? findCrmUser(session.user.id) : null;
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "No se pudo completar la operación.";
  return Response.json({ error: message }, { status: 400 });
}
function validCommand(value: unknown): value is LeadCommand {
  if (!value || typeof value !== "object") return false;
  const command = value as Record<string, unknown>;
  if (!/^\d+$/.test(String(command.leadId)) || !Number.isSafeInteger(command.version)) return false;
  if (command.type === "sent") return /^\d+$/.test(String(command.mensajeId)) && typeof command.mensajeTexto === "string";
  if (command.type === "replied") return true;
  if (command.type === "reschedule") return typeof command.fecha === "string" && typeof command.accion === "string" && command.accion.length <= 500;
  if (command.type === "status") return leadStatuses.includes(command.estado as (typeof leadStatuses)[number]);
  return false;
}

export async function GET() {
  if (!(await currentUser())) return Response.json({ error: "Acceso no autorizado." }, { status: 401 });
  try {
    return Response.json(await createConfiguredBaserowReader().load(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Acceso no autorizado." }, { status: 401 });
  if (new URL(request.url).origin !== request.headers.get("origin")) {
    return Response.json({ error: "Origen no autorizado." }, { status: 403 });
  }
  try {
    if (Number(request.headers.get("content-length")) > 10000) throw new Error("Solicitud demasiado grande.");
    const command: unknown = await request.json();
    if (!validCommand(command)) throw new Error("Acción inválida.");
    return Response.json(await createConfiguredBaserowCrmWriter().execute(command, user.displayName), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}

