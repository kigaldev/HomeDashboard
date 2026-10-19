"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error Boundary]:", error);
  }, [error]);

  const isDbError =
    error.message?.includes("database") ||
    error.message?.includes("relation") ||
    error.message?.includes("connect") ||
    error.message?.includes("PGlite") ||
    error.message?.includes("DATABASE_URL");

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "var(--bg-main, #0f172a)",
        color: "var(--text-main, #f8fafc)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "540px",
          width: "100%",
          padding: "2rem",
          borderRadius: "1rem",
          background: "rgba(30, 41, 59, 0.8)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(148, 163, 184, 0.2)",
          textAlign: "center",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛠️</div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.75rem" }}>
          Iniciando Home Dashboard
        </h1>

        <p style={{ fontSize: "0.9rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: "1.25rem" }}>
          {isDbError
            ? "Parece que la base de datos aún no está configurada en Vercel. Para sincronizar tu dashboard en la nube, añade la variable de entorno DATABASE_URL (Supabase o Neon)."
            : "Ha ocurrido una incidencia temporal al cargar los datos del hogar."}
        </p>

        {error?.message && (
          <div
            style={{
              padding: "0.75rem",
              borderRadius: "0.5rem",
              background: "rgba(15, 23, 42, 0.6)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              fontSize: "0.78rem",
              fontFamily: "monospace",
              textAlign: "left",
              marginBottom: "1.5rem",
              wordBreak: "break-all",
              maxHeight: "120px",
              overflowY: "auto",
            }}
          >
            {error.message}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              background: "#3b82f6",
              color: "white",
              border: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            🔄 Reintentar
          </button>
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              background: "rgba(255, 255, 255, 0.08)",
              color: "#cbd5e1",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              fontWeight: 600,
              fontSize: "0.85rem",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Configurar en Vercel →
          </a>
        </div>
      </div>
    </div>
  );
}
