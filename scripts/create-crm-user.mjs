import { randomBytes, scryptSync } from "node:crypto";

const [username, displayName, role = "asesor"] = process.argv.slice(2);
if (!username || !/^[a-z0-9._-]{3,40}$/.test(username) || !displayName || !["admin", "asesor"].includes(role)) {
  console.error('Uso: node scripts/create-crm-user.mjs usuario "Nombre visible" admin|asesor');
  process.exit(1);
}
if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  console.error("Ejecuta este comando en una terminal interactiva para ocultar la contraseña.");
  process.exit(1);
}

async function readSecret(prompt) {
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  let value = "";
  try {
    return await new Promise((resolve, reject) => {
      function onData(chunk) {
        for (const char of chunk.toString("utf8")) {
          if (char === "\u0003") { process.stdin.off("data", onData); reject(new Error("Cancelado")); return; }
          if (char === "\r" || char === "\n") { process.stdin.off("data", onData); process.stdout.write("\n"); resolve(value); return; }
          if (char === "\u007f" || char === "\b") { value = value.slice(0, -1); continue; }
          value += char;
        }
      }
      process.stdin.on("data", onData);
    });
  } finally {
    process.stdin.setRawMode(false);
    process.stdin.pause();
  }
}

try {
  const password = await readSecret("Contraseña (mínimo 14 caracteres): ");
  const confirm = await readSecret("Repite la contraseña: ");
  if (password.length < 14 || password.length > 256 || password !== confirm) {
    throw new Error("Las contraseñas deben coincidir y tener entre 14 y 256 caracteres.");
  }
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex");
  console.log(JSON.stringify({ username, displayName, role, passwordHash: `scrypt:${salt}:${hash}`, active: true }));
} catch (error) {
  console.error(error instanceof Error ? error.message : "No se pudo crear el usuario.");
  process.exitCode = 1;
}

