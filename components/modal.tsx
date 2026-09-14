"use client";
import { useEffect, useRef, type ReactNode } from "react";
export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} aria-label={title} onCancel={close}>
      <div className="section-heading">
        <h2>{title}</h2>
        <button
          className="button button--ghost"
          onClick={close}
          aria-label="Cerrar ventana"
        >
          Cerrar
        </button>
      </div>
      {children}
    </dialog>
  );
}
