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
      {/* Fila superior / barra de estado en móvil */}
      <div className="top-bar-header">
        <div className="top-bar-identity">
          <div className="top-bar-status-pill">
            <span className="status-dot-live" />
            <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--apple-blue)" }}>
              SEGUNDO CEREBRO
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--apple-text-tertiary)" }}>•</span>
            <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)", fontWeight: 500 }}>
              Salamanca
            </span>
          </div>

          <h1 className="greeting-title">
            <span>{greeting}</span>
            <span className="greeting-icon">🏡</span>
          </h1>
          <p className="greeting-subtitle">{formattedDate}</p>
        </div>

        {/* Acciones de la cabecera */}
        <div className="top-bar-actions">
          {/* Weather Capsule */}
          {wInfo && todayWeather && (
            <div
              className="weather-capsule"
              title={`Mín: ${todayWeather.tMin}° / Máx: ${todayWeather.tMax}°. Ropa: ${outfit.join(" · ")}`}
            >
              <span style={{ fontSize: "1.1rem" }}>{wInfo.icon}</span>
              <span className="weather-temp">{currentWeather?.temp ?? todayWeather.tMax}°</span>
              <span className="weather-range">
                {todayWeather.tMin}°/{todayWeather.tMax}°
              </span>
              {todayWeather.rainProb >= 25 && (
                <span className="weather-rain">
                  🌧️ {todayWeather.rainProb}%
                </span>
              )}
            </div>
          )}

          {/* Avatares familiares compactos */}
          <div className="family-avatar-stack">
            <div style={{ display: "flex", marginLeft: "0.15rem" }}>
              {members.map((m, idx) => (
                <span
                  key={m.id}
                  title={`${m.name} (${m.role === "adult" ? "Adulto" : "Peque"})`}
                  className="family-avatar-item"
                  style={{
                    backgroundColor: `${m.color}22`,
                    borderColor: m.color,
                    marginLeft: idx === 0 ? 0 : "-7px",
                  }}
                >
                  {m.emoji}
                </span>
              ))}
            </div>
          </div>

          {/* Botón Segundo Cerebro (Desktop & Tablet) */}
          <div className="btn-apple-intelligence hide-on-mobile" onClick={onOpenAssistant} role="button" tabIndex={0}>
            <div className="btn-apple-intelligence-inner">
              <span className="ai-status-indicator" />
              <span>Segundo Cerebro</span>
              <span style={{ fontSize: "0.9rem" }}>✨</span>
            </div>
          </div>

          {/* Botón Ajustes */}
          <button
            onClick={onOpenSettings}
            className="btn-settings-header"
            title="Ajustes del hogar"
            aria-label="Ajustes del hogar"
          >
            ⚙️
          </button>
        </div>
      </div>
    </header>
  );
}
