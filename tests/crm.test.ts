import assert from "node:assert/strict";
import test from "node:test";
import { applyCommand, priority, renderMessage } from "../lib/crm";
import { addDays, today, validDate } from "../lib/dates";
import { createMockData } from "../lib/mock-data";
import { createMockRepository } from "../lib/mock-repository";

const now = new Date("2026-09-14T15:30:00Z");
const seed = () => createMockData("2026-09-14");
function sent(data = seed(), index = 0) {
  const lead = data.leads[index];
  const message = data.mensajes.find(
    (item) => item.id === lead.proximoMensajeId,
  )!;
  return {
    type: "sent" as const,
    leadId: lead.id,
    version: lead.version,
    mensajeId: message.id,
    mensajeTexto: renderMessage(message, lead),
  };
}
test("agenda clasifica los cuatro grupos y excluye fechas futuras, pausados y cerrados", () => {
  const { leads } = seed();
  assert.deepEqual(
    leads.map((lead) => priority(lead, "2026-09-14")),
    ["NUEVO", "ATRASADO", "HOY", "MANUAL"],
  );
  assert.equal(
    priority({ ...leads[0], proximoContacto: "2026-09-15" }, "2026-09-14"),
    null,
  );
  assert.equal(
    priority({ ...leads[0], secuenciaPausada: true }, "2026-09-14"),
    null,
  );
  for (const estado of ["CLIENTE", "NO_APTO", "INACTIVO"] as const)
    assert.equal(priority({ ...leads[3], estado }, "2026-09-14"), null);
});
test("envío atrasado calcula desde hoy, guarda texto real y no muta entrada", () => {
  const data = seed();
  const result = applyCommand(data, sent(data, 1), now, "event-1");
  assert.equal(result.leads[1].proximoContacto, "2026-09-17");
  assert.equal(result.leads[1].ultimoContacto, now.toISOString());
  assert.equal(
    result.interacciones[0].mensajeTexto,
    sent(data, 1).mensajeTexto,
  );
  assert.equal(data.leads[1].proximoContacto, "2026-09-13");
});
test("doble envío y texto desactualizado son rechazados", () => {
  const data = seed();
  const command = sent(data);
  const result = applyCommand(data, command, now, "event-1");
  assert.throws(() => applyCommand(result, command, now, "event-2"), /cambió/);
  assert.throws(
    () =>
      applyCommand(
        data,
        { ...command, mensajeTexto: "Otro texto" },
        now,
        "event-2",
      ),
    /mensaje cambió/,
  );
});
test("respuesta pausa secuencia, conserva último envío y habilita atención manual", () => {
  const data = seed();
  const lead = data.leads[1];
  const result = applyCommand(
    data,
    { type: "replied", leadId: lead.id, version: 0 },
    now,
    "event-1",
  );
  assert.equal(result.leads[1].secuenciaPausada, true);
  assert.equal(result.leads[1].estado, "EN_CONVERSACION");
  assert.equal(result.leads[1].ultimoContacto, lead.ultimoContacto);
  assert.equal(priority(result.leads[1], "2026-09-14"), "MANUAL");
  const afterManual = applyCommand(result, sent(result, 1), now, "event-2");
  assert.equal(afterManual.leads[1].proximoContacto, undefined);
  assert.equal(afterManual.leads[1].secuenciaPausada, true);
});
test("reprogramar mantiene estado, pausa y último envío; rechaza fechas pasadas", () => {
  const data = seed();
  const lead = data.leads[3];
  const command = {
    type: "reschedule" as const,
    leadId: lead.id,
    version: 0,
    fecha: "2026-09-21",
    accion: "Confirmar documentos",
  };
  const result = applyCommand(data, command, now, "event-1");
  assert.equal(result.leads[3].estado, lead.estado);
  assert.equal(result.leads[3].ultimoContacto, lead.ultimoContacto);
  assert.equal(result.leads[3].secuenciaPausada, true);
  assert.equal(priority(result.leads[3], "2026-09-14"), null);
  assert.equal(priority(result.leads[3], "2026-09-22"), "MANUAL");
  assert.throws(
    () =>
      applyCommand(data, { ...command, fecha: "2026-09-13" }, now, "event-2"),
    /futura/,
  );
  assert.throws(
    () => applyCommand(data, { ...command, accion: " " }, now, "event-2"),
    /acción/,
  );
});
test("fin de secuencia no inventa otro mensaje ni cierra la venta", () => {
  const data = seed();
  const result = applyCommand(data, sent(data, 2), now, "event-1");
  assert.equal(result.leads[2].proximoMensajeId, undefined);
  assert.equal(result.leads[2].proximoContacto, undefined);
  assert.equal(result.leads[2].estado, "SEGUIMIENTO");
});
test("venta y pérdida salen de HOY y conservan el historial", () => {
  for (const estado of ["CLIENTE", "NO_APTO", "INACTIVO"] as const) {
    const data = applyCommand(seed(), sent(), now, "event-1");
    const result = applyCommand(
      data,
      { type: "status", leadId: data.leads[0].id, version: 1, estado },
      now,
      "event-2",
    );
    assert.equal(priority(result.leads[0], "2026-09-14"), null);
    assert.equal(result.interacciones.length, 2);
    assert.equal(result.leads[0].ultimoContacto, now.toISOString());
  }
});
test("fechas usan Buenos Aires y desplazan fines de semana sin desfases", () => {
  assert.equal(today(new Date("2026-09-15T01:00:00Z")), "2026-09-14");
  assert.equal(addDays("2026-09-18", 1, true), "2026-09-21");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(validDate("2026-02-30"), false);
});
test("repositorio persiste cambios y plantillas sin reescribir historial", async () => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  } as Storage;
  const repo = createMockRepository(storage, () => now);
  const data = await repo.load();
  await repo.execute(sent(data));
  await repo.saveMessage({
    ...data.mensajes[0],
    texto: "Texto editado {{nombre}}",
  });
  const reloaded = await createMockRepository(storage, () => now).load();
  assert.equal(reloaded.leads[0].estado, "CONTACTADO");
  assert.equal(reloaded.mensajes[0].texto, "Texto editado {{nombre}}");
  assert.equal(reloaded.interacciones[0].mensajeTexto, sent(data).mensajeTexto);
  await assert.rejects(() =>
    repo.saveMessage({ ...data.mensajes[0], diasHastaSiguiente: 0 }),
  );
  assert.equal((await repo.reset()).interacciones.length, 0);
});
