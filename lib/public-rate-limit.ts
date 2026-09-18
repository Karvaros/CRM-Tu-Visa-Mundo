import { checkRateLimit } from "@vercel/firewall";

export type PublicRateLimitScope = "study" | "login";
export const PUBLIC_RATE_LIMIT_ID = "tvm-public-submissions";

/** Separate buckets so a study submission never consumes CRM login attempts. */
export function publicRateLimitKey(scope: PublicRateLimitScope, headers: Headers): string | null {
  const ip = headers.get("x-vercel-forwarded-for") || headers.get("x-real-ip");
  return ip ? `${scope}:${ip}` : null;
}

export async function publicRateLimited(scope: PublicRateLimitScope, headers: Headers): Promise<boolean> {
  if (process.env.VERCEL !== "1") return false;
  const key = publicRateLimitKey(scope, headers);
  if (!key) {
    console.warn("public-rate-limit-missing-ip", scope);
    return false;
  }
  try {
    const result = await checkRateLimit(PUBLIC_RATE_LIMIT_ID, { headers, rateLimitKey: key });
    if (result.error === "not-found") console.warn("public-rate-limit-not-configured", scope);
    return result.rateLimited;
  } catch (error) {
    // Password verification and study validation remain enforced if the WAF API is unavailable.
    console.error("public-rate-limit-unavailable", scope, error instanceof Error ? error.message : "unknown");
    return false;
  }
}
