import "server-only";
import { applyCommand } from "./crm";
import { createActiveCampaignOptOut } from "./activecampaign-optout";
import { createConfiguredBaserowReader } from "./baserow-server";
import { baserowTables } from "./study-config";
import type { CrmData, Lead, LeadCommand } from "./types";

function rowId(value: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("Identificador inválido.");
  return id;
}

function leadPatch(lead: Lead): Record<string, unknown> {
  return {
    VERSION: lead.version,
    ESTADO: lead.estado,
    ULTIMO_CONTACTO: lead.ultimoContacto ?? null,
    ULTIMO_MENSAJE: lead.ultimoMensajeId ? [rowId(lead.ultimoMensajeId)] : [],
    PROXIMO_CONTACTO: lead.proximoContacto ? `${lead.proximoContacto}T15:00:00Z` : null,
    PROXIMO_MENSAJE: lead.proximoMensajeId ? [rowId(lead.proximoMensajeId)] : [],
    PROXIMA_ACCION: lead.proximaAccion,
    SEGUIMIENTO_MANUAL: lead.seguimientoManual,
    SECUENCIA_PAUSADA: lead.secuenciaPausada,
  };
}

export function createBaserowCrmWriter(options: {
  token: string;
  tables: { leads: number; interacciones: number };
  fetcher?: typeof fetch;
  baseUrl?: string;
  reader?: { load(): Promise<CrmData> };
  stopMarketing?: (email: string) => Promise<void>;
}) {
  const { token, tables, fetcher = fetch, baseUrl = "https://api.baserow.io",
    reader = createConfiguredBaserowReader(), stopMarketing } = options;
  if (!token) throw new Error("Falta BASEROW_TOKEN en el servidor.");
  const base = `${new URL(baseUrl).origin}/api/database/rows/table`;
  async function write(table: number, method: "PATCH" | "POST", id: number | null, body: object) {
    const response = await fetcher(`${base}/${table}/${id ? `${id}/` : ""}?user_field_names=true`, {
      method,
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`No se pudo guardar en Baserow (HTTP ${response.status}).`);
  }
  return {
    async execute(command: LeadCommand, advisor: string): Promise<CrmData> {
      const before = await reader.load();
      const after = applyCommand(before, command, new Date(), crypto.randomUUID());
      const lead = after.leads.find((item) => item.id === command.leadId)!;
      const interaction = after.interacciones[0];
      const optOut = command.type === "status" && ["NO_APTO", "INACTIVO"].includes(command.estado);
      if (optOut && lead.email) {
        if (!stopMarketing) throw new Error("No está configurada la detención de correos comerciales.");
        try {
          await stopMarketing(lead.email);
        } catch {
          throw new Error("No se pudieron detener los correos en ActiveCampaign. El estado no cambió; inténtalo de nuevo.");
        }
      }
      await write(tables.leads, "PATCH", rowId(lead.id), {
        ...leadPatch(lead), ...(optOut ? { AC_SYNC_STATUS: "OPTED_OUT" } : {}),
      });
      try {
        await write(tables.interacciones, "POST", null, {
          TIPO: interaction.tipo,
          LEAD: [rowId(lead.id)],
          FECHA: interaction.fecha,
          DETALLE: interaction.detalle,
          ASESOR: advisor,
          ORIGEN_SISTEMA: "CRM_V2",
          ...(interaction.mensajeId ? { MENSAJE: [rowId(interaction.mensajeId)] } : {}),
          ...(interaction.mensajeTexto ? { MENSAJE_TEXTO: interaction.mensajeTexto } : {}),
        });
      } catch {
        // The lead update is authoritative. The caller refreshes and sees its new version.
        throw new Error("El lead se actualizó, pero no se guardó su historial. Recarga antes de continuar y revisa Baserow.");
      }
      return reader.load();
    },
  };
}

export function createConfiguredBaserowCrmWriter() {
  return createBaserowCrmWriter({ token: process.env.BASEROW_TOKEN ?? "", tables: baserowTables(),
    stopMarketing: (email) => createActiveCampaignOptOut({
      apiUrl: process.env.ACTIVE_CAMPAIGN_API_URL ?? "",
      apiKey: process.env.ACTIVE_CAMPAIGN_API_KEY ?? "",
    }).stopMarketing(email),
  });
}

