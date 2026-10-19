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
    <div className="glass-card" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem", margin: 0 }}>
          <span>🍲</span>
          <span>Cena de Hoy</span>
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {schoolLunch && (
            <span className="badge badge-amber" title={`Comida en el cole: ${schoolLunch}`} style={{ fontSize: "0.75rem" }}>
              Cole: {schoolLunch.length > 28 ? schoolLunch.slice(0, 28) + "…" : schoolLunch}
            </span>
          )}
          <button
            onClick={handleRegenerate}
            disabled={isPending}
            className="btn-ghost"
            title="Sugerir otras opciones con IA"
            style={{ fontSize: "0.8rem", padding: "0.25rem 0.5rem" }}
          >
            🔄 {isPending ? "Generando..." : "Nuevas ideas"}
          </button>
        </div>
      </div>

      {schoolDinnerRec && (
        <div
          style={{
            marginBottom: "0.9rem",
            padding: "0.55rem 0.85rem",
            borderRadius: "var(--radius-sm)",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.35)",
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>⭐</span>
          <span>
            <strong>Recomendación oficial del cole (*):</strong> {schoolDinnerRec} —{" "}
            <em>Opciones sugeridas a continuación para complementar la comida del mediodía.</em>
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
        {/* Opción Cecotec Mambo */}
        <div
          style={{
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            border: mambo?.chosen ? "2px solid var(--accent-amber)" : "1px solid var(--border-subtle)",
            background: mambo?.chosen ? "var(--accent-amber-subtle)" : "var(--bg-surface)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span className="badge badge-amber" style={{ fontSize: "0.7rem" }}>🤖 Cecotec Mambo</span>
              {mambo?.chosen && <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-amber)" }}>✓ Elegida</span>}
            </div>
            <h3 style={{ fontSize: "0.98rem", fontWeight: 600, marginBottom: "0.4rem" }}>
              {mambo?.title || "Crema de calabacín con quesitos"}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.45, marginBottom: "0.75rem" }}>
              {mambo?.description || "Programar velocidad y temperatura según receta Mambo."}
            </p>
          </div>
          <button
            onClick={() => handleChoose("mambo")}
            disabled={isPending}
            className={mambo?.chosen ? "btn-secondary" : "btn-primary"}
            style={{ width: "100%", fontSize: "0.82rem", padding: "0.45rem", justifyContent: "center" }}
          >
            {mambo?.chosen ? "Cena Seleccionada" : "Elegir Mambo"}
          </button>
        </div>

        {/* Opción Estándar */}
        <div
          style={{
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            border: estandar?.chosen ? "2px solid var(--accent-emerald)" : "1px solid var(--border-subtle)",
            background: estandar?.chosen ? "var(--accent-emerald-subtle)" : "var(--bg-surface)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <span className="badge badge-emerald" style={{ fontSize: "0.7rem" }}>🍳 Estándar (Sartén/Horno)</span>
              {estandar?.chosen && <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-emerald)" }}>✓ Elegida</span>}
            </div>
            <h3 style={{ fontSize: "0.98rem", fontWeight: 600, marginBottom: "0.4rem" }}>
              {estandar?.title || "Tortilla francesa con ensalada"}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.45, marginBottom: "0.75rem" }}>
              {estandar?.description || "Preparación rápida en sartén o plancha."}
            </p>
          </div>
          <button
            onClick={() => handleChoose("estandar")}
            disabled={isPending}
            className={estandar?.chosen ? "btn-secondary" : "btn-primary"}
            style={{ width: "100%", fontSize: "0.82rem", padding: "0.45rem", justifyContent: "center", background: estandar?.chosen ? "" : "linear-gradient(135deg, #10b981, #059669)" }}
          >
            {estandar?.chosen ? "Cena Seleccionada" : "Elegir Estándar"}
          </button>
        </div>
      </div>
    </div>
  );
}
