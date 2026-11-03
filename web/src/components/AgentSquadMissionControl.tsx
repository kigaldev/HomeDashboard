"use client";

import { useState } from "react";
import {
  IconBot,
  IconSparkles,
  IconActivity,
  IconEnergy,
  IconCart,
  IconCalendar,
  IconEconomy,
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconCheck,
} from "./Icons";
import type { Receipt, CalEvent, PerishableAlert, EnergyContract } from "@/lib/repo";

interface AgentSquadMissionControlProps {
  receipts?: Receipt[];
  events?: CalEvent[];
  perishables?: PerishableAlert[];
  energyContracts?: EnergyContract[];
  onOpenAssistant: (initialPrompt?: string) => void;
  onNavigateTab: (tabId: "resumen" | "compra" | "economia" | "familia") => void;
}

export function AgentSquadMissionControl({
  receipts = [],
  events = [],
  perishables = [],
  energyContracts = [],
  onOpenAssistant,
  onNavigateTab,
}: AgentSquadMissionControlProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const latestReceipt = receipts[0];
  const nextEvent = events.find((e) => new Date(e.starts_at) >= new Date()) || events[0];
  const urgentPerishable = perishables[0];
  const elecContract = energyContracts.find((c) => c.service === "electricity");

  const squadAgents = [
    {
      id: "jarvis",
      name: "JARVIS Orchestrator",
      role: "Concierge & Handoffs",
      icon: (s = 18) => <IconBot size={s} />,
      color: "#8B5CF6", // Violeta IA
      bgGlow: "rgba(139, 92, 246, 0.15)",
      status: "active",
      lastAction: "Enrutador activo · Telegram Bot & Web en tiempo real",
      capability: "Coordina al squad y ejecuta cambios con Function Calling nativo.",
      prompt: "Hola JARVIS, ¿cuál es el resumen de operaciones del hogar para hoy?",
    },
    {
      id: "finance",
      name: "Agente de Finanzas",
      role: "OCR Tickets & Comparador",
      icon: (s = 18) => <IconEconomy size={s} />,
      color: "#0071E3", // Apple Blue
      bgGlow: "rgba(0, 113, 227, 0.15)",
      status: "active",
      lastAction: latestReceipt
        ? `Último ticket: ${latestReceipt.company_name} (${latestReceipt.total_amount.toFixed(2)} € - ${latestReceipt.date})`
        : "Auditoría de tickets y precios por supermercado activa",
      capability: "Analiza tickets por foto/PDF, compara precios y categoriza gastos.",
      prompt: "Compara los precios de los productos entre Mercadona, Carrefour y Lidl",
    },
    {
      id: "pantry",
      name: "Agente de Despensa",
      role: "Stock & Básicos Frecuentes",
      icon: (s = 18) => <IconCart size={s} />,
      color: "#FF9500", // Apple Orange
      bgGlow: "rgba(255, 149, 0, 0.15)",
      status: "active",
      lastAction: urgentPerishable
        ? `Atención a perecedero: ${urgentPerishable.name} (caduca pronto)`
        : "Despensa y lista de la compra sincronizadas",
      capability: "Promociona básicos automáticos (+3 compras/mes) y alerta caducidades.",
      prompt: "Dime qué alimentos de la despensa están bajos o próximos a caducar",
    },
    {
      id: "family",
      name: "Agente de Familia",
      role: "Montessori & Agenda",
      icon: (s = 18) => <IconCalendar size={s} />,
      color: "#AF52DE", // Apple Purple
      bgGlow: "rgba(175, 82, 222, 0.15)",
      status: "active",
      lastAction: nextEvent
        ? `Próximo evento: ${nextEvent.title} (${nextEvent.starts_at.slice(0, 10)})`
        : "Turnos escolares y calendario familiar al día",
      capability: "Coordina turnos de Fabio en Montessori, comidas y eventos unificados.",
      prompt: "¿Quién lleva y quién recoge a Fabio del cole Montessori esta semana?",
    },
    {
      id: "energy",
      name: "Agente de Confort",
      role: "Naturgy & Clima",
      icon: (s = 18) => <IconEnergy size={s} />,
      color: "#34C759", // Apple Green
      bgGlow: "rgba(52, 199, 89, 0.15)",
      status: "active",
      lastAction: elecContract
        ? `Tarifa Naturgy: ${elecContract.energy_price_kwh} €/kWh · Carga nocturna VE P2`
        : "Monitor de inercia térmica y tarifas de luz/gas activo",
      capability: "Optimiza horas de recarga del VE, lavadora y calefacción en Salamanca.",
      prompt: "¿A qué horas es óptimo poner la lavadora o cargar el coche hoy?",
    },
  ];

  return (
    <div
      className="glass-card squad-mission-control"
      style={{
        borderRadius: "var(--radius-xl)",
        background: "linear-gradient(180deg, rgba(20, 24, 33, 0.85) 0%, rgba(13, 15, 20, 0.95) 100%)",
        border: "1px solid rgba(139, 92, 246, 0.25)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
        overflow: "hidden",
        marginBottom: "1rem",
        transition: "all 0.25s ease",
      }}
    >
      {/* ── Barra Superior / Toggle Colapsable ── */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: "0.85rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
          borderBottom: isExpanded ? "1px solid rgba(255, 255, 255, 0.07)" : "none",
        }}
        className="touch-target"
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <div
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: "0 2px 10px rgba(139, 92, 246, 0.4)",
            }}
          >
            <IconBot size={16} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#A78BFA",
                }}
              >
                Squad Multiagente del Hogar
              </span>
              <span style={{ fontSize: "0.65rem", color: "rgba(255, 255, 255, 0.3)" }}>•</span>
              <span style={{ fontSize: "0.74rem", color: "var(--apple-text-secondary)", fontWeight: 500 }}>
                Mission Control (FortIA Architecture)
              </span>
            </div>
            <p
              style={{
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "var(--apple-text)",
                margin: "0.1rem 0 0 0",
              }}
            >
              5 Agentes Especializados en Vivo · Memoria Compartida Sincronizada
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <span
            className="badge badge-purple"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.74rem",
              padding: "0.2rem 0.65rem",
              background: "rgba(139, 92, 246, 0.15)",
              border: "1px solid rgba(139, 92, 246, 0.3)",
              color: "#C4B5FD",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#10B981",
                boxShadow: "0 0 6px #10B981",
              }}
            />
            Squad Activo
          </span>

          <button
            type="button"
            className="btn-ghost touch-target"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--apple-text-secondary)",
              padding: 0,
            }}
            aria-label={isExpanded ? "Colapsar Mission Control" : "Desplegar Mission Control"}
          >
            {isExpanded ? <IconChevronDown size={18} /> : <IconChevronRight size={18} />}
          </button>
        </div>
      </div>

      {/* ── Contenido Expandible: Centro de Mando ── */}
      {isExpanded && (
        <div style={{ padding: "1.1rem 1.25rem" }}>
          {/* Grid de los 5 Agentes Especializados */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "0.75rem",
              marginBottom: "1.25rem",
            }}
          >
            {squadAgents.map((ag) => (
              <div
                key={ag.id}
                onClick={() => {
                  setSelectedAgent(selectedAgent === ag.id ? null : ag.id);
                  onOpenAssistant(ag.prompt);
                }}
                className="touch-target"
                style={{
                  padding: "0.85rem 1rem",
                  borderRadius: "var(--radius-lg)",
                  background: selectedAgent === ag.id ? ag.bgGlow : "rgba(255, 255, 255, 0.03)",
                  border: `1.5px solid ${selectedAgent === ag.id ? ag.color : "rgba(255, 255, 255, 0.06)"}`,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: "115px",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "10px",
                        background: ag.bgGlow,
                        color: ag.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `1px solid ${ag.color}33`,
                      }}
                    >
                      {ag.icon(16)}
                    </div>
                    <span
                      style={{
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        padding: "0.15rem 0.45rem",
                        borderRadius: "var(--radius-full)",
                        background: "rgba(16, 185, 129, 0.12)",
                        color: "#10B981",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                      }}
                    >
                      <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#10B981" }} />
                      Live
                    </span>
                  </div>

                  <h4 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--apple-text)", margin: 0 }}>
                    {ag.name}
                  </h4>
                  <p style={{ fontSize: "0.72rem", color: ag.color, fontWeight: 600, margin: "0.1rem 0 0.4rem 0" }}>
                    {ag.role}
                  </p>
                </div>

                <p
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--apple-text-secondary)",
                    margin: 0,
                    lineHeight: "1.25",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={ag.lastAction}
                >
                  {ag.lastAction}
                </p>
              </div>
            ))}
          </div>

          {/* ── Live Agent Activity Stream (Feed en vivo de acciones) ── */}
          <div
            style={{
              padding: "0.95rem 1.1rem",
              borderRadius: "var(--radius-lg)",
              background: "rgba(0, 0, 0, 0.25)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              marginBottom: "1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.65rem" }}>
              <IconActivity size={14} style={{ color: "#A78BFA" }} />
              <h5 style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#C4B5FD", margin: 0 }}>
                Registro de Actividad y Handoffs Recientes
              </h5>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {latestReceipt && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--apple-text)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "#0071E3", fontWeight: 700 }}>[Finanzas]</span>
                    <span>Conciliado ticket de <b>{latestReceipt.company_name}</b> por {latestReceipt.total_amount.toFixed(2)} €</span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--apple-text-secondary)" }}>{latestReceipt.date}</span>
                </div>
              )}

              {nextEvent && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--apple-text)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "#AF52DE", fontWeight: 700 }}>[Familia]</span>
                    <span>Sincronizado evento de agenda: <b>{nextEvent.title}</b></span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--apple-text-secondary)" }}>{nextEvent.starts_at.slice(0, 10)}</span>
                </div>
              )}

              {elecContract && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--apple-text)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "#34C759", fontWeight: 700 }}>[Energía]</span>
                    <span>Tarifa {elecContract.tariff_name} activa ({elecContract.energy_price_kwh} €/kWh)</span>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "var(--apple-text-secondary)" }}>Naturgy</span>
                </div>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.78rem", color: "var(--apple-text)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ color: "#8B5CF6", fontWeight: 700 }}>[JARVIS]</span>
                  <span>Canales activos: Telegram Webhook + Dashboard Web + Function Calling</span>
                </div>
                <span style={{ fontSize: "0.7rem", color: "#10B981" }}>En línea</span>
              </div>
            </div>
          </div>

          {/* ── Botones de Disparo Rápido (Quick Triggers) ── */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)", fontWeight: 600 }}>
              Gatillos rápidos:
            </span>

            <button
              type="button"
              onClick={() => onOpenAssistant("¿A qué hora pongo la lavadora o cargo el coche eléctrico hoy?")}
              className="btn-ghost touch-target"
              style={{
                fontSize: "0.78rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "var(--radius-full)",
                background: "rgba(52, 199, 89, 0.12)",
                color: "var(--apple-green)",
                border: "1px solid rgba(52, 199, 89, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
              }}
            >
              <IconEnergy size={12} />
              Optimizar Coche & Luz
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("economia")}
              className="btn-ghost touch-target"
              style={{
                fontSize: "0.78rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "var(--radius-full)",
                background: "rgba(0, 113, 227, 0.12)",
                color: "var(--apple-blue)",
                border: "1px solid rgba(0, 113, 227, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
              }}
            >
              <IconEconomy size={12} />
              Comparador Precios Súper
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("compra")}
              className="btn-ghost touch-target"
              style={{
                fontSize: "0.78rem",
                padding: "0.35rem 0.75rem",
                borderRadius: "var(--radius-full)",
                background: "rgba(255, 149, 0, 0.12)",
                color: "var(--apple-orange)",
                border: "1px solid rgba(255, 149, 0, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
              }}
            >
              <IconCart size={12} />
              Revisar Despensa & Compra
            </button>

            <button
              type="button"
              onClick={() => onOpenAssistant()}
              className="btn-primary touch-target"
              style={{
                fontSize: "0.78rem",
                padding: "0.35rem 0.85rem",
                borderRadius: "var(--radius-full)",
                background: "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)",
                border: "none",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                cursor: "pointer",
                boxShadow: "0 2px 10px rgba(139, 92, 246, 0.35)",
              }}
            >
              <IconSparkles size={13} />
              Hablar con el Squad
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
