import { addDays, today, validDate } from "./dates";
import {
  leadStatuses,
  type CrmData,
  type Lead,
  type LeadCommand,
  type LeadPriority,
  type Message,
  type StudyClassification,
} from "./types";

export const isClosed = (lead: Lead) =>
  ["CLIENTE", "NO_APTO", "INACTIVO"].includes(lead.estado);
export function priority(lead: Lead, date: string, now = new Date()): LeadPriority | null {
  if (isClosed(lead) || !lead.proximoContacto || lead.proximoContacto > date)
    return null;
  if (lead.estado === "NUEVO" && lead.proximoContactoExacto &&
    new Date(lead.proximoContactoExacto).getTime() > now.getTime()) return null;
  if (lead.seguimientoManual) return "MANUAL";
  if (lead.secuenciaPausada) return null;
  if (lead.estado === "NUEVO") return "NUEVO";
  return lead.proximoContacto < date ? "ATRASADO" : "HOY";
}
export function renderMessage(
  message: Message | undefined,
  _lead: Lead,
): string {
  return message?.texto ?? "";
}
function nextMessage(data: CrmData, lead: Lead, current: Message) {
  const sourceSequence = lead.secuenciaId.startsWith("estudio-")
    ? `sin-${lead.secuenciaId}` : "";
  const testimonialAlreadySent = data.interacciones.some((interaction) => {
    if (interaction.leadId !== lead.id || interaction.tipo !== "ENVIADO" || !interaction.mensajeId) return false;
    const sent = data.mensajes.find((item) => item.id === interaction.mensajeId);
    return sent?.secuenciaId === sourceSequence && sent.orden === 4;
  });
  return data.mensajes
    .filter(
      (item) =>
        item.secuenciaId === lead.secuenciaId &&
        item.orden > current.orden &&
        item.segmento.includes(lead.segmento) &&
        !(sourceSequence && item.orden === 3 && testimonialAlreadySent),
    )
    .sort((a, b) => a.orden - b.orden)[0];
}
export function applyCommand(
  data: CrmData,
  command: LeadCommand,
  now: Date,
  id: string,
): CrmData {
  const result = structuredClone(data);
  const lead = result.leads.find((item) => item.id === command.leadId);
  if (!lead) throw new Error("El lead no existe.");
  if (lead.version !== command.version)
    throw new Error(
      "El lead cambió. Revisa la ficha antes de volver a guardar.",
    );
  const date = today(now);
  let detalle = "";
  let tipo: CrmData["interacciones"][number]["tipo"];
  let message: Message | undefined;
  if (command.type === "sent") {
    if (!priority(lead, date, now))
      throw new Error("Este lead no tiene un envío pendiente para hoy.");
    message = result.mensajes.find((item) => item.id === lead.proximoMensajeId);
    if (
      !message ||
      message.id !== command.mensajeId ||
      renderMessage(message, lead) !== command.mensajeTexto
    )
      throw new Error(
        "El mensaje cambió o no está disponible. Revisa el texto.",
      );
    if (message.requiereRevision)
      throw new Error("Completa la revisión del mensaje antes de enviarlo.");
    lead.ultimoContacto = now.toISOString();
    lead.ultimoMensajeId = message.id;
    if (lead.estado === "NUEVO") lead.estado = "CONTACTADO";
    const next =
      !lead.secuenciaPausada && !lead.seguimientoManual
        ? nextMessage(result, lead, message)
        : undefined;
    lead.proximoMensajeId = next?.id;
    lead.proximoContacto = next
      ? addDays(
          date,
          next.diaSecuencia - message.diaSecuencia,
          next.soloDiasHabiles,
        )
      : undefined;
    lead.proximoContactoExacto = undefined;
    lead.proximaAccion = next
      ? next.titulo
      : "Esperar respuesta; evaluar próxima acción";
    lead.seguimientoManual = false;
    tipo = "ENVIADO";
    detalle = `Envío confirmado: ${message.titulo}`;
  } else if (command.type === "replied") {
    if (isClosed(lead))
      throw new Error("Reabre el lead antes de registrar una respuesta.");
    lead.estado = "EN_CONVERSACION";
    lead.secuenciaPausada = true;
    lead.seguimientoManual = true;
    lead.proximoContacto = date;
    lead.proximoMensajeId = undefined;
    lead.proximaAccion = "Revisar respuesta y acordar el próximo paso";
    tipo = "RESPONDIO";
    detalle = "Respondió. Secuencia pausada; requiere atención manual.";
  } else if (command.type === "reschedule") {
    if (isClosed(lead))
      throw new Error("Reabre el lead antes de reprogramarlo.");
    if (!validDate(command.fecha) || command.fecha < date)
      throw new Error("Selecciona hoy o una fecha futura.");
    if (!command.accion.trim()) throw new Error("Escribe la próxima acción.");
    lead.proximoContacto = command.fecha;
    lead.proximaAccion = command.accion.trim();
    lead.seguimientoManual = true;
    tipo = "REPROGRAMADO";
    detalle = `${command.fecha}: ${lead.proximaAccion}`;
  } else {
    if (!leadStatuses.includes(command.estado))
      throw new Error("Estado inválido.");
    detalle = `${lead.estado} → ${command.estado}`;
    tipo = "ESTADO";
    lead.estado = command.estado;
    if (isClosed(lead)) {
      lead.secuenciaPausada = true;
      lead.proximoContacto = undefined;
      lead.proximoMensajeId = undefined;
      lead.seguimientoManual = false;
      lead.proximaAccion =
        command.estado === "CLIENTE" ? "Venta realizada" : "Lead cerrado";
    }
  }
  lead.version++;
  result.interacciones.unshift({
    id,
    leadId: lead.id,
    tipo,
    fecha: now.toISOString(),
    detalle,
    asesor: lead.asesor,
    ...(command.type === "sent"
      ? { mensajeId: message!.id, mensajeTexto: command.mensajeTexto }
      : {}),
  });
  return result;
}

/** Conserva la primera clasificación, incluso si ActiveCampaign dispara otra ruta. */
export function applyStudyClassification(
  data: CrmData,
  event: StudyClassification,
  now: Date,
  interactionId: string,
): CrmData {
  if (!event.estudioId.trim() || !event.eventoExternoId.trim())
    throw new Error("El estudio y el evento externo deben tener identificador.");
  if (!["A", "B", "C", "D"].includes(event.perfil))
    throw new Error("Clasificación de estudio inválida.");
  if (data.interacciones.some((item) => item.eventoExternoId === event.eventoExternoId))
    return data;

  const result = structuredClone(data);
  const lead = result.leads.find((item) => item.id === event.leadId);
  if (!lead) throw new Error("El lead no existe.");
  const repeated = Boolean(lead.primerEstudioId || lead.perfilEstudio);
  if (!repeated) {
    lead.primerEstudioId = event.estudioId;
    lead.fechaPrimerEstudio = now.toISOString();
    lead.tipoEstudio = "GRATUITO";
    lead.perfilEstudio = event.perfil;
    lead.segmento = `ESTUDIO_${event.perfil}`;
    lead.secuenciaPausada = true;
    lead.proximoMensajeId = undefined;
    if (event.perfil === "D") {
      lead.estado = "NO_APTO";
      lead.secuenciaId = "";
      lead.proximoContacto = undefined;
      lead.seguimientoManual = false;
      lead.proximaAccion = "Perfil D: sin seguimiento comercial";
    } else {
      // La continuidad por hitos se activará cuando exista el adaptador real.
      lead.proximoContacto = today(now);
      lead.seguimientoManual = true;
      lead.proximaAccion = "Revisar estudio y continuar desde el último WhatsApp enviado";
    }
    lead.version++;
  }
  result.interacciones.unshift({
    id: interactionId,
    leadId: lead.id,
    tipo: repeated ? "ESTUDIO_REPETIDO" : "ESTUDIO_CLASIFICADO",
    fecha: now.toISOString(),
    detalle: repeated
      ? `Estudio repetido ${event.estudioId}; se conserva el primer perfil ${lead.perfilEstudio}`
      : `Primer estudio ${event.estudioId}: perfil ${event.perfil}`,
    eventoExternoId: event.eventoExternoId,
  });
  return result;
}
