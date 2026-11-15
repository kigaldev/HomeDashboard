"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { addUtilityBillAction } from "@/app/actions";
import { IconEnergy, IconPlus } from "./Icons";

const UTILITY_SERVICES = [
  { id: "luz", name: "Luz", icon: "💡", defaultProvider: "Naturgy", color: "#f59e0b" },
  { id: "gas", name: "Gas", icon: "🔥", defaultProvider: "Naturgy", color: "#ef4444" },
  { id: "agua", name: "Agua", icon: "💧", defaultProvider: "Aqualia", color: "#06b6d4" },
  { id: "internet", name: "Fibra / Internet", icon: "🌐", defaultProvider: "Movistar / Digi", color: "#3b82f6" },
  { id: "telefono", name: "Teléfono Móvil", icon: "📱", defaultProvider: "O2 / Vodafone", color: "#8b5cf6" },
  { id: "otro", name: "Otro Suministro", icon: "📦", defaultProvider: "Comunidad / Basuras", color: "#64748b" },
] as const;

export function ManualUtilityBillModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [service, setService] = useState<"luz" | "gas" | "agua" | "internet" | "telefono" | "otro">("luz");
  const [provider, setProvider] = useState("Naturgy");
  const [amount, setAmount] = useState("");
  const [billingMonth, setBillingMonth] = useState(() => new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      setError(null);
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

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

  const handleSelectService = (s: typeof UTILITY_SERVICES[number]) => {
    setService(s.id);
    if (!provider || provider === "Naturgy" || provider === "Aqualia" || provider === "Movistar / Digi" || provider === "O2 / Vodafone" || provider === "Comunidad / Basuras") {
      setProvider(s.defaultProvider);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(cleanAmt) || cleanAmt <= 0) {
      setError("Introduce un importe válido superior a 0 €");
      return;
    }
    if (!billingMonth) {
      setError("Selecciona el mes de la factura");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await addUtilityBillAction({
          service,
          provider: provider.trim() || undefined,
          amount: cleanAmt,
          billing_month: billingMonth,
          issue_date: issueDate,
          notes: notes.trim() || undefined,
        });

        setAmount("");
        setNotes("");
        onSuccess?.();
        onClose();
      } catch (err: any) {
        setError(err?.message || "Error al registrar la factura de suministro");
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
                background: "rgba(245, 158, 11, 0.15)",
                color: "#f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconEnergy size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                Registrar Factura de Suministro
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
                Introduce el importe del mes para luz, agua, gas, internet o teléfono
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

        {error && (
          <div
            style={{
              padding: "0.65rem 0.85rem",
              borderRadius: "0.6rem",
              background: "rgba(255, 69, 58, 0.12)",
              border: "1px solid rgba(255, 69, 58, 0.25)",
              color: "#ff453a",
              fontSize: "0.82rem",
              marginBottom: "1rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Selector de Servicio */}
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.45rem", fontWeight: 600 }}>
              Tipo de Suministro
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.45rem",
              }}
            >
              {UTILITY_SERVICES.map((s) => {
                const isSelected = service === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectService(s)}
                    style={{
                      padding: "0.55rem 0.5rem",
                      borderRadius: "0.6rem",
                      fontSize: "0.78rem",
                      fontWeight: isSelected ? 700 : 500,
                      border: isSelected ? `2px solid ${s.color}` : "1px solid var(--apple-border)",
                      background: isSelected ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.03)",
                      color: isSelected ? "#fff" : "var(--apple-text)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.35rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{s.icon}</span>
                    <span>{s.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Importe */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--apple-border)",
              borderRadius: "0.85rem",
              padding: "0.85rem 1rem",
              textAlign: "center",
            }}
          >
            <label style={{ display: "block", fontSize: "0.75rem", color: "var(--apple-text-secondary)", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>
              Importe de la Factura
            </label>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem" }}>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                style={{
                  fontSize: "2.2rem",
                  fontWeight: 800,
                  textAlign: "center",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--apple-text)",
                  width: "160px",
                }}
              />
              <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--apple-blue)" }}>€</span>
            </div>
          </div>

          {/* Mes de facturación y Comercializadora */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                Mes de Facturación *
              </label>
              <input
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                required
                className="input-field"
                style={{ width: "100%", fontSize: "0.88rem" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                Compañía / Proveedor
              </label>
              <input
                type="text"
                placeholder="Ej. Naturgy"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="input-field"
                style={{ width: "100%", fontSize: "0.88rem" }}
              />
            </div>
          </div>

          {/* Fecha de emisión / cargo y Notas */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                Fecha Cargo / Emisión
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="input-field"
                style={{ width: "100%", fontSize: "0.88rem" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                Notas (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej. Consumo regular"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input-field"
                style={{ width: "100%", fontSize: "0.88rem" }}
              />
            </div>
          </div>

          {/* Acciones */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.5rem" }}>
            <button type="button" onClick={onClose} className="btn-secondary" disabled={isPending}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isPending}
              style={{ gap: "0.4rem", padding: "0.55rem 1.25rem" }}
            >
              <IconPlus size={15} />
              <span>{isPending ? "Guardando..." : "Guardar Factura"}</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
