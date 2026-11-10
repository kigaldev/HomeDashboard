"use client";

import { useState, useTransition } from "react";
import {
  setSchoolRunOverrideAction,
  addHealthAction,
  completeHealthAction,
} from "@/app/actions";
import type { Member, HealthItem, SchoolRun } from "@/lib/repo";

export function KidsModule({
  members = [],
  today,
  schoolRun,
  healthUpcoming = [],
  currentMemberId = null,
}: {
  members: Member[];
  today: string;
  schoolRun: SchoolRun | null;
  schoolLunch?: string | null;
  schoolDinnerRec?: string | null;
  healthUpcoming: HealthItem[];
  currentMemberId?: number | null;
}) {
  const [healthTitle, setHealthTitle] = useState("");
  const [healthKind, setHealthKind] = useState("pediatra");
  const [healthChild, setHealthChild] = useState<string>("");
  const [healthDate, setHealthDate] = useState("");
  const [healthNotes, setHealthNotes] = useState("");
  const [showAddHealth, setShowAddHealth] = useState(false);
  const [isPending, startTransition] = useTransition();

  const adultMembers = members.filter((m) => m.role === "adult");
  const childMembers = members.filter((m) => m.role === "child");
  const memberMap = new Map(members.map((m) => [m.id, m]));

  const RUN_OPTIONS = [
    { id: 1, name: "Kike", emoji: "👨" },
    { id: 2, name: "Lara", emoji: "👩" },
    { id: 0, name: "Ambos", emoji: "👥" },
  ];

  const handleSetShift = (shift: "dropoff" | "noon" | "pickup", targetId: number) => {
    const newDropoff = shift === "dropoff" ? targetId : (schoolRun?.dropoff_id ?? null);
    const newNoon = shift === "noon" ? targetId : (schoolRun?.pickup_noon_id ?? null);
    const newPickup = shift === "pickup" ? targetId : (schoolRun?.pickup_id ?? null);
    startTransition(async () => {
      await setSchoolRunOverrideAction(today, newDropoff, newPickup, schoolRun?.note ?? null, newNoon);
    });
  };

  const handleAddHealth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!healthTitle.trim() || !healthChild) return;
    const fd = new FormData();
    fd.append("title", healthTitle);
    fd.append("kind", healthKind);
    fd.append("memberId", healthChild);
    if (healthDate) fd.append("dueDate", healthDate);
    if (healthNotes) fd.append("notes", healthNotes);

    startTransition(async () => {
      await addHealthAction(fd);
      setHealthTitle("");
      setHealthNotes("");
      setHealthDate("");
      setShowAddHealth(false);
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
              background: "var(--apple-orange-subtle)",
              color: "var(--apple-orange)",
            }}
          >
            🧒
          </div>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
              Peques (Cole & Salud)
            </h2>
            <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
              Fabio y Bruno · Colegio Montessori Salamanca
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.4rem" }}>
          {childMembers.map((c) => (
            <span
              key={c.id}
              className="badge"
              style={{
                fontSize: "0.78rem",
                padding: "0.25rem 0.65rem",
                background: "var(--apple-surface-secondary)",
                border: "1px solid var(--apple-border)",
                color: "var(--apple-text)",
              }}
            >
              <span>{c.emoji}</span>
              <span style={{ fontWeight: 600 }}>{c.name}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Turnos de Cole hoy: Llevar Mañana, Recoger Mediodía, Recoger Tarde */}
      <div
        style={{
          padding: "1.1rem",
          background: "var(--apple-surface-secondary)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--apple-border)",
          marginBottom: "1.2rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.4rem" }}>
          <div>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)" }}>
              🚸 Turnos de Cole Hoy · Colegio Montessori
            </span>
            <p style={{ margin: 0, marginTop: "0.15rem", fontSize: "0.74rem", color: "var(--apple-text-tertiary)" }}>
              Selecciona quién se encarga de cada trayecto (Kike, Lara o Ambos)
            </p>
          </div>
          {schoolRun?.note && (
            <span style={{ fontSize: "0.75rem", color: "var(--apple-orange)", fontWeight: 500 }}>
              ℹ️ {schoolRun.note}
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.85rem" }}>
          {/* Turno 1: Llevar mañana */}
          <div
            style={{
              padding: "0.85rem",
              borderRadius: "var(--radius-md)",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--apple-border)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--apple-text)" }}>
                🌅 Llevar mañana
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)" }}>09:00</span>
            </div>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              {RUN_OPTIONS.map((opt) => {
                const isActive = schoolRun?.dropoff_id === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSetShift("dropoff", opt.id)}
                    style={{
                      flex: 1,
                      padding: "0.35rem 0.2rem",
                      borderRadius: "var(--radius-sm)",
                      border: isActive ? "1.5px solid var(--apple-blue)" : "1px solid var(--apple-border)",
                      background: isActive ? "rgba(10, 132, 255, 0.25)" : "rgba(255, 255, 255, 0.04)",
                      color: isActive ? "var(--apple-blue)" : "var(--apple-text-secondary)",
                      fontWeight: isActive ? 700 : 500,
                      fontSize: "0.76rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.1rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Turno 2: Recoger mediodía */}
          <div
            style={{
              padding: "0.85rem",
              borderRadius: "var(--radius-md)",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--apple-border)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--apple-text)" }}>
                🥪 Recoger Medio día
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)" }}>14:00</span>
            </div>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              {RUN_OPTIONS.map((opt) => {
                const isActive = schoolRun?.pickup_noon_id === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSetShift("noon", opt.id)}
                    style={{
                      flex: 1,
                      padding: "0.35rem 0.2rem",
                      borderRadius: "var(--radius-sm)",
                      border: isActive ? "1.5px solid var(--apple-orange)" : "1px solid var(--apple-border)",
                      background: isActive ? "rgba(255, 159, 10, 0.25)" : "rgba(255, 255, 255, 0.04)",
                      color: isActive ? "var(--apple-orange)" : "var(--apple-text-secondary)",
                      fontWeight: isActive ? 700 : 500,
                      fontSize: "0.76rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.1rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Turno 3: Recoger tarde */}
          <div
            style={{
              padding: "0.85rem",
              borderRadius: "var(--radius-md)",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid var(--apple-border)",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--apple-text)" }}>
                🎒 Recoger a la tarde
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)" }}>17:00</span>
            </div>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              {RUN_OPTIONS.map((opt) => {
                const isActive = schoolRun?.pickup_id === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleSetShift("pickup", opt.id)}
                    style={{
                      flex: 1,
                      padding: "0.35rem 0.2rem",
                      borderRadius: "var(--radius-sm)",
                      border: isActive ? "1.5px solid var(--apple-purple)" : "1px solid var(--apple-border)",
                      background: isActive ? "rgba(175, 82, 222, 0.25)" : "rgba(255, 255, 255, 0.04)",
                      color: isActive ? "var(--apple-purple)" : "var(--apple-text-secondary)",
                      fontWeight: isActive ? 700 : 500,
                      fontSize: "0.76rem",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.1rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Cartilla de Salud & Medicación estilo Apple Health */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--apple-text)" }}>
            🩺 Vacunas, Pediatra & Medicación
          </span>
          <button
            onClick={() => setShowAddHealth(!showAddHealth)}
            className="btn-ghost"
            style={{ fontSize: "0.8rem", color: "var(--apple-blue)", fontWeight: 600 }}
          >
            {showAddHealth ? "Cerrar" : "+ Añadir registro"}
          </button>
        </div>

        {showAddHealth && (
          <form
            onSubmit={handleAddHealth}
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
            <select
              value={healthChild}
              onChange={(e) => setHealthChild(e.target.value)}
              required
              className="input-field"
              style={{ flex: "1 1 130px" }}
            >
              <option value="">¿Para qué peque?</option>
              {childMembers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
            <select
              value={healthKind}
              onChange={(e) => setHealthKind(e.target.value)}
              className="input-field"
              style={{ flex: "0 1 120px" }}
            >
              <option value="pediatra">Pediatra</option>
              <option value="vacuna">Vacuna</option>
              <option value="medicacion">Medicación</option>
              <option value="otro">Otro</option>
            </select>
            <input
              type="text"
              placeholder="Título (ej. Revisión 2 años, Dalsy 3ml)..."
              value={healthTitle}
              onChange={(e) => setHealthTitle(e.target.value)}
              required
              className="input-field"
              style={{ flex: "2 1 180px" }}
            />
            <input
              type="date"
              value={healthDate}
              onChange={(e) => setHealthDate(e.target.value)}
              className="input-field"
              style={{ flex: "1 1 130px" }}
            />
            <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              Guardar en Cartilla
            </button>
          </form>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
          {healthUpcoming.length === 0 ? (
            <p style={{ fontSize: "0.84rem", color: "var(--apple-text-secondary)", padding: "0.5rem 0" }}>
              Sin citas ni vacunas pendientes registradas.
            </p>
          ) : (
            healthUpcoming.map((item) => {
              const child = memberMap.get(item.member_id);
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.65rem 0.85rem",
                    background: "var(--apple-surface-secondary)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--apple-border)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>
                      {item.kind === "vacuna" ? "💉" : item.kind === "pediatra" ? "🩺" : item.kind === "medicacion" ? "💊" : "📋"}
                    </span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--apple-text)" }}>{item.title}</span>
                        {child && (
                          <span style={{ fontSize: "0.75rem", color: child.color, fontWeight: 700 }}>
                            ({child.name})
                          </span>
                        )}
                      </div>
                      {item.notes && (
                        <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>{item.notes}</p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    {item.due_date && (
                      <span className="badge badge-rose" style={{ fontSize: "0.72rem" }}>
                        {item.due_date}
                      </span>
                    )}
                    <button
                      onClick={() => startTransition(() => completeHealthAction(item.id))}
                      className="btn-ghost"
                      style={{ fontSize: "0.78rem", padding: "0.25rem 0.5rem", borderRadius: "var(--radius-full)" }}
                      title="Marcar como completado"
                    >
                      ✓ Hecho
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
