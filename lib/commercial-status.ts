import { leadStatuses, type CommercialLeadStatus, type CrmData, type Lead, type LeadStatus } from "./types";

export function isStudyStatus(status: string): boolean {
  return status === "ESTUDIO_GRATUITO" || status === "ESTUDIO_PERSONALIZADO";
}

export function stateAfterStudy(current: LeadStatus | undefined, contacted: boolean): CommercialLeadStatus {
  if (!current || current === "NUEVO" || isStudyStatus(current)) return contacted ? "CONTACTADO" : "NUEVO";
  return current as CommercialLeadStatus;
}

export function hasConfirmedContact(data: Pick<CrmData, "interacciones">, lead: Lead): boolean {
  const undone = new Set(data.interacciones.map((item) => item.undoneInteractionId).filter(Boolean));
  return Boolean(lead.ultimoContacto) || data.interacciones.some((item) =>
    item.leadId === lead.id && item.tipo === "ENVIADO" && !undone.has(item.id));
}

/** Reconcile only obsolete study states and old automatic-follow-up states. */
export function statusReconciliation(data: Pick<CrmData, "interacciones">, lead: Lead): CommercialLeadStatus | undefined {
  if (!isStudyStatus(lead.estado) && lead.estado !== "NUEVO" && lead.estado !== "SEGUIMIENTO") return undefined;
  const undone = new Set(data.interacciones.map((item) => item.undoneInteractionId).filter(Boolean));
  const history = data.interacciones.filter((item) => item.leadId === lead.id && !undone.has(item.id))
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || Number(b.id) - Number(a.id));
  let decision: CommercialLeadStatus | undefined;
  for (const item of history) {
    if (item.tipo === "RESPONDIO" || item.tipo === "SIGUIENTE_PASO") { decision = "EN_CONVERSACION"; break; }
    if (item.tipo === "REPROGRAMADO") { decision = "SEGUIMIENTO"; break; }
    if (item.tipo === "ESTADO") {
      const status = item.detalle.split("→").at(-1)?.trim();
      if ((leadStatuses as readonly string[]).includes(status ?? "")) { decision = status as CommercialLeadStatus; break; }
    }
  }
  // Deliberate current commercial decisions always prevail over migration guesses.
  if (lead.estado === "SEGUIMIENTO" && (lead.seguimientoManual || decision)) return undefined;
  if (lead.estado === "NUEVO" && decision === "NUEVO") return undefined;
  const proposed = decision ?? (hasConfirmedContact(data, lead) ? "CONTACTADO" : "NUEVO");
  return proposed !== lead.estado ? proposed : undefined;
}

export function matchesStudyFilter(lead: Lead, filter: string): boolean {
  return !filter || (lead.tipoEstudio || "NINGUNO") === filter;
}
