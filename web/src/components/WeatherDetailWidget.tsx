"use client";

import type { Weather, DayWeather } from "@/lib/weather";
import type { CommuteTraffic } from "@/lib/traffic";
import { weatherLabel, kidsOutfit } from "@/lib/weather";

export function WeatherDetailWidget({
  weather,
  todayWeather,
  traffic,
}: {
  weather: Weather | null;
  todayWeather: DayWeather | null;
  traffic?: CommuteTraffic | null;
}) {
  const current = weather?.current;
  const wInfo = current ? weatherLabel(current.code) : todayWeather ? weatherLabel(todayWeather.code) : null;
  const outfit = todayWeather ? kidsOutfit(todayWeather) : [];

  if (!todayWeather) return null;

  return (
    <div
      className="liquid-glass liquid-specular"
      style={{
        padding: "0.85rem 1rem",
        borderRadius: "var(--radius-xl)",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
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
          width: "140px",
          height: "140px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0, 113, 227, 0.2) 0%, transparent 70%)",
          filter: "blur(24px)",
          pointerEvents: "none",
        }}
      />

      {/* Cabecera del Clima con Temperatura Gigante y Condición */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.1rem" }}>
            <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--apple-blue)" }}>
              CLIMA EN VIVO
            </span>
            <span style={{ fontSize: "0.65rem", color: "var(--apple-text-tertiary)" }}>•</span>
            <span style={{ fontSize: "0.7rem", color: "var(--apple-text-secondary)", fontWeight: 500 }}>
              Salamanca
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.65rem" }}>
            <span style={{ fontSize: "2.35rem", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1, color: "var(--apple-text)" }}>
              {current?.temp ?? todayWeather.tMax}°
            </span>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--apple-text)" }}>
                {wInfo?.text || "Despejado"}
              </span>
              <span style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)" }}>
                Mín: {todayWeather.tMin}° · Máx: {todayWeather.tMax}°
              </span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: "2.5rem", lineHeight: 1, filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.25))" }}>
          {wInfo?.icon || "🌤️"}
        </div>
      </div>

      {/* Métricas Detalladas en Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
        <div
          style={{
            padding: "0.55rem 0.65rem",
            borderRadius: "var(--radius-md)",
            background: "var(--liquid-glass-bg-subtle)",
            border: "1px solid var(--liquid-glass-border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.12rem",
          }}
        >
          <span style={{ fontSize: "0.66rem", color: "var(--apple-text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>
            Lluvia
          </span>
          <span style={{ fontSize: "0.92rem", fontWeight: 700, color: todayWeather.rainProb >= 40 ? "var(--apple-blue)" : "var(--apple-text)" }}>
            {todayWeather.rainProb}%
          </span>
          <span style={{ fontSize: "0.66rem", color: "var(--apple-text-secondary)" }}>
            {todayWeather.rainMm ? `${todayWeather.rainMm} mm` : "Sin aviso"}
          </span>
        </div>

        <div
          style={{
            padding: "0.55rem 0.65rem",
            borderRadius: "var(--radius-md)",
            background: "var(--liquid-glass-bg-subtle)",
            border: "1px solid var(--liquid-glass-border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.12rem",
          }}
        >
          <span style={{ fontSize: "0.66rem", color: "var(--apple-text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>
            Viento
          </span>
          <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--apple-text)" }}>
            {todayWeather.windMax} km/h
          </span>
          <span style={{ fontSize: "0.66rem", color: "var(--apple-text-secondary)" }}>
            {todayWeather.windMax > 30 ? "Rachas fuertes" : "Brisa suave"}
          </span>
        </div>

        <div
          style={{
            padding: "0.55rem 0.65rem",
            borderRadius: "var(--radius-md)",
            background: "var(--liquid-glass-bg-subtle)",
            border: "1px solid var(--liquid-glass-border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.12rem",
          }}
        >
          <span style={{ fontSize: "0.66rem", color: "var(--apple-text-tertiary)", fontWeight: 600, textTransform: "uppercase" }}>
            Índice UV
          </span>
          <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--apple-text)" }}>
            {todayWeather.uvMax}
          </span>
          <span style={{ fontSize: "0.66rem", color: "var(--apple-green)", fontWeight: 600 }}>
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
            padding: "0.4rem 0.7rem",
            borderRadius: "var(--radius-full)",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid var(--liquid-glass-border)",
            fontSize: "0.74rem",
            color: "var(--apple-text-secondary)",
          }}
        >
          <span style={{ fontSize: "0.9rem" }}>🧥</span>
          <span style={{ fontWeight: 600, color: "var(--apple-text)" }}>Fabio & Bruno:</span>
          <span>{outfit.join(" · ")}</span>
        </div>
      )}

      {/* 🚗 Estado del Tráfico en Vivo: Casa (Las Torres, Arapiles) -> Col. Montessori */}
      {traffic && (
        <div
          style={{
            padding: "0.8rem 0.95rem",
            borderRadius: "var(--radius-lg)",
            background: "var(--liquid-glass-bg-subtle)",
            border: "1px solid var(--liquid-glass-border)",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.45rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <span style={{ fontSize: "1.1rem" }}>🚗</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--apple-text)" }}>
                    Tráfico al Cole Montessori
                  </span>
                  <span
                    style={{
                      fontSize: "0.66rem",
                      fontWeight: 700,
                      padding: "0.12rem 0.45rem",
                      borderRadius: "var(--radius-full)",
                      background:
                        traffic.status === "denso"
                          ? "rgba(255, 69, 58, 0.16)"
                          : traffic.status === "moderado"
                          ? "rgba(255, 159, 10, 0.16)"
                          : "rgba(52, 199, 89, 0.16)",
                      color:
                        traffic.status === "denso"
                          ? "var(--apple-red)"
                          : traffic.status === "moderado"
                          ? "var(--apple-orange)"
                          : "var(--apple-green)",
                      border: `1px solid ${
                        traffic.status === "denso"
                          ? "rgba(255, 69, 58, 0.3)"
                          : traffic.status === "moderado"
                          ? "rgba(255, 159, 10, 0.3)"
                          : "rgba(52, 199, 89, 0.3)"
                      }`,
                    }}
                  >
                    {traffic.statusLabel}
                  </span>
                </div>
                <p style={{ margin: "0.1rem 0 0 0", fontSize: "0.7rem", color: "var(--apple-text-secondary)" }}>
                  Desde Las Torres (Arapiles) · {traffic.distanceKm} km por {traffic.fastestRoute}
                </p>
              </div>
            </div>

            {/* Tiempo Estimado Gigante */}
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--apple-text)", letterSpacing: "-0.02em" }}>
                {traffic.durationMinutes} min
              </span>
              <span style={{ display: "block", fontSize: "0.64rem", color: "var(--apple-text-tertiary)" }}>
                {traffic.delayMinutes > 0 ? `+${traffic.delayMinutes} min retención` : "Tiempo habitual"}
              </span>
            </div>
          </div>

          {/* Aviso contextual de tráfico / obras / lluvia */}
          <div
            style={{
              fontSize: "0.72rem",
              lineHeight: 1.35,
              color: "var(--apple-text-secondary)",
              background: "rgba(0, 0, 0, 0.15)",
              padding: "0.35rem 0.6rem",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.45rem",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", minWidth: 0 }}>
              <span style={{ flexShrink: 0 }}>ℹ️</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{traffic.advisory}</span>
            </div>

            {/* Enlace en vivo a Google Maps */}
            <a
              href={traffic.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target"
              style={{
                fontSize: "0.68rem",
                fontWeight: 600,
                color: "var(--apple-blue)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.2rem",
                whiteSpace: "nowrap",
                padding: "0.2rem 0.45rem",
                borderRadius: "var(--radius-full)",
                background: "rgba(0, 113, 227, 0.12)",
                marginLeft: "auto",
              }}
              title="Abrir ruta con tráfico en tiempo real en Google Maps"
            >
              <span>Ver mapa en vivo ↗</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
