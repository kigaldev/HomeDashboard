"use client";

import { useState, useTransition } from "react";
import { addEventAction, deleteEventAction, syncGoogleCalendarAction } from "@/app/actions";
import type { CalEvent, Member } from "@/lib/repo";
import { timeOf } from "@/lib/dates";

export function CalendarModule({
  events = [],
  members = [],
  today,
}: {
  events: CalEvent[];
  members: Member[];
  today: string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
  const [memberId, setMemberId] = useState("");
  const [location, setLocation] = useState("");
  const [isPending, startTransition] = useTransition();

  const memberMap = new Map(members.map((m) => [m.id, m]));

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    const fd = new FormData();
    fd.append("title", title);
    fd.append("date", date);
    if (time) fd.append("time", time);
    if (memberId) fd.append("memberId", memberId);
    if (location) fd.append("location", location);

    startTransition(async () => {
      await addEventAction(fd);
      setTitle("");
      setTime("");
      setLocation("");
      setShowAdd(false);
    });
  };

  return (
    <div className="glass-card" style={{ padding: "1.35rem" }}>
      {/* Header Apple Style */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            className="squircle-icon"
            style={{
              background: "var(--apple-red-subtle)",
              color: "var(--apple-red)",
            }}
          >
            📅
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
              Agenda Familiar
            </h2>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
              Próximos eventos y citas familiares
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.35rem" }}>
          <button
            onClick={() =>
              startTransition(async () => {
                await syncGoogleCalendarAction();
              })
            }
            disabled={isPending}
            className="btn-ghost"
            style={{ fontSize: "0.78rem", borderRadius: "var(--radius-full)" }}
            title="Sincronizar eventos de Google Calendar"
          >
            🔄 Sync Google
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="btn-ghost"
            style={{ fontSize: "0.8rem", color: "var(--apple-blue)", fontWeight: 600, borderRadius: "var(--radius-full)" }}
          >
            {showAdd ? "Cerrar" : "+ Evento"}
          </button>
        </div>
      </div>

      {showAdd && (
        <form
          onSubmit={handleAdd}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            padding: "1rem",
            background: "var(--apple-surface-secondary)",
            borderRadius: "var(--radius-lg)",
            marginBottom: "1rem",
            border: "1px solid var(--apple-border)",
          }}
        >
          <input
            type="text"
            placeholder="Cita o evento (ej. Dentista, Cumpleaños)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="input-field"
            style={{ flex: "2 1 180px" }}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="input-field"
            style={{ flex: "1 1 130px" }}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input-field"
            style={{ flex: "0 1 110px" }}
          />
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="input-field"
            style={{ flex: "1 1 130px" }}
          >
            <option value="">Familia / Todos</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.emoji} {m.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
            Guardar en Agenda
          </button>
        </form>
      )}

      {/* Lista de eventos estilo Apple Calendar */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: "300px", overflowY: "auto", paddingRight: "0.25rem" }}>
        {events.length === 0 ? (
          <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--apple-text-secondary)" }}>
            <span style={{ fontSize: "1.6rem", display: "block", marginBottom: "0.3rem" }}>✨</span>
            <p style={{ fontSize: "0.88rem", fontWeight: 500, margin: 0 }}>Sin eventos en los próximos días</p>
          </div>
        ) : (
          events.map((ev) => {
            const member = ev.member_id ? memberMap.get(ev.member_id) : null;
            const accent = member?.color || "var(--apple-blue)";

            return (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.65rem 0.85rem",
                  background: "var(--apple-surface-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--apple-border)",
                  borderLeft: `4px solid ${accent}`,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: accent,
                      minWidth: "48px",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {ev.all_day ? "Todo el día" : timeOf(ev.starts_at)}
                  </span>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--apple-text)" }}>
                        {ev.title}
                      </span>
                      {member && (
                        <span style={{ fontSize: "0.72rem", color: member.color, fontWeight: 700 }}>
                          ({member.name})
                        </span>
                      )}
                    </div>
                    {ev.location && (
                      <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                        📍 {ev.location}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => startTransition(() => deleteEventAction(ev.id))}
                  className="btn-ghost"
                  style={{
                    width: "24px",
                    height: "24px",
                    padding: 0,
                    borderRadius: "50%",
                    justifyContent: "center",
                    color: "var(--apple-text-secondary)",
                  }}
                  title="Eliminar evento"
                >
                  ✕
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
