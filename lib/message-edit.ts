import type { Message } from "./types";

/** Only these fields can change in the CRM. Sequence identity and audience stay fixed. */
export type MessageEdit = Pick<Message,
  "id" | "titulo" | "texto" | "diaSecuencia" | "recursoUrl" |
  "soloDiasHabiles" | "requiereRevision" | "observaciones">;

export function validMessageEdit(value: unknown): value is MessageEdit {
  if (!value || typeof value !== "object") return false;
  const edit = value as Record<string, unknown>;
  return typeof edit.id === "string" && /^[1-9]\d*$/.test(edit.id) && Number.isSafeInteger(Number(edit.id)) &&
    typeof edit.titulo === "string" && edit.titulo.length <= 120 &&
    typeof edit.texto === "string" && edit.texto.length <= 4000 &&
    Number.isSafeInteger(edit.diaSecuencia) && Number(edit.diaSecuencia) >= 0 && Number(edit.diaSecuencia) <= 365 &&
    (edit.recursoUrl === undefined || typeof edit.recursoUrl === "string" && edit.recursoUrl.length <= 2000) &&
    typeof edit.soloDiasHabiles === "boolean" &&
    typeof edit.requiereRevision === "boolean" &&
    Array.isArray(edit.observaciones) && edit.observaciones.length <= 20 &&
    edit.observaciones.every((note: unknown) => typeof note === "string" && note.length <= 500);
}

export function validateMessageEdit(message: Message) {
  if (!message.texto.trim() || !message.titulo.trim())
    throw new Error("El título y el texto son obligatorios.");
  if (/\{\{?nombre\}?\}/i.test(message.texto))
    throw new Error("Los mensajes de difusión no pueden incluir una variable de nombre.");
  if (!Number.isInteger(message.diaSecuencia) || message.diaSecuencia < 0 || message.diaSecuencia > 365)
    throw new Error("El día de secuencia debe estar entre 0 y 365.");
  if (message.recursoUrl) {
    try {
      const url = new URL(message.recursoUrl);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error();
    } catch {
      throw new Error("El enlace del recurso debe ser una dirección web válida.");
    }
  }
  if (!message.requiereRevision) {
    if (/\[link[^\]]*\]/i.test(message.texto))
      throw new Error("Reemplaza el marcador de enlace antes de aprobar.");
    if (message.recursoTipo !== "TEXTO" && !message.recursoUrl)
      throw new Error("Agrega el recurso antes de aprobar el mensaje.");
    if (["WEB", "YOUTUBE", "REEL", "ARTICULO"].includes(message.recursoTipo) &&
      !message.texto.includes(message.recursoUrl ?? ""))
      throw new Error("Incluye el enlace del recurso dentro del texto antes de aprobar.");
    if (message.observaciones.length)
      throw new Error("Resuelve o elimina las notas pendientes antes de aprobar el mensaje.");
  }
}

