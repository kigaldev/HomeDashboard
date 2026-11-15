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

const RECURRING_PRESETS = [
  { name: "Hipoteca / Préstamo", icon: "🏠", label: "Hipoteca vivienda", defaultProvider: "Banco Santander", defaultConcept: "Hipoteca vivienda habitual" },
  { name: "Inversiones / Ahorro", icon: "📈", label: "Inversiones / Fondos", defaultProvider: "Indexa Capital", defaultConcept: "Aportación mensual fondos indexados" },
  { name: "Comunidad / Vivienda", icon: "🏢", label: "Comunidad propietarios", defaultProvider: "Comunidad de Propietarios", defaultConcept: "Cuota ordinaria comunidad" },
  { name: "Colegio / Guardería", icon: "🎓", label: "Colegio / Educación", defaultProvider: "Colegio Montessori", defaultConcept: "Mensualidad colegio" },
  { name: "Seguro Coche / Moto", icon: "🏍️", label: "Seguro Fraccionado", defaultProvider: "Aseguradora", defaultConcept: "Seguro vehículo fraccionado" },
  { name: "Suscripciones / Servicios", icon: "💳", label: "Suscripción / Cuota", defaultProvider: "Servicio", defaultConcept: "Cuota periódica mensual" },
  { name: "Otros Fijos", icon: "🔄", label: "Otro Gasto Fijo", defaultProvider: "", defaultConcept: "Gasto fijo mensual" },
];

export function ManualExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  defaultStore,
  defaultType,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultStore?: string;
  defaultType?: "supermarket" | "general" | "recurring";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [expenseType, setExpenseType] = useState<"supermarket" | "general" | "recurring">(defaultType || "supermarket");
  const [amount, setAmount] = useState("");
  const [concept, setConcept] = useState("");
  const [category, setCategory] = useState("Despensa");
  const [storeName, setStoreName] = useState(defaultStore || "Mercadona");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [frequency, setFrequency] = useState<"mensual" | "2_plazos" | "3_plazos" | "trimestral" | "anual">("mensual");
  const [startMonth, setStartMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (defaultType) {
      setExpenseType(defaultType);
      if (defaultType === "recurring") {
        setCategory("Hipoteca / Préstamo");
        setConcept("Hipoteca vivienda habitual");
        setStoreName("Banco Santander");
      }
    }
  }, [defaultType]);

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

  const handleSelectRecurringPreset = (preset: typeof RECURRING_PRESETS[0]) => {
    setCategory(preset.name);
    setConcept(preset.defaultConcept);
    if (preset.defaultProvider) {
      setStoreName(preset.defaultProvider);
    }
    if (preset.name === "Seguro Coche / Moto") {
      setFrequency("2_plazos");
    } else {
      setFrequency("mensual");
    }
  };

  const cleanAmt = parseFloat(amount.replace(",", ".")) || 0;

  // Cálculo del impacto mensual según la frecuencia
  let monthlyImpact = cleanAmt;
  if (frequency === "2_plazos") {
    monthlyImpact = Number(((cleanAmt * 2) / 12).toFixed(2));
  } else if (frequency === "3_plazos") {
    monthlyImpact = Number(((cleanAmt * 3) / 12).toFixed(2));
  } else if (frequency === "trimestral") {
    monthlyImpact = Number(((cleanAmt * 4) / 12).toFixed(2));
  } else if (frequency === "anual") {
    monthlyImpact = Number((cleanAmt / 12).toFixed(2));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(cleanAmt) || cleanAmt <= 0) {
      setError("Por favor introduce un importe válido superior a 0 €");
      return;
    }

    const isRec = expenseType === "recurring";
    let finalConcept = concept.trim();
    if (!finalConcept) {
      if (expenseType === "supermarket") {
        finalConcept = `Compra ${storeName || "Supermercado"}`;
      } else if (isRec) {
        finalConcept = category;
      } else {
        finalConcept = "Gasto manual";
      }
    }

    setError(null);
    startTransition(async () => {
      try {
        await createManualExpenseAction({
          amount: cleanAmt,
          concept: finalConcept,
          category,
          storeName: storeName.trim() || undefined,
          date,
          isRecurring: isRec,
          frequency: isRec ? frequency : undefined,
          startMonth: isRec ? startMonth : undefined,
          notes: notes.trim() || undefined,
        });

        // Limpiar formulario y cerrar
        setAmount("");
        setConcept("");
        setNotes("");
        setStoreName(expenseType === "supermarket" ? "Mercadona" : "");
        onSuccess?.();
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
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
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Cabecera del modal */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.15rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "2.25rem",
                height: "2.25rem",
                borderRadius: "0.6rem",
                background: expenseType === "recurring" ? "rgba(94, 92, 230, 0.15)" : "rgba(0, 113, 227, 0.15)",
                color: expenseType === "recurring" ? "var(--apple-purple, #af52de)" : "var(--apple-blue)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconEconomy size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                {expenseType === "recurring" ? "Nuevo Gasto Periódico / Fijo" : "Nuevo Gasto Manual"}
              </h3>
              <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
                {expenseType === "recurring"
                  ? "Hipoteca, inversiones, comunidad o cuotas que se repiten periódicamente"
                  : "Registra compras de supermercado sin ticket o consumiciones directas"}
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

        {/* Selector de Tipo: Supermercado vs Gasto Puntual vs Gasto Periódico */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1.15fr",
            gap: "0.35rem",
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
              padding: "0.5rem 0.6rem",
              borderRadius: "0.55rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.3rem",
              background: expenseType === "supermarket" ? "var(--apple-blue)" : "transparent",
              color: expenseType === "supermarket" ? "#fff" : "var(--apple-text-secondary)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span>🛒 Super</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setExpenseType("general");
              setCategory("Restaurante");
            }}
            style={{
              padding: "0.5rem 0.6rem",
              borderRadius: "0.55rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.3rem",
              background: expenseType === "general" ? "var(--apple-blue)" : "transparent",
              color: expenseType === "general" ? "#fff" : "var(--apple-text-secondary)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span>🍽️ Puntual</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setExpenseType("recurring");
              setCategory("Hipoteca / Préstamo");
              setConcept("Hipoteca vivienda habitual");
              setStoreName("Banco Santander");
            }}
            style={{
              padding: "0.5rem 0.6rem",
              borderRadius: "0.55rem",
              fontSize: "0.78rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.3rem",
              background: expenseType === "recurring" ? "var(--apple-blue)" : "transparent",
              color: expenseType === "recurring" ? "#fff" : "var(--apple-text-secondary)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span>🔄 Fijo / Periódico</span>
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
          {/* Campo Importe con estilo prominente y cálculo en tiempo real */}
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
              {expenseType === "recurring"
                ? frequency === "mensual"
                  ? "Cuota Mensual"
                  : "Importe de cada Cuota / Pago"
                : "Importe Total"}
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
                  width: "200px",
                }}
              />
              <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--apple-blue)" }}>€</span>
            </div>

            {/* Helper de impacto mensual para gastos fraccionados */}
            {expenseType === "recurring" && cleanAmt > 0 && frequency !== "mensual" && (
              <div style={{ marginTop: "0.4rem", fontSize: "0.76rem", color: "var(--apple-green)", fontWeight: 600 }}>
                💡 Impacto estimado en presupuesto mensual: ~{monthlyImpact.toFixed(2)} € / mes
              </div>
            )}
          </div>

          {/* ── MODO 1: SUPERMERCADO ── */}
          {expenseType === "supermarket" && (
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
                    Supermercado
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

              <div style={{ marginTop: "0.75rem" }}>
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
            </div>
          )}

          {/* ── MODO 2: GASTO PUNTUAL / RESTAURANTE ── */}
          {expenseType === "general" && (
            <div>
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

              <div style={{ marginTop: "0.75rem" }}>
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
            </div>
          )}

          {/* ── MODO 3: GASTO PERIÓDICO / FIJO (HIPOTECA, INVERSIONES, CUOTAS...) ── */}
          {expenseType === "recurring" && (
            <div>
              {/* Presets de Gastos Periódicos */}
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.45rem", fontWeight: 600 }}>
                Tipo de Gasto Periódico Habitual:
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: "0.45rem",
                  marginBottom: "1rem",
                }}
              >
                {RECURRING_PRESETS.map((preset) => {
                  const isSelected = category === preset.name;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectRecurringPreset(preset)}
                      style={{
                        padding: "0.5rem 0.65rem",
                        borderRadius: "0.6rem",
                        fontSize: "0.78rem",
                        fontWeight: isSelected ? 700 : 500,
                        border: isSelected ? "2px solid var(--apple-blue)" : "1px solid var(--apple-border)",
                        background: isSelected ? "rgba(0, 113, 227, 0.18)" : "rgba(255, 255, 255, 0.03)",
                        color: isSelected ? "#fff" : "var(--apple-text)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>{preset.icon}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Frecuencia de Pago / Fraccionamiento */}
              <div style={{ marginBottom: "0.85rem" }}>
                <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 600 }}>
                  Frecuencia de Cobro / Fraccionamiento *
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="input-field"
                  style={{ width: "100%", fontSize: "0.88rem" }}
                >
                  <option value="mensual">🔄 Mensual (todos los meses - ej. Hipoteca, Inversiones, Comunidad)</option>
                  <option value="2_plazos">🏍️ Fraccionado en 2 mensualidades / semestral (ej. seguro coche o moto)</option>
                  <option value="3_plazos">🚗 Fraccionado en 3 mensualidades / cuatrimestral (ej. seguro vehículo)</option>
                  <option value="trimestral">📅 Trimestral (cada 3 meses - 4 pagos/año)</option>
                  <option value="anual">📆 Anual (1 cuota única al año)</option>
                </select>
              </div>

              {/* Concepto y Entidad/Banco */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                    Concepto / Título *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Hipoteca vivienda habitual"
                    value={concept}
                    onChange={(e) => setConcept(e.target.value)}
                    required
                    className="input-field"
                    style={{ width: "100%", fontSize: "0.88rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                    Entidad / Proveedor / Banco
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Banco Santander / Indexa"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="input-field"
                    style={{ width: "100%", fontSize: "0.88rem" }}
                  />
                </div>
              </div>

              {/* Mes de Inicio y Día de Cargo */}
              <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                    Contabilizar automáticamente a partir del mes: *
                  </label>
                  <input
                    type="month"
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    required
                    className="input-field"
                    style={{ width: "100%", fontSize: "0.88rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                    Día habitual de cobro
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(parseInt(e.target.value) || 1)}
                    className="input-field"
                    style={{ width: "100%", fontSize: "0.88rem" }}
                  />
                </div>
              </div>

              {/* Notas opcionales */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginBottom: "0.35rem", fontWeight: 500 }}>
                  Notas u observaciones (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Tipo variable Euribor + 0.79%, plazo 2045"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field"
                  style={{ width: "100%", fontSize: "0.88rem" }}
                />
              </div>

              <div
                style={{
                  marginTop: "0.85rem",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "0.65rem",
                  background: "rgba(52, 199, 89, 0.1)",
                  border: "1px solid rgba(52, 199, 89, 0.25)",
                  fontSize: "0.76rem",
                  color: "var(--apple-text)",
                  lineHeight: 1.4,
                }}
              >
                ✨ <b>Automatización activa:</b> Este gasto se sumará automáticamente a partir de <b>{startMonth}</b> en el Total Acumulado del mes y se desglosará en la categoría <b>{category}</b> en los gráficos sin necesidad de introducirlo a mano cada mes.
              </div>
            </div>
          )}

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
              <span>
                {isPending
                  ? "Guardando..."
                  : expenseType === "recurring"
                  ? "Guardar Gasto Periódico"
                  : "Registrar Gasto"}
              </span>
            </button>
          </div>
        </form>
      </div>
    </dialog>
  );
}
