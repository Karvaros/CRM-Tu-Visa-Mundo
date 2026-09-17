import { scryptSync, timingSafeEqual } from "node:crypto";

export interface CrmUser {
  username: string;
  displayName: string;
  role: "admin" | "asesor";
  passwordHash: string;
  active: boolean;
}

export function crmAuthEnabled() {
  return process.env.CRM_AUTH_ENABLED === "true";
}

export function configuredCrmUsers(): CrmUser[] {
  try {
    const value: unknown = JSON.parse(process.env.CRM_USERS_JSON ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((user): user is CrmUser =>
      user && typeof user === "object" &&
      typeof user.username === "string" && /^[a-z0-9._-]{3,40}$/.test(user.username) &&
      typeof user.displayName === "string" && user.displayName.length > 0 &&
      (user.role === "admin" || user.role === "asesor") &&
      typeof user.passwordHash === "string" && /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/.test(user.passwordHash) &&
      user.active === true,
    );
  } catch {
    return [];
  }
}

export function findCrmUser(username: string) {
  return configuredCrmUsers().find((user) => user.username === username.toLowerCase());
}

export function verifyCrmPassword(username: string, password: string): CrmUser | null {
  if (username.length > 40 || password.length > 256 || !password) return null;
  const user = findCrmUser(username);
  // Perform the same work for an unknown username to avoid a quick existence check.
  const [, salt, expectedHex] = (user?.passwordHash ?? `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`).split(":");
  const actual = scryptSync(password, Buffer.from(salt, "hex"), 64);
  const expected = Buffer.from(expectedHex, "hex");
  return user && timingSafeEqual(actual, expected) ? user : null;
}

