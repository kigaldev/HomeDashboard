"use client";

import type { Weather, DayWeather } from "@/lib/weather";
import { weatherLabel, kidsOutfit } from "@/lib/weather";
import { IconClock } from "./Icons";

export function WeatherDetailWidget({
  weather,
  todayWeather,
}: {
  weather: Weather | null;
  todayWeather: DayWeather | null;
}) {
  const current = weather?.current;
  const wInfo = current ? weatherLabel(current.code) : todayWeather ? weatherLabel(todayWeather.code) : null;
  const outfit = todayWeather ? kidsOutfit(todayWeather) : [];

  if (!todayWeather) return null;

  return (
    <div
      className="liquid-glass liquid-specular"
      style={{
        padding: "1.25rem 1.35rem",
        borderRadius: "var(--radius-xl)",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Resplandor atmosférico de fondo */}
      <div
        style={{
          position: "absolute",
          top: "-30px",
          right: "-30px",
          width: "160px",
          height: "160px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0, 113, 227, 0.25) 0%, transparent 70%)",
          filter: "blur(24px)",
          pointerEvents: "none",
        }}
      />

      {/* Cabecera del Clima con Temperatura Gigante y Condición */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--apple-blue)" }}>
              CLIMA EN VIVO
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--apple-text-tertiary)" }}>•</span>
            <span style={{ fontSize: "0.74rem", color: "var(--apple-text-secondary)", fontWeight: 500 }}>
              Salamanca
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
            <span style={{ fontSize: "3rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--apple-text)" }}>
              {current?.temp ?? todayWeather.tMax}°
            </span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--apple-text)" }}>
                {wInfo?.text || "Despejado"}
              </span>
              <span style={{ fontSize: "0.82rem", color: "var(--apple-text-secondary)" }}>
                Mín: {todayWeather.tMin}° · Máx: {todayWeather.tMax}°
              </span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: "3.2rem", lineHeight: 1, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.25))" }}>
          {wInfo?.icon || "🌤️"}
        </div>
      </div>

      {/* Métricas Detalladas en Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.55rem" }}>
        <div
          style={{
            padding: "0.6rem 0.75rem",
            borderRadius: "var(--radius-md)",
            background: "var(--liquid-glass-bg-subtle)",
            border: "1px solid var(--liquid-glass-border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.15rem",
          }}
        >
          <span style={{ fontSize: "0.68rem", color: "var(--apple-text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>
            Lluvia
          </span>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: todayWeather.rainProb >= 40 ? "var(--apple-blue)" : "var(--apple-text)" }}>
            {todayWeather.rainProb}%
          </span>
          <span style={{ fontSize: "0.68rem", color: "var(--apple-text-secondary)" }}>
            {todayWeather.rainMm ? `${todayWeather.rainMm} mm` : "Sin aviso"}
          </span>
        </div>

        <div
          style={{
            padding: "0.6rem 0.75rem",
            borderRadius: "var(--radius-md)",
            background: "var(--liquid-glass-bg-subtle)",
            border: "1px solid var(--liquid-glass-border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.15rem",
          }}
        >
          <span style={{ fontSize: "0.68rem", color: "var(--apple-text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>
            Viento
          </span>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--apple-text)" }}>
            {todayWeather.windMax} km/h
          </span>
          <span style={{ fontSize: "0.68rem", color: "var(--apple-text-secondary)" }}>
            {todayWeather.windMax > 30 ? "Rachas fuertes" : "Brisa suave"}
          </span>
        </div>

        <div
          style={{
            padding: "0.6rem 0.75rem",
            borderRadius: "var(--radius-md)",
            background: "var(--liquid-glass-bg-subtle)",
            border: "1px solid var(--liquid-glass-border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.15rem",
          }}
        >
          <span style={{ fontSize: "0.68rem", color: "var(--apple-text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>
            Índice UV
          </span>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--apple-text)" }}>
            {todayWeather.uvMax}
          </span>
          <span style={{ fontSize: "0.68rem", color: "var(--apple-green)", fontWeight: 600 }}>
            Bajo
          </span>
        </div>
      </div>

      {/* Ropa recomendada para los peques */}
      {outfit.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            padding: "0.45rem 0.75rem",
            borderRadius: "var(--radius-full)",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid var(--liquid-glass-border)",
            fontSize: "0.76rem",
            color: "var(--apple-text-secondary)",
          }}
        >
          <span style={{ fontSize: "0.95rem" }}>🧥</span>
          <span style={{ fontWeight: 600, color: "var(--apple-text)" }}>Fabio & Bruno:</span>
          <span>{outfit.join(" · ")}</span>
        </div>
      )}
    </div>
  );
}
