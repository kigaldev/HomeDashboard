"use client";

import type { Member } from "@/lib/repo";
import type { Weather } from "@/lib/weather";
import { weatherLabel, kidsOutfit } from "@/lib/weather";

export function Header({
  members,
  weather,
  greeting,
  formattedDate,
  onOpenSettings,
  onOpenAssistant,
}: {
  members: Member[];
  weather: Weather | null;
  greeting: string;
  formattedDate: string;
  onOpenSettings: () => void;
  onOpenAssistant: () => void;
}) {
  const currentWeather = weather?.current;
  const todayWeather = weather?.days[0];
  const wInfo = currentWeather ? weatherLabel(currentWeather.code) : null;
  const outfit = todayWeather ? kidsOutfit(todayWeather) : [];

  return (
    <header className="top-bar">
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--apple-blue)" }}>
            SEGUNDO CEREBRO FAMILIAR
          </span>
          <span style={{ fontSize: "0.65rem", color: "var(--apple-text-tertiary)" }}>•</span>
          <span style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)", fontWeight: 500 }}>
            Salamanca
          </span>
        </div>
        <h1 className="greeting-title">
          <span>{greeting}</span>
          <span style={{ fontSize: "1.75rem", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}>🏡</span>
        </h1>
        <p className="greeting-subtitle">{formattedDate}</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        {/* Apple Weather Capsule */}
        {wInfo && todayWeather && (
          <div
            title={`Mín: ${todayWeather.tMin}° / Máx: ${todayWeather.tMax}°. Ropa peques: ${outfit.join(" · ")}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.55rem",
              background: "var(--apple-surface)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--apple-border)",
              padding: "0.35rem 0.85rem",
              borderRadius: "var(--radius-full)",
              boxShadow: "var(--shadow-sm)",
              fontSize: "0.825rem",
              fontWeight: 600,
            }}
          >
            <span style={{ fontSize: "1.1rem" }}>{wInfo.icon}</span>
            <span>{currentWeather?.temp ?? todayWeather.tMax}°</span>
            <span style={{ color: "var(--apple-text-secondary)", fontWeight: 500, fontSize: "0.75rem" }}>
              {todayWeather.tMin}° / {todayWeather.tMax}°
            </span>
            {todayWeather.rainProb >= 25 && (
              <span style={{ color: "var(--apple-blue)", fontSize: "0.75rem", fontWeight: 600 }}>
                🌧️ {todayWeather.rainProb}%
              </span>
            )}
          </div>
        )}

        {/* Stack de avatares estilo Apple Family */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "0.25rem 0.6rem 0.25rem 0.4rem",
            background: "var(--apple-surface)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid var(--apple-border)",
            borderRadius: "var(--radius-full)",
            boxShadow: "var(--shadow-sm)",
            gap: "0.25rem",
          }}
        >
          <div style={{ display: "flex", marginLeft: "0.2rem" }}>
            {members.map((m, idx) => (
              <span
                key={m.id}
                title={`${m.name} (${m.role === "adult" ? "Adulto" : "Peque"})${m.allergies ? ` · Alergias: ${m.allergies}` : ""}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: `${m.color}22`,
                  border: `2px solid ${m.color}`,
                  marginLeft: idx === 0 ? 0 : "-6px",
                  fontSize: "0.95rem",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.08)",
                  transition: "transform 0.15s ease",
                  cursor: "pointer",
                }}
              >
                {m.emoji}
              </span>
            ))}
          </div>
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--apple-text-secondary)", marginLeft: "0.35rem" }}>
            Familia
          </span>
        </div>

        {/* Botón Apple Intelligence (Segundo Cerebro) */}
        <div className="btn-apple-intelligence" onClick={onOpenAssistant} role="button" tabIndex={0}>
          <div className="btn-apple-intelligence-inner">
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #FF2D55, #AF52DE)",
                boxShadow: "0 0 8px #AF52DE",
                display: "inline-block",
              }}
            />
            <span>Segundo Cerebro</span>
            <span style={{ fontSize: "0.9rem" }}>✨</span>
          </div>
        </div>

        {/* Botón Ajustes */}
        <button
          onClick={onOpenSettings}
          className="btn-ghost"
          title="Ajustes de la casa"
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--apple-surface)",
            border: "1px solid var(--apple-border)",
            padding: 0,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
