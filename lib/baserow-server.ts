import "server-only";
import { createBaserowReader } from "./baserow";
import { baserowTables } from "./study-config";

/** Import this entry point only from authenticated server code. */
export function createConfiguredBaserowReader() {
  return createBaserowReader({ token: process.env.BASEROW_TOKEN ?? "", tables: baserowTables() });
}
