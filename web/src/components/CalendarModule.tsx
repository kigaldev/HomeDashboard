"use client";

import { useState, useTransition, useMemo } from "react";
import { addEventAction, deleteEventAction, syncGoogleCalendarAction } from "@/app/actions";
import type { CalEvent, Member } from "@/lib/repo";
import { timeOf } from "@/lib/dates";
import { IconCalendar, IconPlus, IconRefresh, IconLocation, IconClock } from "./Icons";

interface DayGroup {
  dateKey: string;
  isToday: boolean;
  isTomorrow: boolean;
  dayLabel: string;
  dayNum: string;
  dayWeek: string;
  events: CalEvent[];
}

interface MonthGroup {
  monthKey: string;
  monthTitle: string;
  days: DayGroup[];
  totalEvents: number;
}

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
  const [filterMember, setFilterMember] = useState<number | "all">("all");
  const [filterHorizon, setFilterHorizon] = useState<"7d" | "month" | "all">("all");
  const [isPending, startTransition] = useTransition();

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

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

  // Filtrado y agrupación cronológica por Mes y Día
  const monthGroups = useMemo<MonthGroup[]>(() => {
    // 1. Filtrar eventos por miembro y por horizonte temporal
    const filtered = events.filter((ev) => {
      if (filterMember !== "all" && ev.member_id !== filterMember) {
        return false;
      }
      const evDate = ev.starts_at.slice(0, 10);
      if (filterHorizon === "7d") {
        const todayDate = new Date(today);
        const limitDate = new Date(todayDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const targetDate = new Date(evDate);
        if (targetDate > limitDate) return false;
      } else if (filterHorizon === "month") {
        const currentMonth = today.slice(0, 7);
        if (!evDate.startsWith(currentMonth)) return false;
      }
      return true;
    });

    // 2. Ordenar cronológicamente
    const sorted = [...filtered].sort((a, b) => a.starts_at.localeCompare(b.starts_at));

    // 3. Agrupar por mes y luego por día
    const monthMap = new Map<string, Map<string, CalEvent[]>>();

    for (const ev of sorted) {
      const dateStr = ev.starts_at.slice(0, 10);
      const monthStr = ev.starts_at.slice(0, 7); // YYYY-MM

      if (!monthMap.has(monthStr)) {
        monthMap.set(monthStr, new Map());
      }
      const dayMap = monthMap.get(monthStr)!;
      if (!dayMap.has(dateStr)) {
        dayMap.set(dateStr, []);
      }
      dayMap.get(dateStr)!.push(ev);
    }

    const todayDate = new Date(today);
    const tomorrowDate = new Date(todayDate);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

    const result: MonthGroup[] = [];

    monthMap.forEach((dayMap, monthKey) => {
      const [year, month] = monthKey.split("-");
      const sampleDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const monthTitle = sampleDate
        .toLocaleDateString("es-ES", { month: "long", year: "numeric" })
        .toUpperCase();

      const days: DayGroup[] = [];
      let totalEvents = 0;

      dayMap.forEach((evList, dateKey) => {
        totalEvents += evList.length;
        const d = new Date(dateKey + "T00:00:00");
        const isToday = dateKey === today;
        const isTomorrow = dateKey === tomorrowStr;

        let dayLabel = d.toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
        if (isToday) dayLabel = "Hoy · " + dayLabel;
        else if (isTomorrow) dayLabel = "Mañana · " + dayLabel;

        const dayNum = String(d.getDate()).padStart(2, "0");
        const dayWeek = d.toLocaleDateString("es-ES", { weekday: "short" }).toUpperCase();

        days.push({
          dateKey,
          isToday,
          isTomorrow,
          dayLabel,
          dayNum,
          dayWeek,
          events: evList,
        });
      });

      result.push({
        monthKey,
        monthTitle,
        days,
        totalEvents,
      });
    });

    return result;
  }, [events, today, filterMember, filterHorizon]);

  return (
    <div className="card-apple" style={{ padding: "1.5rem" }}>
      {/* Encabezado Principal */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            className="squircle-icon"
            style={{
              background: "var(--apple-surface-secondary)",
              color: "var(--apple-text)",
              border: "1px solid var(--apple-border)",
            }}
          >
            <IconCalendar size={20} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                Agenda & Cronograma
              </h2>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "0.15rem 0.55rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                  color: "var(--apple-text-secondary)",
                  fontWeight: 600,
                }}
              >
                {events.length} compromisos
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
              Sincronización bidireccional con Google Calendar y agenda del hogar
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.45rem", alignItems: "center" }}>
          <button
            onClick={() =>
              startTransition(async () => {
                await syncGoogleCalendarAction();
              })
            }
            disabled={isPending}
            className="btn-secondary"
            style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem", gap: "0.4rem" }}
            title="Sincronizar eventos de Google Calendar"
          >
            <IconRefresh size={14} className={isPending ? "spin-animation" : ""} />
            <span>Sincronizar</span>
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="btn-primary"
            style={{ fontSize: "0.8rem", padding: "0.45rem 0.95rem", gap: "0.35rem" }}
          >
            <IconPlus size={14} />
            <span>{showAdd ? "Cerrar" : "Nuevo Evento"}</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros Estilo Apple Segments */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.6rem",
          marginBottom: "1.25rem",
          paddingBottom: "0.85rem",
          borderBottom: "1px solid var(--apple-border)",
        }}
      >
        {/* Selector de Miembro */}
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setFilterMember("all")}
            className={`tab-btn ${filterMember === "all" ? "active" : ""}`}
            style={{ fontSize: "0.78rem", padding: "0.3rem 0.75rem" }}
          >
            Toda la familia
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setFilterMember(m.id)}
              className={`tab-btn ${filterMember === m.id ? "active" : ""}`}
              style={{
                fontSize: "0.78rem",
                padding: "0.3rem 0.75rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: m.color,
                }}
              />
              <span>{m.name}</span>
            </button>
          ))}
        </div>

        {/* Selector de Horizonte */}
        <div style={{ display: "flex", gap: "0.25rem" }}>
          <button
            type="button"
            onClick={() => setFilterHorizon("7d")}
            className={`tab-btn ${filterHorizon === "7d" ? "active" : ""}`}
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem" }}
          >
            7 días
          </button>
          <button
            type="button"
            onClick={() => setFilterHorizon("month")}
            className={`tab-btn ${filterHorizon === "month" ? "active" : ""}`}
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem" }}
          >
            Este mes
          </button>
          <button
            type="button"
            onClick={() => setFilterHorizon("all")}
            className={`tab-btn ${filterHorizon === "all" ? "active" : ""}`}
            style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem" }}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Formulario Desplegable para Agregar Evento */}
      {showAdd && (
        <form
          onSubmit={handleAdd}
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.6rem",
            padding: "1.1rem",
            background: "var(--apple-surface-secondary)",
            borderRadius: "var(--radius-lg)",
            marginBottom: "1.25rem",
            border: "1px solid var(--apple-border)",
          }}
        >
          <input
            type="text"
            placeholder="Título del compromiso (ej. Consulta Pediatría, Reunión)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="input-field"
            style={{ flex: "2 1 200px" }}
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="input-field"
            style={{ flex: "1 1 140px" }}
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
            style={{ flex: "1 1 140px" }}
          >
            <option value="">Familiar / Todos</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Ubicación (opcional)..."
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="input-field"
            style={{ flex: "1 1 160px" }}
          />
          <button
            type="submit"
            disabled={isPending}
            className="btn-primary"
            style={{ padding: "0.5rem 1.1rem", fontSize: "0.82rem" }}
          >
            Guardar en Agenda
          </button>
        </form>
      )}

      {/* Timeline Cronológico Agrupado por Mes y Día */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
        {monthGroups.length === 0 ? (
          <div
            style={{
              padding: "2.5rem 1.5rem",
              textAlign: "center",
              color: "var(--apple-text-secondary)",
              background: "var(--apple-surface-secondary)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--apple-border)",
            }}
          >
            <p style={{ fontSize: "0.95rem", fontWeight: 600, margin: 0, color: "var(--apple-text)" }}>
              No hay eventos en este período
            </p>
            <p style={{ fontSize: "0.8rem", margin: 0, marginTop: "0.25rem" }}>
              Pulsa en "Sincronizar" para importar citas de Google Calendar o añade un nuevo evento.
            </p>
          </div>
        ) : (
          monthGroups.map((group) => (
            <div key={group.monthKey} style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {/* Separador de Mes Estilo Apple Calendar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: "0.4rem",
                  borderBottom: "1px solid var(--apple-border-strong)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      color: "var(--apple-text)",
                    }}
                  >
                    {group.monthTitle}
                  </span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: "var(--apple-text-tertiary)",
                    }}
                  >
                    ({group.totalEvents} {group.totalEvents === 1 ? "evento" : "eventos"})
                  </span>
                </div>
              </div>

              {/* Días dentro del mes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {group.days.map((day) => (
                  <div
                    key={day.dateKey}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "70px 1fr",
                      gap: "1rem",
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Badge de Fecha */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        padding: "0.55rem 0.35rem",
                        borderRadius: "var(--radius-md)",
                        background: day.isToday
                          ? "rgba(0, 113, 227, 0.12)"
                          : "var(--apple-surface-secondary)",
                        border: `1px solid ${
                          day.isToday ? "var(--apple-blue)" : "var(--apple-border)"
                        }`,
                        boxShadow: day.isToday ? "0 0 16px rgba(0, 113, 227, 0.2)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          color: day.isToday ? "var(--apple-blue)" : "var(--apple-text-tertiary)",
                        }}
                      >
                        {day.dayWeek}
                      </span>
                      <span
                        style={{
                          fontSize: "1.25rem",
                          fontWeight: 800,
                          lineHeight: 1.1,
                          marginTop: "0.15rem",
                          color: day.isToday ? "var(--apple-blue)" : "var(--apple-text)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {day.dayNum}
                      </span>
                      {day.isToday && (
                        <span
                          style={{
                            fontSize: "0.62rem",
                            fontWeight: 800,
                            letterSpacing: "0.04em",
                            color: "var(--apple-blue)",
                            marginTop: "0.2rem",
                            textTransform: "uppercase",
                          }}
                        >
                          Hoy
                        </span>
                      )}
                      {day.isTomorrow && (
                        <span
                          style={{
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            color: "var(--apple-text-secondary)",
                            marginTop: "0.2rem",
                            textTransform: "uppercase",
                          }}
                        >
                          Mañana
                        </span>
                      )}
                    </div>

                    {/* Lista de Eventos de ese día */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                      {day.events.map((ev) => {
                        const member = ev.member_id ? memberMap.get(ev.member_id) : null;
                        const accent = member?.color || "var(--apple-blue)";
                        const isGoogle = ev.source === "google";

                        return (
                          <div
                            key={ev.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.75rem 0.95rem",
                              background: "var(--apple-surface-secondary)",
                              borderRadius: "var(--radius-md)",
                              border: "1px solid var(--apple-border)",
                              borderLeft: `4px solid ${accent}`,
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flex: 1, minWidth: 0 }}>
                              {/* Horario */}
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.3rem",
                                  minWidth: "75px",
                                  color: accent,
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                }}
                              >
                                <IconClock size={13} />
                                <span>{ev.all_day ? "Todo el día" : timeOf(ev.starts_at)}</span>
                              </div>

                              {/* Título y detalles */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                  <span
                                    style={{
                                      fontSize: "0.9rem",
                                      fontWeight: 600,
                                      color: "var(--apple-text)",
                                      letterSpacing: "-0.01em",
                                    }}
                                  >
                                    {ev.title}
                                  </span>

                                  {member && (
                                    <span
                                      style={{
                                        fontSize: "0.7rem",
                                        padding: "0.1rem 0.45rem",
                                        borderRadius: "var(--radius-full)",
                                        background: `${member.color}18`,
                                        color: member.color,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {member.name}
                                    </span>
                                  )}

                                  {isGoogle && (
                                    <span
                                      style={{
                                        fontSize: "0.68rem",
                                        padding: "0.08rem 0.4rem",
                                        borderRadius: "var(--radius-full)",
                                        background: "rgba(255, 255, 255, 0.06)",
                                        color: "var(--apple-text-tertiary)",
                                        fontWeight: 500,
                                      }}
                                      title="Evento importado de Google Calendar"
                                    >
                                      Google
                                    </span>
                                  )}
                                </div>

                                {ev.location && (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.3rem",
                                      fontSize: "0.75rem",
                                      color: "var(--apple-text-secondary)",
                                      marginTop: "0.2rem",
                                    }}
                                  >
                                    <IconLocation size={12} />
                                    <span>{ev.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Eliminar evento manual */}
                            {!isGoogle && (
                              <button
                                onClick={() => startTransition(() => deleteEventAction(ev.id))}
                                className="btn-ghost"
                                style={{
                                  width: "26px",
                                  height: "26px",
                                  padding: 0,
                                  borderRadius: "50%",
                                  justifyContent: "center",
                                  color: "var(--apple-text-tertiary)",
                                }}
                                title="Eliminar evento"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
