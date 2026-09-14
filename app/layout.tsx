import type { Metadata } from "next";
import "./globals.css";
import { CrmProvider } from "@/components/crm-provider";
import { CrmShell } from "@/components/crm-shell";

export const metadata: Metadata = {
  title: "CRM Tu Visa Mundo V2",
  description: "Agenda comercial y seguimiento de leads de Tu Visa Mundo",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <CrmProvider>
          <CrmShell>{children}</CrmShell>
        </CrmProvider>
      </body>
    </html>
  );
}
