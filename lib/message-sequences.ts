import type { CrmData, Lead, Message, StudyProfile } from "./types";

export function studySequenceForDestination(destination: string): string | undefined {
  const key = destination.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  const slugs: Record<string, string> = {
    canada: "canada",
    australia: "australia",
    eeuu: "eeuu",
    estadosunidos: "eeuu",
    usa: "eeuu",
    uk: "uk",
    reinounido: "uk",
  };
  return slugs[key] ? `estudio-${slugs[key]}` : undefined;
}

/** Only confirmed sends count. Opening WhatsApp, copying, or email do not. */
export function confirmedWhatsAppMessageIds(data: CrmData, lead: Lead): string[] {
  const undone = new Set(data.interacciones.map((item) => item.undoneInteractionId).filter(Boolean));
  const ids = data.interacciones.filter((item) => item.leadId === lead.id &&
    item.tipo === "ENVIADO" && !undone.has(item.id)).flatMap((item) => item.mensajeId ? [item.mensajeId] : []);
  if (lead.ultimoContacto && lead.ultimoMensajeId) ids.push(lead.ultimoMensajeId);
  return [...new Set(ids)];
}

export function firstStudyMessage(messages: Message[], destination: string, profile: StudyProfile | "PENDIENTE",
  sentMessageIds: readonly string[] = []) {
  if (profile === "D" || profile === "PENDIENTE") return undefined;
  const sequence = studySequenceForDestination(destination);
  if (!sequence) return undefined;
  // Reuse the editable country introduction. Keep the LEAD in the study sequence
  // so confirming this send schedules its result, not a reminder to take the study.
  if (!sentMessageIds.length) {
    return messages.find((message) => message.secuenciaId === `sin-${sequence}` &&
      message.orden === 1 && message.diaSecuencia === 0);
  }
  const sent = messages.filter((message) => sentMessageIds.includes(message.id));
  const lastOrder = Math.max(1, ...sent.filter((message) => message.secuenciaId === sequence).map((message) => message.orden));
  const testimonialsSent = sent.some((message) => message.secuenciaId === `sin-${sequence}` && message.orden === 4);
  return messages.filter((message) => message.secuenciaId === sequence &&
    message.orden > lastOrder && message.segmento.includes(`ESTUDIO_${profile}`) &&
    !(testimonialsSent && message.orden === 3)).sort((a, b) => a.orden - b.orden)[0];
}

/** Repair only untouched automatic follow-up or the old unassigned study placeholder. */
export function initialStudyContactRepairs(data: CrmData) {
  return data.leads.flatMap((lead) => {
    if (lead.tipoEstudio !== "GRATUITO" || !lead.perfilEstudio ||
      !["A", "B", "C"].includes(lead.perfilEstudio) || !["ESTUDIO_GRATUITO", "NUEVO"].includes(lead.estado) ||
      confirmedWhatsAppMessageIds(data, lead).length) return [];
    const oldPlaceholder = lead.seguimientoManual && lead.secuenciaPausada && !lead.proximoMensajeId &&
      lead.proximaAccion === "Revisar estudio y continuar desde el último WhatsApp enviado";
    const pending = data.mensajes.find((message) => message.id === lead.proximoMensajeId);
    const sequence = studySequenceForDestination(lead.destino);
    const automaticResult = !lead.seguimientoManual && !lead.secuenciaPausada &&
      pending?.secuenciaId === sequence && pending?.orden === 2;
    if (!oldPlaceholder && !automaticResult) return [];
    // A reschedule, reply or chosen next step is an advisor decision, not this bug.
    if (data.interacciones.some((item) => item.leadId === lead.id &&
      ["RESPONDIO", "REPROGRAMADO", "SIGUIENTE_PASO", "ESTADO"].includes(item.tipo))) return [];
    const message = firstStudyMessage(data.mensajes, lead.destino, lead.perfilEstudio);
    return message && !message.requiereRevision && sequence ? [{ lead, message, sequence }] : [];
  });
}
