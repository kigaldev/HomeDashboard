"use client";

import { useState } from "react";
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
        <h1 className="greeting-title">
          <span>{greeting}</span>
          <span style={{ fontSize: "1.4rem" }}>🏡</span>
        </h1>
        <p className="greeting-subtitle">{formattedDate}</p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        {/* Píldora del Tiempo */}
        {wInfo && todayWeather && (
          <div className="badge badge-cyan" title={`Mín: ${todayWeather.tMin}° / Máx: ${todayWeather.tMax}°. Ropa peques: ${outfit.join(" · ")}`}>
            <span>{wInfo.icon}</span>
            <span>{currentWeather?.temp ?? todayWeather.tMax}°C {weather?.place}</span>
            {todayWeather.rainProb >= 30 && <span>· 🌧️ {todayWeather.rainProb}%</span>}
          </div>
        )}

        {/* Avatares de la familia */}
        <div style={{ display: "flex", gap: "0.35rem", alignItems: "center", background: "var(--bg-surface)", padding: "0.25rem 0.5rem", borderRadius: "var(--radius-full)", border: "1px solid var(--border-subtle)" }}>
          {members.map((m) => (
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
                background: `${m.color}33`,
                border: `1.5px solid ${m.color}`,
                fontSize: "0.95rem",
              }}
            >
              {m.emoji}
            </span>
          ))}
        </div>

        {/* Botón Segundo Cerebro (IA) */}
        <button
          onClick={onOpenAssistant}
          className="btn-primary"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)", padding: "0.45rem 0.9rem", fontSize: "0.85rem" }}
        >
          <span className="pulse-indicator" style={{ background: "#a7f3d0" }} />
          <span>Segundo Cerebro</span>
        </button>

        {/* Botón Ajustes */}
        <button
          onClick={onOpenSettings}
          className="btn-ghost"
          title="Ajustes de la casa"
          style={{ padding: "0.45rem", borderRadius: "50%" }}
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
