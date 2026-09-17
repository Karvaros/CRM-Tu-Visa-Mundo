import type { StudyAnswers } from "./study";

export type StudyTableIds = { leads: number; interacciones: number; emailField: number; eventField: number };

export type StoredProfile = "A" | "B" | "C" | "D" | "PENDIENTE";
export type ClaimStatus = "PROCESSING" | "REVIEW" | "SENT" | "ERROR" | "HISTORICAL";
export type StudyClaim = {
  id: string;
  email: string;
  answers: StudyAnswers;
  perfil: StoredProfile;
  automation: number | null;
  createdAt: string;
  status: ClaimStatus;
  legacy: boolean;
  acContactId?: string;
  rowId?: number;
};
export type LeadRow = Record<string, unknown> & { id: number };

export function studyKey(email: string): string {
  return `ESTUDIO_V2_PRIMERO:${email.trim().toLowerCase()}`;
}

export function createStudyStore(options: { token: string; ids: StudyTableIds; fetcher?: typeof fetch; baseUrl?: string }) {
  const { token, ids, fetcher = fetch, baseUrl = "https://api.baserow.io" } = options;
  if (!token) throw new Error("Falta BASEROW_TOKEN.");
  const origin = new URL(baseUrl);
  if (origin.protocol !== "https:" && origin.hostname !== "localhost") throw new Error("Baserow requiere HTTPS.");
  const base = `${origin.origin}/api/database/rows/table`;

  async function request<T>(table: number, method: "GET" | "POST" | "PATCH", suffix: string, body?: object): Promise<T> {
    const response = await fetcher(`${base}/${table}/${suffix}`, {
      method, headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined, cache: "no-store",
    });
    if (!response.ok) throw new Error(`Baserow devolvió HTTP ${response.status}.`);
    return response.json() as Promise<T>;
  }

  async function findOne(table: number, field: number, value: string): Promise<LeadRow | null> {
    const params = new URLSearchParams({ user_field_names: "true", size: "2", [`filter__field_${field}__equal`]: value });
    const page = await request<{ results: LeadRow[] }>(table, "GET", `?${params}`);
    if (!Array.isArray(page.results)) throw new Error("Baserow devolvió una búsqueda inválida.");
    return page.results[0] ?? null;
  }

  function parseClaim(row: LeadRow | null): StudyClaim | null {
    if (!row) return null;
    try {
      const data = JSON.parse(String(row.RESPUESTAS_ESTUDIO)) as StudyClaim;
      if (!data.email || !data.id || !data.perfil || !data.status) throw new Error("incomplete");
      return { ...data, rowId: row.id };
    } catch {
      throw new Error("El registro del primer estudio no se puede leer; requiere revisión manual.");
    }
  }

  return {
    async findClaim(email: string): Promise<StudyClaim | null> {
      return parseClaim(await findOne(ids.interacciones, ids.eventField, studyKey(email)));
    },
    async claimFirst(claim: StudyClaim): Promise<{ claim: StudyClaim; created: boolean }> {
      try {
        const row = await request<LeadRow>(ids.interacciones, "POST", "?user_field_names=true", {
          TIPO: "ESTUDIO_CLASIFICADO", DETALLE: `Primer Estudio de Perfil: ${claim.perfil}`,
          ID_EVENTO_EXTERNO: studyKey(claim.email), ORIGEN_SISTEMA: "ESTUDIO_V2",
          FECHA: claim.createdAt, RESPUESTAS_ESTUDIO: JSON.stringify(claim),
        });
        return { claim: { ...claim, rowId: row.id }, created: true };
      } catch (error) {
        // The unique constraint on ID_EVENTO_EXTERNO elects exactly one first study.
        if (!(error instanceof Error) || !error.message.includes("HTTP 400")) throw error;
        const existing = await this.findClaim(claim.email);
        if (!existing) throw error;
        return { claim: existing, created: false };
      }
    },
    async updateClaim(claim: StudyClaim): Promise<void> {
      if (!claim.rowId) throw new Error("Falta el ID de la interacción.");
      await request<LeadRow>(ids.interacciones, "PATCH", `${claim.rowId}/?user_field_names=true`, {
        RESPUESTAS_ESTUDIO: JSON.stringify({ ...claim, rowId: undefined }),
      });
    },
    async linkClaim(claim: StudyClaim, leadId: number): Promise<void> {
      if (!claim.rowId) throw new Error("Falta el ID de la interacción.");
      await request<LeadRow>(ids.interacciones, "PATCH", `${claim.rowId}/?user_field_names=true`, { LEAD: [leadId] });
    },
    async findLead(email: string): Promise<LeadRow | null> {
      return findOne(ids.leads, ids.emailField, email);
    },
    async createLead(fields: Record<string, unknown>): Promise<LeadRow> {
      try {
        return await request<LeadRow>(ids.leads, "POST", "?user_field_names=true", fields);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("HTTP 400")) throw error;
        const existing = await this.findLead(String(fields.EMAIL));
        if (!existing) throw error;
        return existing;
      }
    },
    async updateLead(id: number, fields: Record<string, unknown>): Promise<LeadRow> {
      return request<LeadRow>(ids.leads, "PATCH", `${id}/?user_field_names=true`, fields);
    },
  };
}
