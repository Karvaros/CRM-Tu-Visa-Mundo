"use client";

import { useState } from "react";
import { classifyStudy, studyOptions, studyPages, type StudyAnswers, type StudyOutcome } from "@/lib/study";
import "./study.css";

const TOTAL_PAGES = studyPages.length + 1;

export default function StudyPage() {
  const [page, setPage] = useState(0);
  const [answers, setAnswers] = useState<StudyAnswers>({});
  const [outcome, setOutcome] = useState<StudyOutcome | null>(null);
  const questionPage = studyPages[page];
  const ready = questionPage
    ? questionPage.fields.every((field) => Boolean(answers[field.key]))
    : Boolean(answers.nombre?.trim() && answers.email?.trim() && answers.telefono?.trim());

  function next(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready) return;
    if (page < TOTAL_PAGES - 1) {
      setPage(page + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setOutcome(classifyStudy(answers));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="study-screen">
      <div className="study-frame">
        <header className="study-brand" aria-label="Tu Visa Mundo">
          <span className="study-brand__globe" aria-hidden="true">✦</span>
          <span><strong>tuvisa</strong><b>MUNDO</b></span>
        </header>
        <div className="study-card">
          {!outcome ? (
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
                  <h1>{questionPage?.fields[0].label ?? "¿Dónde te enviamos el resultado?"}</h1>
                  <p>{questionPage?.subtitle ?? "Déjanos tus datos para identificar tu estudio. En esta vista de prueba no se guardan ni envían respuestas."}</p>
                </div>
                {questionPage ? (
                  <div className="study-questions">
                    {questionPage.fields.map((field) => (
                      <fieldset className="study-question" key={field.key}>
                        <legend className="study-visually-hidden">{field.label} (obligatorio)</legend>
                        <div className="study-options">
                          {studyOptions[field.key].map((option) => (
                            <label className={`study-option ${answers[field.key] === option ? "study-option--selected" : ""}`} key={option}>
                              <input
                                type="radio"
                                name={field.key}
                                value={option}
                                checked={answers[field.key] === option}
                                onChange={() => setAnswers((current) => ({ ...current, [field.key]: option }))}
                              />
                              <span className="study-option__mark" aria-hidden="true" />
                              <span>{option}</span>
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
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
                    <p className="study-preview-note">Vista de prueba: el resultado se calcula aquí, pero no se guarda en el CRM ni se envía por correo.</p>
                  </div>
                )}
                <div className="study-actions">
                  {page > 0 ? <button className="study-back" type="button" onClick={() => { setPage(page - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}>← Volver</button> : <span />}
                  <button className="study-next" type="submit" disabled={!ready}>{page === TOTAL_PAGES - 1 ? "Ver resultado de prueba" : "Continuar"}<span aria-hidden="true">→</span></button>
                </div>
              </form>
            </>
          ) : (
            <div className="study-result">
              <span className="study-result__icon" aria-hidden="true">✓</span>
              <span className="study-kicker">ESTUDIO COMPLETADO · VISTA DE PRUEBA</span>
              <h1>{outcome.perfil === "PENDIENTE" ? "Tu caso requiere revisión" : "Ya tenemos tu orientación inicial"}</h1>
              <p>Resultado calculado: <strong>{outcome.perfil === "PENDIENTE" ? "Pendiente de revisión" : `Perfil ${outcome.perfil}`}</strong>.</p>
              <p className="study-result__detail">{outcome.motivo}</p>
              <p className="study-preview-note">Ningún correo fue enviado y ninguna respuesta se guardó en el CRM. La conexión se activará después de validar las reglas y configurar Baserow y ActiveCampaign.</p>
              <button className="study-next" type="button" onClick={() => { setOutcome(null); setPage(0); setAnswers({}); }}>Probar de nuevo <span aria-hidden="true">↻</span></button>
            </div>
          )}
        </div>
        <p className="study-footer">Tu Visa Mundo · Orientación inicial, no garantiza la aprobación de una visa.</p>
      </div>
    </main>
  );
}
