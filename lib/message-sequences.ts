import type { Message, StudyProfile } from "./types";

export function studySequenceForDestination(destination: string): string | undefined {
  const key = destination.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
  const slugs: Record<string, string> = {
    canada: "canada",
    australia: "australia",
    eeuu: "eeuu",
    estadosunidos: "eeuu",
    usa: "eeuu",
    uk: "uk",
    reinounido: "uk",
  };
  return slugs[key] ? `estudio-${slugs[key]}` : undefined;
}

export function firstStudyMessage(messages: Message[], destination: string, profile: StudyProfile | "PENDIENTE") {
  if (profile === "D" || profile === "PENDIENTE") return undefined;
  const sequence = studySequenceForDestination(destination);
  if (!sequence) return undefined;
  return messages.find((message) => message.secuenciaId === sequence &&
    message.orden === 2 && message.segmento.includes(`ESTUDIO_${profile}`));
}
