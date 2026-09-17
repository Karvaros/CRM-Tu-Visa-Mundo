"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import logoClaro from "@/logo_tvm.png";
import { logout } from "@/app/acceso/actions";
const links = [
  ["/", "Hoy"],
  ["/leads", "Leads"],
  ["/pipeline", "Pipeline"],
  ["/historial", "Historial"],
  ["/mensajes", "Mensajes"],
  ["/configuracion", "Configuración"],
];
export function CrmShell({ children, authEnabled }: { children: ReactNode; authEnabled: boolean }) {
  const pathname = usePathname();
  if (pathname === "/estudio" || pathname === "/acceso") return <>{children}</>;
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">
            <Image src={logoClaro} alt="Tu Visa Mundo" priority />
          </div>
          <span>CRM V2</span>
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
          {authEnabled ? "Sesión privada" : "Asesor principal"}
          <br />
          V2 · demostración
          <br />
          Cambios guardados en esta pestaña.
          {authEnabled && <form action={logout}>
            <button type="submit" className="logout-button">Cerrar sesión</button>
          </form>}
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

