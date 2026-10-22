"use client";

import type { Member } from "@/lib/repo";
import type { Weather } from "@/lib/weather";
import { weatherLabel, kidsOutfit } from "@/lib/weather";

export function Header({
  members,
  currentMemberId = null,
  weather,
  greeting,
  formattedDate,
  onOpenSettings,
  onOpenAssistant,
  onOpenProfile,
}: {
  members: Member[];
  currentMemberId?: number | null;
  weather: Weather | null;
  greeting: string;
  formattedDate: string;
  onOpenSettings: () => void;
  onOpenAssistant: () => void;
  onOpenProfile?: () => void;
}) {
  const currentWeather = weather?.current;
  const todayWeather = weather?.days[0];
  const wInfo = currentWeather ? weatherLabel(currentWeather.code) : null;
  const outfit = todayWeather ? kidsOutfit(todayWeather) : [];
  const activeMember = members.find((m) => m.id === currentMemberId);

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
            <span>{activeMember ? `${greeting}, ${activeMember.name}` : greeting}</span>
            <span className="greeting-icon">{activeMember ? activeMember.emoji : "🏡"}</span>
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

          {/* Selector de perfil activo (Kike / Lara) */}
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: activeMember ? "0.32rem 0.75rem" : "0.35rem 0.65rem",
                borderRadius: "var(--radius-full)",
                background: activeMember ? `${activeMember.color}1e` : "var(--apple-surface-secondary)",
                border: `1.5px solid ${activeMember ? activeMember.color : "var(--apple-border)"}`,
                cursor: "pointer",
                boxShadow: activeMember ? `0 0 12px ${activeMember.color}33` : "none",
                transition: "all 0.15s ease",
              }}
              title={activeMember ? `Perfil activo: ${activeMember.name}. Toca para cambiar.` : "Iniciar sesión o elegir perfil"}
              aria-label="Selector de perfil"
            >
              {activeMember ? (
                <>
                  <span style={{ fontSize: "1.05rem", lineHeight: 1 }}>{activeMember.emoji}</span>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--apple-text)" }}>
                    {activeMember.name}
                  </span>
                  <span style={{ fontSize: "0.62rem", color: activeMember.color, fontWeight: 700 }}>▼</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: "0.95rem" }}>👤</span>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>
                    Perfil
                  </span>
                </>
              )}
            </button>
          )}

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
