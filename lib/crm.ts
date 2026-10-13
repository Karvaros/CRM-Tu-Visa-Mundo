import { addDays, today, validDate } from "./dates";
import {
  leadStatuses,
  type CrmData,
  type Interaction,
  type Lead,
  type LeadCommand,
  type LeadOperationalSnapshot,
  type LeadPriority,
  type Message,
  type StudyClassification,
} from "./types";

export const isClosed = (lead: Lead) =>
  ["CLIENTE", "NO_APTO", "INACTIVO"].includes(lead.estado);
export const PENDING_DEFINITION_ACTION =
  "Definir el siguiente paso de la conversación";

export function isPendingDefinition(lead: Lead): boolean {
  return (
    lead.estado === "EN_CONVERSACION" &&
    lead.secuenciaPausada &&
    lead.seguimientoManual &&
    lead.proximaAccion === PENDING_DEFINITION_ACTION
  );
}

export function priority(lead: Lead, date: string, now = new Date()): LeadPriority | null {
  if (isClosed(lead)) return null;
  if (isPendingDefinition(lead)) return "PENDIENTE_DEFINIR";
  if (!lead.proximoContacto || lead.proximoContacto > date) return null;
  if (lead.estado === "NUEVO" && lead.proximoContactoExacto &&
    new Date(lead.proximoContactoExacto).getTime() > now.getTime()) return null;
  if (lead.seguimientoManual) return "MANUAL";
  if (lead.secuenciaPausada) return null;
  if (lead.estado === "NUEVO") return "NUEVO";
  return lead.proximoContacto < date ? "ATRASADO" : "HOY";
}

export function matchesLeadFilter(
  lead: Lead,
  filter: string,
  date: string,
  now = new Date(),
): boolean {
  if (filter === "PENDIENTES_HOY") return priority(lead, date, now) !== null;
  return !filter || lead.estado === filter;
}

const snapshotFields = [
  "estado",
  "ultimoContacto",
  "ultimoMensajeId",
  "proximoContacto",
  "proximoContactoExacto",
  "proximaAccion",
  "proximoMensajeId",
  "seguimientoManual",
  "secuenciaPausada",
  "secuenciaId",
  "segmento",
  "tipoEstudio",
  "perfilEstudio",
  "primerEstudioId",
  "fechaPrimerEstudio",
] as const satisfies readonly (keyof LeadOperationalSnapshot)[];

export function leadOperationalSnapshot(lead: Lead): LeadOperationalSnapshot {
  return Object.fromEntries(
    snapshotFields.map((field) => [field, lead[field]]),
  ) as LeadOperationalSnapshot;
}

function restoreOperationalSnapshot(
  lead: Lead,
  snapshot: LeadOperationalSnapshot,
) {
  for (const field of snapshotFields) {
    (lead as unknown as Record<string, unknown>)[field] = snapshot[field];
  }
}

function interactionOrder(a: Interaction, b: Interaction) {
  const byDate = b.fecha.localeCompare(a.fecha);
  if (byDate) return byDate;
  return Number(b.id) - Number(a.id);
}

export function latestUndoableInteraction(
  data: Pick<CrmData, "interacciones">,
  leadId: string,
): Interaction | undefined {
  const undone = new Set(
    data.interacciones
      .filter((item) => item.undoneInteractionId)
      .map((item) => item.undoneInteractionId),
  );
  const ordered = data.interacciones
    .filter(
      (item) =>
        item.leadId === leadId &&
        !["ACCION_DESHECHA", "SEGUIMIENTO_RESTAURADO"].includes(item.tipo),
    )
    .sort(interactionOrder);
  for (const interaction of ordered) {
    if (interaction.undoSnapshot) {
      if (undone.has(interaction.id)) continue;
      return interaction;
    }
    return undefined;
  }
  return undefined;
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
  if (command.type === "undo") {
    const interaction = result.interacciones.find(
      (item) => item.id === command.interactionId,
    );
    if (
      !interaction ||
      interaction.leadId !== lead.id ||
      !interaction.undoSnapshot
    )
      throw new Error("La acción seleccionada no se puede deshacer.");
    if (latestUndoableInteraction(result, lead.id)?.id !== interaction.id)
      throw new Error("Solo se puede deshacer la última acción del lead.");
    restoreOperationalSnapshot(lead, interaction.undoSnapshot);
    lead.version++;
    const restoredMessage = lead.proximoMensajeId
      ? result.mensajes.find((item) => item.id === lead.proximoMensajeId)
      : undefined;
    result.interacciones.unshift(
      {
        id,
        leadId: lead.id,
        tipo: "ACCION_DESHECHA",
        fecha: now.toISOString(),
        detalle: `Acción deshecha: ${interaction.undoLabel ?? interaction.detalle}`,
        asesor: lead.asesor,
        undoneInteractionId: interaction.id,
      },
      {
        id: `${id}-restored`,
        leadId: lead.id,
        tipo: "SEGUIMIENTO_RESTAURADO",
        fecha: now.toISOString(),
        detalle: `Restaurado seguimiento: ${restoredMessage?.titulo ?? "sin mensaje pendiente"} / próxima fecha ${lead.proximoContacto ?? "sin fecha"} / estado ${lead.estado.replaceAll("_", " ")}`,
        asesor: lead.asesor,
      },
    );
    return result;
  }

  const before = leadOperationalSnapshot(lead);
  let detalle = "";
  let undoLabel: string | undefined;
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
    lead.proximoContacto = undefined;
    lead.proximoContactoExacto = undefined;
    lead.proximoMensajeId = undefined;
    lead.proximaAccion = PENDING_DEFINITION_ACTION;
    tipo = "RESPONDIO";
    detalle = "Respondió. Secuencia pausada; requiere atención manual.";
    undoLabel = "Marcado como Respondió";
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
    undoLabel = "Seguimiento reprogramado";
  } else if (command.type === "nextStep") {
    if (!isPendingDefinition(lead))
      throw new Error("Este lead ya tiene definido su siguiente paso.");
    const steps = {
      MANUAL: "Seguir conversación manualmente",
      ESTUDIO: "Enviar estudio de perfil",
      ASESORIA: "Ofrecer asesoría personalizada",
      INFORMACION: "Enviar información / precios",
    } as const;
    lead.proximoContacto = date;
    lead.proximaAccion = steps[command.step];
    lead.seguimientoManual = true;
    lead.secuenciaPausada = true;
    lead.proximoMensajeId = undefined;
    tipo = "SIGUIENTE_PASO";
    detalle = `Siguiente paso definido: ${lead.proximaAccion}`;
    undoLabel = detalle;
  } else {
    if (!leadStatuses.includes(command.estado))
      throw new Error("Estado inválido.");
    const wasPending = isPendingDefinition(lead);
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
    } else if (wasPending) {
      lead.proximoContacto = date;
      lead.proximoContactoExacto = undefined;
      lead.proximoMensajeId = undefined;
      lead.secuenciaPausada = true;
      lead.seguimientoManual = true;
      lead.proximaAccion =
        command.estado === "INTERESADO"
          ? "Acordar próximo paso comercial"
          : "Continuar conversación manualmente";
    }
    undoLabel = `Cambio de estado: ${detalle}`;
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
    ...(undoLabel ? { undoSnapshot: before, undoLabel } : {}),
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
