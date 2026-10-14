"use client";
import { useState } from "react";
import { Modal } from "./modal";

type Change = { leadId: string; nombre: string; anterior: string; estado: string };
export function StatusReconciliation() {
  const [changes, setChanges] = useState<Change[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function request(apply: boolean) {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/crm/statuses/reconcile", { method: apply ? "POST" : "GET" });
      if (!response.ok) throw new Error("No se pudo actualizar. Solo un administrador puede realizar esta revisión; recarga antes de reintentar.");
      const result = await response.json();
      if (apply) { setChanges(null); setNotice(`Estados actualizados: ${result.updated.length}.`); }
      else setChanges(result.changes);
    } catch (error) { setNotice(error instanceof Error ? error.message : "No se pudo completar la revisión."); }
    finally { setBusy(false); }
  }
  return <section>
    <h3>Estados de registros anteriores</h3>
    <p>Revisa los registros que todavía usan el estudio como estado comercial y los ajusta según los contactos y respuestas registrados. Conserva sus fechas, mensajes pendientes y clasificación.</p>
    <button className="button button--secondary" disabled={busy} onClick={() => request(false)}>Revisar estados anteriores</button>
    {notice && <p role="status">{notice}</p>}
    {changes && <Modal title="Actualizar estados comerciales" close={() => { if (!busy) setChanges(null); }}>
      {changes.length ? <>
        <p>Se actualizarán {changes.length} registros según su historial. Los estados Interesado, Cliente, No apto e Inactivo se conservan.</p>
        <ul>{changes.map((item) => <li key={item.leadId}><strong>{item.nombre}</strong>: {item.anterior.replaceAll("_", " ")} → {item.estado.replaceAll("_", " ")}</li>)}</ul>
        <button className="button button--primary" disabled={busy} onClick={() => request(true)}>Aplicar estados según historial</button>
      </> : <p>Todos los registros ya tienen un estado comercial consistente.</p>}
      {busy && <p role="status">Guardando estados…</p>}
      {notice && <p role="alert">{notice}</p>}
    </Modal>}
  </section>;
}
