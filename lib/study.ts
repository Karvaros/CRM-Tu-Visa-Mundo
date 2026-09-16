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
    title: "Tu destino",
    subtitle: "Elige el país que te interesa visitar.",
    fields: [{ key: "destino", label: "¿Para qué destino deseas tramitar la visa de turismo?" }],
  },
  {
    title: "Tu grupo",
    subtitle: "Si viajas con más personas, luego responde por el solicitante principal.",
    fields: [{ key: "grupo", label: "¿Quiénes aplicarán a la visa?" }],
  },
  {
    title: "Tu solicitud",
    subtitle: "Cuéntanos si es tu primera solicitud o una renovación.",
    fields: [{ key: "solicitud", label: "¿Es tu primera solicitud o una renovación?" }],
  },
  {
    title: "Pasaportes",
    subtitle: "Considera a todas las personas que viajarán.",
    fields: [{ key: "pasaportes", label: "¿Cómo está el estatus de los pasaportes del grupo?" }],
  },
  {
    title: "Ocupación",
    subtitle: "Responde por el principal responsable económico del viaje.",
    fields: [{ key: "ocupacion", label: "¿A qué se dedica el principal responsable económico del viaje?" }],
  },
  {
    title: "Visas anteriores",
    subtitle: "Responde por el solicitante principal.",
    fields: [{ key: "visaAnterior", label: "¿Tiene o ha tenido visa antes?" }],
  },
  {
    title: "Viajes anteriores",
    subtitle: "Responde por el solicitante principal.",
    fields: [{ key: "viajes", label: "¿El solicitante principal ha viajado a alguno de estos destinos en los últimos 5 años?" }],
  },
  {
    title: "Cumplimiento",
    subtitle: "Selecciona la opción que mejor describa tu situación.",
    fields: [{ key: "cumplimiento", label: "¿Cuál es tu historial de cumplimiento migratorio?" }],
  },
  {
    title: "Familia en destino",
    subtitle: "Una última pregunta antes de tus datos de contacto.",
    fields: [{ key: "lazos", label: "¿Tienen familiares directos en el país de destino?" }],
  },
] as const;

export type StudyQuestionKey = keyof typeof studyOptions;
type StudyPage = (typeof studyPages)[number];

/** La presentación cambia según el grupo; los valores guardados siguen siendo los del formulario original. */
export function presentStudyQuestion(page: StudyPage, answers: StudyAnswers) {
  const field = page.fields[0];
  const solo = answers.grupo === studyOptions.grupo[0];
  let label: string = field.label;
  let subtitle: string = page.subtitle;
  let options = (studyOptions[field.key] as readonly string[]).map((value) => ({ value, label: value }));

  if (solo) {
    if (field.key === "pasaportes") {
      label = "¿Tienes pasaporte vigente?";
      subtitle = "Selecciona la opción que corresponda a tu pasaporte.";
      options = [
        { value: studyOptions.pasaportes[0], label: "Sí, tengo pasaporte vigente" },
        { value: studyOptions.pasaportes[2], label: "No tengo pasaporte vigente" },
      ];
    } else if (field.key === "ocupacion") {
      label = "¿A qué te dedicas?";
      subtitle = "Elige tu ocupación actual.";
    } else if (field.key === "visaAnterior") {
      label = "¿Tienes o has tenido visa antes?";
      subtitle = "Selecciona la opción que mejor describa tu situación.";
    } else if (field.key === "viajes") {
      label = "¿Has viajado a alguno de estos destinos en los últimos 5 años?";
      subtitle = "Ten en cuenta tus viajes personales.";
    } else if (field.key === "lazos") {
      label = "¿Tienes familiares directos en el país de destino?";
      options = [
        { value: studyOptions.lazos[0], label: "Sí, ciudadanos o residentes" },
        { value: studyOptions.lazos[1], label: "No tengo familia allá" },
      ];
    }
  } else if (answers.grupo) {
    if (field.key === "solicitud") {
      label = "¿La solicitud principal es por primera vez o renovación?";
      subtitle = "Responde por el solicitante principal.";
    } else if (field.key === "cumplimiento") {
      label = "¿Cuál es el historial de cumplimiento migratorio del solicitante principal?";
      subtitle = "Responde por el solicitante principal.";
    }
  }

  return { key: field.key, label, subtitle, options };
}

export function updateStudyAnswer(current: StudyAnswers, key: StudyQuestionKey, value: string): StudyAnswers {
  if (!(studyOptions[key] as readonly string[]).includes(value)) throw new Error("Respuesta de estudio inválida.");
  const next = { ...current, [key]: value };
  if (key === "grupo" && value !== current.grupo) {
    next.solicitud = undefined;
    next.pasaportes = undefined;
    next.ocupacion = undefined;
    next.visaAnterior = undefined;
    next.viajes = undefined;
    next.cumplimiento = undefined;
    next.lazos = undefined;
  }
  if (key === "destino" && value !== current.destino) next.lazos = undefined;
  return next;
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
