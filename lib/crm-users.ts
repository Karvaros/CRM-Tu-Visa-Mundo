import { pbkdf2Sync, scryptSync, timingSafeEqual } from "node:crypto";

const scryptPattern = /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/;
const pbkdf2Pattern = /^pbkdf2-sha256:600000:[a-f0-9]{32}:[a-f0-9]{128}$/;

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
      typeof user.passwordHash === "string" &&
      (scryptPattern.test(user.passwordHash) || pbkdf2Pattern.test(user.passwordHash)) &&
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
  // Perform both supported hash calculations for every attempt, including unknown users.
  const isPbkdf2 = user?.passwordHash.startsWith("pbkdf2-sha256:") ?? false;
  const [, , pbkdf2Salt, pbkdf2Expected] = isPbkdf2 ? user!.passwordHash.split(":") : [];
  const [, scryptSalt, scryptExpected] = !isPbkdf2 && user
    ? user.passwordHash.split(":")
    : ["scrypt", "0".repeat(32), "0".repeat(128)];
  const scryptActual = scryptSync(password, Buffer.from(scryptSalt, "hex"), 64);
  const pbkdf2Actual = pbkdf2Sync(password, Buffer.from(pbkdf2Salt ?? "0".repeat(32), "hex"), 600_000, 64, "sha256");
  const actual = isPbkdf2 ? pbkdf2Actual : scryptActual;
  const expectedHex = isPbkdf2 ? pbkdf2Expected : scryptExpected;
  const expected = Buffer.from(expectedHex, "hex");
  return user && timingSafeEqual(actual, expected) ? user : null;
}

