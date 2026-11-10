"use client";

import type { Member } from "@/lib/repo";
import type { Weather } from "@/lib/weather";
import { weatherLabel, kidsOutfit } from "@/lib/weather";
import { IconSparkles, IconSettings } from "./Icons";

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
      {/* Fila superior / barra de estado */}
      <div className="top-bar-header">
        <div className="top-bar-identity">
          <div className="top-bar-status-pill">
            <span className="status-dot-live" />
            <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--apple-blue)" }}>
              ASISTENTE
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--apple-text-tertiary)" }}>•</span>
            <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)", fontWeight: 500 }}>
              Salamanca
            </span>
          </div>

          <h1 className="greeting-title">
            <span>{activeMember ? `${greeting}, ${activeMember.name}` : greeting}</span>
          </h1>
          <p className="greeting-subtitle">{formattedDate}</p>
        </div>

        {/* Acciones de la cabecera */}
        <div className="top-bar-actions">
          {/* Weather Capsule */}
          {wInfo && todayWeather && (
            <div
              className="weather-capsule liquid-pill liquid-specular"
              title={`Mín: ${todayWeather.tMin}° / Máx: ${todayWeather.tMax}°. Ropa: ${outfit.join(" · ")}`}
            >
              <span style={{ fontSize: "1rem" }}>{wInfo.icon}</span>
              <span className="weather-temp">{currentWeather?.temp ?? todayWeather.tMax}°</span>
              <span className="weather-range">
                {todayWeather.tMin}°/{todayWeather.tMax}°
              </span>
              {todayWeather.rainProb >= 25 && (
                <span className="weather-rain">
                  {todayWeather.rainProb}% lluvia
                </span>
              )}
            </div>
          )}

          {/* Selector de perfil activo (Kike / Lara) */}
          {onOpenProfile && (
            <button
              type="button"
              onClick={onOpenProfile}
              className="liquid-pill liquid-specular"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.45rem",
                padding: activeMember ? "0.38rem 0.95rem" : "0.38rem 0.85rem",
                borderRadius: "var(--radius-full)",
                background: activeMember ? `${activeMember.color}1e` : undefined,
                borderColor: activeMember ? `${activeMember.color}66` : undefined,
                cursor: "pointer",
                boxShadow: activeMember ? `0 0 16px ${activeMember.color}33, inset 0 1px 1px var(--liquid-specular-top)` : undefined,
                transition: "all 0.2s var(--ease-spring)",
              }}
              title={activeMember ? `Perfil activo: ${activeMember.name}. Toca para cambiar.` : "Iniciar sesión o elegir perfil"}
              aria-label="Selector de perfil"
            >
              {activeMember ? (
                <>
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: activeMember.color,
                      boxShadow: `0 0 8px ${activeMember.color}`,
                    }}
                  />
                  <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--apple-text)" }}>
                    {activeMember.name}
                  </span>
                  <span style={{ fontSize: "0.62rem", color: activeMember.color, fontWeight: 700 }}>▼</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>
                    Perfil
                  </span>
                </>
              )}
            </button>
          )}

          {/* Botón Asistente (Desktop & Tablet) */}
          <div className="btn-apple-intelligence hide-on-mobile liquid-specular" onClick={onOpenAssistant} role="button" tabIndex={0}>
            <div className="btn-apple-intelligence-inner">
              <span className="ai-status-indicator" />
              <span>Asistente</span>
              <IconSparkles size={14} />
            </div>
          </div>

          {/* Botón Ajustes */}
          <button
            onClick={onOpenSettings}
            className="btn-settings-header liquid-glass-elevated"
            title="Ajustes del sistema"
            aria-label="Ajustes del sistema"
          >
            <IconSettings size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
