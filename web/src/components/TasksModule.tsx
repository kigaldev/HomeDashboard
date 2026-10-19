"use client";

import { useState, useTransition } from "react";
import { addTaskAction, toggleTaskAction, deleteTaskAction } from "@/app/actions";
import type { Task, Member } from "@/lib/repo";

export function TasksModule({
  tasks,
  members,
}: {
  tasks: Task[];
  members: Member[];
}) {
  const [filterAssignee, setFilterAssignee] = useState<number | "all">("all");
  const [newTitle, setNewTitle] = useState("");
  const [newAssignee, setNewAssignee] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [newRecurrence, setNewRecurrence] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const adultMembers = members.filter((m) => m.role === "adult");
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const filteredTasks = tasks.filter((t) => {
    if (filterAssignee === "all") return true;
    return t.assignee_id === filterAssignee;
  });

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
    <div className="glass-card" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span>✅</span>
          <span>Tareas del Hogar</span>
          <span className="badge badge-blue" style={{ fontSize: "0.75rem" }}>
            {tasks.filter((t) => !t.done).length} pendientes
          </span>
        </h2>

        {/* Filtro por adulto / responsable */}
        <div style={{ display: "flex", gap: "0.3rem" }}>
          <button
            onClick={() => setFilterAssignee("all")}
            className={`tab-btn ${filterAssignee === "all" ? "active" : ""}`}
            style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem" }}
          >
            Todas
          </button>
          {adultMembers.map((m) => (
            <button
              key={m.id}
              onClick={() => setFilterAssignee(m.id)}
              className={`tab-btn ${filterAssignee === m.id ? "active" : ""}`}
              style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem" }}
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
          style={{ flex: "1 1 200px", fontSize: "0.88rem" }}
        />
        <select
          value={newAssignee}
          onChange={(e) => setNewAssignee(e.target.value)}
          className="input-field"
          style={{ flex: "0 1 120px", fontSize: "0.82rem" }}
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
          style={{ flex: "0 1 110px", fontSize: "0.82rem" }}
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
          style={{ flex: "0 1 130px", fontSize: "0.82rem" }}
        />
        <button type="submit" disabled={isPending || !newTitle.trim()} className="btn-primary" style={{ padding: "0.5rem 0.9rem" }}>
          Añadir
        </button>
      </form>

      {/* Lista de tareas */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "320px", overflowY: "auto" }}>
        {filteredTasks.length === 0 ? (
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "1.5rem 0" }}>
            Todo al día en casa 🙌
          </p>
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
                  padding: "0.55rem 0.75rem",
                  background: task.done ? "transparent" : "var(--bg-surface)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  opacity: task.done ? 0.45 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "0.65rem", cursor: "pointer", flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => startTransition(() => toggleTaskAction(task.id))}
                    style={{ width: "18px", height: "18px", accentColor: "var(--accent-blue)", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.9rem", textDecoration: task.done ? "line-through" : "none" }}>
                    {task.title}
                  </span>
                </label>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  {task.recurrence && (
                    <span className="badge badge-purple" style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem" }}>
                      🔁 {task.recurrence === "daily" ? "Diaria" : task.recurrence === "weekly" ? "Semanal" : "Mensual"}
                    </span>
                  )}
                  {task.due_date && (
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {task.due_date.slice(5)}
                    </span>
                  )}
                  {assignee && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        fontSize: "0.72rem",
                        padding: "0.15rem 0.45rem",
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
                    style={{ fontSize: "0.75rem", padding: "0.2rem 0.4rem", opacity: 0.6 }}
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
