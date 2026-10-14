import { presentStudyQuestion, studyPages, studyProfileLabels } from "@/lib/study";
import { dateLabel } from "@/lib/dates";
import type { Interaction } from "@/lib/types";

export function StudyAnswers({ study }: { study: NonNullable<Interaction["estudio"]> }) {
  return <details className="study-answers">
    <summary>Ver respuestas del Estudio de Perfil</summary>
    <p><strong>{studyProfileLabels[study.perfil]}</strong> · {dateLabel(study.createdAt)}</p>
    <p>{study.motivo}</p>
    {study.revision && <p className="muted">Corrección registrada por {study.revision.asesor} el {dateLabel(study.revision.fecha)}. Se conservan las respuestas originales.</p>}
    <dl>{studyPages.map((page) => {
      const question = presentStudyQuestion(page, study.answers);
      const answer = study.answers[question.key];
      return <div key={question.key}><dt>{question.label}</dt><dd>{question.options.find((option) => option.value === answer)?.label ?? answer ?? "Sin respuesta registrada"}</dd></div>;
    })}
      <dt>Nombre registrado</dt><dd>{study.answers.nombre ?? "Sin dato"}</dd>
      <dt>Correo registrado</dt><dd>{study.answers.email ?? "Sin dato"}</dd>
      <dt>Teléfono registrado</dt><dd>{study.answers.telefono ?? "Sin dato"}</dd>
    </dl>
  </details>;
}
