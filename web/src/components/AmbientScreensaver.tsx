"use client";

import { useState, useEffect, useRef } from "react";
import type { Weather } from "@/lib/weather";
import { weatherLabel } from "@/lib/weather";

export function AmbientScreensaver({
  isActive,
  onDismiss,
  photos = ["/photos/familia-feliz-gallego.jpg"],
  weather,
}: {
  isActive: boolean;
  onDismiss: () => void;
  photos?: string[];
  weather: Weather | null;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Actualizar reloj cada segundo
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("es-ES", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
      setDateStr(
        now.toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })
      );
    }
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rotar fotografías cada 12 segundos si hay varias
  useEffect(() => {
    if (!isActive || photos.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 12000);
    return () => clearInterval(interval);
  }, [isActive, photos]);

  // Si no está activo, no renderizar o mantener invisible
  if (!isActive) return null;

  const currentPhoto = photos[currentIndex] || photos[0] || "/photos/familia-feliz-gallego.jpg";
  const currentTemp = weather?.current?.temp ?? weather?.days?.[0]?.tMax ?? null;
  const wInfo = weather?.current ? weatherLabel(weather.current.code) : null;

  const handlePointerDown = (e: React.PointerEvent) => {
    touchStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    onDismiss();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Fondo de pantalla activo. Toca para volver a la pantalla principal."
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={onDismiss}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "#000000",
        cursor: "pointer",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "manipulation",
        animation: "ambientFadeIn 0.5s ease-out forwards",
      }}
    >
      {/* Fotografía de Fondo en Pantalla Completa */}
      <img
        key={currentPhoto}
        src={currentPhoto}
        alt="Familia Feliz Gallego"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.9) contrast(1.04)",
          animation: "ambientPhotoZoom 20s ease-in-out infinite alternate",
        }}
      />

      {/* Viñeta cinematográfica y degradados suaves */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.45) 85%, rgba(0,0,0,0.75) 100%), linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.1) 40%, transparent 100%), linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 35%)",
          pointerEvents: "none",
        }}
      />

      {/* Reloj y Fecha Minimalista en la esquina superior izquierda */}
      <div
        style={{
          position: "absolute",
          top: "2.5rem",
          left: "2.5rem",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          gap: "0.2rem",
          textShadow: "0 2px 20px rgba(0,0,0,0.8)",
        }}
      >
        <span
          style={{
            fontSize: "clamp(3.5rem, 8vw, 5.5rem)",
            fontWeight: 800,
            lineHeight: 0.95,
            color: "#ffffff",
            letterSpacing: "-0.04em",
          }}
        >
          {timeStr}
        </span>
        <span
          style={{
            fontSize: "1.25rem",
            fontWeight: 500,
            color: "rgba(255, 255, 255, 0.9)",
            textTransform: "capitalize",
            marginTop: "0.35rem",
          }}
        >
          {dateStr}
        </span>
      </div>

      {/* Píldora de Clima en la esquina superior derecha */}
      {currentTemp !== null && (
        <div
          style={{
            position: "absolute",
            top: "2.5rem",
            right: "2.5rem",
            zIndex: 2,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.55rem 1.1rem",
            borderRadius: "var(--radius-full)",
            background: "rgba(0, 0, 0, 0.45)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            color: "#ffffff",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <span style={{ fontSize: "1.5rem" }}>{wInfo?.icon || "🌤️"}</span>
          <span style={{ fontSize: "1.4rem", fontWeight: 700 }}>{currentTemp}°</span>
          <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.75)" }}>Salamanca</span>
        </div>
      )}

      {/* Pie de pantalla: Identificación familiar y llamada a la acción */}
      <div
        style={{
          position: "absolute",
          bottom: "2.2rem",
          left: "2.5rem",
          right: "2.5rem",
          zIndex: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.3rem" }}>🏡</span>
            <h2
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "#ffffff",
                margin: 0,
                letterSpacing: "-0.02em",
                textShadow: "0 2px 14px rgba(0,0,0,0.8)",
              }}
            >
              Familia Feliz Gallego
            </h2>
          </div>
          <p
            style={{
              fontSize: "0.92rem",
              color: "rgba(255, 255, 255, 0.8)",
              margin: "0.3rem 0 0 0",
              textShadow: "0 1px 8px rgba(0,0,0,0.7)",
            }}
          >
            Kike · Lara · Fabio · Bruno
          </p>
        </div>

        {/* Indicador de toque para volver */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 1.1rem",
            borderRadius: "var(--radius-full)",
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.25)",
            color: "#ffffff",
            fontSize: "0.85rem",
            fontWeight: 600,
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          }}
        >
          <span style={{ fontSize: "1rem" }}>👆</span>
          <span>Toca la pantalla para abrir el Dashboard</span>
        </div>
      </div>
    </div>
  );
}
