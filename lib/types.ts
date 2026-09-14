export type LeadStatus =
  | 'NUEVO'
  | 'CONTACTADO'
  | 'EN_CONVERSACION'
  | 'SEGUIMIENTO'
  | 'ESTUDIO_GRATUITO'
  | 'ESTUDIO_PERSONALIZADO'
  | 'INTERESADO'
  | 'CLIENTE'
  | 'NO_APTO'
  | 'INACTIVO';

export type LeadPriority = 'NUEVO' | 'ATRASADO' | 'HOY' | 'MANUAL';

export interface Lead {
  id: string;
  nombre: string;
  apellido?: string;
  whatsapp: string;
  email?: string;
  destino: string;
  tipoVisa: string;
  origen: string;
  fechaIngreso: string;
  estado: LeadStatus;
  prioridad: LeadPriority;
  ultimoContacto?: string;
  proximoContacto: string;
  proximaAccion: string;
  mensajeNumero?: number;
  mensajeTexto: string;
  conversacionActiva?: boolean;
  asesor?: string;
  notas?: string;
}
