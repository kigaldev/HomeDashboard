"use client";

import { useState, useTransition } from "react";
import { generateBriefingAction } from "@/app/actions";
import type { DayWeather } from "@/lib/weather";
import { kidsOutfit } from "@/lib/weather";

export function BriefingCard({
  initialContent,
  todayWeather,
}: {
  initialContent: string | null;
  todayWeather: DayWeather | null;
}) {
  const [content, setContent] = useState<string>(
    initialContent ||
      "☀️ <b>Bienvenido a tu Home Dashboard</b>.<br/>Haz clic en 'Generar Briefing' para sincronizar tu día con IA."
  );
  const [kind, setKind] = useState<"morning" | "evening">("morning");
  const [isPending, startTransition] = useTransition();

  const handleGenerate = (k: "morning" | "evening") => {
    setKind(k);
    startTransition(async () => {
      try {
        const res = await generateBriefingAction(k);
        setContent(res);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const outfit = todayWeather ? kidsOutfit(todayWeather) : [];

  return (
    <div className="glass-card" style={{ padding: "1.25rem", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h2 style={{ fontSize: "1.15rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span>{kind === "morning" ? "☀️" : "🌙"}</span>
            <span>Briefing Diario</span>
          </h2>
          <span className="badge badge-purple" style={{ fontSize: "0.75rem" }}>IA Activa</span>
        </div>

        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button
            onClick={() => handleGenerate("morning")}
            disabled={isPending}
            className={`btn-ghost ${kind === "morning" ? "badge-blue" : ""}`}
            style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
          >
            ☀️ Mañana
          </button>
          <button
            onClick={() => handleGenerate("evening")}
            disabled={isPending}
            className={`btn-ghost ${kind === "evening" ? "badge-amber" : ""}`}
            style={{ fontSize: "0.8rem", padding: "0.3rem 0.6rem" }}
          >
            🌙 Noche
          </button>
        </div>
      </div>

      {/* Ropa recomendada para los peques */}
      {outfit.length > 0 && (
        <div style={{ background: "var(--accent-cyan-subtle)", border: "1px solid rgba(6, 182, 212, 0.25)", borderRadius: "var(--radius-sm)", padding: "0.6rem 0.8rem", marginBottom: "0.85rem", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.1rem" }}>👕</span>
          <div>
            <strong style={{ color: "var(--accent-cyan)" }}>Ropa para los niños hoy:</strong>{" "}
            <span>{outfit.join(" · ")}</span>
          </div>
        </div>
      )}

      {/* Contenido HTML del Briefing */}
      <div
        style={{
          lineHeight: 1.6,
          fontSize: "0.92rem",
          whiteSpace: "pre-line",
          maxHeight: "340px",
          overflowY: "auto",
          paddingRight: "0.5rem",
          opacity: isPending ? 0.6 : 1,
          transition: "opacity 0.2s",
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {isPending && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
          <span className="pulse-indicator" style={{ background: "var(--accent-purple)" }} />
          <span>Generando briefing personalizado con IA local...</span>
        </div>
      )}
    </div>
  );
}
