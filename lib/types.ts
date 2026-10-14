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
export type LeadPriority =
  | "PENDIENTE_DEFINIR"
  | "NUEVO"
  | "ATRASADO"
  | "HOY"
  | "MANUAL";
export const messageSegments = [
  "SIN_ESTUDIO",
  "ESTUDIO_A",
  "ESTUDIO_B",
  "ESTUDIO_C",
  "ESTUDIO_D",
] as const;
export type MessageSegment = (typeof messageSegments)[number];
export type StudyType = "NINGUNO" | "GRATUITO" | "PAGO";
export type StudyProfile = "A" | "B" | "C" | "D";
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
  primerEstudioId?: string;
  fechaPrimerEstudio?: string;
  secuenciaId: string;
  fechaIngreso: string;
  estado: LeadStatus;
  ultimoContacto?: string;
  ultimoMensajeId?: string;
  proximoContacto?: string;
  /** Hora exacta de espera para registros nuevos de formularios externos. */
  proximoContactoExacto?: string;
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
export type LeadOperationalSnapshot = Pick<
  Lead,
  | "estado"
  | "ultimoContacto"
  | "ultimoMensajeId"
  | "proximoContacto"
  | "proximoContactoExacto"
  | "proximaAccion"
  | "proximoMensajeId"
  | "seguimientoManual"
  | "secuenciaPausada"
  | "secuenciaId"
  | "segmento"
  | "tipoEstudio"
  | "perfilEstudio"
  | "primerEstudioId"
  | "fechaPrimerEstudio"
  | "notas"
>;
export interface Interaction {
  id: string;
  leadId: string;
  tipo:
    | "ENVIADO"
    | "RESPONDIO"
    | "REPROGRAMADO"
    | "ESTADO"
    | "SIGUIENTE_PASO"
    | "ACCION_DESHECHA"
    | "SEGUIMIENTO_RESTAURADO"
    | "ESTUDIO_CLASIFICADO"
    | "ESTUDIO_REPETIDO";
  fecha: string;
  detalle: string;
  mensajeId?: string;
  mensajeTexto?: string;
  asesor?: string;
  eventoExternoId?: string;
  undoSnapshot?: LeadOperationalSnapshot;
  undoLabel?: string;
  undoneInteractionId?: string;
  estudio?: {
    id: string;
    answers: import("./study").StudyAnswers;
    perfil: "A" | "B" | "C" | "D" | "PENDIENTE";
    createdAt: string;
    motivo: string;
    sugerencia?: "C";
    estadoSincronizacion: string;
    revision?: { motivo: string; asesor: string; fecha: string };
  };
}
export interface StudyClassification {
  leadId: string;
  estudioId: string;
  eventoExternoId: string;
  perfil: StudyProfile;
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
  | {
      type: "nextStep";
      step: "MANUAL" | "ESTUDIO" | "ASESORIA" | "INFORMACION";
    }
  | { type: "status"; estado: LeadStatus }
  | { type: "note"; texto: string }
  | { type: "undo"; interactionId: string }
);
