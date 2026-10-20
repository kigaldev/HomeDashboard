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
  const [isSpeaking, setIsSpeaking] = useState(false);
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

  const handleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const cleanText = content.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "es-ES";
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const outfit = todayWeather ? kidsOutfit(todayWeather) : [];

  return (
    <div className="glass-card" style={{ padding: "1.35rem", position: "relative" }}>
      {/* Cabecera del Widget estilo Apple */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            className="squircle-icon"
            style={{
              background: kind === "morning" ? "var(--apple-orange-subtle)" : "var(--apple-indigo-subtle)",
              color: kind === "morning" ? "var(--apple-orange)" : "var(--apple-indigo)",
            }}
          >
            {kind === "morning" ? "☀️" : "🌙"}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                Briefing Diario
              </h2>
              <span
                className="badge badge-purple"
                style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}
              >
                Apple Intelligence
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
              {kind === "morning" ? "Plan y estado para empezar el día" : "Cierre y preparación para mañana"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          {/* Botón Escuchar en voz alta */}
          <button
            onClick={handleSpeak}
            className="btn-ghost"
            title={isSpeaking ? "Pausar lectura en voz alta" : "Escuchar briefing con voz"}
            style={{
              padding: "0.35rem 0.65rem",
              borderRadius: "var(--radius-full)",
              background: isSpeaking ? "var(--apple-blue-subtle)" : "transparent",
              color: isSpeaking ? "var(--apple-blue)" : "var(--apple-text-secondary)",
              fontWeight: 600,
              fontSize: "0.8rem",
            }}
          >
            <span>{isSpeaking ? "⏹️ Detener" : "🔊 Escuchar"}</span>
          </button>

          {/* Toggle Mañana / Noche (Segmented control) */}
          <div
            style={{
              display: "inline-flex",
              padding: "2px",
              background: "light-dark(rgba(118,118,128,0.12), rgba(118,118,128,0.24))",
              borderRadius: "var(--radius-full)",
            }}
          >
            <button
              onClick={() => handleGenerate("morning")}
              disabled={isPending}
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: "var(--radius-full)",
                fontSize: "0.78rem",
                fontWeight: kind === "morning" ? 600 : 500,
                background: kind === "morning" ? "var(--apple-surface-elevated)" : "transparent",
                color: kind === "morning" ? "var(--apple-text)" : "var(--apple-text-secondary)",
                boxShadow: kind === "morning" ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s var(--ease-spring)",
              }}
            >
              Mañana
            </button>
            <button
              onClick={() => handleGenerate("evening")}
              disabled={isPending}
              style={{
                padding: "0.3rem 0.75rem",
                borderRadius: "var(--radius-full)",
                fontSize: "0.78rem",
                fontWeight: kind === "evening" ? 600 : 500,
                background: kind === "evening" ? "var(--apple-surface-elevated)" : "transparent",
                color: kind === "evening" ? "var(--apple-text)" : "var(--apple-text-secondary)",
                boxShadow: kind === "evening" ? "0 2px 6px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s var(--ease-spring)",
              }}
            >
              Noche
            </button>
          </div>
        </div>
      </div>

      {/* Ropa recomendada estilo Apple Weather Advice */}
      {outfit.length > 0 && (
        <div
          style={{
            background: "var(--apple-teal-subtle)",
            border: "1px solid rgba(48, 176, 199, 0.25)",
            borderRadius: "var(--radius-md)",
            padding: "0.65rem 0.95rem",
            marginBottom: "1rem",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <span style={{ fontSize: "1.2rem" }}>🧥</span>
          <div>
            <span style={{ color: "var(--apple-teal)", fontWeight: 700 }}>Vestimenta recomendada para los peques:</span>{" "}
            <span style={{ color: "var(--apple-text)", fontWeight: 500 }}>{outfit.join(" · ")}</span>
          </div>
        </div>
      )}

      {/* Cuerpo del Briefing */}
      <div
        style={{
          lineHeight: 1.65,
          fontSize: "0.925rem",
          whiteSpace: "pre-line",
          maxHeight: "320px",
          overflowY: "auto",
          paddingRight: "0.5rem",
          color: "var(--apple-text)",
          opacity: isPending ? 0.5 : 1,
          transition: "opacity 0.2s ease",
        }}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {isPending && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginTop: "0.85rem",
            fontSize: "0.825rem",
            color: "var(--apple-purple)",
            fontWeight: 500,
          }}
        >
          <span className="pulse-indicator" style={{ background: "var(--apple-purple)" }} />
          <span>Sincronizando briefing inteligente para la familia...</span>
        </div>
      )}
    </div>
  );
}
