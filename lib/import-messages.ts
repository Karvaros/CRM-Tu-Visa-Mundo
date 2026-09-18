import messages from "../data/mensajes.json";
import type { Message } from "./types";

type SourceMessage = Omit<Message, "observaciones"> & { observaciones: string[] };

export function missingMessageRows(existing: Message[]) {
  const keys = new Set(existing.map((message) =>
    `${message.secuenciaId}|${message.orden}|${message.segmento.join(",")}|${message.destino}`));
  return (messages as SourceMessage[])
    .filter((message) => !keys.has(`${message.secuenciaId}|${message.orden}|${message.segmento.join(",")}|${message.destino}`))
    .map((message) => ({
      TITULO: message.titulo, TEXTO: message.texto,
      SECUENCIA_ID: message.secuenciaId, SEGMENTOS: message.segmento.join(", "),
      DESTINO: message.destino, ORDEN: message.orden, DIA_SECUENCIA: message.diaSecuencia,
      RECURSO_TIPO: message.recursoTipo, RECURSO_URL: message.recursoUrl ?? null,
      SOLO_DIAS_HABILES: message.soloDiasHabiles, BORRADOR: message.borrador,
      REQUIERE_REVISION: message.requiereRevision,
      OBSERVACIONES: message.observaciones.join("\n"),
    }));
}
