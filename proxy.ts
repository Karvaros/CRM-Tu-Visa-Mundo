import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { crmAuthEnabled } from "@/lib/crm-users";

export const proxy = auth((request) => {
  if (!crmAuthEnabled()) return NextResponse.next();
  const path = request.nextUrl.pathname;
  // The webhook verifies its own HMAC signature before accessing lead data.
  if (path === "/estudio" || path === "/api/estudio" || path === "/api/activecampaign/form" || path.startsWith("/api/auth/")) return NextResponse.next();
  if (path === "/acceso") return request.auth ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  if (request.auth) return NextResponse.next();
  if (path.startsWith("/api/")) return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  return NextResponse.redirect(new URL("/acceso", request.url));
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|ico)$).*)"],
};

