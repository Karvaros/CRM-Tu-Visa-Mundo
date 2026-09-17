import assert from "node:assert/strict";
import test from "node:test";
import { createActiveCampaign } from "../lib/activecampaign";
import { createStudyStore } from "../lib/study-store";
import { createStudySubmission, validateStudyAnswers } from "../lib/study-submission";
import { studyOptions, type StudyAnswers } from "../lib/study";

const answers: StudyAnswers = {
  destino: studyOptions.destino[0], grupo: studyOptions.grupo[0], solicitud: "Renovación",
  pasaportes: studyOptions.pasaportes[0], ocupacion: studyOptions.ocupacion[0],
  visaAnterior: studyOptions.visaAnterior[0], viajes: studyOptions.viajes[0],
  cumplimiento: studyOptions.cumplimiento[2], lazos: studyOptions.lazos[1],
  nombre: "Ana Prueba", email: "ANA@example.com", telefono: "+541112345678",
};
const ids = { leads: 101, interacciones: 102, emailField: 201, eventField: 202 };
const automations = { PERFIL_ALTO_RENOVACION: 301, PERFIL_ALTO_PRIMERA_VEZ: 302,
  PERFIL_MEDIO_ALTO: 303, PERFIL_MEDIO: 304, PERFIL_BAJO: 305 };
const fields = { destino: 401, grupo: 402, solicitud: 403, pasaportes: 404,
  ocupacion: 405, visaAnterior: 406, viajes: 407, cumplimiento: 408, lazos: 409 };

test("valida en el servidor y normaliza el correo", () => {
  assert.equal(validateStudyAnswers(answers).email, "ana@example.com");
  assert.throws(() => validateStudyAnswers({ ...answers, pasaportes: "opción inventada" }), /pasaportes/);
  assert.throws(() => validateStudyAnswers({ ...answers, telefono: "123" }), /teléfono válido/);
});

test("guarda la primera clasificación y dispara solo su automatización de ActiveCampaign", async () => {
  const leads: Array<Record<string, unknown> & { id: number }> = [];
  const interactions: Array<Record<string, unknown> & { id: number }> = [];
  const startedAutomations: number[] = [];
  let syncPayload: Record<string, unknown> | null = null;
  const fetcher: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method ?? "GET";
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    if (url.hostname === "api.baserow.io") {
      assert.equal(new Headers(init?.headers).get("Authorization"), "Token test-baserow");
      const isLead = url.pathname.includes(`/${ids.leads}/`);
      const rows = isLead ? leads : interactions;
      if (method === "GET") {
        const field = isLead ? "EMAIL" : "ID_EVENTO_EXTERNO";
        const key = `filter__field_${isLead ? ids.emailField : ids.eventField}__equal`;
        return Response.json({ results: rows.filter((row) => row[field] === url.searchParams.get(key)) });
      }
      if (method === "POST") {
        const row = { id: rows.length + 1, ...body };
        rows.push(row);
        return Response.json(row);
      }
      const id = Number(url.pathname.match(/\/(\d+)\/$/)?.[1]);
      const row = rows.find((item) => item.id === id)!;
      Object.assign(row, body);
      return Response.json(row);
    }
    assert.equal(new Headers(init?.headers).get("Api-Token"), "test-activecampaign");
    if (url.pathname.endsWith("/contacts")) return Response.json({ contacts: [] });
    if (url.pathname.endsWith("/contact/sync")) {
      syncPayload = body;
      return Response.json({ contact: { id: "700", email: "ana@example.com" } });
    }
    if (url.pathname.endsWith("/contactAutomations")) {
      if (method === "GET") return Response.json({ contactAutomations: [] });
      const id = Number((body.contactAutomation as { automation: string }).automation);
      startedAutomations.push(id);
      return Response.json({ contactAutomation: { seriesid: String(id) } });
    }
    throw new Error(`Unexpected request: ${method} ${url}`);
  };
  const store = createStudyStore({ token: "test-baserow", ids, fetcher });
  const campaign = createActiveCampaign({ apiUrl: "https://example.api-us1.com", apiKey: "test-activecampaign", automations, fields, fetcher });
  const submit = createStudySubmission({ store, campaign, now: () => new Date("2026-09-17T12:00:00Z"), uuid: () => "study-one" });

  const first = await submit(answers);
  assert.deepEqual(first, { perfil: "A", status: "SENT" });
  assert.equal(leads[0].PERFIL_ESTUDIO, "A");
  assert.equal(leads[0].FECHA_PRIMER_ESTUDIO, "2026-09-17T12:00:00.000Z");
  assert.equal(leads[0].FECHA_INGRESO, "2026-09-17T12:00:00.000Z");
  assert.equal(leads[0].SECUENCIA_PAUSADA, true);
  assert.equal(leads[0].PROXIMA_ACCION, "Revisar estudio y continuar desde el último WhatsApp enviado");
  assert.equal(interactions[0].ID_EVENTO_EXTERNO, "ESTUDIO_V2_PRIMERO:ana@example.com");
  assert.equal(interactions[0].FECHA, "2026-09-17T12:00:00.000Z");
  assert.deepEqual(startedAutomations, [301]);
  const contact = (syncPayload as { contact: { fieldValues: Array<{ field: string; value: string }> } } | null)?.contact;
  assert.equal(contact?.fieldValues.find((item) => item.field === String(fields.solicitud))?.value, "Renovación");
  assert.equal(contact?.fieldValues.find((item) => item.field === String(fields.destino))?.value, "Canadá");
  assert.equal(Object.hasOwn(contact ?? {}, "form"), false);

  const repeated = await submit({ ...answers, solicitud: "Primera vez", pasaportes: studyOptions.pasaportes[2] });
  assert.deepEqual(repeated, { perfil: null, status: "EXISTING" });
  assert.equal(leads[0].PERFIL_ESTUDIO, "A");
  assert.equal(interactions.length, 1);
  assert.deepEqual(startedAutomations, [301]);
});

test("si ActiveCampaign inicia el correo pero falla la respuesta, el reintento no lo duplica", async () => {
  type Claim = NonNullable<Awaited<ReturnType<ReturnType<typeof createStudyStore>["findClaim"]>>>;
  let claim: Claim | null = null;
  let lead: Record<string, unknown> & { id: number } | null = null;
  let contactCreated = false;
  let started = 0;
  const store = {
    async findLead() { return lead; },
    async findClaim() { return claim; },
    async claimFirst(value: Claim) { claim = { ...value, rowId: 1 }; return { claim, created: true }; },
    async createLead(fields: Record<string, unknown>) { lead = { id: 1, ...fields }; return lead; },
    async updateLead(_id: number, fields: Record<string, unknown>) { lead = { ...lead!, ...fields }; return lead; },
    async linkClaim() {},
    async updateClaim(value: Claim) { claim = value; },
  } as unknown as ReturnType<typeof createStudyStore>;
  const campaign = {
    automationForOutcome() { return 301; },
    async findContact() { return contactCreated ? { id: "700", email: "ana@example.com" } : null; },
    async historicalStudy() { return started ? { perfil: "A" as const, automation: 301, date: "2026-09-17T12:00:00Z" } : null; },
    async syncContact() { contactCreated = true; return { id: "700", email: "ana@example.com" }; },
    async startStudyAutomation() { started += 1; throw new Error("Respuesta perdida después del inicio"); },
  } as unknown as ReturnType<typeof createActiveCampaign>;
  const submit = createStudySubmission({ store, campaign, now: () => new Date("2026-09-17T12:00:00Z"), uuid: () => "one" });

  assert.deepEqual(await submit(answers), { perfil: null, status: "ERROR" });
  assert.equal(started, 1);
  assert.deepEqual(await submit(answers), { perfil: null, status: "EXISTING" });
  assert.equal(started, 1);
  assert.equal((claim as Claim | null)?.status, "SENT");
});
