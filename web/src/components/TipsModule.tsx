"use client";

import { useState } from "react";
import type { EnergyContract, FamilyInsurance, Warranty, PriceComparison } from "@/lib/repo";
import {
  IconEnergy,
  IconShield,
  IconWarranty,
  IconCart,
  IconSparkles,
  IconClock,
  IconCheck,
} from "./Icons";

export function TipsModule({
  energyContracts = [],
  insurances = [],
  warranties = [],
  priceComparisons = [],
}: {
  energyContracts?: EnergyContract[];
  insurances?: FamilyInsurance[];
  warranties?: Warranty[];
  priceComparisons?: PriceComparison[];
}) {
  const [activeSection, setActiveSection] = useState<"all" | "energy" | "shopping" | "insurance">("all");

  const elecContract = energyContracts.find((c) => c.service === "electricity");
  const gasContract = energyContracts.find((c) => c.service === "gas");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* ── Cabecera de Tips & Optimización del Hogar ── */}
      <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              className="squircle-icon"
              style={{
                background: "rgba(255, 149, 0, 0.15)",
                color: "var(--apple-orange)",
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.3rem",
                boxShadow: "0 2px 10px rgba(255, 149, 0, 0.25)",
              }}
            >
              💡
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
                Tips & Optimización Familiar
              </h2>
              <p style={{ fontSize: "0.8rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
                Consejos automáticos de ahorro energético, cesta de la compra y coberturas del hogar.
              </p>
            </div>
          </div>

          {/* Filtros de sección */}
          <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => setActiveSection("all")}
              className={`tab-btn ${activeSection === "all" ? "active" : ""}`}
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("energy")}
              className={`tab-btn ${activeSection === "energy" ? "active" : ""}`}
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
            >
              ⚡ Energía & Suministros
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("shopping")}
              className={`tab-btn ${activeSection === "shopping" ? "active" : ""}`}
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
            >
              🛒 Compra & Precios
            </button>
            <button
              type="button"
              onClick={() => setActiveSection("insurance")}
              className={`tab-btn ${activeSection === "insurance" ? "active" : ""}`}
              style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
            >
              🛡️ Pólizas & Garantías
            </button>
          </div>
        </div>
      </div>

      {/* ── BLOQUE 1: ENERGÍA & SUMINISTROS (NATURGY) ── */}
      {(activeSection === "all" || activeSection === "energy") && (
        <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "rgba(52, 199, 89, 0.15)",
                color: "var(--apple-green)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconEnergy size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: "0.98rem", fontWeight: 700, margin: 0 }}>
                Suministros Naturgy & Consejos Eléctricos
              </h3>
              <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0 }}>
                Tarifa Fija 24h activa a {elecContract?.energy_price_kwh || 0.123} €/kWh
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.85rem" }}>
            {/* Coche Eléctrico */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-lg)",
                background: "var(--liquid-glass-bg-subtle)",
                border: "1px solid var(--liquid-glass-border)",
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "1.2rem" }}>🚗</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-blue)" }}>
                  Coche Eléctrico (VE)
                </span>
              </div>
              <p style={{ fontSize: "0.82rem", margin: 0, color: "var(--apple-text)", lineHeight: 1.45 }}>
                Ventana óptima: <b>00:00 - 07:30</b> (Periodo P2 Valle). Se evitan picos de potencia conjunta con cocina y calefacción, reduciendo riesgo de disparo del ICP.
              </p>
              <div style={{ marginTop: "0.5rem", fontSize: "0.74rem", color: "var(--apple-green)", fontWeight: 600 }}>
                ✓ Recomendación activa
              </div>
            </div>

            {/* Electrodomésticos de Alto Consumo */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-lg)",
                background: "var(--liquid-glass-bg-subtle)",
                border: "1px solid var(--liquid-glass-border)",
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "1.2rem" }}>🧺</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-blue)" }}>
                  Electrodomésticos de Gran Consumo
                </span>
              </div>
              <p style={{ fontSize: "0.82rem", margin: 0, color: "var(--apple-text)", lineHeight: 1.45 }}>
                Lavavajillas y secadora programados a partir de las <b>23:00</b> o fines de semana para maximizar el margen de potencia contratada en casa.
              </p>
              <div style={{ marginTop: "0.5rem", fontSize: "0.74rem", color: "var(--apple-text-secondary)" }}>
                Tip de confort y seguridad
              </div>
            </div>

            {/* Climatización Térmica */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-lg)",
                background: "var(--liquid-glass-bg-subtle)",
                border: "1px solid var(--liquid-glass-border)",
                boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
                <span style={{ fontSize: "1.2rem" }}>🌡️</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-blue)" }}>
                  Climatización Térmica en Salamanca
                </span>
              </div>
              <p style={{ fontSize: "0.82rem", margin: 0, color: "var(--apple-text)", lineHeight: 1.45 }}>
                Termostato a <b>20.0 °C día</b> y <b>17.5 °C noche</b>. Ventilación natural recomendada entre 13:00 y 15:00 aprovechando la radiación solar.
              </p>
              <div style={{ marginTop: "0.5rem", fontSize: "0.74rem", color: "var(--apple-green)", fontWeight: 600 }}>
                ✓ Eficiencia energética óptima
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BLOQUE 2: COMPRA & PRECIOS ── */}
      {(activeSection === "all" || activeSection === "shopping") && (
        <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "rgba(0, 113, 227, 0.15)",
                color: "var(--apple-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconCart size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: "0.98rem", fontWeight: 700, margin: 0 }}>
                Consejos de Ahorro en Cesta y Despensa
              </h3>
              <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0 }}>
                Optimización de compras habituales entre Mercadona, Carrefour y Lidl
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.85rem" }}>
            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-lg)",
                background: "var(--liquid-glass-bg-subtle)",
                border: "1px solid var(--liquid-glass-border)",
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-text)", marginBottom: "0.3rem" }}>
                🛒 Búsqueda y Reposición Anticipada
              </div>
              <p style={{ fontSize: "0.82rem", margin: 0, color: "var(--apple-text-secondary)", lineHeight: 1.45 }}>
                Usa el selector de existencias en <b>Compra</b>: si fijas un básico al <b>25% o menos</b>, el sistema lo añade automáticamente a la lista para comprarlo en la siguiente visita.
              </p>
            </div>

            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-lg)",
                background: "var(--liquid-glass-bg-subtle)",
                border: "1px solid var(--liquid-glass-border)",
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-text)", marginBottom: "0.3rem" }}>
                🧾 Conciliación con Ticket Fotográfico
              </div>
              <p style={{ fontSize: "0.82rem", margin: 0, color: "var(--apple-text-secondary)", lineHeight: 1.45 }}>
                Al subir la foto del ticket desde el escáner o bot de Telegram, los productos tachados se reponen al <b>100% de stock</b> automáticamente en tu despensa.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── BLOQUE 3: PÓLIZAS & GARANTÍAS ── */}
      {(activeSection === "all" || activeSection === "insurance") && (
        <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "rgba(175, 82, 222, 0.15)",
                color: "var(--apple-purple)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconShield size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: "0.98rem", fontWeight: 700, margin: 0 }}>
                Coberturas Legales, Seguros y Garantías
              </h3>
              <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0 }}>
                Aviso 30 días antes de renovaciones automáticas y seguimiento de 3 años de garantía
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.85rem" }}>
            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-lg)",
                background: "var(--liquid-glass-bg-subtle)",
                border: "1px solid var(--liquid-glass-border)",
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-text)", marginBottom: "0.3rem" }}>
                🛡️ Revisión de Pólizas Anuales
              </div>
              <p style={{ fontSize: "0.82rem", margin: 0, color: "var(--apple-text-secondary)", lineHeight: 1.45 }}>
                Comprueba las primas de Mapfre (Hogar), Línea Directa (Coche) y Sanitas (Salud) en la pestaña <b>Economía</b> antes de su renovación anual para comparar con el mercado.
              </p>
            </div>

            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-lg)",
                background: "var(--liquid-glass-bg-subtle)",
                border: "1px solid var(--liquid-glass-border)",
              }}
            >
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-text)", marginBottom: "0.3rem" }}>
                📑 Garantías de 3 Años
              </div>
              <p style={{ fontSize: "0.82rem", margin: 0, color: "var(--apple-text-secondary)", lineHeight: 1.45 }}>
                Todos los electrodomésticos y compras de valor registradas conservan su ticket digitalizado para cualquier reclamación de servicio técnico oficial.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

