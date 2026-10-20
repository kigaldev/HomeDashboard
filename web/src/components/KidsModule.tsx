"use client";

import { useState, useTransition } from "react";
import {
  setSchoolRunOverrideAction,
  setSchoolMenuAction,
  addHealthAction,
  completeHealthAction,
  syncMontessoriMenuAction,
} from "@/app/actions";
import type { Member, HealthItem, SchoolRun } from "@/lib/repo";

export function KidsModule({
  members = [],
  today,
  schoolRun,
  schoolLunch,
  schoolDinnerRec,
  healthUpcoming = [],
}: {
  members: Member[];
  today: string;
  schoolRun: SchoolRun | null;
  schoolLunch: string | null;
  schoolDinnerRec?: string | null;
  healthUpcoming: HealthItem[];
}) {
  const [lunchInput, setLunchInput] = useState(schoolLunch || "");
  const [isEditingLunch, setIsEditingLunch] = useState(false);
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

  const dropoff = schoolRun?.dropoff_id ? memberMap.get(schoolRun.dropoff_id) : null;
  const pickup = schoolRun?.pickup_id ? memberMap.get(schoolRun.pickup_id) : null;

  const handleSwapRun = () => {
    if (adultMembers.length < 2) return;
    const a1 = adultMembers[0].id;
    const a2 = adultMembers[1].id;
    const currentPickup = schoolRun?.pickup_id === a1 ? a2 : a1;
    const currentDropoff = schoolRun?.dropoff_id === a1 ? a2 : a1;
    startTransition(async () => {
      await setSchoolRunOverrideAction(today, currentDropoff, currentPickup, "Cambio puntual de hoy");
    });
  };

  const handleSaveLunch = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await setSchoolMenuAction(today, lunchInput);
      setIsEditingLunch(false);
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

      <div className="responsive-grid-2" style={{ marginBottom: "1.2rem" }}>
        {/* Turnos de Cole hoy */}
        <div
          style={{
            padding: "1rem",
            background: "var(--apple-surface-secondary)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--apple-border)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)" }}>
              🚸 Turnos de Cole Hoy
            </span>
            <button
              onClick={handleSwapRun}
              disabled={isPending}
              className="btn-ghost"
              style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-full)" }}
            >
              🔄 Cambiar
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-around", gap: "0.5rem", marginTop: "0.5rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)", marginBottom: "0.25rem" }}>Lleva a la mañana</div>
              <span
                className="badge badge-blue"
                style={{ fontSize: "0.82rem", padding: "0.3rem 0.65rem" }}
              >
                {dropoff ? `${dropoff.emoji} ${dropoff.name}` : "Por definir"}
              </span>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)", marginBottom: "0.25rem" }}>Recoge a la tarde</div>
              <span
                className="badge badge-purple"
                style={{ fontSize: "0.82rem", padding: "0.3rem 0.65rem" }}
              >
                {pickup ? `${pickup.emoji} ${pickup.name}` : "Por definir"}
              </span>
            </div>
          </div>
          {schoolRun?.note && (
            <p style={{ fontSize: "0.75rem", color: "var(--apple-orange)", marginTop: "0.6rem", textAlign: "center", fontWeight: 500 }}>
              ℹ️ {schoolRun.note}
            </p>
          )}
        </div>

        {/* Menú del cole hoy */}
        <div
          style={{
            padding: "1rem",
            background: "var(--apple-surface-secondary)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--apple-border)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem", flexWrap: "wrap", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)" }}>
              🍽️ Comedor Montessori
            </span>
            <div style={{ display: "flex", gap: "0.3rem" }}>
              <a
                href="/menus/menu_actual.pdf"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
                style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", color: "var(--apple-blue)", fontWeight: 600 }}
                title="Abrir el PDF oficial del Menú Basal del mes"
              >
                📄 PDF
              </a>
              <button
                onClick={() =>
                  startTransition(async () => {
                    await syncMontessoriMenuAction();
                  })
                }
                disabled={isPending}
                className="btn-ghost"
                style={{ fontSize: "0.72rem", padding: "0.2rem 0.45rem" }}
                title="Descargar y sincronizar el último menú de montessorisalamanca.es"
              >
                🔄 Sync
              </button>
              <button
                onClick={() => setIsEditingLunch(!isEditingLunch)}
                className="btn-ghost"
                style={{ fontSize: "0.72rem", padding: "0.2rem 0.4rem" }}
              >
                {isEditingLunch ? "Cerrar" : "✏️"}
              </button>
            </div>
          </div>

          {isEditingLunch ? (
            <form onSubmit={handleSaveLunch} style={{ display: "flex", gap: "0.4rem" }}>
              <input
                type="text"
                value={lunchInput}
                onChange={(e) => setLunchInput(e.target.value)}
                placeholder="Ej. Puré de verduras + Merluza"
                className="input-field"
                style={{ fontSize: "0.85rem" }}
              />
              <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}>
                OK
              </button>
            </form>
          ) : (
            <div>
              <p style={{ fontSize: "0.9rem", fontWeight: 600, lineHeight: 1.45, color: schoolLunch ? "var(--apple-text)" : "var(--apple-text-secondary)", margin: 0 }}>
                {schoolLunch || "Aún no anotado para hoy (haz clic en ✏️)."}
              </p>
              {schoolDinnerRec && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--apple-orange)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <span>⭐</span>
                  <span><strong>Sugerencia noche (*):</strong> {schoolDinnerRec}</span>
                </div>
              )}
            </div>
          )}
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
