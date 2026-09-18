import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { countryForForm, createFormRegistration, parseFormWebhook, validWebhookSignature } from "../lib/form-registration";
import { createStudyStore } from "../lib/study-store";
import { mapLead } from "../lib/baserow";
import { priority } from "../lib/crm";

test("acepta únicamente una firma auténtica y los formularios de turismo", () => {
  const body = new URLSearchParams({ type: "subscribe", "form[id]": "1", "contact[id]": "121", "contact[email]": "TEST@example.com" }).toString();
  const signature = createHmac("sha256", "test-secret").update(body).digest("hex");
  assert.equal(validWebhookSignature(body, signature, "test-secret"), true);
  assert.equal(validWebhookSignature(`${body}&extra=1`, signature, "test-secret"), false);
  assert.equal(parseFormWebhook(body)?.email, "test@example.com");
  assert.equal(parseFormWebhook(body.replace("form%5Bid%5D=1", "form%5Bid%5D=7")), null);
  assert.deepEqual(countryForForm("1", "Canadá"), { name: "Canadá", slug: "canada" });
  assert.deepEqual(countryForForm("3"), { name: "Estados Unidos", slug: "eeuu" });
});

test("crea un único lead nuevo y lo muestra tras 30 minutos; conserva estudio anterior", async () => {
  const leads: Array<Record<string, unknown> & { id: number }> = [];
  const store = createStudyStore({ token: "test-token", ids: { leads: 1, interacciones: 2, emailField: 3, eventField: 4 },
    fetcher: async (input, init) => {
      const url = new URL(String(input));
      if (init?.method === "POST") {
        const row = { id: leads.length + 1, ...JSON.parse(String(init.body)) };
        leads.push(row);
        return Response.json(row);
      }
      return Response.json({ results: leads.filter((lead) => lead.EMAIL === url.searchParams.get("filter__field_3__equal")) });
    },
  });
  const sync = createFormRegistration({ store, readDestination: async () => "Canadá", findFirstMessage: async () => 11,
    now: () => new Date("2026-09-17T13:00:00Z") });
  const registration = { formId: "1" as const, contactId: "121", email: "test@example.com", firstName: "Ana", lastName: "Prueba", phone: "+541112345678" };
  assert.equal(await sync(registration), "created");
  assert.equal(leads.length, 1);
  assert.deepEqual(leads[0].PROXIMO_MENSAJE, [11]);
  const lead = mapLead(leads[0]);
  assert.equal(priority(lead, "2026-09-17", new Date("2026-09-17T13:29:00Z")), null);
  assert.equal(priority(lead, "2026-09-17", new Date("2026-09-17T13:30:00Z")), "NUEVO");
  leads[0].PRIMER_ESTUDIO_ID = "first-study";
  leads[0].PERFIL_ESTUDIO = "B";
  assert.equal(await sync(registration), "existing");
  assert.equal(leads[0].PRIMER_ESTUDIO_ID, "first-study");
  assert.equal(leads.length, 1);
});

test("un nuevo formulario no reactiva el correo de un lead dado de baja", async () => {
  let stopped = 0;
  const store = {
    async findLead() { return { id: 7, AC_SYNC_STATUS: "OPTED_OUT" }; },
  } as unknown as ReturnType<typeof createStudyStore>;
  const sync = createFormRegistration({ store,
    readDestination: async () => { throw new Error("No debe leer el destino"); },
    findFirstMessage: async () => { throw new Error("No debe buscar mensajes"); },
    keepClosed: async (email) => { assert.equal(email, "test@example.com"); stopped++; },
  });
  assert.equal(await sync({ formId: "1", contactId: "7", email: "test@example.com",
    firstName: "", lastName: "", phone: "" }), "existing");
  assert.equal(stopped, 1);
});
