import assert from "node:assert/strict";
import test from "node:test";
import { createBaserowMessageWriter } from "../lib/baserow-message-writer";
import { validMessageEdit, validateMessageEdit } from "../lib/message-edit";
import type { CrmData, Message } from "../lib/types";

const source: Message = {
  id: "9", secuenciaId: "estudio-canada", segmento: ["ESTUDIO_A"], destino: "Canadá",
  orden: 4, diaSecuencia: 20, titulo: "Tres errores", texto: "Mira este Reel: [Link Instagram]",
  recursoTipo: "REEL", soloDiasHabiles: true, borrador: false, requiereRevision: true,
  observaciones: ["Falta el Reel."],
};
const data: CrmData = { leads: [], interacciones: [], mensajes: [source] };

test("edita solo el texto y recursos de un mensaje existente en Baserow", async () => {
  const calls: { url: string; body: Record<string, unknown>; method: string }[] = [];
  let reads = 0;
  const writer = createBaserowMessageWriter({
    token: "private-token", table: 103,
    load: async () => { reads++; return data; },
    fetcher: async (url, options) => {
      calls.push({ url: String(url), body: JSON.parse(String(options?.body)), method: String(options?.method) });
      return new Response(null, { status: 200 });
    },
  });
  const url = "https://www.instagram.com/reel/example/";
  const edit = {
    id: "9", titulo: "Tres errores", texto: `Mira este Reel: ${url}`,
    diaSecuencia: 20, recursoUrl: url, soloDiasHabiles: true,
    requiereRevision: false, observaciones: [],
  };
  assert.equal(validMessageEdit(edit), true);
  await writer.save(edit);
  assert.equal(reads, 2);
  assert.equal(calls[0].method, "PATCH");
  assert.equal(calls[0].url, "https://api.baserow.io/api/database/rows/table/103/9/?user_field_names=true");
  assert.equal(calls[0].body.TEXTO, edit.texto);
  assert.equal(calls[0].body.REQUIERE_REVISION, false);
  assert.equal("SECUENCIA_ID" in calls[0].body, false);
  assert.equal("LEAD" in calls[0].body, false);
});

test("no habilita un mensaje con enlace ausente o notas pendientes", () => {
  assert.throws(() => validateMessageEdit({ ...source, requiereRevision: false }), /marcador/);
  assert.throws(() => validateMessageEdit({ ...source, texto: "Reel: https://example.com", recursoUrl: "https://example.com", requiereRevision: false }), /notas pendientes/);
  assert.throws(() => validateMessageEdit({ ...source, texto: "Hola {Nombre}" }), /nombre/);
  assert.equal(validMessageEdit({ id: "9", texto: "Sin campos" }), false);
});

