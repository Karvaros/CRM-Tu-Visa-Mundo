"use client";
import { useState } from "react";
import { dateLabel, TIME_ZONE } from "@/lib/dates";
import { priority } from "@/lib/crm";
import { leadStatuses, type LeadPriority, type Message } from "@/lib/types";
import { useCrm } from "./crm-provider";
import { LeadCard } from "./lead-card";
import { Modal } from "./modal";

const sections: { key: LeadPriority; title: string; description: string }[] = [
  {
    key: "NUEVO",
    title: "Nuevos leads",
    description: "Esperan su primer contacto.",
  },
  {
    key: "ATRASADO",
    title: "Seguimientos vencidos",
    description: "Debían contactarse antes de hoy.",
  },
  {
    key: "HOY",
    title: "Seguimientos de hoy",
    description: "Corresponde contactar hoy según la secuencia.",
  },
  {
    key: "MANUAL",
    title: "Seguimientos manuales",
    description: "Acciones manuales de hoy o pendientes de días anteriores.",
  },
];
const titles: Record<string, string> = {
  hoy: "Hoy",
  leads: "Leads",
  pipeline: "Pipeline",
  historial: "Historial",
  mensajes: "Mensajes",
  configuracion: "Configuración",
};
export function CrmView({ view }: { view: string }) {
  const { data, date, busy, reset } = useCrm();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [messageSequence, setMessageSequence] = useState("");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!data) return <p role="status">Cargando demostración…</p>;
  const leads = data.leads.filter(
    (lead) =>
      `${lead.nombre} ${lead.apellido} ${lead.destino} ${lead.whatsapp}`
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")) &&
      (!filter || lead.estado === filter),
  );
  const due = data.leads.filter((lead) => priority(lead, date));
  return (
    <>
      <header className="page-header">
        <div>
          <div className="eyebrow">Agenda comercial · modo demo</div>
          <h1>{titles[view]}</h1>
          <p>
            {view === "hoy"
              ? "A quién contactar, qué decir y cuál es el próximo paso."
              : "Tu Visa Mundo · espacio de trabajo del asesor"}
          </p>
        </div>
        <div className="date-chip">{dateLabel(date)}</div>
      </header>
      <p className="demo-note">
        Datos ficticios · mensajes pendientes de revisión · cambios guardados
        solo en esta pestaña.
      </p>
      {view === "hoy" && (
        <section className="metrics" aria-label="Resumen del día">
          {[
            ["Pendientes hoy", due.length],
            [
              "Nuevos",
              due.filter((lead) => priority(lead, date) === "NUEVO").length,
            ],
            [
              "Vencidos",
              due.filter((lead) => lead.proximoContacto! < date).length,
            ],
            [
              "Conversaciones activas",
              data.leads.filter((lead) => lead.estado === "EN_CONVERSACION")
                .length,
            ],
          ].map(([label, count]) => (
            <div className="metric" key={label}>
              <span>{label}</span>
              <strong>{count}</strong>
            </div>
          ))}
        </section>
      )}
      {["hoy", "leads"].includes(view) && (
        <div className="filters">
          <label>
            Buscar lead
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nombre, destino o teléfono"
            />
          </label>
          <label>
            Estado
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            >
              <option value="">Todos los estados</option>
              {leadStatuses.map((status) => (
                <option key={status} value={status}>
                  {status
                    .replaceAll("_", " ")
                    .replace("CONVERSACION", "CONVERSACIÓN")}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {view === "hoy" && (
        <>
          {due.length === 0 && (
            <div className="empty-state">
              <h2>Estás al día</h2>
              <p>
                No hay contactos pendientes. Puedes consultar todos los leads en
                LEADS.
              </p>
            </div>
          )}
          {sections.map((section) => {
            const items = leads
              .filter((lead) => priority(lead, date) === section.key)
              .sort((a, b) =>
                (a.proximoContacto ?? "").localeCompare(
                  b.proximoContacto ?? "",
                ),
              );
            return (
              <section className="agenda-section" key={section.key}>
                <div className="section-heading">
                  <div>
                    <h2>{section.title}</h2>
                    <p>{section.description}</p>
                  </div>
                  <span className="count-badge">{items.length}</span>
                </div>
                <div className="lead-list">
                  {items.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} />
                  ))}
                  {!items.length && (
                    <p className="empty-state">
                      Sin pendientes
                      {search || filter ? " para estos filtros" : ""}.
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </>
      )}
      {view === "leads" && (
        <div className="lead-list">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
          {!leads.length && (
            <p className="empty-state">No se encontraron leads.</p>
          )}
        </div>
      )}
      {view === "pipeline" && (
        <div className="pipeline">
          {leadStatuses.map((status) => (
            <section className="pipeline-column" key={status}>
              <h2>
                {status
                  .replaceAll("_", " ")
                  .replace("CONVERSACION", "CONVERSACIÓN")}{" "}
                <span className="count-badge">
                  {data.leads.filter((lead) => lead.estado === status).length}
                </span>
              </h2>
              {data.leads
                .filter((lead) => lead.estado === status)
                .map((lead) => (
                  <div className="pipeline-card" key={lead.id}>
                    <strong>
                      {lead.nombre} {lead.apellido}
                    </strong>
                    <p>{lead.destino}</p>
                    <p>{lead.proximaAccion}</p>
                    <small>{dateLabel(lead.proximoContacto)}</small>
                  </div>
                ))}
            </section>
          ))}
        </div>
      )}
      {view === "historial" && (
        <section className="lead-card">
          <h2>Interacciones registradas</h2>
          {data.interacciones.length === 0 && (
            <p className="empty-state">
              Todavía no hay acciones registradas. Confirma un envío, una
              respuesta o una reprogramación desde HOY.
            </p>
          )}
          {data.interacciones.map((item) => {
            const lead = data.leads.find((lead) => lead.id === item.leadId);
            return (
              <article className="history-item" key={item.id}>
                <strong>
                  {lead?.nombre} {lead?.apellido} · {item.tipo}
                </strong>
                <p>
                  {dateLabel(item.fecha)} · {item.asesor}
                </p>
                <p>{item.detalle}</p>
                {item.mensajeTexto && (
                  <blockquote>{item.mensajeTexto}</blockquote>
                )}
              </article>
            );
          })}
        </section>
      )}
      {view === "mensajes" && (
        <>
          <p className="empty-state">
            Mensajes establecidos para difusión, sin variable de nombre. Se
            separan en SIN ESTUDIO y ESTUDIO A/B/C. Los cambios no alteran el
            historial ni fechas ya programadas.
          </p>
          <div className="review-summary">
            <strong>Falta una secuencia para el estudio pago.</strong>
            <p>
              Los mensajes SIN ESTUDIO ofrecen únicamente el estudio gratuito en
              línea. Los mensajes A/B/C no distinguen si el estudio previo fue
              gratuito o pago.
            </p>
          </div>
          <div className="filters">
            <label>
              Secuencia
              <select
                value={messageSequence}
                onChange={(event) => setMessageSequence(event.target.value)}
              >
                <option value="">Todas las secuencias</option>
                {[
                  ...new Set(data.mensajes.map((item) => item.secuenciaId)),
                ].map((sequence) => (
                  <option key={sequence} value={sequence}>
                    {sequence.replaceAll("-", " ").toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <label className="checkbox-label review-filter">
              <input
                type="checkbox"
                checked={reviewOnly}
                onChange={(event) => setReviewOnly(event.target.checked)}
              />
              Mostrar solo mensajes que requieren revisión
            </label>
          </div>
          <div className="lead-list">
            {data.mensajes
              .filter(
                (message) =>
                  (!messageSequence ||
                    message.secuenciaId === messageSequence) &&
                  (!reviewOnly || message.requiereRevision),
              )
              .map((message) => (
                <MessageEditor key={message.id} message={message} />
              ))}
          </div>
        </>
      )}
      {view === "configuracion" && (
        <section className="lead-card">
          <h2>Entorno de demostración</h2>
          <dl>
            <dt>Asesor</dt>
            <dd>Asesor principal · campo preparado por lead</dd>
            <dt>Zona horaria</dt>
            <dd>{TIME_ZONE}</dd>
            <dt>Almacenamiento</dt>
            <dd>
              Sesión de esta pestaña. Persiste al recargar; no se comparte entre
              dispositivos.
            </dd>
            <dt>Base de datos</dt>
            <dd>Baserow pendiente de conexión.</dd>
            <dt>Secuencias</dt>
            <dd>
              Solo planifican contactos; el asesor realiza y confirma cada
              envío.
            </dd>
          </dl>
          <button
            className="button button--secondary"
            disabled={busy}
            onClick={() => setConfirmReset(true)}
          >
            Restablecer datos demo
          </button>
          {confirmReset && (
            <Modal
              title="Restablecer demostración"
              close={() => setConfirmReset(false)}
            >
              <p>
                Se eliminarán las acciones y ediciones de mensajes de esta
                pestaña y se cargarán cuatro leads ficticios con fechas
                relativas a hoy.
              </p>
              <button
                className="button button--primary"
                disabled={busy}
                onClick={async () => {
                  if (await reset()) setConfirmReset(false);
                }}
              >
                Confirmar restablecimiento
              </button>
            </Modal>
          )}
        </section>
      )}
    </>
  );
}
function MessageEditor({ message }: { message: Message }) {
  const { busy, saveMessage } = useCrm();
  return (
    <form
      className="lead-card"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await saveMessage({
          ...message,
          titulo: String(form.get("titulo")),
          texto: String(form.get("texto")),
          diaSecuencia: Number(form.get("dia")),
          recursoUrl: String(form.get("recursoUrl") || "") || undefined,
          soloDiasHabiles: form.get("habiles") === "on",
          requiereRevision: form.get("revision") === "on",
        });
      }}
    >
      <div className="eyebrow">
        {message.secuenciaId.replaceAll("-", " ")} ·{" "}
        {message.segmento.join(" / ")}
      </div>
      <div className="message-editor-heading">
        <h2>
          Día {message.diaSecuencia} · {message.titulo}
        </h2>
        <span
          className={message.requiereRevision ? "review-badge" : "ready-badge"}
        >
          {message.requiereRevision ? "Requiere revisión" : "Establecido"}
        </span>
      </div>
      <label>
        Título
        <input
          name="titulo"
          required
          maxLength={120}
          defaultValue={message.titulo}
        />
      </label>
      <label>
        Texto del mensaje
        <textarea
          name="texto"
          required
          maxLength={4000}
          rows={4}
          defaultValue={message.texto}
        />
      </label>
      <div className="editor-grid">
        <label>
          Día de la secuencia
          <input
            name="dia"
            type="number"
            required
            min={0}
            max={365}
            defaultValue={message.diaSecuencia}
          />
        </label>
        <label>
          Recurso ({message.recursoTipo})
          <input
            name="recursoUrl"
            type="url"
            placeholder="Enlace pendiente"
            defaultValue={message.recursoUrl}
          />
        </label>
      </div>
      <label className="checkbox-label">
        <input
          name="habiles"
          type="checkbox"
          defaultChecked={message.soloDiasHabiles}
        />
        Mover al lunes si el siguiente contacto cae en fin de semana
      </label>
      <label className="checkbox-label">
        <input
          name="revision"
          type="checkbox"
          defaultChecked={message.requiereRevision}
        />
        Bloquear envío hasta completar la revisión
      </label>
      {message.observaciones.map((note) => (
        <p className="review-note" key={note}>
          {note}
        </p>
      ))}
      <button className="button button--primary" disabled={busy}>
        Guardar cambios
      </button>
    </form>
  );
}
