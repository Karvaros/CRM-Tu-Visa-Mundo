export const studyOptions = {
  destino: ["Canadá", "Estados Unidos", "Australia", "Reino Unido"],
  grupo: [
    "Solo yo (Aplicante individual)",
    "Mi pareja y yo",
    "Grupo Familiar (Pareja e hijos)",
    "Grupo de Amigos / Otros familiares (Primos, hermanos, etc.)",
  ],
  solicitud: ["Primera vez", "Renovación"],
  pasaportes: [
    "Todos tenemos pasaporte vigente",
    "Algunos tienen pasaporte, otros no",
    "Ninguno tiene pasaporte vigente",
  ],
  ocupacion: [
    "Empleado (Contrato laboral)",
    "Independiente / Dueño de Negocio (Registrado)",
    "Pensionado / Jubilado",
    "Estudiante (Dependiente económico)",
    "Desempleado / Informal",
  ],
  visaAnterior: [
    "Sí, de EEUU o Canadá o Australia",
    "Sí, de Reino Unido o China o India, etc.",
    "No he tenido visa",
  ],
  viajes: [
    "Sí: EE.UU., Canadá, Europa, Australia o Asia",
    "Sí: Solo países de Latinoamérica",
    "No: No ha salido del país",
  ],
  cumplimiento: [
    "He estado en situación irregular o he sido deportado",
    "He permanecido en un país más del tiempo permitido",
    "Ninguna de las anteriores",
  ],
  lazos: ["Sí, Ciudadanos o Residentes", "No tenemos familia allá"],
} as const;

export type StudyAnswers = Partial<Record<keyof typeof studyOptions, string>> & {
  nombre?: string;
  email?: string;
  telefono?: string;
};
export type StudyOutcome =
  | { perfil: "A" | "B" | "C" | "D"; correo: string; motivo: string; crm: { segmento: "ESTUDIO_A" | "ESTUDIO_B" | "ESTUDIO_C" | "ESTUDIO_D"; estado: "ESTUDIO_GRATUITO" | "NO_APTO"; accion: string } }
  | { perfil: "PENDIENTE"; correo: null; motivo: string; crm: { segmento: null; estado: null; accion: string } };

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

export const studyPages = [
  {
    title: "Tu viaje",
    subtitle: "Comencemos con tu destino y quiénes viajarán.",
    fields: [
      { key: "destino", label: "¿Para qué destino deseas tramitar la visa?" },
      { key: "grupo", label: "¿Quiénes aplicarán a la visa?" },
      { key: "solicitud", label: "Estado de la solicitud" },
    ],
  },
  {
    title: "Documentos y ocupación",
    subtitle: "Responde por el solicitante principal si viajas en grupo.",
    fields: [
      { key: "pasaportes", label: "¿Cómo está el estatus de los pasaportes del grupo?" },
      { key: "ocupacion", label: "¿A qué se dedica el principal responsable económico del viaje?" },
    ],
  },
  {
    title: "Tu experiencia de viaje",
    subtitle: "Estas respuestas ayudan a orientar el resultado inicial.",
    fields: [
      { key: "visaAnterior", label: "¿Tiene o ha tenido visa antes?" },
      { key: "viajes", label: "¿El solicitante principal ha viajado a alguno de estos destinos en los últimos 5 años?" },
    ],
  },
  {
    title: "Antecedentes y vínculos",
    subtitle: "Selecciona la opción que mejor describa tu situación.",
    fields: [
      { key: "cumplimiento", label: "Historial de cumplimiento" },
      { key: "lazos", label: "¿Tienen familiares directos en el país de destino?" },
    ],
  },
] as const;

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
