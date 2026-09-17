import test from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { configuredCrmUsers, verifyCrmPassword } from "../lib/crm-users";

test("solo una cuenta activa con contraseña correcta puede entrar", () => {
  const previous = process.env.CRM_USERS_JSON;
  const salt = "0123456789abcdef0123456789abcdef";
  const password = "password-de-prueba-larga";
  const passwordHash = `scrypt:${salt}:${scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex")}`;
  try {
    process.env.CRM_USERS_JSON = JSON.stringify([
      { username: "asesor1", displayName: "Asesor uno", role: "asesor", passwordHash, active: true },
      { username: "asesor2", displayName: "Asesor dos", role: "asesor", passwordHash, active: false },
    ]);
    assert.equal(configuredCrmUsers().length, 1);
    assert.equal(verifyCrmPassword("asesor1", password)?.displayName, "Asesor uno");
    assert.equal(verifyCrmPassword("asesor1", "incorrecta"), null);
    assert.equal(verifyCrmPassword("asesor2", password), null);
    assert.equal(verifyCrmPassword("desconocido", password), null);
    process.env.CRM_USERS_JSON = "malformed";
    assert.deepEqual(configuredCrmUsers(), []);
  } finally {
    if (previous === undefined) delete process.env.CRM_USERS_JSON;
    else process.env.CRM_USERS_JSON = previous;
  }
});

