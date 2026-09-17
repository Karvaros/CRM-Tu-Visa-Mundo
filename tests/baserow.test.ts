import assert from "node:assert/strict";
import test from "node:test";
import { createBaserowReader } from "../lib/baserow";
const tables = { leads: 101, interacciones: 102, mensajes: 103 };

test("lee las tres tablas con paginación y traduce relaciones a IDs del CRM", async () => {
  const requested: string[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    requested.push(url);
    assert.equal(new Headers(init?.headers).get("Authorization"), "Token secreto-de-prueba");
    assert.equal(init?.cache, "no-store");
    if (url.includes(`/${tables.leads}/`)) {
      return Response.json({
        results: [{ id: 42, NOMBRE: "Ana", WHATSAPP: "123", VERSION: 1,
          SEGMENTO: "SIN_ESTUDIO", TIPO_ESTUDIO: "NINGUNO", ESTADO: "NUEVO",
          ULTIMO_MENSAJE: [{ id: 8, value: "Intro" }], PROXIMO_MENSAJE: [{ id: 9, value: "Siguiente" }],
          SECUENCIA_PAUSADA: true }],
        next: null,
      });
    }
    if (url.includes(`/${tables.interacciones}/`)) {
      return Response.json({ results: [{ id: 7, TIPO: "ENVIADO", LEAD: [{ id: 42, value: "Ana" }],
        MENSAJE: [{ id: 8, value: "Intro" }] }], next: null });
    }
    if (url.includes("page=2")) {
      return Response.json({ results: [{ id: 9, TITULO: "Siguiente", SEGMENTOS: "ESTUDIO_A, ESTUDIO_B" }], next: null });
    }
    return Response.json({ results: [{ id: 8, TITULO: "Intro", SEGMENTOS: "SIN_ESTUDIO" }],
      next: `https://api.baserow.io/api/database/rows/table/${tables.mensajes}/?page=2` });
  };
  const data = await createBaserowReader({ token: "secreto-de-prueba", tables, fetcher }).load();
  assert.equal(requested.length, 4);
  assert.equal(data.leads[0].ultimoMensajeId, "8");
  assert.equal(data.leads[0].proximoMensajeId, "9");
  assert.equal(data.leads[0].secuenciaPausada, true);
  assert.equal(data.interacciones[0].leadId, "42");
  assert.equal(data.interacciones[0].mensajeId, "8");
  assert.deepEqual(data.mensajes[1].segmento, ["ESTUDIO_A", "ESTUDIO_B"]);
});

test("rechaza una continuación ajena sin enviarle el token", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    return Response.json({ results: [], next: "https://otro-dominio.example/robar" });
  };
  await assert.rejects(createBaserowReader({ token: "secreto-de-prueba", tables, fetcher }).load(), /continuación inválida/);
  assert.equal(calls, 3);
});
