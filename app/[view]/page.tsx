import { notFound } from "next/navigation";
import { CrmView } from "@/components/crm-views";
const views = ["leads", "pipeline", "historial", "mensajes", "configuracion"];
export function generateStaticParams() {
  return views.map((view) => ({ view }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  if (!views.includes(view)) notFound();
  return <CrmView key={view} view={view} />;
}
