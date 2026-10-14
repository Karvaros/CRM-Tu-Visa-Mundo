import assert from "node:assert/strict";
import test from "node:test";
import { createMockData } from "../lib/mock-data";
import { applyCommand, leadOperationalSnapshot, matchesAgendaFilter, matchesLeadFilter } from "../lib/crm";
import { hasConfirmedContact, matchesStudyFilter, stateAfterStudy, statusReconciliation } from "../lib/commercial-status";
import type { Interaction, Lead } from "../lib/types";

const now = new Date("2026-10-14T19:00:00Z");
const seed = () => createMockData("2026-10-14");

test("primer WhatsApp pasa a Contactado con y sin estudio; Respondió pasa a conversación y pausa", () => {
  for (const profile of [undefined, "A", "B", "C"] as const) {
    const data = seed(); const lead = data.leads[0];
    lead.tipoEstudio = profile ? "GRATUITO" : "NINGUNO"; lead.perfilEstudio = profile;
    if (profile) { lead.segmento = `ESTUDIO_${profile}`; lead.secuenciaId = "estudio-canada"; }
    const message = data.mensajes.find((item) => item.id === lead.proximoMensajeId)!;
    const contacted = applyCommand(data, { type: "sent", leadId: lead.id, version: lead.version,
      mensajeId: message.id, mensajeTexto: message.texto }, now, "send");
    assert.equal(contacted.leads[0].estado, "CONTACTADO");
    assert.equal(contacted.leads[0].perfilEstudio, profile);
    assert.equal(matchesLeadFilter(contacted.leads[0], "CONTACTADO", "2026-10-14"), true);
    assert.equal(matchesStudyFilter(contacted.leads[0], profile ? "GRATUITO" : "NINGUNO"), true);
    const replied = applyCommand(contacted, { type: "replied", leadId: lead.id, version: 1 }, now, "reply");
    assert.equal(replied.leads[0].estado, "EN_CONVERSACION");
    assert.equal(replied.leads[0].secuenciaPausada, true);
    assert.equal(matchesLeadFilter(replied.leads[0], "CONTACTADO", "2026-10-14"), false);
    assert.equal(matchesLeadFilter(replied.leads[0], "EN_CONVERSACION", "2026-10-14"), true);
  }
});

test("el estado comercial no se pierde al hacer el estudio; aún sin contactar sigue Nuevo", () => {
  assert.equal(stateAfterStudy(undefined, false), "NUEVO");
  assert.equal(stateAfterStudy("ESTUDIO_GRATUITO", true), "CONTACTADO");
  for (const state of ["CONTACTADO", "EN_CONVERSACION", "INTERESADO", "SEGUIMIENTO", "CLIENTE", "NO_APTO", "INACTIVO"] as const)
    assert.equal(stateAfterStudy(state, true), state);
});

test("Seguimiento exige reprogramación; Interesado se conserva y pausa la secuencia", () => {
  let data = seed(); const lead = data.leads[0];
  assert.throws(() => applyCommand(data, { type: "status", leadId: lead.id, version: 0, estado: "SEGUIMIENTO" }, now, "invalid"), /Reprogramar/);
  data = applyCommand(data, { type: "reschedule", leadId: lead.id, version: 0, fecha: "2026-10-20", accion: "Retomar llamada" }, now, "schedule");
  assert.equal(data.leads[0].estado, "SEGUIMIENTO");
  assert.equal(matchesAgendaFilter(data.leads[0], "", "2026-10-14"), false);
  data = applyCommand(data, { type: "status", leadId: lead.id, version: 1, estado: "INTERESADO" }, now, "interest");
  assert.equal(data.leads[0].estado, "INTERESADO");
  assert.equal(data.leads[0].secuenciaPausada, true);
  assert.equal(data.leads[0].proximoContacto, "2026-10-20");
  data = applyCommand(data, { type: "reschedule", leadId: lead.id, version: 2, fecha: "2026-10-22", accion: "Confirmar contratación" }, now, "schedule-interest");
  assert.equal(data.leads[0].estado, "INTERESADO");
});

test("la migración se basa en WhatsApp confirmado y respuestas, no en haber hecho el estudio", () => {
  const data = seed(); const lead: Lead = { ...data.leads[0], estado: "ESTUDIO_GRATUITO", tipoEstudio: "GRATUITO", perfilEstudio: "A" };
  const event = (tipo: Interaction["tipo"], id = "1"): Interaction => ({ id, leadId: lead.id, tipo, fecha: now.toISOString(), detalle: "Registro" });
  assert.equal(statusReconciliation({ interacciones: [] }, lead), "NUEVO");
  assert.equal(statusReconciliation({ interacciones: [event("ESTUDIO_CLASIFICADO")] }, lead), "NUEVO");
  assert.equal(statusReconciliation({ interacciones: [event("ENVIADO")] }, lead), "CONTACTADO");
  assert.equal(statusReconciliation({ interacciones: [event("ENVIADO"), event("RESPONDIO", "2")] }, lead), "EN_CONVERSACION");
  assert.equal(statusReconciliation({ interacciones: [event("REPROGRAMADO")] }, lead), "SEGUIMIENTO");
  const undone = { ...event("ACCION_DESHECHA", "2"), undoneInteractionId: "1" };
  assert.equal(hasConfirmedContact({ interacciones: [event("ENVIADO"), undone] }, lead), false);
  for (const state of ["INTERESADO", "CLIENTE", "NO_APTO", "INACTIVO", "EN_CONVERSACION"] as const)
    assert.equal(statusReconciliation({ interacciones: [event("ENVIADO")] }, { ...lead, estado: state }), undefined);
});

test("la corrección de registros anteriores cambia únicamente estado y versión, conserva cola y permite deshacer", () => {
  const data = seed(); const lead = data.leads[0];
  lead.estado = "ESTUDIO_GRATUITO"; lead.tipoEstudio = "GRATUITO"; lead.perfilEstudio = "B";
  lead.ultimoContacto = now.toISOString();
  const before = leadOperationalSnapshot(lead);
  const changed = applyCommand(data, { type: "reconcileStatus", leadId: lead.id, version: 0 }, now, "repair");
  assert.deepEqual(leadOperationalSnapshot(changed.leads[0]), { ...before, estado: "CONTACTADO" });
  assert.equal(statusReconciliation(changed, changed.leads[0]), undefined);
  const undone = applyCommand(changed, { type: "undo", leadId: lead.id, version: 1, interactionId: "repair" }, now, "undo");
  assert.deepEqual(leadOperationalSnapshot(undone.leads[0]), before);
});
