import type { CrmData } from "./types";
import { validateMessageEdit, type MessageEdit } from "./message-edit";

export function createBaserowMessageWriter(options: {
  token: string;
  table: number;
  load: () => Promise<CrmData>;
  fetcher?: typeof fetch;
  baseUrl?: string;
}) {
  const { token, table, load, fetcher = fetch, baseUrl = "https://api.baserow.io" } = options;
  if (!token) throw new Error("Falta BASEROW_TOKEN en el servidor.");
  return {
    async save(edit: MessageEdit): Promise<CrmData> {
      const before = await load();
      const current = before.mensajes.find((item) => item.id === edit.id);
      if (!current) throw new Error("El mensaje no existe.");
      const message = { ...current, ...edit };
      validateMessageEdit(message);
      const response = await fetcher(
        `${new URL(baseUrl).origin}/api/database/rows/table/${table}/${Number(edit.id)}/?user_field_names=true`,
        {
          method: "PATCH",
          headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            TITULO: message.titulo,
            TEXTO: message.texto,
            DIA_SECUENCIA: message.diaSecuencia,
            RECURSO_URL: message.recursoUrl || null,
            SOLO_DIAS_HABILES: message.soloDiasHabiles,
            REQUIERE_REVISION: message.requiereRevision,
            OBSERVACIONES: message.observaciones.join("\n"),
          }),
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error(`No se pudo guardar el mensaje en Baserow (HTTP ${response.status}).`);
      return load();
    },
  };
}

