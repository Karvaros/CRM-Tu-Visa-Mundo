import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { publicRateLimited } from "@/lib/public-rate-limit";

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
  if (new URL(request.url).pathname === "/api/auth/callback/credentials" &&
      await publicRateLimited("login", request.headers)) {
    return Response.json({ error: "No se pudo iniciar sesión." }, { status: 429 });
  }
  return handlers.POST(request);
}

