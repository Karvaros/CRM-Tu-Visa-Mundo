import assert from "node:assert/strict";
import test from "node:test";
import { createStudyReview } from "../lib/study-review";
import { createMockData } from "../lib/mock-data";
import type { createStudyStore, StudyClaim, LeadRow } from "../lib/study-store";
import type { createActiveCampaign } from "../lib/activecampaign";
import { mapInteraction, mapLead } from "../lib/baserow";

function fixture() {
  const data = createMockData("2026-10-14");
  data.mensajes = data.mensajes.map((message, index) => ({ ...message, id: String(index + 1) }));
  let claim: StudyClaim = { id: "original-study", rowId: 9, email: "test@example.com", perfil: "PENDIENTE", automation: null,
    status: "REVIEW", legacy: false, createdAt: "2026-10-14T14:53:55.607Z", answers: {
      destino: "Estados Unidos", grupo: "Grupo Familiar (Pareja e hijos)", solicitud: "Primera vez",
      pasaportes: "Todos tenemos pasaporte vigente", ocupacion: "Empleado (Contrato laboral)",
      visaAnterior: "Sí, de EEUU o Canadá o Australia", viajes: "No: No ha salido del país",
      cumplimiento: "Ninguna de las anteriores", lazos: "No tenemos familia allá",
      nombre: "Prueba", email: "test@example.com", telefono: "3012339245",
    } };
  let raw: LeadRow = { id: 8, NOMBRE: "Prueba", EMAIL: claim.email, VERSION: 3, DESTINO: "Estados Unidos",
    ESTADO: "ESTUDIO_GRATUITO", TIPO_ESTUDIO: "GRATUITO", PRIMER_ESTUDIO_ID: claim.id,
    FECHA_PRIMER_ESTUDIO: claim.createdAt, SEGUIMIENTO_MANUAL: true, SECUENCIA_PAUSADA: true,
    PROXIMA_ACCION: "Revisar clasificación del Estudio de Perfil", PROXIMO_CONTACTO: claim.createdAt };
  let starts = 0;
  let failAfterSend = false;
  let history: { perfil: "C"; automation: number; date: string } | null = null;
  const revisions: string[] = [];
  const store = {
    async findClaim() { return structuredClone(claim); }, async findLead() { return structuredClone(raw); },
    async updateClaim(value: StudyClaim) { claim = structuredClone(value); },
    async recordRevision(value: StudyClaim) { if (!revisions.includes(value.id)) revisions.push(value.id); },
    async updateLead(_id: number, fields: Record<string, unknown>) {
      if (failAfterSend) { failAfterSend = false; throw new Error("write failed"); }
      raw = { ...raw, ...fields }; return raw;
    },
  } as unknown as ReturnType<typeof createStudyStore>;
  const campaign = {
    automationForOutcome() { return 27; }, async findContact() { return { id: "700" }; },
    async historicalStudy() { return history; }, async syncContact(answers: StudyClaim["answers"]) {
      assert.deepEqual(answers, claim.answers); return { id: "700" };
    }, async startStudyAutomation() { starts++; history = { perfil: "C", automation: 27, date: "2026-10-14" }; },
  } as unknown as ReturnType<typeof createActiveCampaign>;
  async function load() {
    return { ...data, leads: [mapLead(raw)], interacciones: [mapInteraction({ id: 9, LEAD: [{ id: 8 }],
      TIPO: "ESTUDIO_CLASIFICADO", RESPUESTAS_ESTUDIO: JSON.stringify(claim), ID_EVENTO_EXTERNO: `ESTUDIO_V2_PRIMERO:${claim.email}` })] };
  }
  const resolve = createStudyReview({ store, campaign, load, now: () => new Date("2026-10-14T17:00:00Z") });
  return { resolve, load, get claim() { return claim; }, get raw() { return raw; }, get starts() { return starts; }, revisions,
    failNextLeadWrite() { failAfterSend = true; }, close() { raw.ESTADO = "INACTIVO"; },
    setOtherCombination() { claim.answers.viajes = "Sí: Solo países de Latinoamérica"; } };
}

test("resuelve el pendiente a Medio, preserva primer estudio y respuestas y recupera presentación sin registrar envío", async () => {
  const f = fixture();
  const original = structuredClone(f.claim);
  await f.resolve("8", 3, "Lina Osorio");
  assert.equal(f.starts, 1);
  assert.equal(f.raw.PERFIL_ESTUDIO, "C");
  assert.equal(f.raw.SEGMENTO, "ESTUDIO_C");
  assert.equal(f.raw.SECUENCIA_ID, "estudio-eeuu");
  assert.equal(f.raw.SECUENCIA_PAUSADA, false);
  assert.equal(f.raw.SEGUIMIENTO_MANUAL, false);
  assert.equal(f.raw.ULTIMO_CONTACTO, undefined);
  const data = await f.load();
  const pending = data.mensajes.find((m) => m.id === String((f.raw.PROXIMO_MENSAJE as number[])[0]))!;
  assert.equal(pending.diaSecuencia, 0);
  assert.deepEqual(f.claim.answers, original.answers);
  assert.equal(f.claim.id, original.id);
  assert.equal(f.claim.createdAt, original.createdAt);
  assert.equal(f.claim.revision?.asesor, "Lina Osorio");
  assert.equal(f.claim.status, "SENT");
  assert.equal(data.interacciones[0].estudio?.perfil, "C");
  assert.equal(JSON.stringify(data.interacciones[0].estudio).includes("automation"), false);
  await assert.rejects(f.resolve("8", 4, "Lina"), /ya está clasificado/);
  assert.equal(f.starts, 1);
});

test("reintentar tras fallo de Baserow después de activar correo no duplica la automatización", async () => {
  const f = fixture(); f.failNextLeadWrite();
  await assert.rejects(f.resolve("8", 3, "Lina"), /write failed/);
  assert.equal(f.claim.status, "ERROR");
  assert.equal(f.starts, 1);
  await f.resolve("8", 3, "Lina");
  assert.equal(f.starts, 1);
  assert.equal(f.claim.status, "SENT");
  assert.equal(f.revisions.length, 1);
});

test("no reactiva cerrados ni resuelve combinaciones no autorizadas", async () => {
  const closed = fixture(); closed.close();
  await assert.rejects(closed.resolve("8", 3, "Lina"), /cerrado/);
  assert.equal(closed.starts, 0);
  const other = fixture(); other.setOtherCombination();
  await assert.rejects(other.resolve("8", 3, "Lina"), /otro|otra revisión/);
  assert.equal(other.starts, 0);
});
