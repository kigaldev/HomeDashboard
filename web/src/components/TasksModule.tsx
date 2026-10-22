"use client";

import { useState, useTransition } from "react";
import { addTaskAction, toggleTaskAction, deleteTaskAction } from "@/app/actions";
import type { Task, Member } from "@/lib/repo";

export function TasksModule({
  tasks = [],
  members = [],
  currentMemberId = null,
}: {
  tasks: Task[];
  members: Member[];
  currentMemberId?: number | null;
}) {
  const [filterAssignee, setFilterAssignee] = useState<number | "all">(
    currentMemberId ? currentMemberId : "all"
  );
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState<string>(
    currentMemberId ? currentMemberId.toString() : ""
  );
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [newRecurrence, setNewRecurrence] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const adultMembers = members.filter((m) => m.role === "adult");
  const memberMap = new Map(members.map((m) => [m.id, m]));

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
    if (newAssignee) fd.append("assigneeId", newAssignee);
    if (newDueDate) fd.append("dueDate", newDueDate);
    if (newRecurrence) fd.append("recurrence", newRecurrence);

    startTransition(async () => {
      await addTaskAction(fd);
      setNewTitle("");
      setNewAssignee("");
      setNewDueDate("");
      setNewRecurrence("");
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
              Gestión compartida Kike & Lara
            </p>
          </div>
        </div>

        {/* Filtro por adulto / responsable */}
        <div style={{ display: "flex", gap: "0.3rem" }}>
          <button
            onClick={() => setFilterAssignee("all")}
            className={`tab-btn ${filterAssignee === "all" ? "active" : ""}`}
            style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
          >
            Todas
          </button>
          {adultMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => setFilterAssignee(m.id)}
              className={`tab-btn ${filterAssignee === m.id ? "active" : ""}`}
              style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
            >
              <span>{m.emoji}</span> <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Formulario añadir tarea */}
      <form onSubmit={handleAddTask} style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Nueva tarea (ej. Pedir cita ITV, Lavadora sábanas)..."
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
          {adultMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.emoji} {m.name}
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
            const assignee = task.assignee_id ? memberMap.get(task.assignee_id) : null;
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
                  {assignee && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.74rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "var(--radius-full)",
                        background: `${assignee.color}22`,
                        color: assignee.color,
                        fontWeight: 600,
                      }}
                    >
                      <span>{assignee.emoji}</span>
                      <span>{assignee.name}</span>
                    </span>
                  )}
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
  );
}
