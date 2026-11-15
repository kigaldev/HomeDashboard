"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { addMonthlyIncomeAction } from "@/app/actions";
import { IconEconomy, IconPlus } from "./Icons";
import type { Member } from "@/lib/repo";

interface PresetIncome {
  label: string;
  source: string;
  memberName?: string;
  isRecurring: boolean;
  icon: string;
}

const PRESET_INCOMES: PresetIncome[] = [
  { label: "Nómina Kike", source: "Nómina Kike", memberName: "Kike", isRecurring: true, icon: "💼" },
  { label: "Nómina Lara", source: "Nómina Lara", memberName: "Lara", isRecurring: true, icon: "💼" },
  { label: "Ingreso Extra / Variable", source: "Ingreso Extra / Variable", isRecurring: false, icon: "✨" },
  { label: "Rendimiento Inversión", source: "Rendimiento Inversión / Dividendos", isRecurring: true, icon: "📈" },
  { label: "Paga Extraordinaria", source: "Paga Extraordinaria", isRecurring: false, icon: "🎁" },
];

export function IncomeModal({
  isOpen,
  onClose,
  members = [],
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  members?: Member[];
  onSuccess?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [source, setSource] = useState("Nómina");
  const [amount, setAmount] = useState("");
  const [memberId, setMemberId] = useState<number | null>(null);
  const [isRecurring, setIsRecurring] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      setError(null);
      // Auto-asignar primer miembro adulto si existe
      if (members.length > 0 && memberId === null) {
        const adult = members.find((m) => m.role === "adult") || members[0];
        setMemberId(adult.id);
        setSource(`Nómina ${adult.name}`);
      }
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen, members, memberId]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const isInside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!isInside) {
        onClose();
      }
    };

    dialog.addEventListener("click", handleBackdropClick);
    return () => dialog.removeEventListener("click", handleBackdropClick);
  }, [onClose]);

  const handleApplyPreset = (preset: PresetIncome) => {
    setSource(preset.source);
    setIsRecurring(preset.isRecurring);
    if (preset.memberName) {
      const match = members.find((m) => m.name.toLowerCase().includes(preset.memberName!.toLowerCase()));
      if (match) setMemberId(match.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(cleanAmt) || cleanAmt <= 0) {
      setError("Introduce un importe válido superior a 0 €");
      return;
    }
    if (!month) {
      setError("Selecciona el mes del ingreso (YYYY-MM)");
      return;
    }
    if (!source.trim()) {
      setError("Indica la procedencia o concepto del ingreso");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await addMonthlyIncomeAction({
          month,
          source: source.trim(),
          amount: cleanAmt,
          member_id: memberId,
          is_recurring: isRecurring,
          notes: notes.trim() || undefined,
        });

        setAmount("");
        setNotes("");
        onSuccess?.();
        onClose();
      } catch (err: any) {
        setError(err?.message || "Error al registrar el ingreso mensual");
      }
    });
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="backdrop:bg-black/70 backdrop:backdrop-blur-md bg-transparent p-0 border-0 outline-none max-w-lg w-[92vw]"
      style={{ margin: "auto" }}
    >
      <div
        className="liquid-glass liquid-specular"
        style={{
          padding: "1.75rem",
          borderRadius: "1.25rem",
          boxShadow: "var(--liquid-shadow-elevated)",
        }}
      >
        {/* Cabecera */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "0.6rem",
                background: "rgba(48, 209, 88, 0.15)",
                color: "#30d158",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconEconomy size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                Registrar Ingreso Mensual
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
                Nóminas familiares, pagas extras o ingresos periódicos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ width: "2rem", height: "2rem", padding: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
            aria-label="Cerrar modal"
          >
            ✕
          </button>
        </div>

        {/* Plantillas Rápidas */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--apple-text-secondary)", marginBottom: "0.4rem" }}>
            Plantillas Rápidas
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {PRESET_INCOMES.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => handleApplyPreset(p)}
                style={{
                  fontSize: "0.76rem",
                  padding: "0.35rem 0.65rem",
                  borderRadius: "var(--radius-full)",
                  background: source === p.source ? "rgba(48, 209, 88, 0.2)" : "var(--apple-surface-secondary)",
                  color: source === p.source ? "#30d158" : "var(--apple-text)",
                  border: `1px solid ${source === p.source ? "#30d158" : "var(--apple-border)"}`,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  transition: "all 0.15s ease",
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {error && (
            <div
              style={{
                padding: "0.6rem 0.8rem",
                borderRadius: "var(--radius-md)",
                background: "rgba(255, 69, 58, 0.15)",
                color: "var(--apple-red)",
                fontSize: "0.8rem",
                border: "1px solid rgba(255, 69, 58, 0.3)",
              }}
            >
              {error}
            </div>
          )}

          {/* Mes del Ingreso y Miembro */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--apple-text-secondary)", marginBottom: "0.35rem" }}>
                Mes de Facturación / Nómina
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
                className="input-base"
                style={{ width: "100%", fontSize: "0.85rem", padding: "0.55rem 0.75rem" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--apple-text-secondary)", marginBottom: "0.35rem" }}>
                Miembro Familiar
              </label>
              <select
                value={memberId ?? ""}
                onChange={(e) => setMemberId(e.target.value ? Number(e.target.value) : null)}
                className="input-base"
                style={{ width: "100%", fontSize: "0.85rem", padding: "0.55rem 0.75rem" }}
              >
                <option value="">Familiar Común / Conjunto</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.role === "adult" ? "Adulto" : "Hijo"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Concepto / Fuente */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--apple-text-secondary)", marginBottom: "0.35rem" }}>
              Concepto / Fuente del Ingreso
            </label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="Ej: Nómina Kike, Nómina Lara, Rendimientos..."
              required
              className="input-base"
              style={{ width: "100%", fontSize: "0.85rem", padding: "0.55rem 0.75rem" }}
            />
          </div>

          {/* Importe Neto */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--apple-text-secondary)", marginBottom: "0.35rem" }}>
              Importe Neto Percibido (€)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="input-base"
                style={{
                  width: "100%",
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  padding: "0.55rem 2.2rem 0.55rem 0.75rem",
                  color: "#30d158",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  right: "0.85rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "0.95rem",
                  color: "var(--apple-text-secondary)",
                  fontWeight: 600,
                }}
              >
                €
              </span>
            </div>
          </div>

          {/* Checkbox Recurrente mensual */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "0.6rem",
              padding: "0.75rem",
              borderRadius: "var(--radius-md)",
              background: "var(--apple-surface-secondary)",
              border: "1px solid var(--apple-border)",
            }}
          >
            <input
              type="checkbox"
              id="is_recurring_income"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              style={{ marginTop: "0.15rem", cursor: "pointer", accentColor: "#30d158" }}
            />
            <label htmlFor="is_recurring_income" style={{ fontSize: "0.8rem", cursor: "pointer", userSelect: "none" }}>
              <span style={{ fontWeight: 600, color: "var(--apple-text)", display: "block" }}>
                Ingreso recurrente todos los meses
              </span>
              <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)", display: "block", marginTop: "0.1rem" }}>
                Se proyectará de forma automática en los siguientes meses si no hay una cifra puntual distinta.
              </span>
            </label>
          </div>

          {/* Notas */}
          <div>
            <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--apple-text-secondary)", marginBottom: "0.35rem" }}>
              Notas / Observaciones (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre retenciones, horas extra, complementos..."
              rows={2}
              className="input-base"
              style={{ width: "100%", fontSize: "0.82rem", padding: "0.55rem 0.75rem", resize: "none" }}
            />
          </div>

          {/* Botones de acción */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="btn-secondary"
              style={{ fontSize: "0.85rem", padding: "0.55rem 1.1rem" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              style={{
                background: "#30d158",
                color: "#000",
                fontWeight: 700,
                fontSize: "0.85rem",
                padding: "0.55rem 1.25rem",
                borderRadius: "var(--radius-md)",
                border: "none",
                cursor: isPending ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <IconPlus size={15} />
              <span>{isPending ? "Guardando..." : "Guardar Ingreso"}</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}