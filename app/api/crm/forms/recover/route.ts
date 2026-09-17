import { auth } from "@/auth";
import { crmAuthEnabled, findCrmUser } from "@/lib/crm-users";
import { createConfiguredFormSync } from "@/lib/form-sync-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!crmAuthEnabled()) return new Response(null, { status: 403 });
  const session = await auth();
  const user = session?.user?.id ? findCrmUser(session.user.id) : null;
  if (user?.role !== "admin" || request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }
  try {
    const input = await request.json() as { contactId?: string; formId?: string };
    if (!/^\d{1,12}$/.test(input.contactId ?? "") || !["1", "3"].includes(input.formId ?? "")) {
      return Response.json({ error: "Indica un contacto y formulario válidos." }, { status: 400 });
    }
    const contactId = input.contactId!;
    const formId = input.formId as "1" | "3";
    const initial = createConfiguredFormSync();
    const contact = await initial.contact(contactId);
    const registeredAt = contact.cdate && !Number.isNaN(Date.parse(contact.cdate)) ? new Date(contact.cdate) : new Date();
    const status = await createConfiguredFormSync(registeredAt).sync({
      formId, contactId, email: contact.email, firstName: contact.firstName ?? "",
      lastName: contact.lastName ?? "", phone: contact.phone ?? "",
    });
    return Response.json({ status });
  } catch (error) {
    console.error("form-recovery", error instanceof Error ? error.message : "Error desconocido");
    return Response.json({ error: "No se pudo recuperar la inscripción." }, { status: 503 });
  }
}
