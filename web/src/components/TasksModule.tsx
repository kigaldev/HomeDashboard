"use client";

import { useState, useTransition } from "react";
import {
  addTaskAction,
  toggleTaskAction,
  deleteTaskAction,
  updateTaskAssigneeAction,
} from "@/app/actions";
import type { Task, Member } from "@/lib/repo";

const PRESET_TASKS = [
  { label: "🧺 Poner lavadora", text: "Poner lavadora", rec: "" },
  { label: "👕 Tender la colada", text: "Tender la colada", rec: "" },
  { label: "👔 Doblar y guardar ropa", text: "Doblar y guardar ropa", rec: "" },
  { label: "🍽️ Vaciar lavavajillas", text: "Vaciar lavavajillas", rec: "daily" },
  { label: "🫧 Poner lavavajillas", text: "Poner lavavajillas", rec: "daily" },
  { label: "🗑️ Bajar basura y reciclaje", text: "Bajar la basura y reciclaje", rec: "daily" },
  { label: "🧹 Pasar aspiradora / Roomba", text: "Pasar la aspiradora", rec: "weekly" },
  { label: "🧽 Limpiar baños", text: "Limpiar cuartos de baño", rec: "weekly" },
  { label: "🍳 Limpiar cocina a fondo", text: "Limpiar la cocina", rec: "weekly" },
  { label: "🛏️ Cambiar sábanas y toallas", text: "Cambiar sábanas y toallas", rec: "weekly" },
  { label: "🪟 Limpiar polvo y superficies", text: "Limpiar el polvo y muebles", rec: "weekly" },
  { label: "🛒 Compra semanal", text: "Hacer compra semanal", rec: "weekly" },
  { label: "🥫 Revisar despensa y nevera", text: "Revisar despensa y caducidades", rec: "weekly" },
  { label: "🪴 Regar plantas", text: "Regar las plantas", rec: "weekly" },
  { label: "🎒 Preparar mochilas del cole", text: "Preparar mochilas del cole", rec: "daily" },
  { label: "🩺 Pedir cita médico / dentista", text: "Pedir cita médico / pediatra", rec: "" },
  { label: "🚗 Revisión / ITV coche", text: "Pasar la ITV / revisión del coche", rec: "" },
];

const ASSIGNEE_OPTIONS = [
  { id: 1, name: "Kike", emoji: "👨", color: "#3b82f6" },
  { id: 2, name: "Lara", emoji: "👩", color: "#ec4899" },
  { id: 0, name: "Ambos", emoji: "👥", color: "#8b5cf6" },
];

function getWeekDays(referenceDate: Date = new Date()) {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 es Domingo
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const days: { dateStr: string; dayName: string; dayNumber: number; isToday: boolean }[] = [];
  const names = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const todayStr = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const dateStr = cur.toISOString().slice(0, 10);
    days.push({
      dateStr,
      dayName: names[i],
      dayNumber: cur.getDate(),
      isToday: dateStr === todayStr,
    });
  }
  return days;
}

export function TasksModule({
  tasks = [],
  members = [],
  currentMemberId = null,
}: {
  tasks: Task[];
  members: Member[];
  currentMemberId?: number | null;
}) {
  const [viewMode, setViewMode] = useState<"list" | "quadrant" | "stats">("list");
  const [filterAssignee, setFilterAssignee] = useState<number | "all">(
    currentMemberId !== null && currentMemberId !== undefined ? currentMemberId : "all"
  );
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState<string>(
    currentMemberId !== null && currentMemberId !== undefined ? currentMemberId.toString() : "0"
  );
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [newRecurrence, setNewRecurrence] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const memberMap = new Map(members.map((m) => [m.id, m]));
  // Asegurar entrada de "Ambos" en el mapa
  if (!memberMap.has(0)) {
    memberMap.set(0, { id: 0, name: "Ambos", role: "adult", emoji: "👥", color: "#8b5cf6" } as Member);
  }

  const getAssignee = (id: number | null | undefined) => {
    if (id === null || id === undefined) return null;
    return memberMap.get(id) || (id === 0 ? { id: 0, name: "Ambos", emoji: "👥", color: "#8b5cf6" } : null);
  };

  const filteredTasks = tasks.filter((t) => {
    if (filterAssignee === "all") return true;
    return t.assignee_id === filterAssignee;
  });

  const pendingCount = tasks.filter((t) => !t.done).length;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const fd = new FormData();
    fd.append("title", newTitle);
    if (newAssignee !== "") fd.append("assigneeId", newAssignee);
    if (newDueDate) fd.append("dueDate", newDueDate);
    if (newRecurrence) fd.append("recurrence", newRecurrence);

    startTransition(async () => {
      await addTaskAction(fd);
      setNewTitle("");
      setNewAssignee(currentMemberId !== null && currentMemberId !== undefined ? currentMemberId.toString() : "0");
      setNewDueDate("");
      setNewRecurrence("");
    });
  };

  const handleCycleAssignee = (taskId: number, currentAssigneeId: number | null | undefined) => {
    // Cicla entre Kike (1) -> Lara (2) -> Ambos (0)
    let nextId = 1;
    if (currentAssigneeId === 1) nextId = 2;
    else if (currentAssigneeId === 2) nextId = 0;
    else nextId = 1;

    startTransition(async () => {
      await updateTaskAssigneeAction(taskId, nextId);
    });
  };

  // Cuadrante semanal
  const weekDays = getWeekDays();

  // Estadísticas de tareas realizadas
  const completedTasks = tasks.filter((t) => t.done);
  const totalCompleted = completedTasks.length;

  const kikeCompleted = completedTasks.filter((t) => t.assignee_id === 1).length;
  const laraCompleted = completedTasks.filter((t) => t.assignee_id === 2).length;
  const ambosCompleted = completedTasks.filter((t) => t.assignee_id === 0).length;

  const kikePct = totalCompleted > 0 ? Math.round((kikeCompleted / totalCompleted) * 100) : 0;
  const laraPct = totalCompleted > 0 ? Math.round((laraCompleted / totalCompleted) * 100) : 0;
  const ambosPct = totalCompleted > 0 ? Math.round((ambosCompleted / totalCompleted) * 100) : 0;

  // Frecuencia por nombre de tarea
  const titleFrequency = new Map<string, { title: string; count: number; lastDoneAt: string | null }>();
  for (const t of tasks) {
    const key = t.title.trim().toLowerCase();
    const existing = titleFrequency.get(key);
    const count = (existing?.count || 0) + (t.done ? 1 : 0);
    const lastDoneAt = t.done_at || existing?.lastDoneAt || null;
    titleFrequency.set(key, { title: t.title, count, lastDoneAt });
  }

  const sortedTasks = [...titleFrequency.values()].sort((a, b) => b.count - a.count);
  const mostDoneTasks = sortedTasks.slice(0, 5);
  const leastDoneTasks = [...sortedTasks].reverse().slice(0, 5);

  return (
    <div className="glass-card" style={{ padding: "1.35rem" }}>
      {/* Header Apple Style */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <div
            className="squircle-icon"
            style={{
              background: "var(--apple-blue-subtle)",
              color: "var(--apple-blue)",
            }}
          >
            ✅
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                Tareas del Hogar
              </h2>
              <span className="badge badge-blue" style={{ fontSize: "0.72rem", padding: "0.15rem 0.55rem" }}>
                {pendingCount} pendientes
              </span>
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
              Gestión compartida Kike, Lara & Ambos
            </p>
          </div>
        </div>

        {/* Selector de modo de vista: Lista / Cuadrante Semanal / Estadísticas */}
        <div style={{ display: "flex", gap: "0.3rem", background: "var(--apple-surface-secondary)", padding: "0.2rem", borderRadius: "var(--radius-full)" }}>
          <button
            onClick={() => setViewMode("list")}
            className={`tab-btn ${viewMode === "list" ? "active" : ""}`}
            style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
          >
            📋 Lista
          </button>
          <button
            onClick={() => setViewMode("quadrant")}
            className={`tab-btn ${viewMode === "quadrant" ? "active" : ""}`}
            style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
          >
            🗓️ Cuadrante Semanal
          </button>
          <button
            onClick={() => setViewMode("stats")}
            className={`tab-btn ${viewMode === "stats" ? "active" : ""}`}
            style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
          >
            📊 Estadísticas
          </button>
        </div>
      </div>

      {/* ── VISTA 1: LISTA TRADICIONAL ── */}
      {viewMode === "list" && (
        <div>
          {/* Filtro por responsable */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)" }}>Filtrar por:</span>
            <div style={{ display: "flex", gap: "0.3rem" }}>
              <button
                onClick={() => setFilterAssignee("all")}
                className={`tab-btn ${filterAssignee === "all" ? "active" : ""}`}
                style={{ padding: "0.2rem 0.6rem", fontSize: "0.76rem" }}
              >
                Todas
              </button>
              {ASSIGNEE_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFilterAssignee(opt.id)}
                  className={`tab-btn ${filterAssignee === opt.id ? "active" : ""}`}
                  style={{ padding: "0.2rem 0.6rem", fontSize: "0.76rem" }}
                >
                  <span>{opt.emoji}</span> <span>{opt.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Formulario añadir tarea */}
          <form onSubmit={handleAddTask} style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "1rem" }}>
            {/* Desplegable de tareas predeterminadas */}
            <select
              onChange={(e) => {
                if (!e.target.value) return;
                const chosen = PRESET_TASKS.find((p) => p.text === e.target.value);
                if (chosen) {
                  setNewTitle(chosen.text);
                  if (chosen.rec) setNewRecurrence(chosen.rec);
                }
              }}
              defaultValue=""
              className="input-field"
              style={{ flex: "0 1 180px", color: "var(--apple-blue)", fontWeight: 500 }}
              title="Seleccionar una tarea habitual predeterminada"
            >
              <option value="">📋 Tareas habituales...</option>
              {PRESET_TASKS.map((p) => (
                <option key={p.text} value={p.text}>
                  {p.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="O escribe una tarea personalizada..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="input-field"
              style={{ flex: "1 1 200px" }}
            />
            <select
              value={newAssignee}
              onChange={(e) => setNewAssignee(e.target.value)}
              className="input-field"
              style={{ flex: "0 1 120px" }}
            >
              <option value="">¿Quién?</option>
              {ASSIGNEE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.emoji} {opt.name}
                </option>
              ))}
            </select>
            <select
              value={newRecurrence}
              onChange={(e) => setNewRecurrence(e.target.value)}
              className="input-field"
              style={{ flex: "0 1 110px" }}
            >
              <option value="">Puntual</option>
              <option value="daily">Diaria</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
            </select>
            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="input-field"
              style={{ flex: "0 1 130px" }}
            />
            <button
              type="submit"
              disabled={isPending || !newTitle.trim()}
              className="btn-primary"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            >
              Añadir
            </button>
          </form>

          {/* Lista de tareas estilo Apple Reminders */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", maxHeight: "320px", overflowY: "auto", paddingRight: "0.25rem" }}>
            {filteredTasks.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--apple-text-secondary)" }}>
                <span style={{ fontSize: "1.6rem", display: "block", marginBottom: "0.3rem" }}>🙌</span>
                <p style={{ fontSize: "0.88rem", fontWeight: 500, margin: 0 }}>Todo al día en casa</p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const assignee = getAssignee(task.assignee_id);
                return (
                  <div
                    key={task.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.65rem 0.85rem",
                      background: task.done ? "transparent" : "var(--apple-surface-secondary)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--apple-border)",
                      opacity: task.done ? 0.45 : 1,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", flex: 1 }}>
                      <input
                        type="checkbox"
                        checked={task.done}
                        onChange={() => startTransition(() => toggleTaskAction(task.id))}
                        style={{
                          width: "20px",
                          height: "20px",
                          accentColor: "var(--apple-blue)",
                          cursor: "pointer",
                          borderRadius: "6px",
                        }}
                      />
                      <span style={{ fontSize: "0.92rem", fontWeight: 500, textDecoration: task.done ? "line-through" : "none", color: "var(--apple-text)" }}>
                        {task.title}
                      </span>
                    </label>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      {task.recurrence && (
                        <span className="badge badge-purple" style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem" }}>
                          🔁 {task.recurrence === "daily" ? "Diaria" : task.recurrence === "weekly" ? "Semanal" : "Mensual"}
                        </span>
                      )}
                      {task.due_date && (
                        <span style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)" }}>
                          {task.due_date.slice(5)}
                        </span>
                      )}

                      {/* Botón selector de responsable (Kike / Lara / Ambos) */}
                      <button
                        type="button"
                        onClick={() => handleCycleAssignee(task.id, task.assignee_id)}
                        disabled={isPending}
                        className="btn-ghost"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          fontSize: "0.74rem",
                          padding: "0.2rem 0.55rem",
                          borderRadius: "var(--radius-full)",
                          background: assignee ? `${assignee.color}22` : "var(--apple-surface)",
                          color: assignee ? assignee.color : "var(--apple-text-secondary)",
                          border: assignee ? `1px solid ${assignee.color}44` : "1px solid var(--apple-border)",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        title="Haz clic para alternar entre Kike, Lara o Ambos"
                      >
                        <span>{assignee ? assignee.emoji : "👤"}</span>
                        <span>{assignee ? assignee.name : "Asignar"}</span>
                      </button>

                      <button
                        onClick={() => startTransition(() => deleteTaskAction(task.id))}
                        className="btn-ghost"
                        style={{
                          width: "24px",
                          height: "24px",
                          padding: 0,
                          borderRadius: "50%",
                          justifyContent: "center",
                          color: "var(--apple-text-secondary)",
                        }}
                        title="Eliminar tarea"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── VISTA 2: CUADRANTE SEMANAL DE LUNES A DOMINGO ── */}
      {viewMode === "quadrant" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--apple-text)" }}>
              🗓️ Cuadrante de la Semana en Curso
            </span>
            <span style={{ fontSize: "0.74rem", color: "var(--apple-text-tertiary)" }}>
              Pulsa en cada tarea para marcarla o cambiar responsable
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "0.55rem",
              overflowX: "auto",
              paddingBottom: "0.5rem",
            }}
          >
            {weekDays.map((day) => {
              // Tareas hechas en este día o programadas para este día
              const dayTasks = tasks.filter((t) => {
                const doneMatch = t.done_at && t.done_at.slice(0, 10) === day.dateStr;
                const dueMatch = t.due_date === day.dateStr;
                return doneMatch || dueMatch;
              });

              return (
                <div
                  key={day.dateStr}
                  style={{
                    background: day.isToday
                      ? "rgba(10, 132, 255, 0.12)"
                      : "var(--apple-surface-secondary)",
                    borderRadius: "var(--radius-md)",
                    border: day.isToday
                      ? "1.5px solid var(--apple-blue)"
                      : "1px solid var(--apple-border)",
                    padding: "0.65rem 0.55rem",
                    minHeight: "180px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid var(--apple-border)",
                      paddingBottom: "0.35rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: day.isToday ? 700 : 600,
                        color: day.isToday ? "var(--apple-blue)" : "var(--apple-text)",
                      }}
                    >
                      {day.dayName} {day.dayNumber}
                    </span>
                    {day.isToday && (
                      <span className="badge badge-blue" style={{ fontSize: "0.62rem", padding: "0.1rem 0.35rem" }}>
                        Hoy
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: 1 }}>
                    {dayTasks.length === 0 ? (
                      <div style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)", textAlign: "center", marginTop: "1rem" }}>
                        —
                      </div>
                    ) : (
                      dayTasks.map((t) => {
                        const assignee = getAssignee(t.assignee_id);
                        return (
                          <div
                            key={t.id}
                            style={{
                              padding: "0.4rem 0.45rem",
                              borderRadius: "var(--radius-sm)",
                              background: t.done ? "rgba(52, 199, 89, 0.12)" : "rgba(255, 255, 255, 0.05)",
                              border: t.done ? "1px solid rgba(52, 199, 89, 0.3)" : "1px solid var(--apple-border)",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.2rem",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                              <button
                                type="button"
                                onClick={() => startTransition(() => toggleTaskAction(t.id))}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  cursor: "pointer",
                                  fontSize: "0.85rem",
                                }}
                                title={t.done ? "Completada (clic para reabrir)" : "Pendiente (clic para completar)"}
                              >
                                {t.done ? "✅" : "⭕"}
                              </button>
                              <span
                                style={{
                                  fontSize: "0.76rem",
                                  fontWeight: 500,
                                  color: "var(--apple-text)",
                                  textDecoration: t.done ? "line-through" : "none",
                                  opacity: t.done ? 0.75 : 1,
                                  wordBreak: "break-word",
                                }}
                              >
                                {t.title}
                              </span>
                            </div>

                            {/* Badge con responsable */}
                            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                              <button
                                type="button"
                                onClick={() => handleCycleAssignee(t.id, t.assignee_id)}
                                disabled={isPending}
                                style={{
                                  background: assignee ? `${assignee.color}20` : "transparent",
                                  border: "none",
                                  borderRadius: "var(--radius-full)",
                                  padding: "0.1rem 0.4rem",
                                  fontSize: "0.68rem",
                                  color: assignee ? assignee.color : "var(--apple-text-secondary)",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                                title="Clic para alternar responsable"
                              >
                                {assignee ? `${assignee.emoji} ${assignee.name}` : "👥 Asignar"}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VISTA 3: ESTADÍSTICAS & RANKING DE TAREAS ── */}
      {viewMode === "stats" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Reparto de tareas completadas */}
          <div
            style={{
              padding: "1rem",
              background: "var(--apple-surface-secondary)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--apple-border)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
              <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "var(--apple-text)" }}>
                ⚖️ Reparto de Tareas Realizadas ({totalCompleted} en total)
              </span>
            </div>

            {/* Barra porcentual comparativa */}
            <div
              style={{
                width: "100%",
                height: "10px",
                borderRadius: "var(--radius-full)",
                overflow: "hidden",
                display: "flex",
                background: "rgba(255, 255, 255, 0.08)",
                marginBottom: "0.75rem",
              }}
            >
              <div style={{ width: `${kikePct}%`, background: "#3b82f6", transition: "width 0.4s ease" }} title={`Kike: ${kikePct}%`} />
              <div style={{ width: `${laraPct}%`, background: "#ec4899", transition: "width 0.4s ease" }} title={`Lara: ${laraPct}%`} />
              <div style={{ width: `${ambosPct}%`, background: "#8b5cf6", transition: "width 0.4s ease" }} title={`Ambos: ${ambosPct}%`} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-around", gap: "0.5rem" }}>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#3b82f6" }}>👨 Kike</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--apple-text)" }}>{kikeCompleted}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)" }}>{kikePct}%</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#ec4899" }}>👩 Lara</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--apple-text)" }}>{laraCompleted}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)" }}>{laraPct}%</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#8b5cf6" }}>👥 Ambos</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--apple-text)" }}>{ambosCompleted}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)" }}>{ambosPct}%</div>
              </div>
            </div>
          </div>

          {/* Ranking de Tareas: Más Frecuentes vs Menos Frecuentes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.85rem" }}>
            {/* Tareas que más se hacen */}
            <div
              style={{
                padding: "0.95rem",
                background: "var(--apple-surface-secondary)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--apple-border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <span>🏆</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--apple-text)" }}>
                  Tareas más frecuentes
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {mostDoneTasks.length === 0 ? (
                  <p style={{ fontSize: "0.76rem", color: "var(--apple-text-tertiary)", margin: 0 }}>Sin registros aún</p>
                ) : (
                  mostDoneTasks.map((t, idx) => (
                    <div
                      key={t.title}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.78rem",
                        padding: "0.3rem 0.45rem",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      <span style={{ color: "var(--apple-text)", fontWeight: 500 }}>
                        {idx + 1}. {t.title}
                      </span>
                      <span className="badge badge-green" style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>
                        {t.count} veces
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tareas menos frecuentes / más rezagadas */}
            <div
              style={{
                padding: "0.95rem",
                background: "var(--apple-surface-secondary)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--apple-border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <span>⏳</span>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--apple-text)" }}>
                  Tareas menos frecuentes
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {leastDoneTasks.length === 0 ? (
                  <p style={{ fontSize: "0.76rem", color: "var(--apple-text-tertiary)", margin: 0 }}>Sin registros aún</p>
                ) : (
                  leastDoneTasks.map((t, idx) => (
                    <div
                      key={t.title}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontSize: "0.78rem",
                        padding: "0.3rem 0.45rem",
                        borderRadius: "var(--radius-sm)",
                        background: "rgba(255, 255, 255, 0.04)",
                      }}
                    >
                      <span style={{ color: "var(--apple-text)", fontWeight: 500 }}>
                        {idx + 1}. {t.title}
                      </span>
                      <span className="badge badge-blue" style={{ fontSize: "0.7rem", padding: "0.1rem 0.4rem" }}>
                        {t.count} veces
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
