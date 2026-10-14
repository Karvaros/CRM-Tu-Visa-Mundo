"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createMockRepository } from "@/lib/mock-repository";
import { createHttpRepository } from "@/lib/http-repository";
import type { CrmRepository } from "@/lib/repository";
import type { CrmData, LeadCommand, Message } from "@/lib/types";
import { today } from "@/lib/dates";
import { latestUndoableInteraction } from "@/lib/crm";
import { usePathname } from "next/navigation";

type Notice = {
  message: string;
  leadHref?: string;
  undo?: { leadId: string; interactionId: string };
};

interface CrmContextValue {
  data: CrmData | null;
  date: string;
  clock: number;
  busy: boolean;
  realData: boolean;
  execute: (command: LeadCommand) => Promise<boolean>;
  saveMessage: (message: Message) => Promise<boolean>;
  resolveStudy: (leadId: string, version: number) => Promise<boolean>;
  reset: () => Promise<boolean>;
  notify: (message: string) => void;
}
const Context = createContext<CrmContextValue | null>(null);
export function CrmProvider({ children, realData }: { children: ReactNode; realData: boolean }) {
  const pathname = usePathname();
  const repository = useRef<CrmRepository | null>(null);
  const lock = useRef(false);
  const [data, setData] = useState<CrmData | null>(null);
  const [date, setDate] = useState("");
  const [clock, setClock] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    setDate(today());
    if (pathname === "/estudio" || pathname === "/acceso") return;
    try {
      repository.current = realData
        ? createHttpRepository()
        : createMockRepository(window.sessionStorage);
      repository.current
        .load()
        .then(setData)
        .catch((error) => setError(error.message));
    } catch {
      setError("No se pudo iniciar el CRM. Recarga la página.");
    }
    const timer = setInterval(() => { setDate(today()); setClock(Date.now()); }, 30000);
    return () => clearInterval(timer);
  }, [pathname, realData]);
  async function run(
    action: (repo: CrmRepository) => Promise<CrmData>,
    success: string | ((result: CrmData) => Notice),
  ) {
    if (!repository.current || lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await action(repository.current);
      setData(result);
      setNotice(typeof success === "string" ? { message: success } : success(result));
      return true;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar. Inténtalo nuevamente.",
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function execute(command: LeadCommand) {
    const leadName = data?.leads.find((lead) => lead.id === command.leadId)?.nombre ?? "Lead";
    const leadHref = `/leads?buscar=${encodeURIComponent(leadName)}`;
    const undoneClosure = command.type === "undo"
      ? data?.interacciones.find((item) => item.id === command.interactionId)?.detalle
      : undefined;
    return run((repo) => repo.execute(command), (result) => {
      if (command.type === "undo") {
        const emailNotice =
          realData && /→ (NO_APTO|INACTIVO)$/.test(undoneClosure ?? "")
            ? " Los correos comerciales permanecen detenidos."
            : "";
        return { message: `${leadName}: última acción deshecha y seguimiento restaurado.${emailNotice}`, leadHref };
      }
      const undoable = latestUndoableInteraction(result, command.leadId);
      const undo = undoable
        ? { leadId: command.leadId, interactionId: undoable.id }
        : undefined;
      if (command.type === "replied") {
        return { message: `${leadName} fue marcado como Respondió`, undo, leadHref };
      }
      if (command.type === "reschedule") {
        return { message: `${leadName}: seguimiento reprogramado`, undo, leadHref };
      }
      if (command.type === "nextStep") {
        return { message: `${leadName}: siguiente paso guardado`, undo, leadHref };
      }
      if (command.type === "status") {
        const status = command.estado.replaceAll("_", " ").toLowerCase();
        const emailNotice =
          realData && ["NO_APTO", "INACTIVO"].includes(command.estado)
            ? " y correos comerciales detenidos"
            : "";
        return { message: `${leadName} fue marcado como ${status}${emailNotice}`, undo, leadHref };
      }
      return {
        undo: command.type === "note" ? undo : undefined,
        leadHref,
        message: command.type === "note" ? `${leadName}: notas guardadas` : realData
          ? "Acción guardada en Baserow."
          : "Acción guardada en la demostración.",
      };
    });
  }
  return (
    <Context.Provider
      value={{
        data,
        date,
        clock,
        busy,
        realData,
        notify: (message) => setNotice({ message }),
        execute,
        resolveStudy: (leadId, version) => run(async () => {
          const response = await fetch("/api/crm/studies/resolve", { method: "POST",
            headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadId, version }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error ?? "Solo un administrador puede revisar el estudio.");
          return result.data;
        }, "Perfil Medio guardado; ActiveCampaign confirmó la automatización del resultado."),
        saveMessage: (message) =>
          run(
            (repo) => repo.saveMessage(message),
            "Borrador guardado. Los próximos envíos usarán este texto.",
          ),
        reset: () =>
          run((repo) => repo.reset(), "Datos de demostración restablecidos."),
      }}
    >
      {notice && (
        <div className="toast" role="status">
          <span>{notice.message}</span>
          {notice.leadHref && <a className="toast__undo" href={notice.leadHref}>Ver lead</a>}
          {notice.undo && (
            <button
              className="toast__undo"
              disabled={busy}
              onClick={async () => {
                const lead = data?.leads.find((item) => item.id === notice.undo?.leadId);
                if (!lead || !notice.undo) return;
                await execute({
                  type: "undo",
                  leadId: lead.id,
                  version: lead.version,
                  interactionId: notice.undo.interactionId,
                });
              }}
            >
              Deshacer
            </button>
          )}
          <button aria-label="Cerrar aviso" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          {error}{" "}
          {!data && !realData && (
            <button
              onClick={() => run((repo) => repo.reset(), "Demo restablecida.")}
            >
              Restablecer datos demo
            </button>
          )}
        </div>
      )}
      {children}
    </Context.Provider>
  );
}
export function useCrm() {
  const value = useContext(Context);
  if (!value) throw new Error("Falta CrmProvider.");
  return value;
}
