import type { StudyAnswers, StudyOutcome } from "./study";

export type StudyAutomations = Record<"PERFIL_ALTO_RENOVACION" | "PERFIL_ALTO_PRIMERA_VEZ" | "PERFIL_MEDIO_ALTO" | "PERFIL_MEDIO" | "PERFIL_BAJO", number>;
export type StudyFields = Record<"destino" | "grupo" | "solicitud" | "pasaportes" | "ocupacion" | "visaAnterior" | "viajes" | "cumplimiento" | "lazos", number>;

type Contact = { id: string; email: string };
type AutomationRun = { seriesid: string; adddate?: string };
type Fetcher = typeof fetch;

export function automationForOutcome(outcome: StudyOutcome, automations: StudyAutomations): number | null {
  return outcome.correo ? automations[outcome.correo as keyof StudyAutomations] ?? null : null;
}

export function firstHistoricalProfile(runs: AutomationRun[], automations: StudyAutomations): { perfil: "A" | "B" | "C" | "D"; automation: number; date: string } | null {
  const known = runs
    .map((run) => ({ id: Number(run.seriesid), date: run.adddate ?? "" }))
    .filter((run) => Object.values(automations).includes(run.id))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!known.length) return null;
  const id = known[0].id;
  return { perfil: id === automations.PERFIL_ALTO_RENOVACION || id === automations.PERFIL_ALTO_PRIMERA_VEZ ? "A" : id === automations.PERFIL_MEDIO_ALTO ? "B" : id === automations.PERFIL_MEDIO ? "C" : "D", automation: id, date: known[0].date };
}

export function createActiveCampaign(options: { apiUrl: string; apiKey: string; automations: StudyAutomations; fields: StudyFields; fetcher?: Fetcher }) {
  const { apiUrl, apiKey, automations, fields, fetcher = fetch } = options;
  const origin = new URL(apiUrl);
  if (origin.protocol !== "https:") throw new Error("ActiveCampaign requiere HTTPS.");
  if (!apiKey) throw new Error("Falta ACTIVE_CAMPAIGN_API_KEY.");
  const base = `${origin.origin}/api/3`;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetcher(`${base}${path}`, {
      ...init,
      headers: { "Api-Token": apiKey, "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`ActiveCampaign devolvió HTTP ${response.status}.`);
    return response.json() as Promise<T>;
  }

  return {
    automationForOutcome(outcome: StudyOutcome) { return automationForOutcome(outcome, automations); },
    async findContact(email: string): Promise<Contact | null> {
      const result = await request<{ contacts: Contact[] }>(`/contacts?email=${encodeURIComponent(email)}&limit=2`);
      return result.contacts.find((contact) => contact.email.toLowerCase() === email) ?? null;
    },
    async historicalStudy(contactId: string) {
      const runs: AutomationRun[] = [];
      for (let offset = 0; ; offset += 100) {
        const result = await request<{ contactAutomations: AutomationRun[] }>(
          `/contactAutomations?filters[subscriberid][eq]=${encodeURIComponent(contactId)}&limit=100&offset=${offset}`,
        );
        if (!Array.isArray(result.contactAutomations)) throw new Error("Historial de ActiveCampaign inválido.");
        runs.push(...result.contactAutomations);
        if (result.contactAutomations.length < 100) break;
      }
      return firstHistoricalProfile(runs, automations);
    },
    async syncContact(answers: StudyAnswers): Promise<Contact> {
      const parts = answers.nombre!.trim().split(/\s+/);
      const result = await request<{ contact: Contact }>("/contact/sync", {
        method: "POST",
        body: JSON.stringify({
          source: "CRM Tu Visa Mundo V2",
          contact: {
            email: answers.email!.trim().toLowerCase(),
            firstName: parts[0], lastName: parts.slice(1).join(" "), phone: answers.telefono!.trim(),
            fieldValues: Object.entries(fields).map(([key, field]) => ({
              field: String(field), value: answers[key as keyof StudyFields],
            })),
          },
        }),
      });
      if (!result.contact?.id) throw new Error("ActiveCampaign no confirmó el contacto.");
      return result.contact;
    },
    async startStudyAutomation(contactId: string, automation: number): Promise<void> {
      const result = await request<{ contactAutomation?: { seriesid?: string; automation?: string }; meta?: { succeeded?: number[]; failed?: number[] } }>(
        "/contactAutomations",
        { method: "POST", body: JSON.stringify({ contactAutomation: { contact: contactId, automation: String(automation) } }) },
      );
      const started = Number(result.contactAutomation?.seriesid ?? result.contactAutomation?.automation) === automation;
      if (!started && !result.meta?.succeeded?.includes(automation)) {
        throw new Error("ActiveCampaign no confirmó el inicio de la automatización.");
      }
    },
  };
}
