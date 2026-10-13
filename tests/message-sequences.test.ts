import assert from "node:assert/strict";
import test from "node:test";
import { applyCommand, renderMessage } from "../lib/crm";
import { createMockData } from "../lib/mock-data";
import { confirmedWhatsAppMessageIds, firstStudyMessage, initialStudyContactRepairs } from "../lib/message-sequences";
import type { StudyProfile } from "../lib/types";

const scenarios = [
  ["Canadá", "canada"],
  ["Australia", "australia"],
  ["Estados Unidos", "eeuu"],
  ["Reino Unido", "uk"],
] as const;
const sentAt = new Date("2026-09-14T15:30:00Z");

test("cada destino A/B/C empieza por la presentación cuando no hay WhatsApp confirmado", () => {
  const { mensajes } = createMockData("2026-09-14");
  for (const [destination, slug] of scenarios) {
    for (const profile of ["A", "B", "C"] as StudyProfile[]) {
      const message = firstStudyMessage(mensajes, destination, profile);
      assert.equal(message?.id, `sin-estudio-${slug}-1`);
      assert.equal(message?.diaSecuencia, 0);
      assert.equal(message?.requiereRevision, false);
      assert.equal(firstStudyMessage(mensajes, destination, profile, [message!.id])?.id,
        `estudio-${slug}-2-${profile.toLowerCase()}`);
    }
    assert.equal(firstStudyMessage(mensajes, destination, "D"), undefined);
  }
});

test("confirmar el resultado programa testimonios desde el envío real, sin mezclar países", () => {
  for (const [destination, slug] of scenarios) {
    const data = createMockData("2026-09-14");
    const message = firstStudyMessage(data.mensajes, destination, "B", [`sin-estudio-${slug}-1`])!;
    const lead = data.leads[2];
    Object.assign(lead, {
      destino: destination, segmento: "ESTUDIO_B", perfilEstudio: "B",
      secuenciaId: message.secuenciaId, proximoMensajeId: message.id,
      proximoContacto: "2026-09-14",
    });
    const result = applyCommand(data, {
      type: "sent", leadId: lead.id, version: lead.version,
      mensajeId: message.id, mensajeTexto: renderMessage(message, lead),
    }, sentAt, `enviado-${slug}`);
    assert.equal(result.leads[2].proximoMensajeId, `estudio-${slug}-3`);
    assert.equal(result.leads[2].proximoContacto, "2026-09-21");
    assert.equal(result.interacciones[0].tipo, "ENVIADO");
  }
});

test("testimonios previos de SIN ESTUDIO no se repiten tras el resultado", () => {
  for (const [destination, slug] of scenarios) {
    const data = createMockData("2026-09-14");
    const message = firstStudyMessage(data.mensajes, destination, "C", [`sin-estudio-${slug}-1`])!;
    const lead = data.leads[2];
    Object.assign(lead, {
      destino: destination, segmento: "ESTUDIO_C", perfilEstudio: "C",
      secuenciaId: message.secuenciaId, proximoMensajeId: message.id,
      proximoContacto: "2026-09-14",
    });
    data.interacciones.push({
      id: `anterior-${slug}`, leadId: lead.id, tipo: "ENVIADO",
      fecha: "2026-09-10T15:30:00Z", detalle: "Testimonios enviados",
      mensajeId: `sin-estudio-${slug}-4`,
    });
    const result = applyCommand(data, {
      type: "sent", leadId: lead.id, version: lead.version,
      mensajeId: message.id, mensajeTexto: renderMessage(message, lead),
    }, sentAt, `enviado-${slug}`);
    assert.notEqual(result.leads[2].proximoMensajeId, `estudio-${slug}-3`);
    if (slug !== "canada") assert.equal(result.leads[2].proximoMensajeId, undefined);
  }
});

test("tras la presentación de un estudio se programa su resultado y nunca el recordatorio de hacer el estudio", () => {
  for (const [destination, slug] of scenarios) {
    for (const profile of ["A", "B", "C"] as const) {
      const data = createMockData("2026-09-14");
      const intro = firstStudyMessage(data.mensajes, destination, profile)!;
      const lead = data.leads[2];
      Object.assign(lead, { destino: destination, segmento: `ESTUDIO_${profile}`,
        perfilEstudio: profile, secuenciaId: `estudio-${slug}`, proximoMensajeId: intro.id,
        estado: "ESTUDIO_GRATUITO", proximoContacto: "2026-09-14", seguimientoManual: false, secuenciaPausada: false });
      const result = applyCommand(data, { type: "sent", leadId: lead.id, version: lead.version,
        mensajeId: intro.id, mensajeTexto: renderMessage(intro, lead) }, sentAt, `intro-${slug}-${profile}`);
      const updated = result.leads[2];
      assert.equal(updated.proximoMensajeId, `estudio-${slug}-2-${profile.toLowerCase()}`);
      const next = result.mensajes.find((message) => message.id === updated.proximoMensajeId)!;
      assert.equal(updated.secuenciaId, `estudio-${slug}`);
      assert.equal(updated.proximoContacto, "2026-09-16");
      assert.equal(next.titulo.startsWith("Resultado"), true);
      assert.equal(result.interacciones[0].mensajeId, intro.id);
    }
  }
});

test("un resultado ya confirmado continúa al siguiente hito sin repetir ni presentación ni resultado", () => {
  const { mensajes } = createMockData("2026-09-14");
  for (const [destination, slug] of scenarios) {
    assert.equal(firstStudyMessage(mensajes, destination, "B", [`estudio-${slug}-2-b`])?.id,
      `estudio-${slug}-3`);
    const next = firstStudyMessage(mensajes, destination, "B", [`sin-estudio-${slug}-4`, `estudio-${slug}-2-b`]);
    assert.notEqual(next?.id, `estudio-${slug}-3`);
  }
});

test("correo, estudio, mensajes copiados o asignados no cuentan como WhatsApp enviado", () => {
  const data = createMockData("2026-09-14");
  const lead = data.leads[2];
  Object.assign(lead, { ultimoContacto: undefined, ultimoMensajeId: undefined });
  data.interacciones = [{ id: "study", leadId: lead.id, tipo: "ESTUDIO_CLASIFICADO",
    fecha: sentAt.toISOString(), detalle: "Correo enviado", mensajeId: "estudio-canada-2-b" }];
  assert.deepEqual(confirmedWhatsAppMessageIds(data, lead), []);
  data.interacciones.push({ id: "sent", leadId: lead.id, tipo: "ENVIADO", fecha: sentAt.toISOString(),
    detalle: "Confirmado", mensajeId: "sin-estudio-canada-1" });
  assert.deepEqual(confirmedWhatsAppMessageIds(data, lead), ["sin-estudio-canada-1"]);
});

test("la reparación recupera el día cero de todos los destinos y conserva conversaciones y acciones manuales", () => {
  for (const [destination, slug] of scenarios) {
    const data = createMockData("2026-09-14");
    const lead = data.leads[2];
    data.leads = [lead]; data.interacciones = [];
    Object.assign(lead, { destino: destination, tipoEstudio: "GRATUITO", perfilEstudio: "B",
      estado: "ESTUDIO_GRATUITO", secuenciaId: `estudio-${slug}`, proximoMensajeId: `estudio-${slug}-2-b`,
      ultimoMensajeId: undefined, ultimoContacto: undefined, seguimientoManual: false, secuenciaPausada: false });
    assert.equal(initialStudyContactRepairs(data)[0]?.message.id, `sin-estudio-${slug}-1`);
    lead.seguimientoManual = true;
    assert.equal(initialStudyContactRepairs(data).length, 0);
    lead.seguimientoManual = false;
    lead.estado = "EN_CONVERSACION";
    assert.equal(initialStudyContactRepairs(data).length, 0);
    lead.estado = "ESTUDIO_GRATUITO";
    data.interacciones.push({ id: "sent", leadId: lead.id, tipo: "ENVIADO", fecha: sentAt.toISOString(),
      detalle: "Presentación enviada", mensajeId: `sin-estudio-${slug}-1` });
    assert.equal(initialStudyContactRepairs(data).length, 0);
    data.interacciones[0].tipo = "REPROGRAMADO";
    assert.equal(initialStudyContactRepairs(data).length, 0);
    data.interacciones = [];
    lead.perfilEstudio = "D";
    assert.equal(initialStudyContactRepairs(data).length, 0);
  }
});
