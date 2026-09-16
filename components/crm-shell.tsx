"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
const links = [
  ["/", "Hoy"],
  ["/leads", "Leads"],
  ["/pipeline", "Pipeline"],
  ["/historial", "Historial"],
  ["/mensajes", "Mensajes"],
  ["/configuracion", "Configuración"],
];
export function CrmShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/estudio") return <>{children}</>;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">TVM</div>
          <div>
            <strong>Tu Visa Mundo</strong>
            <span>CRM V2</span>
          </div>
        </div>
        <nav aria-label="Navegación principal">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${pathname === href ? "nav-item--active" : ""}`}
              aria-current={pathname === href ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note">
          Asesor principal
          <br />
          V2 · demostración
          <br />
          Cambios guardados en esta pestaña.
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}
