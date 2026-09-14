"use client";
import { useState } from "react";
import { dateLabel } from "@/lib/dates";
import { isClosed, priority, renderMessage } from "@/lib/crm";
import { leadStatuses, type Lead, type LeadStatus } from "@/lib/types";
import { useCrm } from "./crm-provider";
import { Modal } from "./modal";

export function LeadCard({ lead }: { lead: Lead }) {
  const { data, date, busy, execute, notify } = useCrm();
  const [panel, setPanel] = useState<"sent" | "reschedule" | "detail" | null>(
    null,
  );
  const message = data?.mensajes.find(
    (item) => item.id === lead.proximoMensajeId,
  );
  const text = renderMessage(message, lead);
  const canSend = Boolean(text && priority(lead, date));
  const label =
    leadStatuses.indexOf(lead.estado) >= 0
      ? lead.estado.replaceAll("_", " ").replace("CONVERSACION", "CONVERSACIÓN")
      : lead.estado;
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      notify("Mensaje copiado.");
    } catch {
      notify(
        "No se pudo copiar. Selecciona el texto del mensaje y cópialo manualmente.",
      );
    }
  }
  return (
    <article
      className="lead-card"
      aria-label={`${lead.nombre} ${lead.apellido ?? ""}`}
    >
      <div className="lead-card__top">
        <div>
          <div className="eyebrow">
            {lead.destino} · {lead.tipoVisa}
          </div>
          <h3>
            {lead.nombre} {lead.apellido}
          </h3>
          <p className="muted">
            Origen: {lead.origen} · Ingresó: {dateLabel(lead.fechaIngreso)}
          </p>
        </div>
        <span className={`status status--${lead.estado.toLowerCase()}`}>
          {label}
        </span>
      </div>
      {lead.secuenciaPausada && (
        <p className="pause-note">Secuencia pausada · atención manual</p>
      )}
      <div className="lead-meta">
        <div>
          <span>Último mensaje enviado</span>
          <strong>
            {lead.ultimoContacto
              ? dateLabel(lead.ultimoContacto)
              : "Sin envío registrado"}
          </strong>
        </div>
        <div>
          <span>Próximo contacto</span>
          <strong>{dateLabel(lead.proximoContacto)}</strong>
        </div>
        <div>
          <span>Próxima acción</span>
          <strong>{lead.proximaAccion}</strong>
        </div>
      </div>
      <div className="message-box">
        <div className="message-box__title">
          {message?.titulo ?? "Sin mensaje pendiente"}{" "}
          {message?.borrador && "· Borrador de demostración"}
        </div>
        <p>{text || "Revisa la ficha y define la próxima acción."}</p>
      </div>
      <div className="actions">
        <button
          className="button button--secondary"
          disabled={!text}
          onClick={copy}
        >
          Copiar mensaje
        </button>
        <a
          className="button button--primary"
          href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}${text ? `?text=${encodeURIComponent(text)}` : ""}`}
          target="_blank"
          rel="noreferrer"
        >
          Abrir WhatsApp
        </a>
        <button
          className="button button--success"
          disabled={busy || !canSend}
          onClick={() => setPanel("sent")}
        >
          Marcar como enviado
        </button>
        <button
          className="button button--ghost"
          disabled={busy || isClosed(lead)}
          onClick={() =>
            execute({ type: "replied", leadId: lead.id, version: lead.version })
          }
        >
          Respondió
        </button>
        <button
          className="button button--ghost"
          disabled={busy || isClosed(lead)}
          onClick={() => setPanel("reschedule")}
        >
          Reprogramar
        </button>
        <button
          className="button button--ghost"
          onClick={() => setPanel("detail")}
        >
          Ver ficha
        </button>
      </div>
      {panel === "sent" && (
        <Modal title="Confirmar mensaje enviado" close={() => setPanel(null)}>
          <p>
            Confirma solo después de haber enviado este mensaje a {lead.nombre}{" "}
            en WhatsApp.
          </p>
          <div className="message-box">
            <p>{text}</p>
          </div>
          <p className="muted">
            Copiar o abrir WhatsApp no registra un envío. Esta confirmación
            guarda la fecha real y calcula el siguiente contacto.
          </p>
          <button
            className="button button--success"
            disabled={busy}
            onClick={async () => {
              if (
                await execute({
                  type: "sent",
                  leadId: lead.id,
                  version: lead.version,
                  mensajeId: message!.id,
                  mensajeTexto: text,
                })
              )
                setPanel(null);
            }}
          >
            Confirmar envío realizado
          </button>
        </Modal>
      )}
      {panel === "reschedule" && (
        <Modal
          title={`Reprogramar a ${lead.nombre}`}
          close={() => setPanel(null)}
        >
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              if (
                await execute({
                  type: "reschedule",
                  leadId: lead.id,
                  version: lead.version,
                  fecha: String(form.get("fecha")),
                  accion: String(form.get("accion")),
                })
              )
                setPanel(null);
            }}
          >
            <label>
              Fecha del próximo contacto
              <input
                name="fecha"
                type="date"
                required
                min={date}
                defaultValue={
                  lead.proximoContacto && lead.proximoContacto >= date
                    ? lead.proximoContacto
                    : date
                }
              />
            </label>
            <label>
              Próxima acción
              <textarea
                name="accion"
                required
                maxLength={500}
                defaultValue={lead.proximaAccion}
              />
            </label>
            <p className="muted">
              Se guardará como seguimiento manual. No cambia el último envío ni
              reactiva una secuencia pausada.
            </p>
            <button className="button button--primary" disabled={busy}>
              Guardar reprogramación
            </button>
          </form>
        </Modal>
      )}
      {panel === "detail" && (
        <Modal
          title={`Ficha de ${lead.nombre} ${lead.apellido ?? ""}`}
          close={() => setPanel(null)}
        >
          <dl>
            <dt>WhatsApp</dt>
            <dd>{lead.whatsapp}</dd>
            <dt>Email</dt>
            <dd>{lead.email ?? "Sin email"}</dd>
            <dt>Asesor</dt>
            <dd>{lead.asesor ?? "Sin asignar"}</dd>
            <dt>Notas</dt>
            <dd>{lead.notas ?? "Sin notas"}</dd>
            <dt>Último mensaje</dt>
            <dd>{lead.ultimoMensajeId ?? "Ninguno"}</dd>
            <dt>Próxima acción</dt>
            <dd>{lead.proximaAccion}</dd>
          </dl>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              await execute({
                type: "status",
                leadId: lead.id,
                version: lead.version,
                estado: String(form.get("estado")) as LeadStatus,
              });
            }}
          >
            <label>
              Estado
              <select
                key={lead.estado}
                name="estado"
                defaultValue={lead.estado}
              >
                {leadStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status
                      .replaceAll("_", " ")
                      .replace("CONVERSACION", "CONVERSACIÓN")}
                  </option>
                ))}
              </select>
            </label>
            <button className="button button--secondary" disabled={busy}>
              Guardar estado
            </button>
          </form>
          <p className="muted">
            Cliente registra una venta; No apto e Inactivo cierran el lead. Para
            retomar un lead cerrado, cambia el estado y reprograma una acción
            manual.
          </p>
          <h3>Historial del lead</h3>
          {data?.interacciones
            .filter((item) => item.leadId === lead.id)
            .map((item) => (
              <div className="history-item" key={item.id}>
                <strong>
                  {dateLabel(item.fecha)} · {item.tipo}
                </strong>
                <p>{item.detalle}</p>
                {item.mensajeTexto && (
                  <p className="muted">{item.mensajeTexto}</p>
                )}
              </div>
            ))}
          {!data?.interacciones.some((item) => item.leadId === lead.id) && (
            <p className="muted">
              Sin acciones registradas en esta demostración.
            </p>
          )}
        </Modal>
      )}
    </article>
  );
}
