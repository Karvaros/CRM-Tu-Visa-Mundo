import type { CrmRepository } from "./repository";
import type { CrmData } from "./types";

async function responseData(response: Response): Promise<CrmData> {
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "No se pudo conectar con el CRM.");
  if (!Array.isArray(result.leads) || !Array.isArray(result.mensajes) || !Array.isArray(result.interacciones)) {
    throw new Error("Baserow devolvió datos incompletos.");
  }
  return result as CrmData;
}

export function createHttpRepository(): CrmRepository {
  return {
    load: () => fetch("/api/crm", { cache: "no-store" }).then(responseData),
    execute: (command) => fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(command),
    }).then(responseData),
    saveMessage: (message) => fetch("/api/crm/messages/edit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: message.id,
        titulo: message.titulo,
        texto: message.texto,
        diaSecuencia: message.diaSecuencia,
        recursoUrl: message.recursoUrl,
        soloDiasHabiles: message.soloDiasHabiles,
        requiereRevision: message.requiereRevision,
        observaciones: message.observaciones,
      }),
    }).then(responseData),
    async reset() {
      throw new Error("Los datos reales no se pueden restablecer desde el CRM.");
    },
  };
}


