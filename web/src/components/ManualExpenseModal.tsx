"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { createManualExpenseAction } from "@/app/actions";
import { IconEconomy, IconPlus } from "./Icons";

const SUPERMARKETS = [
  { name: "Mercadona", color: "#00a650", emoji: "🟢" },
  { name: "Carrefour", color: "#0055b8", emoji: "🔵" },
  { name: "Lidl", color: "#e6a100", emoji: "🟡" },
  { name: "Aldi", color: "#00205b", emoji: "🔵" },
  { name: "Día", color: "#d91d24", emoji: "🔴" },
  { name: "Alcampo", color: "#c60c30", emoji: "🔴" },
  { name: "Hipercor", color: "#007a33", emoji: "🟢" },
  { name: "E.Leclerc", color: "#0066b3", emoji: "🔵" },
  { name: "Eroski", color: "#e30613", emoji: "🔴" },
  { name: "Ahorramas", color: "#f39200", emoji: "🟠" },
];

const PRESET_CATEGORIES = [
  { name: "Despensa", icon: "🥫", label: "Supermercado / Despensa" },
  { name: "Restaurante", icon: "🍽️", label: "Restaurante / Bar" },
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
  defaultStore,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultStore?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expenseType, setExpenseType] = useState<"supermarket" | "general">("supermarket");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("Despensa");
  const [storeName, setStoreName] = useState(defaultStore || "Mercadona");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (defaultStore) {
      setStoreName(defaultStore);
      setExpenseType("supermarket");
      setCategory("Despensa");
    }
  }, [defaultStore]);

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

  const handleSelectSupermarket = (superName: string) => {
    setStoreName(superName);
    setCategory("Despensa");
    if (!concept || concept.startsWith("Compra ")) {
      setConcept(`Compra ${superName}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmt = parseFloat(amount.replace(",", "."));
    if (isNaN(cleanAmt) || cleanAmt <= 0) {
      setError("Por favor introduce un importe válido superior a 0 €");
      return;
    }
    const finalConcept = concept.trim() || (expenseType === "supermarket" ? `Compra ${storeName || "Supermercado"}` : "Gasto manual");

    setError(null);
    startTransition(async () => {
      try {
        await createManualExpenseAction({
          amount: cleanAmt,
          concept: finalConcept,
          category,
          storeName: storeName.trim() || undefined,
          date,
        });

        // Limpiar formulario y cerrar
        setAmount("");
        setConcept("");
        setStoreName(expenseType === "supermarket" ? "Mercadona" : "");
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
                Registra compras de supermercado sin ticket o consumiciones directas
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

        {/* Selector de Tipo: Supermercado vs Otro Gasto */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.4rem",
            background: "rgba(0, 0, 0, 0.25)",
            padding: "0.3rem",
            borderRadius: "0.75rem",
            marginBottom: "1.15rem",
            border: "1px solid var(--apple-border)",
          }}
        >
          <button
            type="button"
            onClick={() => {
              setExpenseType("supermarket");
              setCategory("Despensa");
              if (!storeName) setStoreName("Mercadona");
            }}
            style={{
              padding: "0.55rem 0.8rem",
              borderRadius: "0.55rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              background: expenseType === "supermarket" ? "var(--apple-blue)" : "transparent",
              color: expenseType === "supermarket" ? "#fff" : "var(--apple-text-secondary)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span>🛒 Compra Supermercado</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setExpenseType("general");
              setCategory("Restaurante");
            }}
            style={{
              padding: "0.55rem 0.8rem",
              borderRadius: "0.55rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
              background: expenseType === "general" ? "var(--apple-blue)" : "transparent",
              color: expenseType === "general" ? "#fff" : "var(--apple-text-secondary)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span>🍽️ Restaurante / Otro Gasto</span>
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

          {/* Opciones de Supermercado si está activo */}
          {expenseType === "supermarket" ? (
            <div>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.45rem", fontWeight: 600 }}>
                Elige el Supermercado donde compraste:
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))",
                  gap: "0.45rem",
                  marginBottom: "0.75rem",
                }}
              >
                {SUPERMARKETS.map((sm) => {
                  const isSelected = storeName.toLowerCase() === sm.name.toLowerCase();
                  return (
                    <button
                      key={sm.name}
                      type="button"
                      onClick={() => handleSelectSupermarket(sm.name)}
                      style={{
                        padding: "0.5rem 0.6rem",
                        borderRadius: "0.6rem",
                        fontSize: "0.8rem",
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? `2px solid ${sm.color}` : "1px solid var(--apple-border)",
                        background: isSelected ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.03)",
                        color: isSelected ? "#fff" : "var(--apple-text)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: sm.color }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sm.name}</span>
                    </button>
                  );
                })}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                    Supermercado (editable si es otro)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Supermercado local"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                    className="input-field"
                    style={{ width: "100%", fontSize: "0.88rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                    Concepto / Detalle
                  </label>
                  <input
                    type="text"
                    placeholder={`Ej. Compra semanal ${storeName}`}
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    className="input-field"
                    style={{ width: "100%", fontSize: "0.88rem" }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Concepto y Establecimiento General */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
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

              {/* Selector de Categoría General */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.45rem", fontWeight: 500 }}>
                  Categoría de Consumo
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                    gap: "0.4rem",
                    maxHeight: "135px",
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
            </div>
          )}

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

          <div
            style={{
              padding: "0.6rem 0.85rem",
              borderRadius: "0.65rem",
              background: "rgba(0, 113, 227, 0.08)",
              border: "1px solid rgba(0, 113, 227, 0.2)",
              fontSize: "0.75rem",
              color: "var(--apple-text-secondary)",
              lineHeight: 1.4,
            }}
          >
            ℹ️ Este gasto se guardará y se listará de inmediato en <b>Tickets Digitalizados</b> y computará en el desglose comercial mensual.
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
              <span>{isPending ? "Guardando..." : "Registrar Gasto"}</span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
