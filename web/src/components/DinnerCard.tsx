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
    <div className="glass-card" style={{ padding: "1.35rem" }}>
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

      {/* Recomendación oficial del cole (*) */}
      {schoolDinnerRec && (
        <div
          style={{
            marginBottom: "1.1rem",
            padding: "0.65rem 1rem",
            borderRadius: "var(--radius-md)",
            background: "var(--apple-orange-subtle)",
            border: "1px solid rgba(255, 149, 0, 0.25)",
            fontSize: "0.825rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>⭐</span>
          <span style={{ color: "var(--apple-text)", lineHeight: 1.45 }}>
            <strong style={{ color: "var(--apple-orange)" }}>Pauta del colegio (*):</strong> {schoolDinnerRec} —{" "}
            <em style={{ color: "var(--apple-text-secondary)" }}>Platos sugeridos abajo para equilibrar la jornada.</em>
          </span>
        </div>
      )}

      {/* Grid Bento de 2 Opciones */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
        {/* Opción Cecotec Mambo */}
        <div
          style={{
            padding: "1.15rem",
            borderRadius: "var(--radius-lg)",
            background: mambo?.chosen ? "var(--apple-orange-subtle)" : "var(--apple-surface-secondary)",
            border: mambo?.chosen ? "2px solid var(--apple-orange)" : "1px solid var(--apple-border)",
            boxShadow: mambo?.chosen ? "0 4px 18px rgba(255, 149, 0, 0.2)" : "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
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
            <p style={{ fontSize: "0.83rem", color: "var(--apple-text-secondary)", lineHeight: 1.5, marginBottom: "1rem" }}>
              {mambo?.description || "Programar velocidad y temperatura según receta Mambo."}
            </p>
          </div>

          <button
            onClick={() => handleChoose("mambo")}
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
          style={{
            padding: "1.15rem",
            borderRadius: "var(--radius-lg)",
            background: estandar?.chosen ? "var(--apple-green-subtle)" : "var(--apple-surface-secondary)",
            border: estandar?.chosen ? "2px solid var(--apple-green)" : "1px solid var(--apple-border)",
            boxShadow: estandar?.chosen ? "0 4px 18px rgba(52, 199, 89, 0.2)" : "none",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
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
            <p style={{ fontSize: "0.83rem", color: "var(--apple-text-secondary)", lineHeight: 1.5, marginBottom: "1rem" }}>
              {estandar?.description || "Preparación tradicional rápida y limpia."}
            </p>
          </div>

          <button
            onClick={() => handleChoose("estandar")}
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
