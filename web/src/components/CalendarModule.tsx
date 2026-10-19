"use client";

import { useState, useTransition } from "react";
import { addEventAction, deleteEventAction, syncGoogleCalendarAction } from "@/app/actions";
import type { CalEvent, Member } from "@/lib/repo";
import { timeOf } from "@/lib/dates";

export function CalendarModule({
  events,
  members,
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
    <div className="glass-card" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span>📅</span>
          <span>Agenda Familiar</span>
        </h2>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            onClick={() =>
              startTransition(async () => {
                await syncGoogleCalendarAction();
              })
            }
            disabled={isPending}
            className="btn-ghost"
            style={{ fontSize: "0.78rem" }}
            title="Sincronizar eventos de las cuentas de Google Calendar de Kike y Lara"
          >
            🔄 Sincronizar Google
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-ghost" style={{ fontSize: "0.78rem" }}>
            {showAdd ? "Cancelar" : "+ Nuevo evento"}
          </button>
        </div>
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0.75rem", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", marginBottom: "0.85rem", border: "1px solid var(--border-subtle)" }}>
          <input
            type="text"
            placeholder="Cita o evento (ej. Dentista, Cumpleaños)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="input-field"
            style={{ flex: "2 1 180px", fontSize: "0.82rem" }}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="input-field"
            style={{ flex: "1 1 120px", fontSize: "0.82rem" }}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="input-field"
            style={{ flex: "0 1 100px", fontSize: "0.82rem" }}
          />
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="input-field"
            style={{ flex: "1 1 120px", fontSize: "0.82rem" }}
          >
            <option value="">Familia / Todos</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.emoji} {m.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
            Guardar
          </button>
        </form>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "280px", overflowY: "auto" }}>
        {events.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "1.2rem 0" }}>
            Sin eventos en los próximos días 🎉
          </p>
        ) : (
          events.map((ev) => {
            const member = ev.member_id ? memberMap.get(ev.member_id) : null;
            return (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.55rem 0.75rem",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--accent-blue)", minWidth: "48px" }}>
                    {ev.all_day ? "Día" : timeOf(ev.starts_at)}
                  </span>
                  <div>
                    <span style={{ fontSize: "0.88rem", fontWeight: 500 }}>{ev.title}</span>
                    {ev.location && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.4rem" }}>
                        📍 {ev.location}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  {member && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        padding: "0.15rem 0.45rem",
                        borderRadius: "var(--radius-full)",
                        background: `${member.color}22`,
                        color: member.color,
                        fontWeight: 600,
                      }}
                    >
                      {member.emoji} {member.name}
                    </span>
                  )}
                  {ev.source === "manual" && (
                    <button
                      onClick={() => startTransition(() => deleteEventAction(ev.id))}
                      className="btn-ghost"
                      style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem", opacity: 0.6 }}
                      title="Eliminar evento"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
