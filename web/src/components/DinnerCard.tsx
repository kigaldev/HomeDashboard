"use client";

import { useState, useTransition } from "react";
import { chooseDinnerAction, regenerateDinnerAction } from "@/app/actions";
import type { DinnerPlan } from "@/lib/repo";

export function DinnerCard({
  date,
  initialPlans,
  schoolLunch,
  schoolDinnerRec,
}: {
  date: string;
  initialPlans: DinnerPlan[];
  schoolLunch: string | null;
  schoolDinnerRec?: string | null;
}) {
  const [plans, setPlans] = useState<DinnerPlan[]>(initialPlans);
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    mambo: false,
    estandar: false,
  });

  const toggleExpand = (option: string) => {
    setExpanded((prev) => ({
      ...prev,
      [option]: !prev[option],
    }));
  };

  const mambo = plans.find((p) => p.option === "mambo");
  const estandar = plans.find((p) => p.option === "estandar");

  const handleChoose = (option: string) => {
    startTransition(async () => {
      await chooseDinnerAction(date, option);
      setPlans((prev) => prev.map((p) => ({ ...p, chosen: p.option === option })));
    });
  };

  const handleRegenerate = () => {
    startTransition(async () => {
      await regenerateDinnerAction(date);
    });
  };

  return (
    <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
      {/* Header Apple Style */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            className="squircle-icon"
            style={{
              background: "var(--apple-green-subtle)",
              color: "var(--apple-green)",
            }}
          >
            🥗
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
              Cena de Hoy
            </h2>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
              Criterio familiar: baja en hidratos simples · digestión ligera
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {schoolLunch && (
            <div
              className="badge badge-amber"
              title={`Comida del colegio: ${schoolLunch}`}
              style={{ fontSize: "0.76rem", padding: "0.3rem 0.7rem", maxWidth: "230px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              <span>🏫 Cole:</span>
              <span style={{ fontWeight: 500 }}>{schoolLunch}</span>
            </div>
          )}

          <button
            onClick={handleRegenerate}
            disabled={isPending}
            className="btn-ghost"
            title="Sugerir otras opciones con IA"
            style={{ fontSize: "0.8rem", padding: "0.35rem 0.65rem", borderRadius: "var(--radius-full)" }}
          >
            <span>🔄</span>
            <span>{isPending ? "Generando..." : "Nuevas ideas"}</span>
          </button>
        </div>
      </div>

      {/* Bloque Destacado: Menú del Colegio Montessori a Mediodía */}
      {schoolLunch && (
        <div
          style={{
            marginBottom: "1.25rem",
            padding: "1rem 1.25rem",
            borderRadius: "var(--radius-lg)",
            background: "var(--liquid-glass-bg-subtle)",
            border: "1px solid rgba(255, 149, 0, 0.3)",
            borderLeft: "4px solid var(--apple-orange)",
            boxShadow: "var(--liquid-shadow-ambient)",
            display: "flex",
            flexDirection: "column",
            gap: "0.55rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.25rem" }}>🏫</span>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                  Comida de Hoy en el Colegio Montessori
                </h3>
                <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)" }}>
                  Fabio & Bruno · Menú Basal oficial del centro
                </span>
              </div>
            </div>

            <a
              href="/menus/menu_actual.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target"
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "var(--apple-blue)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.25rem 0.6rem",
                borderRadius: "var(--radius-full)",
                background: "rgba(0, 113, 227, 0.12)",
              }}
            >
              <span>📄 Ver PDF oficial del mes ↗</span>
            </a>
          </div>

          <div
            style={{
              padding: "0.6rem 0.85rem",
              borderRadius: "var(--radius-md)",
              background: "rgba(0,0,0,0.18)",
              fontSize: "0.92rem",
              fontWeight: 600,
              color: "var(--apple-text)",
              lineHeight: 1.4,
            }}
          >
            🍽️ {schoolLunch}
          </div>

          {schoolDinnerRec && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.78rem", color: "var(--apple-text-secondary)" }}>
              <span>⭐</span>
              <span>
                <strong style={{ color: "var(--apple-orange)" }}>Pauta nutricional del cole para cenar:</strong> {schoolDinnerRec}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Grid Bento de 2 Opciones (1 columna en móvil, 2 en pantallas más anchas) */}
      <div className="responsive-grid-2">
        {/* Opción Cecotec Mambo */}
        <div
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("button[data-action='choose']")) return;
            toggleExpand("mambo");
          }}
          role="region"
          aria-expanded={expanded.mambo}
          style={{
            padding: "1.15rem",
            borderRadius: "var(--radius-lg)",
            background: mambo?.chosen ? "var(--apple-orange-subtle)" : "var(--apple-surface-secondary)",
            border: mambo?.chosen ? "2px solid var(--apple-orange)" : "1px solid var(--apple-border)",
            boxShadow: mambo?.chosen ? "0 4px 18px rgba(255, 149, 0, 0.2)" : "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "all 0.2s var(--ease-spring)",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span
                className="badge badge-amber"
                style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}
              >
                🤖 Cecotec Mambo
              </span>
              {mambo?.chosen && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--apple-orange)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  ✓ Seleccionada
                </span>
              )}
            </div>
            <h3 style={{ fontSize: "1.02rem", fontWeight: 700, letterSpacing: "-0.015em", marginBottom: "0.45rem", color: "var(--apple-text)" }}>
              {mambo?.title || "Crema de calabacín con quesitos"}
            </h3>

            {/* Indicador interactivo para ver / cerrar receta */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.79rem",
                fontWeight: 600,
                color: mambo?.chosen ? "var(--apple-orange)" : "var(--apple-text-secondary)",
                marginBottom: expanded.mambo ? "0.6rem" : "1rem",
                transition: "color 0.15s ease",
              }}
            >
              <span>{expanded.mambo ? "Cerrar receta" : "📖 Pulsa para ver receta"}</span>
              <span
                style={{
                  fontSize: "0.65rem",
                  transform: expanded.mambo ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.25s ease",
                  display: "inline-block",
                }}
              >
                ▼
              </span>
            </div>

            {/* Receta colapsable */}
            <div
              style={{
                overflow: "hidden",
                maxHeight: expanded.mambo ? "500px" : "0px",
                opacity: expanded.mambo ? 1 : 0,
                transition: "max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, margin 0.2s ease",
                marginBottom: expanded.mambo ? "1.1rem" : "0px",
              }}
            >
              <div
                style={{
                  padding: "0.75rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--apple-surface-elevated)",
                  border: "1px solid var(--apple-border)",
                  fontSize: "0.82rem",
                  color: "var(--apple-text-secondary)",
                  lineHeight: 1.55,
                  whiteSpace: "pre-line",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.75rem", color: "var(--apple-text)", marginBottom: "0.3rem" }}>
                  👨‍🍳 Preparación / Receta Mambo:
                </div>
                {mambo?.description || "Programar velocidad y temperatura según receta Mambo."}
              </div>
            </div>
          </div>

          <button
            data-action="choose"
            onClick={(e) => {
              e.stopPropagation();
              handleChoose("mambo");
            }}
            disabled={isPending}
            style={{
              width: "100%",
              padding: "0.55rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              fontWeight: 600,
              background: mambo?.chosen ? "var(--apple-surface-elevated)" : "var(--apple-orange)",
              color: mambo?.chosen ? "var(--apple-orange)" : "#ffffff",
              border: mambo?.chosen ? "1px solid var(--apple-orange)" : "none",
              boxShadow: mambo?.chosen ? "none" : "0 3px 10px rgba(255, 149, 0, 0.3)",
              cursor: "pointer",
              transition: "all 0.15s var(--ease-spring)",
            }}
          >
            {mambo?.chosen ? "Cena Elegida para Hoy" : "Elegir Robot Mambo"}
          </button>
        </div>

        {/* Opción Estándar */}
        <div
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("button[data-action='choose']")) return;
            toggleExpand("estandar");
          }}
          role="region"
          aria-expanded={expanded.estandar}
          style={{
            padding: "1.15rem",
            borderRadius: "var(--radius-lg)",
            background: estandar?.chosen ? "var(--apple-green-subtle)" : "var(--apple-surface-secondary)",
            border: estandar?.chosen ? "2px solid var(--apple-green)" : "1px solid var(--apple-border)",
            boxShadow: estandar?.chosen ? "0 4px 18px rgba(52, 199, 89, 0.2)" : "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            cursor: "pointer",
            transition: "all 0.2s var(--ease-spring)",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span
                className="badge badge-emerald"
                style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}
              >
                🍳 Sartén / Plancha / Horno
              </span>
              {estandar?.chosen && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "var(--apple-green)",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  ✓ Seleccionada
                </span>
              )}
            </div>
            <h3 style={{ fontSize: "1.02rem", fontWeight: 700, letterSpacing: "-0.015em", marginBottom: "0.45rem", color: "var(--apple-text)" }}>
              {estandar?.title || "Merluza en papillote con verduras"}
            </h3>

            {/* Indicador interactivo para ver / cerrar receta */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.79rem",
                fontWeight: 600,
                color: estandar?.chosen ? "var(--apple-green)" : "var(--apple-text-secondary)",
                marginBottom: expanded.estandar ? "0.6rem" : "1rem",
                transition: "color 0.15s ease",
              }}
            >
              <span>{expanded.estandar ? "Cerrar receta" : "📖 Pulsa para ver receta"}</span>
              <span
                style={{
                  fontSize: "0.65rem",
                  transform: expanded.estandar ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.25s ease",
                  display: "inline-block",
                }}
              >
                ▼
              </span>
            </div>

            {/* Receta colapsable */}
            <div
              style={{
                overflow: "hidden",
                maxHeight: expanded.estandar ? "500px" : "0px",
                opacity: expanded.estandar ? 1 : 0,
                transition: "max-height 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease, margin 0.2s ease",
                marginBottom: expanded.estandar ? "1.1rem" : "0px",
              }}
            >
              <div
                style={{
                  padding: "0.75rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--apple-surface-elevated)",
                  border: "1px solid var(--apple-border)",
                  fontSize: "0.82rem",
                  color: "var(--apple-text-secondary)",
                  lineHeight: 1.55,
                  whiteSpace: "pre-line",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.75rem", color: "var(--apple-text)", marginBottom: "0.3rem" }}>
                  👨‍🍳 Preparación / Receta:
                </div>
                {estandar?.description || "Preparación tradicional rápida y limpia."}
              </div>
            </div>
          </div>

          <button
            data-action="choose"
            onClick={(e) => {
              e.stopPropagation();
              handleChoose("estandar");
            }}
            disabled={isPending}
            style={{
              width: "100%",
              padding: "0.55rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              fontWeight: 600,
              background: estandar?.chosen ? "var(--apple-surface-elevated)" : "var(--apple-green)",
              color: estandar?.chosen ? "var(--apple-green)" : "#ffffff",
              border: estandar?.chosen ? "1px solid var(--apple-green)" : "none",
              boxShadow: estandar?.chosen ? "none" : "0 3px 10px rgba(52, 199, 89, 0.3)",
              cursor: "pointer",
              transition: "all 0.15s var(--ease-spring)",
            }}
          >
            {estandar?.chosen ? "Cena Elegida para Hoy" : "Elegir Opción Estándar"}
          </button>
        </div>
      </div>
    </div>
  );
}
