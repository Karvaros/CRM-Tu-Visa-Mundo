import type { CrmData, LeadCommand, Message } from "./types";

/** UI boundary. Future HTTP adapter calls authenticated server routes; Baserow tokens stay server-side. */
export interface CrmRepository {
  load(): Promise<CrmData>;
  execute(command: LeadCommand): Promise<CrmData>;
  saveMessage(message: Message): Promise<CrmData>;
  reset(): Promise<CrmData>;
}
