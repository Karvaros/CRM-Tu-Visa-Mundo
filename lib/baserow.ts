import type { CrmData, Interaction, Lead, Message, MessageSegment } from "./types";

export type BaserowTables = { leads: number; interacciones: number; mensajes: number };
const defaultBaseUrl = "https://api.baserow.io";
type Row = Record<string, unknown> & { id: number };
type Page = { results: Row[]; next: string | null };
type Request = typeof fetch;

function value(row: Row, key: string): string {
  const item = row[key];
  return typeof item === "string" ? item : item == null ? "" : String(item);
}
function optional(row: Row, key: string): string | undefined {
  return value(row, key) || undefined;
}
function linkedId(row: Row, key: string): string | undefined {
  const item = row[key];
  if (!Array.isArray(item)) return undefined;
  const first = item[0];
  return first && typeof first === "object" && "id" in first
    ? String(first.id)
    : undefined;
}
function boolean(row: Row, key: string): boolean {
  return row[key] === true;
}
function number(row: Row, key: string): number {
  const result = Number(row[key]);
  return Number.isFinite(result) ? result : 0;
}
function segments(raw: string): MessageSegment[] {
  return raw.split(",").map((part) => part.trim()).filter(Boolean) as MessageSegment[];
}

export function mapLead(row: Row): Lead {
  return {
    id: String(row.id), version: number(row, "VERSION"), nombre: value(row, "NOMBRE"),
    apellido: optional(row, "APELLIDO"), email: optional(row, "EMAIL"),
    whatsapp: value(row, "WHATSAPP"), destino: value(row, "DESTINO"),
    tipoVisa: value(row, "TIPO_VISA"), origen: value(row, "ORIGEN"),
    segmento: value(row, "SEGMENTO") as Lead["segmento"],
    tipoEstudio: value(row, "TIPO_ESTUDIO") as Lead["tipoEstudio"],
    perfilEstudio: optional(row, "PERFIL_ESTUDIO") as Lead["perfilEstudio"],
    primerEstudioId: optional(row, "PRIMER_ESTUDIO_ID"),
    fechaPrimerEstudio: optional(row, "FECHA_PRIMER_ESTUDIO"),
    secuenciaId: value(row, "SECUENCIA_ID"), fechaIngreso: value(row, "FECHA_INGRESO"),
    estado: value(row, "ESTADO") as Lead["estado"],
    ultimoContacto: optional(row, "ULTIMO_CONTACTO"),
    ultimoMensajeId: linkedId(row, "ULTIMO_MENSAJE"),
    proximoContacto: optional(row, "PROXIMO_CONTACTO"),
    proximaAccion: value(row, "PROXIMA_ACCION"),
    proximoMensajeId: linkedId(row, "PROXIMO_MENSAJE"),
    seguimientoManual: boolean(row, "SEGUIMIENTO_MANUAL"),
    secuenciaPausada: boolean(row, "SECUENCIA_PAUSADA"),
    asesor: optional(row, "ASESOR"), notas: optional(row, "NOTAS"),
  };
}

export function mapMessage(row: Row): Message {
  return {
    id: String(row.id), secuenciaId: value(row, "SECUENCIA_ID"),
    segmento: segments(value(row, "SEGMENTOS")), destino: value(row, "DESTINO"),
    orden: number(row, "ORDEN"), diaSecuencia: number(row, "DIA_SECUENCIA"),
    titulo: value(row, "TITULO"), texto: value(row, "TEXTO"),
    recursoTipo: value(row, "RECURSO_TIPO") as Message["recursoTipo"],
    recursoUrl: optional(row, "RECURSO_URL"),
    soloDiasHabiles: boolean(row, "SOLO_DIAS_HABILES"), borrador: boolean(row, "BORRADOR"),
    requiereRevision: boolean(row, "REQUIERE_REVISION"),
    observaciones: value(row, "OBSERVACIONES").split("\n").filter(Boolean),
  };
}

export function mapInteraction(row: Row): Interaction {
  return {
    id: String(row.id), leadId: linkedId(row, "LEAD") ?? "",
    tipo: value(row, "TIPO") as Interaction["tipo"], fecha: value(row, "FECHA"),
    detalle: value(row, "DETALLE"), mensajeId: linkedId(row, "MENSAJE"),
    mensajeTexto: optional(row, "MENSAJE_TEXTO"), asesor: optional(row, "ASESOR"),
    eventoExternoId: optional(row, "ID_EVENTO_EXTERNO"),
  };
}

/** Server-only read boundary. Never expose this response through an unauthenticated route. */
export function createBaserowReader(options: {
  token: string;
  tables: BaserowTables;
  fetcher?: Request;
  baseUrl?: string;
}) {
  const { token, tables, fetcher = fetch, baseUrl = defaultBaseUrl } = options;
  if (!token) throw new Error("Falta BASEROW_TOKEN en el servidor.");
  const origin = new URL(baseUrl);

  async function list(tableId: number): Promise<Row[]> {
    const rows: Row[] = [];
    let next: string | null = `${origin.origin}/api/database/rows/table/${tableId}/?user_field_names=true&size=200`;
    while (next) {
      const url: URL = new URL(next);
      if (url.origin !== origin.origin || !url.pathname.startsWith(`/api/database/rows/table/${tableId}/`)) {
        throw new Error("Baserow devolvió una página de continuación inválida.");
      }
      const response: Response = await fetcher(url, {
        headers: { Authorization: `Token ${token}` }, cache: "no-store",
      });
      if (!response.ok) throw new Error(`No se pudo leer Baserow (HTTP ${response.status}).`);
      const page = (await response.json()) as Page;
      if (!Array.isArray(page.results) || (page.next !== null && typeof page.next !== "string")) {
        throw new Error("Baserow devolvió una página inválida.");
      }
      rows.push(...page.results);
      next = page.next;
    }
    return rows;
  }

  return {
    async load(): Promise<CrmData> {
      const [leads, interacciones, mensajes] = await Promise.all([
        list(tables.leads), list(tables.interacciones), list(tables.mensajes),
      ]);
      return {
        leads: leads.map(mapLead), interacciones: interacciones.map(mapInteraction),
        mensajes: mensajes.map(mapMessage),
      };
    },
  };
}
