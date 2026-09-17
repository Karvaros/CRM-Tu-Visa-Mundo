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
import { usePathname } from "next/navigation";

interface CrmContextValue {
  data: CrmData | null;
  date: string;
  busy: boolean;
  realData: boolean;
  execute: (command: LeadCommand) => Promise<boolean>;
  saveMessage: (message: Message) => Promise<boolean>;
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
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
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
    const timer = setInterval(() => setDate(today()), 30000);
    return () => clearInterval(timer);
  }, [pathname, realData]);
  async function run(
    action: (repo: CrmRepository) => Promise<CrmData>,
    success: string,
  ) {
    if (!repository.current || lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setData(await action(repository.current));
      setNotice(success);
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
  return (
    <Context.Provider
      value={{
        data,
        date,
        busy,
        realData,
        notify: setNotice,
        execute: (command) =>
          run(
            (repo) => repo.execute(command),
            realData ? "Acción guardada en Baserow." : "Acción guardada en la demostración.",
          ),
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
          {notice}
          <button aria-label="Cerrar aviso" onClick={() => setNotice("")}>
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

