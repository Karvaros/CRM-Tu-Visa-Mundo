import assert from "node:assert/strict";
import test from "node:test";
import { applyCommand, renderMessage } from "../lib/crm";
import { createMockData } from "../lib/mock-data";
import { firstStudyMessage } from "../lib/message-sequences";
import type { StudyProfile } from "../lib/types";

const scenarios = [
  ["Canadá", "canada"],
  ["Australia", "australia"],
  ["Estados Unidos", "eeuu"],
  ["Reino Unido", "uk"],
] as const;
const sentAt = new Date("2026-09-14T15:30:00Z");

test("cada destino elige el resultado A/B/C de su propia secuencia", () => {
  const { mensajes } = createMockData("2026-09-14");
  for (const [destination, slug] of scenarios) {
    for (const profile of ["A", "B", "C"] as StudyProfile[]) {
      const message = firstStudyMessage(mensajes, destination, profile);
      assert.equal(message?.id, `estudio-${slug}-2-${profile.toLowerCase()}`);
      assert.equal(message?.requiereRevision, false);
    }
    assert.equal(firstStudyMessage(mensajes, destination, "D"), undefined);
  }
});

test("confirmar el resultado programa testimonios desde el envío real, sin mezclar países", () => {
  for (const [destination, slug] of scenarios) {
    const data = createMockData("2026-09-14");
    const message = firstStudyMessage(data.mensajes, destination, "B")!;
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
    const message = firstStudyMessage(data.mensajes, destination, "C")!;
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
