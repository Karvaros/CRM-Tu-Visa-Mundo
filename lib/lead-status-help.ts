import type { CommercialLeadStatus } from "./types";

export const leadStatusHelp: Record<CommercialLeadStatus, string> = {
  NUEVO: "Registro que todavía espera su primer contacto. Si viene de un formulario, esperamos 30 minutos para que complete el estudio.",
  CONTACTADO: "Ya confirmamos al menos un WhatsApp y todavía esperamos su respuesta. Se aplica con o sin estudio de perfil; los siguientes mensajes automáticos mantienen este estado.",
  EN_CONVERSACION: "Se marcó Respondió. La secuencia se pausa y el asesor debe definir el siguiente paso.",
  SEGUIMIENTO: "El asesor reprogramó retomar el contacto con una fecha y una acción concreta. No se asigna por el simple hecho de tener otro mensaje automático pendiente.",
  INTERESADO: "Expresó interés en continuar. El asesor debe acordar y programar el siguiente paso.",
  CLIENTE: "Venta realizada. Sale de los pendientes comerciales.",
  NO_APTO: "No se continuará el proceso. Se detienen WhatsApp y todos los correos comerciales del contacto.",
  INACTIVO: "El asesor decidió dejar de contactar: por ejemplo, nunca responde o ya no desea continuar. Se detienen WhatsApp y todos los correos comerciales del contacto; no se asigna automáticamente por una demora en responder.",
};
