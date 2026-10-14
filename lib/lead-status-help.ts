import type { LeadStatus } from "./types";

export const leadStatusHelp: Record<LeadStatus, string> = {
  NUEVO: "Registro que todavía espera su primer contacto. Si viene de un formulario, esperamos 30 minutos para que complete el estudio.",
  CONTACTADO: "Se confirmó el primer WhatsApp de un lead que estaba como Nuevo. Un lead con estudio conserva su estado de estudio al enviarle un mensaje.",
  EN_CONVERSACION: "Se marcó Respondió. La secuencia se pausa y el asesor debe definir el siguiente paso.",
  SEGUIMIENTO: "Estado comercial para continuar el contacto. La fecha y la próxima acción indican cuándo y cómo hacerlo; cambiar este estado por sí solo no reprograma la secuencia.",
  ESTUDIO_GRATUITO: "Completó el estudio gratuito. Puede tener mensajes enviados y seguimientos futuros sin salir de este estado.",
  ESTUDIO_PERSONALIZADO: "Lead que se está atendiendo mediante el servicio de estudio personalizado. Revisa su próxima acción y fecha.",
  INTERESADO: "Expresó interés en continuar. El asesor debe acordar y programar el siguiente paso.",
  CLIENTE: "Venta realizada. Sale de los pendientes comerciales.",
  NO_APTO: "No se continuará el proceso. Se detienen WhatsApp y todos los correos comerciales del contacto.",
  INACTIVO: "Se decidió dejar de contactar al lead. Se detienen WhatsApp y todos los correos comerciales del contacto.",
};
