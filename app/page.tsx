import { CrmView } from "@/components/crm-views";
import { requireCrmUser } from "@/lib/crm-access";
export default async function Home() {
  await requireCrmUser();
  return <CrmView view="hoy" />;
}

