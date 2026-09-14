"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty-state">
      <h1>No se pudo abrir esta pantalla</h1>
      <p>Intenta cargarla nuevamente.</p>
      <button className="button button--primary" onClick={reset}>
        Reintentar
      </button>
    </section>
  );
}
