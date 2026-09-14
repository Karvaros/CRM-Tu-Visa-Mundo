import { addDays, today, validDate } from "./dates";
import {
  leadStatuses,
  type CrmData,
  type Lead,
  type LeadCommand,
  type LeadPriority,
  type Message,
} from "./types";

export const isClosed = (lead: Lead) =>
  ["CLIENTE", "NO_APTO", "INACTIVO"].includes(lead.estado);
export function priority(lead: Lead, date: string): LeadPriority | null {
  if (isClosed(lead) || !lead.proximoContacto || lead.proximoContacto > date)
    return null;
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
  return data.mensajes
    .filter(
      (item) =>
        item.secuenciaId === lead.secuenciaId &&
        item.orden > current.orden &&
        item.segmento.includes(lead.segmento),
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
    if (!priority(lead, date))
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
