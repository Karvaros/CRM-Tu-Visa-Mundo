export const leadStatuses = [
  "NUEVO",
  "CONTACTADO",
  "EN_CONVERSACION",
  "SEGUIMIENTO",
  "ESTUDIO_GRATUITO",
  "ESTUDIO_PERSONALIZADO",
  "INTERESADO",
  "CLIENTE",
  "NO_APTO",
  "INACTIVO",
] as const;
export type LeadStatus = (typeof leadStatuses)[number];
export type LeadPriority = "NUEVO" | "ATRASADO" | "HOY" | "MANUAL";
export interface Lead {
  id: string;
  version: number;
  nombre: string;
  apellido?: string;
  whatsapp: string;
  email?: string;
  destino: string;
  tipoVisa: string;
  origen: string;
  fechaIngreso: string;
  estado: LeadStatus;
  ultimoContacto?: string;
  ultimoMensajeId?: string;
  proximoContacto?: string;
  proximaAccion: string;
  proximoMensajeId?: string;
  seguimientoManual: boolean;
  secuenciaPausada: boolean;
  asesor?: string;
  notas?: string;
}
export interface Message {
  id: string;
  titulo: string;
  texto: string;
  siguienteId: string | null;
  diasHastaSiguiente: number;
  soloDiasHabiles: boolean;
  borrador: boolean;
}
export interface Interaction {
  id: string;
  leadId: string;
  tipo: "ENVIADO" | "RESPONDIO" | "REPROGRAMADO" | "ESTADO";
  fecha: string;
  detalle: string;
  mensajeId?: string;
  mensajeTexto?: string;
  asesor?: string;
}
export interface CrmData {
  leads: Lead[];
  mensajes: Message[];
  interacciones: Interaction[];
}
export type LeadCommand = { leadId: string; version: number } & (
  | { type: "sent"; mensajeId: string; mensajeTexto: string }
  | { type: "replied" }
  | { type: "reschedule"; fecha: string; accion: string }
  | { type: "status"; estado: LeadStatus }
);
