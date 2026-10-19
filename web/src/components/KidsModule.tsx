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
  members,
  today,
  schoolRun,
  schoolLunch,
  schoolDinnerRec,
  healthUpcoming,
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
    <div className="glass-card" style={{ padding: "1.25rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "1.15rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <span>🧒</span>
          <span>Peques (Cole &amp; Salud)</span>
        </h2>
        <div style={{ display: "flex", gap: "0.3rem" }}>
          {childMembers.map((c) => (
            <span key={c.id} className="badge badge-amber" style={{ fontSize: "0.75rem" }}>
              {c.emoji} {c.name}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
        {/* Turnos de Cole hoy */}
        <div style={{ padding: "0.9rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
              🚸 Turnos de hoy
            </span>
            <button onClick={handleSwapRun} disabled={isPending} className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.4rem" }}>
              🔄 Cambiar
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-around", gap: "0.5rem", marginTop: "0.4rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Lleva por la mañana</div>
              <span className="badge badge-blue" style={{ fontSize: "0.82rem" }}>
                {dropoff ? `${dropoff.emoji} ${dropoff.name}` : "Por definir"}
              </span>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.2rem" }}>Recoge a la tarde</div>
              <span className="badge badge-rose" style={{ fontSize: "0.82rem" }}>
                {pickup ? `${pickup.emoji} ${pickup.name}` : "Por definir"}
              </span>
            </div>
          </div>
          {schoolRun?.note && (
            <p style={{ fontSize: "0.75rem", color: "var(--accent-amber)", marginTop: "0.5rem", textAlign: "center" }}>
              ℹ️ {schoolRun.note}
            </p>
          )}
        </div>

        {/* Menú del cole hoy */}
        <div style={{ padding: "0.9rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)" }}>
              🍽️ Comida Colegio Montessori
            </span>
            <div style={{ display: "flex", gap: "0.3rem" }}>
              <a
                href="/menus/menu_actual.pdf"
                target="_blank"
                rel="noreferrer"
                className="btn-ghost"
                style={{ fontSize: "0.72rem", padding: "0.2rem 0.45rem", color: "var(--accent-blue)" }}
                title="Abrir el PDF oficial del Menú Basal del mes"
              >
                📄 Ver PDF
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
                🔄 Actualizar
              </button>
              <button onClick={() => setIsEditingLunch(!isEditingLunch)} className="btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.4rem" }}>
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
                style={{ fontSize: "0.82rem" }}
              />
              <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.78rem" }}>
                OK
              </button>
            </form>
          ) : (
            <div>
              <p style={{ fontSize: "0.88rem", fontWeight: 500, lineHeight: 1.4, color: schoolLunch ? "var(--text-main)" : "var(--text-muted)", margin: 0 }}>
                {schoolLunch || "Aún no has anotado el menú de hoy (haz clic en Editar)."}
              </p>
              {schoolDinnerRec && (
                <div style={{ marginTop: "0.45rem", fontSize: "0.78rem", color: "var(--accent-amber)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  <span>⭐</span>
                  <span><strong>Recomendación cena (*):</strong> {schoolDinnerRec}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cartilla de Salud & Medicación */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)" }}>
            🩺 Vacunas, Pediatra &amp; Medicación
          </span>
          <button onClick={() => setShowAddHealth(!showAddHealth)} className="btn-ghost" style={{ fontSize: "0.78rem" }}>
            + Añadir registro
          </button>
        </div>

        {showAddHealth && (
          <form onSubmit={handleAddHealth} style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0.75rem", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)", marginBottom: "0.75rem", border: "1px solid var(--border-subtle)" }}>
            <select
              value={healthChild}
              onChange={(e) => setHealthChild(e.target.value)}
              required
              className="input-field"
              style={{ flex: "1 1 120px", fontSize: "0.82rem" }}
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
              style={{ flex: "0 1 110px", fontSize: "0.82rem" }}
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
              style={{ flex: "2 1 180px", fontSize: "0.82rem" }}
            />
            <input
              type="date"
              value={healthDate}
              onChange={(e) => setHealthDate(e.target.value)}
              className="input-field"
              style={{ flex: "1 1 120px", fontSize: "0.82rem" }}
            />
            <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
              Guardar
            </button>
          </form>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {healthUpcoming.length === 0 ? (
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", padding: "0.5rem 0" }}>
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
                    padding: "0.45rem 0.75rem",
                    background: "var(--bg-surface)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem" }}>
                      {item.kind === "vacuna" ? "💉" : item.kind === "pediatra" ? "🩺" : item.kind === "medicacion" ? "💊" : "📋"}
                    </span>
                    <div>
                      <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>{item.title}</span>
                      {child && (
                        <span style={{ fontSize: "0.75rem", color: child.color, marginLeft: "0.4rem", fontWeight: 600 }}>
                          ({child.name})
                        </span>
                      )}
                      {item.notes && (
                        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.notes}</p>
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
                      style={{ fontSize: "0.75rem", padding: "0.2rem 0.45rem" }}
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
