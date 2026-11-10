"use client";

import { useState } from "react";
import type { NewsItem } from "@/lib/news";
import { IconSparkles } from "./Icons";

export function NewsWidget({
  espanaNews = [],
  cylNews = [],
}: {
  espanaNews: NewsItem[];
  cylNews: NewsItem[];
}) {
  const [selectedRegion, setSelectedRegion] = useState<"espana" | "cyl">("cyl");
  const [isExpanded, setIsExpanded] = useState(false);

  const currentList = selectedRegion === "cyl" ? cylNews : espanaNews;

  return (
    <div
      className="liquid-glass liquid-specular"
      style={{
        padding: "0.85rem 1rem",
        borderRadius: "var(--radius-xl)",
        display: "flex",
        flexDirection: "column",
        gap: "0.6rem",
      }}
    >
      {/* Cabecera del widget con selector de región */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem" }}>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "rgba(10, 132, 255, 0.15)",
              color: "var(--apple-blue)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
            }}
          >
            📰
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span className="status-dot-live" />
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                Titulares de Última Hora
              </h3>
            </div>
            <p style={{ fontSize: "0.74rem", color: "var(--apple-text-secondary)", margin: 0 }}>
              Actualidad verificada en tiempo real
            </p>
          </div>
        </div>

        {/* Selector de Región (Castilla y León / España) */}
        <div
          style={{
            display: "inline-flex",
            padding: "2px",
            background: "rgba(255, 255, 255, 0.06)",
            borderRadius: "var(--radius-full)",
            border: "1px solid var(--liquid-glass-border)",
            gap: "2px",
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedRegion("cyl")}
            style={{
              padding: "0.25rem 0.65rem",
              fontSize: "0.74rem",
              fontWeight: selectedRegion === "cyl" ? 700 : 500,
              borderRadius: "var(--radius-full)",
              border: "none",
              background: selectedRegion === "cyl" ? "var(--apple-blue)" : "transparent",
              color: selectedRegion === "cyl" ? "#ffffff" : "var(--apple-text-secondary)",
              boxShadow: selectedRegion === "cyl" ? "0 2px 8px rgba(10, 132, 255, 0.3)" : "none",
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
          >
            🏰 Castilla y León
          </button>
          <button
            type="button"
            onClick={() => setSelectedRegion("espana")}
            style={{
              padding: "0.25rem 0.65rem",
              fontSize: "0.74rem",
              fontWeight: selectedRegion === "espana" ? 700 : 500,
              borderRadius: "var(--radius-full)",
              border: "none",
              background: selectedRegion === "espana" ? "var(--apple-blue)" : "transparent",
              color: selectedRegion === "espana" ? "#ffffff" : "var(--apple-text-secondary)",
              boxShadow: selectedRegion === "espana" ? "0 2px 8px rgba(10, 132, 255, 0.3)" : "none",
              cursor: "pointer",
              transition: "all 0.18s ease",
            }}
          >
            🇪🇸 España
          </button>

          {/* Botón Plegar / Desplegar */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-ghost touch-target"
            style={{
              padding: "0.22rem 0.55rem",
              borderRadius: "var(--radius-full)",
              fontSize: "0.74rem",
              fontWeight: 600,
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid var(--liquid-glass-border)",
              color: "var(--apple-text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              cursor: "pointer",
              marginLeft: "0.3rem",
            }}
          >
            <span>{isExpanded ? "Plegar ▲" : `Titulares (${currentList.length}) ▼`}</span>
          </button>
        </div>
      </div>

      {/* Lista de Titulares (Plegable para Kiosk) */}
      {isExpanded ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {currentList.slice(0, 3).map((item, idx) => (
            <a
              key={item.id || idx}
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.65rem",
                padding: "0.45rem 0.65rem",
                borderRadius: "var(--radius-md)",
                background: "var(--liquid-glass-bg-subtle)",
                border: "1px solid var(--liquid-glass-border)",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.borderColor = "var(--apple-blue)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "var(--liquid-glass-bg-subtle)";
                e.currentTarget.style.borderColor = "var(--liquid-glass-border)";
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    color: "var(--apple-text)",
                    lineHeight: 1.35,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {item.title}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginTop: "0.25rem" }}>
                  <span
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: "var(--apple-blue)",
                      background: "rgba(10, 132, 255, 0.12)",
                      padding: "0.1rem 0.45rem",
                      borderRadius: "var(--radius-full)",
                    }}
                  >
                    {item.source}
                  </span>
                  {item.timeAgo && (
                    <span style={{ fontSize: "0.68rem", color: "var(--apple-text-tertiary)" }}>
                      {item.timeAgo}
                    </span>
                  )}
                </div>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--apple-text-tertiary)", marginTop: "0.1rem" }}>
                ↗
              </span>
            </a>
          ))}
        </div>
      ) : (
        /* Titular único compacto en 1 línea cuando está plegado */
        currentList[0] && (
          <a
            href={currentList[0].link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.6rem",
              padding: "0.35rem 0.65rem",
              borderRadius: "var(--radius-md)",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid var(--liquid-glass-border)",
              fontSize: "0.78rem",
            }}
          >
            <span style={{ color: "var(--apple-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              📢 <b>{currentList[0].source}:</b> {currentList[0].title}
            </span>
            <span style={{ color: "var(--apple-blue)", fontSize: "0.72rem", flexShrink: 0, fontWeight: 600 }}>Leer ↗</span>
          </a>
        )
      )}
    </div>
  );
}

