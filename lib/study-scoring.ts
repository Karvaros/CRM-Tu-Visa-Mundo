import { studyOptions, type StudyAnswers, type StudyOutcome } from "./study";

// Only server-side submission code imports this module. The browser receives
// the questions and labels, never the rules used to assign a profile.
function outcome(perfil: "A" | "B" | "C" | "D", correo: string, motivo: string): StudyOutcome {
  return {
    perfil, correo, motivo,
    crm: perfil === "D"
      ? { segmento: "ESTUDIO_D", estado: "NO_APTO", accion: "Sin secuencia ni seguimiento comercial" }
      : { segmento: `ESTUDIO_${perfil}`, estado: "ESTUDIO_GRATUITO", accion: "Continuar WhatsApp desde el último hito confirmado" },
  };
}

function pending(motivo: string): StudyOutcome {
  return { perfil: "PENDIENTE", correo: null, motivo, crm: { segmento: null, estado: null, accion: "Revisar clasificación antes de enviar correo o WhatsApp" } };
}

export function classifyStudy(answers: StudyAnswers): StudyOutcome {
  for (const [key, choices] of Object.entries(studyOptions)) {
    if (!(choices as readonly string[]).includes(answers[key as keyof typeof studyOptions] ?? ""))
      return pending(`Falta una respuesta válida: ${key}.`);
  }
  const low =
    (answers.ocupacion === "Desempleado / Informal" && answers.solicitud === "Primera vez") ||
    answers.cumplimiento === "He estado en situación irregular o he sido deportado" ||
    answers.cumplimiento === "He permanecido en un país más del tiempo permitido" ||
    answers.pasaportes === "Ninguno tiene pasaporte vigente";
  if (low) return outcome("D", "PERFIL_BAJO", "Coincide con una condición de perfil Bajo.");
  if (answers.solicitud === "Renovación")
    return outcome("A", "PERFIL_ALTO_RENOVACION", "Renovación sin condición de perfil Bajo.");
  const strongTravel = answers.viajes === "Sí: EE.UU., Canadá, Europa, Australia o Asia";
  if (strongTravel && answers.visaAnterior === "Sí, de EEUU o Canadá o Australia")
    return outcome("A", "PERFIL_ALTO_PRIMERA_VEZ", "Primera solicitud con visa y viajes a destinos principales.");
  if (strongTravel && ["No he tenido visa", "Sí, de Reino Unido o China o India, etc."].includes(answers.visaAnterior ?? ""))
    return outcome("B", "PERFIL_MEDIO_ALTO", "Primera solicitud con viajes a destinos principales.");
  if (!strongTravel && answers.visaAnterior === "No he tenido visa")
    return outcome("C", "PERFIL_MEDIO", "Primera solicitud sin visa previa ni viajes a destinos principales.");
  return pending("Las automatizaciones actuales no definen este cruce de respuestas; requiere revisión.");
}
