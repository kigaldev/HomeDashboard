"use client";

import { useRef, useEffect } from "react";

export function DocumentViewerModal({
  isOpen,
  onClose,
  title,
  url,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isInside) {
        onClose();
      }
    };

    dialog.addEventListener("click", handleBackdropClick);
    return () => dialog.removeEventListener("click", handleBackdropClick);
  }, [onClose]);

  if (!url) return null;

  const isPdf = url.toLowerCase().endsWith(".pdf");

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="backdrop:bg-black/75 backdrop:backdrop-blur-md bg-transparent p-0 border-0 outline-none max-w-3xl w-[94vw]"
      style={{ margin: "auto" }}
    >
      <div
        className="liquid-glass liquid-specular"
        style={{
          padding: "1.5rem",
          borderRadius: "1.25rem",
          boxShadow: "var(--liquid-shadow-elevated)",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
              {title}
            </h3>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
              Documento archivado en el sistema
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem", textDecoration: "none" }}
            >
              Abrir en pestaña nueva ↗
            </a>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ width: "2rem", height: "2rem", padding: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        <div
          style={{
            background: "rgba(0, 0, 0, 0.4)",
            borderRadius: "0.75rem",
            overflow: "hidden",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "350px",
            maxHeight: "75vh",
          }}
        >
          {isPdf ? (
            <iframe
              src={url}
              title={title}
              style={{ width: "100%", height: "70vh", border: "none" }}
            />
          ) : (
            <img
              src={url}
              alt={title}
              style={{ maxWidth: "100%", maxHeight: "72vh", objectFit: "contain" }}
            />
          )}
        </div>
      </div>
    </dialog>
  );
}
