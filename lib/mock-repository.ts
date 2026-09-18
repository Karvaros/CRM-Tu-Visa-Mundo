import { applyCommand } from "./crm";
import { today } from "./dates";
import { validateMessageEdit } from "./message-edit";
import { createMockData } from "./mock-data";
import type { CrmRepository } from "./repository";
import type { CrmData } from "./types";

const KEY = "tvm-crm-demo-v3";
/** Isolated per tab, survives reload. No process-global state on Vercel. */
export function createMockRepository(
  storage: Storage,
  clock = () => new Date(),
): CrmRepository {
  function read(): CrmData {
    const saved = storage.getItem(KEY);
    if (!saved) return persist(createMockData(today(clock())));
    try {
      const data = JSON.parse(saved) as CrmData;
      if (
        !Array.isArray(data.leads) ||
        !Array.isArray(data.mensajes) ||
        !Array.isArray(data.interacciones)
      )
        throw new Error();
      return data;
    } catch {
      throw new Error(
        "No se pudo leer la demostración guardada. Restablece los datos demo.",
      );
    }
  }
  function persist(data: CrmData): CrmData {
    storage.setItem(KEY, JSON.stringify(data));
    return data;
  }
  return {
    async load() {
      return read();
    },
    async execute(command) {
      return persist(
        applyCommand(read(), command, clock(), crypto.randomUUID()),
      );
    },
    async saveMessage(message) {
      const data = read();
      validateMessageEdit(message);
      if (!data.mensajes.some((item) => item.id === message.id))
        throw new Error("El mensaje no existe.");
      data.mensajes = data.mensajes.map((item) =>
        item.id === message.id ? { ...message, borrador: true } : item,
      );
      return persist(data);
    },
    async reset() {
      return persist(createMockData(today(clock())));
    },
  };
}

