"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { createManualExpenseAction } from "@/app/actions";
import { IconEconomy, IconPlus } from "./Icons";

const PRESET_CATEGORIES = [
  { name: "Restaurante", icon: "🍽️", label: "Restaurante / Bar" },
  { name: "Despensa", icon: "🥫", label: "Supermercado / Despensa" },
  { name: "Fruta y Verdura", icon: "🍎", label: "Frutería / Verdura" },
  { name: "Carnicería", icon: "🥩", label: "Carnicería" },
  { name: "Pescadería", icon: "🐟", label: "Pescadería" },
  { name: "Lácteos", icon: "🧀", label: "Lácteos / Quesos" },
  { name: "Huevos", icon: "🥚", label: "Huevos" },
  { name: "Panadería", icon: "🥖", label: "Panadería / Dulces" },
  { name: "Bebé / Higiene", icon: "👶", label: "Bebé / Higiene" },
  { name: "Salud / Farmacia", icon: "💊", label: "Salud / Farmacia" },
  { name: "Transporte", icon: "🚗", label: "Gasolina / Parking" },
  { name: "Ocio", icon: "🎟️", label: "Ocio / Cultura" },
  { name: "Otros", icon: "📦", label: "Otros gastos" },
];

export function ManualExpenseModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("Restaurante");
  const [storeName, setStoreName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      // Reset form
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(cleanAmt) || cleanAmt <= 0) {
      setError("Por favor introduce un importe válido superior a 0 €");
      return;
    }
    if (!concept.trim()) {
      setError("Por favor escribe el concepto o descripción del gasto");
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await createManualExpenseAction({
          amount: cleanAmt,
          concept: concept.trim(),
          category,
          storeName: storeName.trim() || undefined,
          date,
        });

        // Limpiar formulario y cerrar
        setAmount("");
        setConcept("");
        setStoreName("");
        onSuccess?.();
        onClose();
      } catch (err: any) {
        setError(err?.message || "Error al registrar el gasto manual");
      }
    });
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="backdrop:bg-black/70 backdrop:backdrop-blur-md bg-transparent p-0 border-0 outline-none max-w-xl w-[92vw]"
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
        {/* Cabecera del modal */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "0.6rem",
                background: "rgba(0, 113, 227, 0.15)",
                color: "var(--apple-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconEconomy size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                Nuevo Gasto Manual
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
                Añade consumiciones, farmacia, gasolina o compras directas sin ticket
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
          {/* Campo Importe con estilo prominente */}
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
              Importe Total
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
                  width: "180px",
                }}
              />
              <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--apple-blue)" }}>€</span>
            </div>
          </div>

          {/* Concepto y Establecimiento */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                Concepto / Descripción *
              </label>
              <input
                type="text"
                placeholder="Ej. Comida restaurante"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                required
                className="input-field"
                style={{ width: "100%", fontSize: "0.88rem" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                Establecimiento / Local
              </label>
              <input
                type="text"
                placeholder="Ej. Restaurante Casa Pepe"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="input-field"
                style={{ width: "100%", fontSize: "0.88rem" }}
              />
            </div>
          </div>

          {/* Fecha */}
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
              Fecha del Gasto
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
              style={{ width: "100%", fontSize: "0.88rem" }}
            />
          </div>

          {/* Selector de Categoría */}
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.45rem", fontWeight: 500 }}>
              Categoría de Consumo
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: "0.4rem",
                maxHeight: "150px",
                overflowY: "auto",
                padding: "0.3rem",
                border: "1px solid var(--apple-border)",
                borderRadius: "0.75rem",
                background: "rgba(0, 0, 0, 0.2)",
              }}
            >
              {PRESET_CATEGORIES.map((cat) => {
                const isSelected = category === cat.name;
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      padding: "0.45rem 0.6rem",
                      borderRadius: "0.5rem",
                      fontSize: "0.76rem",
                      textAlign: "left",
                      border: isSelected ? "1px solid var(--apple-blue)" : "1px solid transparent",
                      background: isSelected ? "rgba(0, 113, 227, 0.2)" : "rgba(255, 255, 255, 0.03)",
                      color: isSelected ? "#60a5fa" : "var(--apple-text)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Acciones */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", marginTop: "0.75rem" }}>
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
              <span>{isPending ? "Guardando..." : "Registrar Gasto"}</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}

