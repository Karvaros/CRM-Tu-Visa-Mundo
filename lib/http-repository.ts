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
    async saveMessage() {
      throw new Error("La edición de mensajes estará disponible cuando se carguen en Baserow.");
    },
    async reset() {
      throw new Error("Los datos reales no se pueden restablecer desde el CRM.");
    },
  };
}

