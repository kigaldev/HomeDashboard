"use client";

import { useState, useMemo } from "react";
import type { CalEvent, Member } from "@/lib/repo";
import { timeOf } from "@/lib/dates";
import { IconCalendar, IconClock, IconLocation, IconPlus } from "./Icons";

export function MiniUpcomingAgenda({
  events = [],
  members = [],
  today,
  onOpenFullAgenda,
}: {
  events: CalEvent[];
  members: Member[];
  today: string;
  onOpenFullAgenda: () => void;
}) {
  // Estado para filtrar por miembro: null = Todos, 1 = Kike, 2 = Lara
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  const kike = members.find((m) => m.name.toLowerCase() === "kike");
  const lara = members.find((m) => m.name.toLowerCase() === "lara");
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  // Filtrado de eventos de hoy en la ventana de las próximas 3 horas
  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const threeHoursFromNow = new Date(now.getTime() + 3 * 60 * 60 * 1000);

    return events.filter((ev) => {
      // Filtrar por miembro si está seleccionado
      if (selectedMemberId && ev.member_id !== selectedMemberId) {
        return false;
      }

      // Eventos del día de hoy
      if (!ev.starts_at || !ev.starts_at.startsWith(today)) {
        return false;
      }

      if (ev.all_day) return true;

      try {
        const evDate = new Date(ev.starts_at);
        // Margen de 30 minutos pasados por si el evento está en curso
        const marginPast = new Date(now.getTime() - 30 * 60 * 1000);
        return evDate >= marginPast && evDate <= threeHoursFromNow;
      } catch {
        return true;
      }
    });
  }, [events, today, selectedMemberId]);

  // Si no hay ninguno en las próximas 3 horas exactas, mostrar los siguientes de hoy
  const fallbackEvents = useMemo(() => {
    if (upcomingEvents.length > 0) return upcomingEvents;
    return events
      .filter((ev) => {
        if (selectedMemberId && ev.member_id !== selectedMemberId) return false;
        return ev.starts_at && ev.starts_at.startsWith(today);
      })
      .slice(0, 3);
  }, [events, today, selectedMemberId, upcomingEvents]);

  const activeMemberName = selectedMemberId === kike?.id ? "Kike" : selectedMemberId === lara?.id ? "Lara" : "Todos";

  return (
    <div
      className="liquid-glass liquid-specular"
      style={{
        padding: "1rem 1.25rem",
        borderRadius: "var(--radius-xl)",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      {/* Cabecera del Widget con Selector de Kike / Lara y Botón + */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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
            <IconCalendar size={15} />
          </div>
          <div>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
              Agenda · Próximas 3 Horas
            </h3>
            <p style={{ fontSize: "0.74rem", color: "var(--apple-text-secondary)", margin: 0 }}>
              Filtro: {activeMemberName}
            </p>
          </div>
        </div>

        {/* Acciones: Selector de Kike / Lara + Botón '+' para ver agenda completa */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {/* Selector de Kike */}
          {kike && (
            <button
              type="button"
              onClick={() => setSelectedMemberId(selectedMemberId === kike.id ? null : kike.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.22rem 0.55rem",
                borderRadius: "var(--radius-full)",
                border: `1px solid ${selectedMemberId === kike.id ? kike.color : "var(--liquid-glass-border)"}`,
                background: selectedMemberId === kike.id ? `${kike.color}25` : "rgba(255, 255, 255, 0.04)",
                color: selectedMemberId === kike.id ? "#ffffff" : "var(--apple-text-secondary)",
                fontSize: "0.74rem",
                fontWeight: selectedMemberId === kike.id ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Filtrar agenda de Kike"
            >
              <span>{kike.emoji}</span>
              <span>Kike</span>
            </button>
          )}

          {/* Selector de Lara */}
          {lara && (
            <button
              type="button"
              onClick={() => setSelectedMemberId(selectedMemberId === lara.id ? null : lara.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                padding: "0.22rem 0.55rem",
                borderRadius: "var(--radius-full)",
                border: `1px solid ${selectedMemberId === lara.id ? lara.color : "var(--liquid-glass-border)"}`,
                background: selectedMemberId === lara.id ? `${lara.color}25` : "rgba(255, 255, 255, 0.04)",
                color: selectedMemberId === lara.id ? "#ffffff" : "var(--apple-text-secondary)",
                fontSize: "0.74rem",
                fontWeight: selectedMemberId === lara.id ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="Filtrar agenda de Lara"
            >
              <span>{lara.emoji}</span>
              <span>Lara</span>
            </button>
          )}

          {/* Botón '+' para ver la pestaña completa de Agenda */}
          <button
            type="button"
            onClick={onOpenFullAgenda}
            className="btn-primary touch-target"
            style={{
              width: "30px",
              height: "30px",
              padding: 0,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0, 113, 227, 0.3)",
            }}
            title="Ver agenda completa de la familia (+)"
            aria-label="Ver agenda completa de la familia"
          >
            <IconPlus size={16} />
          </button>
        </div>
      </div>

      {/* Lista de Eventos */}
      {fallbackEvents.length === 0 ? (
        <div
          style={{
            padding: "0.85rem 1rem",
            textAlign: "center",
            borderRadius: "var(--radius-md)",
            background: "var(--liquid-glass-bg-subtle)",
            color: "var(--apple-text-secondary)",
            fontSize: "0.82rem",
            border: "1px dashed var(--liquid-glass-border)",
          }}
        >
          Todo despejado en las próximas 3 horas ✨
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {fallbackEvents.map((ev) => {
            const member = ev.member_id ? memberMap.get(ev.member_id) : null;
            const accent = member?.color || "var(--apple-blue)";

            return (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--liquid-glass-bg-subtle)",
                  border: "1px solid var(--liquid-glass-border)",
                  borderLeft: `3px solid ${accent}`,
                  gap: "0.6rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: accent,
                      flexShrink: 0,
                    }}
                  >
                    <IconClock size={12} />
                    <span>{ev.all_day ? "Día" : timeOf(ev.starts_at)}</span>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        fontSize: "0.84rem",
                        fontWeight: 600,
                        color: "var(--apple-text)",
                        display: "block",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {ev.title}
                    </span>
                    {ev.location && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--apple-text-secondary)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.2rem",
                        }}
                      >
                        <IconLocation size={10} />
                        <span>{ev.location}</span>
                      </span>
                    )}
                  </div>
                </div>

                {member && (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      padding: "0.1rem 0.45rem",
                      borderRadius: "var(--radius-full)",
                      background: `${member.color}15`,
                      color: member.color,
                      fontWeight: 600,
                      border: `1px solid ${member.color}30`,
                      flexShrink: 0,
                    }}
                  >
                    {member.emoji} {member.name}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

