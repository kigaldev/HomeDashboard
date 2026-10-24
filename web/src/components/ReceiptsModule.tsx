"use client";

import { useState, useTransition } from "react";
import {
  processReceiptAction,
  processReceiptImageAction,
  markPerishableConsumedAction,
  seedDemoReceiptsAction,
  quickAddStapleAction,
} from "@/app/actions";
import type {
  Receipt,
  PerishableAlert,
  PriceComparison,
  HabitInsight,
} from "@/lib/repo";
import type { ReceiptReconciliationResult } from "@/lib/receiptShared";

export function ReceiptsModule({
  receipts = [],
  perishables = [],
  monthlyExpenses = {
    current_month_total: 0,
    last_month_total: 0,
    by_store: [],
    by_category: [],
  },
  priceComparisons = [],
  habits = [],
}: {
  receipts: Receipt[];
  perishables: PerishableAlert[];
  monthlyExpenses: {
    current_month_total: number;
    last_month_total: number;
    by_store: { store_name: string; color: string; total: number; count: number }[];
    by_category: { category: string; total: number; percentage: number }[];
  };
  priceComparisons: PriceComparison[];
  habits: HabitInsight[];
}) {
  const [isPending, startTransition] = useTransition();
  const [rawInput, setRawInput] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [showAllPerishables, setShowAllPerishables] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<ReceiptReconciliationResult | null>(null);

  const displayedPerishables = showAllPerishables ? perishables : perishables.slice(0, 4);

  const handleProcessText = (text: string) => {
    if (!text.trim() || isPending) return;
    startTransition(async () => {
      try {
        const parsed = await processReceiptAction(text);
        if (parsed.reconciliation) {
          setReconciliation(parsed.reconciliation);
        }
        setScanFeedback(
          parsed.reconciliation?.summaryMessage ||
            `✅ Ticket de ${parsed.storeName} (${parsed.totalAmount.toFixed(2)} €) procesado con éxito. Se han añadido ${parsed.items.length} productos y actualizado la despensa.`
        );
        setRawInput("");
        setShowScanner(false);
      } catch {
        setScanFeedback("⚠️ Error al analizar el ticket. Por favor revisa el formato.");
      }
    });
  };

  const handleSimulateDemo = (store: "Mercadona" | "Carrefour" | "Lidl") => {
    let sample = "";
    if (store === "Mercadona") {
      sample = `MERCADONA S.A. Salamanca
LECHE ENTERA HACENDADO 6x1L 5.76
HUEVOS CAMPEROS L 2.35
YOGUR NATURAL PACK 8 1.25
PAÑALES TALLA 4 BRUNO 14.50
PLATANOS DE CANARIAS 1.5KG 2.85
PECHUGA DE POLLO CORRAL 8.74
TOTAL 35.45 €`;
    } else if (store === "Carrefour") {
      sample = `CARREFOUR Salamanca
LOMOS MERLUZA FRESCA 11.20
SALMON FRESCO FILETES 12.50
JUDIAS VERDES PLANAS 2.10
ZANAHORIAS BOLSA 1KG 1.15
LECHE ENTERA CARREFOUR 6.10
TOTAL 33.05 €`;
    } else {
      sample = `LIDL Salamanca
PAN DE HOGAZA ARTESANO 1.45
PAPEL HIGIENICO 3 CAPAS 4.20
HUEVOS CAMPEROS L 2.25
LECHE ENTERA MILBONA 5.70
MANZANAS GOLDEN 2.90
TOTAL 16.50 €`;
    }
    handleProcessText(sample);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanFeedback("📸 Analizando foto del ticket con Gemini Vision...");
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      startTransition(async () => {
        try {
          const res = await processReceiptImageAction(base64, file.type || "image/jpeg");
          if (res.reconciliation) {
            setReconciliation(res.reconciliation);
          }
          if (res.items && res.items.length > 0) {
            setScanFeedback(
              res.reconciliation?.summaryMessage ||
                `✅ ¡Ticket procesado con éxito! ${res.storeName} · ${res.items.length} productos registrados (${res.totalAmount} €).`
            );
            setShowScanner(false);
          } else {
            setScanFeedback("ℹ️ Foto enviada. Si no se aprecian bien los textos, puedes pegar el texto del ticket.");
          }
        } catch {
          setScanFeedback("⚠️ Error al analizar la imagen. Puedes pegar el texto manualmente.");
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleConsume = (id: number) => {
    startTransition(async () => {
      await markPerishableConsumedAction(id);
    });
  };

  const handleLoadSeed = () => {
    startTransition(async () => {
      await seedDemoReceiptsAction();
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
      {/* ── ALERTA DE ALIMENTOS PERECEDEROS ── */}
      <div className="glass-card" style={{ padding: "1.35rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div
              className="squircle-icon"
              style={{
                background: "var(--apple-orange-subtle)",
                color: "var(--apple-orange)",
              }}
            >
              ⏰
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                  Radar de Caducidades & Frescos
                </h2>
                <span className="badge badge-amber" style={{ fontSize: "0.72rem", padding: "0.15rem 0.55rem" }}>
                  {perishables.length} alimentos
                </span>
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                Monitoreo automático tras escanear tickets · Evita el desperdicio
              </p>
            </div>
          </div>
        </div>

        {perishables.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--apple-text-secondary)", background: "var(--apple-surface-secondary)", borderRadius: "var(--radius-lg)" }}>
            <span style={{ fontSize: "1.8rem", display: "block", marginBottom: "0.3rem" }}>🎉</span>
            <p style={{ fontWeight: 600, fontSize: "0.92rem", margin: 0, color: "var(--apple-text)" }}>¡Todo al día en la despensa!</p>
            <p style={{ fontSize: "0.8rem", margin: 0, marginTop: "0.2rem" }}>No hay frescos próximos a caducar.</p>
          </div>
        ) : (
          <>
            <div className="responsive-grid-2">
              {displayedPerishables.map((item) => {
                const isUrgent = item.days_left <= 1;
                const isModerate = item.days_left <= 3;
                const badgeColor = isUrgent ? "var(--apple-red)" : isModerate ? "var(--apple-orange)" : "var(--apple-green)";
                const badgeBg = isUrgent ? "var(--apple-red-subtle)" : isModerate ? "var(--apple-orange-subtle)" : "var(--apple-green-subtle)";

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: "0.95rem",
                      borderRadius: "var(--radius-lg)",
                      border: "1px solid var(--apple-border)",
                      background: "var(--apple-surface-secondary)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                      transition: "transform 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "0.2rem 0.55rem",
                            borderRadius: "var(--radius-full)",
                            background: badgeBg,
                            color: badgeColor,
                          }}
                        >
                          {item.days_left < 0
                            ? "Caducó"
                            : item.days_left === 0
                            ? "Caduca HOY"
                            : item.days_left === 1
                            ? "Caduca MAÑANA"
                            : `${item.days_left} días restantes`}
                        </span>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>
                          {item.store_name}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--apple-text)", letterSpacing: "-0.01em" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginTop: "0.2rem" }}>
                        {item.category} • {item.total_price.toFixed(2)} €
                      </div>
                    </div>

                    <button
                      onClick={() => handleConsume(item.id)}
                      disabled={isPending}
                      className="btn-secondary"
                      style={{
                        fontSize: "0.78rem",
                        padding: "0.4rem 0.65rem",
                        justifyContent: "center",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      ✓ Marcar como consumido
                    </button>
                  </div>
                );
              })}
            </div>

            {perishables.length > 4 && (
              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <button
                  onClick={() => setShowAllPerishables(!showAllPerishables)}
                  className="btn-ghost"
                  style={{ fontSize: "0.82rem", borderRadius: "var(--radius-full)" }}
                >
                  {showAllPerishables ? "▲ Mostrar solo más urgentes" : `▼ Ver todos los alimentos (${perishables.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── ESCÁNER DE TICKETS & SUBIDA ESTILO APPLE WALLET ── */}
      <div className="glass-card" style={{ padding: "1.35rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div
              className="squircle-icon"
              style={{
                background: "var(--apple-purple-subtle)",
                color: "var(--apple-purple)",
              }}
            >
              🧾
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                Escanear Ticket de Compra
              </h2>
              <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                Mercadona, Carrefour o Lidl · Auto-inventario, precios y fechas
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {receipts.length === 0 && (
              <button onClick={handleLoadSeed} disabled={isPending} className="btn-secondary" style={{ fontSize: "0.78rem" }}>
                🧪 Cargar demo
              </button>
            )}
            <button
              onClick={() => setShowScanner(!showScanner)}
              className="btn-primary"
              style={{ fontSize: "0.82rem" }}
            >
              {showScanner ? "Ocultar Escáner" : "📷 Nuevo Ticket"}
            </button>
          </div>
        </div>

        {/* Banner de Reconciliación Inteligente */}
        {reconciliation && (
          <div
            style={{
              padding: "1rem",
              background: "rgba(52, 199, 89, 0.12)",
              border: "1px solid rgba(52, 199, 89, 0.35)",
              borderRadius: "var(--radius-lg)",
              marginBottom: "1rem",
              boxShadow: "0 4px 16px rgba(52, 199, 89, 0.1)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <span style={{ fontSize: "1.2rem" }}>🎉</span>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--apple-green)" }}>
                  Reconciliación de Compra Completada
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setReconciliation(null)}
                className="btn-ghost"
                style={{ fontSize: "0.8rem", color: "var(--apple-green)" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: "0.84rem", color: "var(--apple-text)", margin: 0, marginBottom: "0.65rem", lineHeight: 1.4 }}>
              {reconciliation.summaryMessage}
            </p>
            <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
              <span className="badge badge-emerald" style={{ fontSize: "0.74rem" }}>
                ✓ {reconciliation.matchedCount} tachados de tu lista de la compra
              </span>
              <span className="badge" style={{ fontSize: "0.74rem", background: "rgba(255, 255, 255, 0.08)", color: "var(--apple-text-secondary)" }}>
                📋 {reconciliation.pendingRemainingCount} pendientes para otra compra
              </span>
              <span className="badge badge-blue" style={{ fontSize: "0.74rem" }}>
                🥫 {reconciliation.pantryUpdatedCount} actualizados en despensa
              </span>
            </div>
            {reconciliation.matchedNames.length > 0 && (
              <div style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)", marginTop: "0.35rem" }}>
                Comprados: <em>{reconciliation.matchedNames.join(", ")}</em>
              </div>
            )}
          </div>
        )}

        {scanFeedback && !reconciliation && (
          <div
            style={{
              padding: "0.85rem 1rem",
              marginBottom: "1rem",
              borderRadius: "var(--radius-md)",
              background: "var(--apple-blue-subtle)",
              border: "1px solid rgba(0, 113, 227, 0.25)",
              color: "var(--apple-text)",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            {scanFeedback}
          </div>
        )}

        {showScanner && (
          <div
            style={{
              padding: "1.25rem",
              background: "var(--apple-surface-secondary)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--apple-border)",
              marginBottom: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {/* Opción A: Subir Foto / Cámara */}
              <div
                style={{
                  flex: 1,
                  minWidth: "220px",
                  padding: "1.25rem",
                  border: "2px dashed var(--apple-border-strong)",
                  borderRadius: "var(--radius-lg)",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.45rem",
                  background: "var(--apple-surface-elevated)",
                }}
              >
                <span style={{ fontSize: "2.2rem" }}>📸</span>
                <span style={{ fontSize: "0.92rem", fontWeight: 700 }}>Foto del Ticket</span>
                <span style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)" }}>
                  Extrae productos, precios y caducidades al instante
                </span>
                <label className="btn-primary" style={{ cursor: "pointer", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                  <span>Elegir imagen o hacer foto</span>
                  <input type="file" accept="image/*,application/pdf" capture="environment" onChange={handleFileUpload} style={{ display: "none" }} />
                </label>
              </div>

              {/* Opción B: Pegar Texto OCR */}
              <div style={{ flex: 1.5, minWidth: "260px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>O pega el texto del ticket:</span>
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="Ej: MERCADONA... LECHE ENTERA 5.76... HUEVOS 2.35..."
                  rows={4}
                  className="input-field"
                  style={{ fontSize: "0.85rem", resize: "vertical" }}
                />
                <button
                  onClick={() => handleProcessText(rawInput)}
                  disabled={isPending || !rawInput.trim()}
                  className="btn-primary"
                  style={{ alignSelf: "flex-end", fontSize: "0.82rem" }}
                >
                  {isPending ? "Procesando..." : "Procesar Ticket"}
                </button>
              </div>
            </div>

            {/* Accesos rápidos de simulación */}
            <div style={{ borderTop: "1px solid var(--apple-border)", paddingTop: "0.85rem" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--apple-text-secondary)", marginRight: "0.6rem" }}>
                Probar con tickets de muestra:
              </span>
              <div style={{ display: "inline-flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.25rem" }}>
                <button onClick={() => handleSimulateDemo("Mercadona")} disabled={isPending} className="btn-secondary" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}>
                  🟢 Mercadona (35,45 €)
                </button>
                <button onClick={() => handleSimulateDemo("Carrefour")} disabled={isPending} className="btn-secondary" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}>
                  🔵 Carrefour (33,05 €)
                </button>
                <button onClick={() => handleSimulateDemo("Lidl")} disabled={isPending} className="btn-secondary" style={{ fontSize: "0.75rem", padding: "0.3rem 0.6rem" }}>
                  🟡 Lidl (16,50 €)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── RESUMEN FINANCIERO ESTILO APPLE WALLET ── */}
        <div className="responsive-grid-2" style={{ marginTop: "0.5rem" }}>
          {/* Tarjeta 1: Total Mes Actual */}
          <div style={{ padding: "1.1rem", background: "var(--apple-surface-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--apple-border)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--apple-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Gasto Mensual en Súper
            </div>
            <div style={{ fontSize: "1.85rem", fontWeight: 800, color: "var(--apple-blue)", marginTop: "0.35rem", letterSpacing: "-0.03em" }}>
              {monthlyExpenses.current_month_total.toFixed(2)} €
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginTop: "0.25rem" }}>
              Mes anterior: <strong>{monthlyExpenses.last_month_total.toFixed(2)} €</strong>
            </div>
          </div>

          {/* Tarjeta 2: Por Supermercado */}
          <div style={{ padding: "1.1rem", background: "var(--apple-surface-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--apple-border)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--apple-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
              Gasto por Cadena
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {monthlyExpenses.by_store.length === 0 ? (
                <span style={{ fontSize: "0.8rem", color: "var(--apple-text-secondary)" }}>Sin tickets registrados este mes</span>
              ) : (
                monthlyExpenses.by_store.map((s, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", alignItems: "center" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color, boxShadow: `0 0 6px ${s.color}66` }} />
                      <span style={{ fontWeight: 500 }}>{s.store_name} ({s.count}):</span>
                    </span>
                    <strong style={{ fontWeight: 700 }}>{s.total.toFixed(2)} €</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tarjeta 3: Categorías */}
          <div style={{ padding: "1.1rem", background: "var(--apple-surface-secondary)", borderRadius: "var(--radius-lg)", border: "1px solid var(--apple-border)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--apple-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
              Distribución de Categorías
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              {monthlyExpenses.by_category.slice(0, 3).map((c, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", alignItems: "center" }}>
                  <span style={{ color: "var(--apple-text)", fontWeight: 500 }}>{c.category}:</span>
                  <span>
                    <strong>{c.total.toFixed(2)} €</strong>{" "}
                    <span style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)" }}>({c.percentage}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── COMPARADOR DE PRECIOS ENTRE SUPERMERCADOS ── */}
      <div className="glass-card" style={{ padding: "1.35rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div
              className="squircle-icon"
              style={{
                background: "var(--apple-teal-subtle)",
                color: "var(--apple-teal)",
              }}
            >
              ⚖️
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                Comparador de Precios (Mercadona vs Carrefour vs Lidl)
              </h2>
              <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                Precios reales extraídos de vuestros tickets de compra familiares
              </p>
            </div>
          </div>
        </div>

        {priceComparisons.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--apple-text-secondary)", background: "var(--apple-surface-secondary)", borderRadius: "var(--radius-lg)" }}>
            ℹ️ Escanea tickets de al menos dos supermercados distintos para ver la comparativa de precios y el ahorro.
          </div>
        ) : (
          <div className="responsive-grid-2">
            {priceComparisons.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.45rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--apple-text)" }}>{item.item_name}</div>
                    {item.savings_percent > 0 && (
                      <span className="badge badge-emerald" style={{ fontSize: "0.72rem", padding: "0.15rem 0.55rem" }}>
                        Hasta {item.savings_percent}% ahorro
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.6rem" }}>
                    {item.prices.map((p, pIdx) => {
                      const isBest = p.store_name === item.best_store;
                      return (
                        <div
                          key={pIdx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "0.83rem",
                            padding: "0.35rem 0.55rem",
                            borderRadius: "var(--radius-sm)",
                            background: isBest ? "var(--apple-green-subtle)" : "transparent",
                            border: isBest ? "1px solid rgba(52, 199, 89, 0.3)" : "1px solid transparent",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.store_color }} />
                            <span style={{ fontWeight: 500 }}>{p.store_name}:</span>
                          </span>
                          <span style={{ fontWeight: isBest ? 700 : 500, color: isBest ? "var(--apple-green)" : "var(--apple-text)" }}>
                            {p.price.toFixed(2)} € {isBest && "🏆 Mejor"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── APRENDIZAJE DE HÁBITOS DE COMPRA ── */}
      <div className="glass-card" style={{ padding: "1.35rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <div
              className="squircle-icon"
              style={{
                background: "var(--apple-indigo-subtle)",
                color: "var(--apple-indigo)",
              }}
            >
              🧠
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                Hábitos de Compra & Predicción de Reposición
              </h2>
              <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                Algoritmo predictivo que detecta la frecuencia de consumo y avisa antes de que se agote
              </p>
            </div>
          </div>
        </div>

        {habits.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--apple-text-secondary)", background: "var(--apple-surface-secondary)", borderRadius: "var(--radius-lg)" }}>
            ℹ️ A medida que escaneéis los tickets semanales, el sistema calculará vuestra frecuencia exacta de compra.
          </div>
        ) : (
          <div className="responsive-grid-2">
            {habits.map((h, idx) => {
              const isOverdue = h.status === "overdue";
              const isSoon = h.status === "soon";
              const badgeClass = isOverdue ? "badge-rose" : isSoon ? "badge-amber" : "badge-blue";

              return (
                <div
                  key={idx}
                  style={{
                    padding: "1rem",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--apple-surface-secondary)",
                    border: "1px solid var(--apple-border)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "0.75rem",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem" }}>
                        {isOverdue
                          ? "Toca reponer ya"
                          : isSoon
                          ? `Reponer en ~${h.days_until_needed}d`
                          : `En ~${h.days_until_needed} días`}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)", fontWeight: 500 }}>
                        Cada ~{h.avg_days_between} días
                      </span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--apple-text)" }}>
                      {h.item_name}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", marginTop: "0.2rem" }}>
                      Comprado {h.purchase_count} veces · Última: {h.last_purchase_date}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      startTransition(async () => {
                        await quickAddStapleAction(h.item_name, null);
                      });
                    }}
                    disabled={isPending}
                    className="btn-secondary"
                    style={{ fontSize: "0.78rem", padding: "0.4rem 0.65rem", justifyContent: "center" }}
                  >
                    + Añadir a la lista
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
