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
export const messageSegments = [
  "SIN_ESTUDIO",
  "ESTUDIO_A",
  "ESTUDIO_B",
  "ESTUDIO_C",
] as const;
export type MessageSegment = (typeof messageSegments)[number];
export type StudyType = "NINGUNO" | "GRATUITO" | "PAGO";
export type StudyProfile = "A" | "B" | "C";
export type ResourceType =
  "TEXTO" | "WEB" | "YOUTUBE" | "REEL" | "IMAGEN" | "ARTICULO";
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
  segmento: MessageSegment;
  tipoEstudio: StudyType;
  perfilEstudio?: StudyProfile;
  secuenciaId: string;
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
  secuenciaId: string;
  segmento: MessageSegment[];
  destino: string;
  orden: number;
  diaSecuencia: number;
  titulo: string;
  texto: string;
  recursoTipo: ResourceType;
  recursoUrl?: string;
  soloDiasHabiles: boolean;
  borrador: boolean;
  requiereRevision: boolean;
  observaciones: string[];
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
