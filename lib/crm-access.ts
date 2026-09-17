import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { crmAuthEnabled, findCrmUser } from "./crm-users";

export async function requireCrmUser() {
  if (!crmAuthEnabled()) return null;
  const session = await auth();
  const user = session?.user?.id ? findCrmUser(session.user.id) : null;
  if (!user) redirect("/acceso");
  return { username: user.username, displayName: user.displayName, role: user.role };
}

