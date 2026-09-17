"use client";

import Image from "next/image";
import { useState } from "react";
import studyResultCopy from "@/data/study-result-copy.json";
import { classifyStudy, presentStudyQuestion, studyPages, studyProfileLabels, updateStudyAnswer, type StudyAnswers, type StudyOutcome } from "@/lib/study";
import "./study.css";

const TOTAL_PAGES = studyPages.length + 1;

type Result = { perfil: StudyOutcome["perfil"] | null; status: "PREVIEW" | "SENT" | "EXISTING" | "REVIEW" | "PROCESSING" | "ERROR" };

export default function StudyWizard({ enabled }: { enabled: boolean }) {
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<StudyAnswers>({});
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const questionPage = studyPages[page];
  const question = questionPage ? presentStudyQuestion(questionPage, answers) : null;
  const ready = question
    ? question.options.some((option) => option.value === answers[question.key])
    : Boolean(answers.nombre?.trim() && answers.email?.trim() && answers.telefono?.trim());

  async function next(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || busy) return;
    if (page < TOTAL_PAGES - 1) {
      setPage(page + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (!enabled) {
      setResult({ perfil: classifyStudy(answers).perfil, status: "PREVIEW" });
    } else {
      setBusy(true);
      setError("");
      try {
        const response = await fetch("/api/estudio", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...answers, website: "" }),
        });
        const body = await response.json();
        if (body.status) setResult(body as Result);
        else setError(body.error || "No pudimos enviar el estudio. Inténtalo de nuevo.");
      } catch {
        setError("No pudimos conectar con el servidor. Inténtalo de nuevo.");
      } finally {
        setBusy(false);
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="study-screen">
      <div className="study-frame">
        <header className="study-brand" aria-label="Tu Visa Mundo">
          <Image src="/logo-tu-visa-mundo.png" alt="Tu Visa Mundo" width={200} height={100} priority />
        </header>
        <div className="study-card">
          {!result ? (
            <>
              <div className="study-progress__top">
                <span>ESTUDIO DE PERFIL GRATUITO</span>
                <span>Paso {page + 1} de {TOTAL_PAGES}</span>
              </div>
              <div className="study-progress" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_PAGES} aria-valuenow={page + 1} aria-label="Progreso del estudio">
                <span style={{ width: `${((page + 1) / TOTAL_PAGES) * 100}%` }} />
              </div>
              <form onSubmit={next}>
                <div className="study-intro">
                  <span className="study-kicker">{questionPage?.title ?? "Tus datos"}</span>
                  <h1>{question?.label ?? "¿Dónde te enviamos el resultado?"}</h1>
                  <p>{question?.subtitle ?? (enabled ? "Déjanos tus datos para enviarte el resultado. Solo se tendrá en cuenta tu primer Estudio de Perfil." : "Déjanos tus datos para identificar tu estudio. En esta vista de prueba no se guardan ni envían respuestas.")}</p>
                </div>
                {question ? (
                  <div className="study-questions">
                    <fieldset className="study-question">
                      <legend className="study-visually-hidden">{question.label} (obligatorio)</legend>
                      <div className="study-options">
                        {question.options.map((option) => (
                          <label className={`study-option ${answers[question.key] === option.value ? "study-option--selected" : ""}`} key={option.value}>
                            <input
                              type="radio"
                              name={question.key}
                              value={option.value}
                              checked={answers[question.key] === option.value}
                              onChange={() => setAnswers((current) => updateStudyAnswer(current, question.key, option.value))}
                            />
                            <span className="study-option__mark" aria-hidden="true" />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  </div>
                ) : (
                  <div className="study-contact">
                    <label>Nombre completo *
                      <input autoComplete="name" required value={answers.nombre ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, nombre: event.target.value }))} placeholder="Tu nombre y apellido" />
                    </label>
                    <label>Correo electrónico *
                      <input autoComplete="email" type="email" required value={answers.email ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, email: event.target.value }))} placeholder="nombre@correo.com" />
                    </label>
                    <label>Teléfono / WhatsApp *
                      <input autoComplete="tel" type="tel" minLength={8} required value={answers.telefono ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, telefono: event.target.value }))} placeholder="Incluye el código de país" />
                    </label>
                    {!enabled && <p className="study-preview-note">Vista de prueba: el resultado se calcula aquí, pero no se guarda en el CRM ni se envía por correo.</p>}
                  </div>
                )}
                {error && <p className="study-error" role="alert">{error}</p>}
                <div className="study-actions">
                  {page > 0 ? <button className="study-back" type="button" onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}>← Volver</button> : <span />}
                  <button className="study-next" type="submit" disabled={!ready || busy}>{busy ? "Enviando…" : page === TOTAL_PAGES - 1 ? enabled ? "Enviar respuestas" : "Ver resultado de prueba" : "Continuar"}<span aria-hidden="true">→</span></button>
                </div>
              </form>
            </>
          ) : (
            <div className="study-result">
              <span className="study-result__icon" aria-hidden="true">✓</span>
              <span className="study-kicker">{result.status === "PREVIEW" ? "ESTUDIO COMPLETADO · SIMULACIÓN SIN ENVÍOS" : result.status === "SENT" ? "ESTUDIO COMPLETADO" : "ESTUDIO REGISTRADO"}</span>
              <h1>{result.perfil === "PENDIENTE" ? "Tu Estudio de Perfil requiere revisión" : result.perfil ? "Resultado de tu Estudio de Perfil" : "Ya recibimos tu Estudio de Perfil"}</h1>
              {result.perfil && result.perfil !== "PENDIENTE" && <p>Resultado: <strong>{studyProfileLabels[result.perfil]}</strong>.</p>}
              <p className="study-result__detail">{result.status === "EXISTING" ? "Este correo ya tiene un Estudio de Perfil anterior. Se conserva únicamente la primera clasificación; las respuestas nuevas no la cambian." : result.status === "PROCESSING" ? "Estamos terminando de registrar tu primer estudio. No necesitas enviarlo otra vez." : result.status === "ERROR" ? "Guardamos tu primera respuesta, pero el envío del correo está pendiente. Nuestro equipo podrá revisarlo sin que tengas que repetir el estudio." : result.perfil === "D" ? studyResultCopy.low : result.perfil === "PENDIENTE" ? studyResultCopy.pending : studyResultCopy.positive}</p>
            </div>
          )}
        </div>
        <p className="study-footer">Tu Visa Mundo · El Estudio de Perfil no garantiza la aprobación de una visa.</p>
      </div>
    </main>
  );
}
