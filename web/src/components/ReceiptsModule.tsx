"use client";

import { useState, useTransition } from "react";
import {
  processReceiptAction,
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

export function ReceiptsModule({
  receipts,
  perishables,
  monthlyExpenses,
  priceComparisons,
  habits,
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

  const displayedPerishables = showAllPerishables ? perishables : perishables.slice(0, 4);

  const handleProcessText = (text: string) => {
    if (!text.trim() || isPending) return;
    startTransition(async () => {
      try {
        const parsed = await processReceiptAction(text);
        setScanFeedback(
          `✅ Ticket de ${parsed.storeName} (${parsed.totalAmount.toFixed(2)} €) procesado con éxito. Se han añadido ${parsed.items.length} productos y actualizado la despensa.`,
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

    // Simulación de OCR leyendo el archivo
    setScanFeedback("📸 Escaneando imagen del ticket y extrayendo productos con OCR...");
    setTimeout(() => {
      handleSimulateDemo("Mercadona");
    }, 1200);
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
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* ── ALERTA DE ALIMENTOS PERECEDEROS ── */}
      <div className="glass-card" style={{ padding: "1.25rem", borderLeft: "4px solid var(--accent-amber)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.45rem", margin: 0 }}>
              <span>⏰</span>
              <span>Alimentos Frescos por Caducar</span>
            </h2>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Seguimiento inteligente tras escanear tickets • Evita tirar comida
            </div>
          </div>
          <span className="badge badge-amber" style={{ fontSize: "0.76rem" }}>
            {perishables.length} pendientes
          </span>
        </div>

        {perishables.length === 0 ? (
          <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)" }}>
            🎉 ¡Todo al día! No hay alimentos frescos cerca de caducar en la despensa.
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
              {displayedPerishables.map((item) => {
                const isUrgent = item.days_left <= 1;
                const isModerate = item.days_left <= 3;
                const borderColor = isUrgent ? "#ef4444" : isModerate ? "#f59e0b" : "#10b981";
                const bgColor = isUrgent ? "rgba(239, 68, 68, 0.08)" : isModerate ? "rgba(245, 158, 11, 0.08)" : "var(--bg-surface)";

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: "0.85rem",
                      borderRadius: "var(--radius-md)",
                      border: `1px solid ${borderColor}`,
                      background: bgColor,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                        <span className="badge" style={{ fontSize: "0.7rem", background: borderColor, color: "white" }}>
                          {item.days_left < 0
                            ? "Caducó"
                            : item.days_left === 0
                            ? "Caduca HOY"
                            : item.days_left === 1
                            ? "Caduca MAÑANA"
                            : `${item.days_left} días restantes`}
                        </span>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{item.store_name}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "0.92rem", marginTop: "0.2rem" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                        {item.category} • Costó {item.total_price.toFixed(2)} €
                      </div>
                    </div>

                    <button
                      onClick={() => handleConsume(item.id)}
                      disabled={isPending}
                      className="btn-secondary"
                      style={{ fontSize: "0.76rem", padding: "0.3rem 0.5rem", justifyContent: "center" }}
                    >
                      ✓ Marcar como consumido
                    </button>
                  </div>
                );
              })}
            </div>

            {perishables.length > 4 && (
              <div style={{ textAlign: "center", marginTop: "0.75rem" }}>
                <button
                  onClick={() => setShowAllPerishables(!showAllPerishables)}
                  className="btn-ghost"
                  style={{ fontSize: "0.78rem" }}
                >
                  {showAllPerishables ? "▲ Mostrar solo más urgentes" : `▼ Ver todos los alimentos (${perishables.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── ESCÁNER DE TICKETS & SUBIDA ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.45rem", margin: 0 }}>
              <span>🧾</span>
              <span>Escanear Ticket de Compra</span>
            </h2>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Mercadona, Carrefour o Lidl • Auto-inventario, precios y fechas de caducidad
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {receipts.length === 0 && (
              <button onClick={handleLoadSeed} disabled={isPending} className="btn-secondary" style={{ fontSize: "0.78rem" }}>
                🧪 Cargar datos demo
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

        {scanFeedback && (
          <div
            style={{
              padding: "0.75rem",
              marginBottom: "1rem",
              borderRadius: "var(--radius-sm)",
              background: "rgba(59, 130, 246, 0.12)",
              border: "1px solid var(--accent-blue)",
              fontSize: "0.84rem",
            }}
          >
            {scanFeedback}
          </div>
        )}

        {showScanner && (
          <div
            style={{
              padding: "1.25rem",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
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
                  padding: "1rem",
                  border: "2px dashed var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ fontSize: "2rem" }}>📸</span>
                <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Foto del Ticket (Móvil / PC)</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Extrae automáticamente todos los productos</span>
                <label className="btn-secondary" style={{ cursor: "pointer", fontSize: "0.8rem", marginTop: "0.4rem" }}>
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
                  style={{ fontSize: "0.82rem", resize: "vertical" }}
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
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "0.75rem" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginRight: "0.5rem" }}>
                Probar rápidamente con tickets de ejemplo:
              </span>
              <div style={{ display: "inline-flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.3rem" }}>
                <button onClick={() => handleSimulateDemo("Mercadona")} disabled={isPending} className="btn-ghost" style={{ fontSize: "0.75rem", border: "1px solid var(--border-subtle)" }}>
                  🟢 Ticket Mercadona
                </button>
                <button onClick={() => handleSimulateDemo("Carrefour")} disabled={isPending} className="btn-ghost" style={{ fontSize: "0.75rem", border: "1px solid var(--border-subtle)" }}>
                  🔵 Ticket Carrefour
                </button>
                <button onClick={() => handleSimulateDemo("Lidl")} disabled={isPending} className="btn-ghost" style={{ fontSize: "0.75rem", border: "1px solid var(--border-subtle)" }}>
                  🟡 Ticket Lidl
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── RESUMEN DE GASTOS MENSUALES ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "0.5rem" }}>
          <div style={{ padding: "0.85rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Gasto Total en Super (Mes Actual)</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-blue)", marginTop: "0.25rem" }}>
              {monthlyExpenses.current_month_total.toFixed(2)} €
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
              Mes anterior: {monthlyExpenses.last_month_total.toFixed(2)} €
            </div>
          </div>

          <div style={{ padding: "0.85rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Gasto por Supermercado</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {monthlyExpenses.by_store.length === 0 ? (
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Sin tickets este mes</span>
              ) : (
                monthlyExpenses.by_store.map((s, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: s.color }} />
                      <span>{s.store_name} ({s.count}):</span>
                    </span>
                    <strong>{s.total.toFixed(2)} €</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ padding: "0.85rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>Categorías Principales</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
              {monthlyExpenses.by_category.slice(0, 3).map((c, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem" }}>
                  <span>{c.category}:</span>
                  <span><strong>{c.total.toFixed(2)} €</strong> ({c.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── COMPARADOR DE PRECIOS ENTRE SUPERMERCADOS ── */}
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.45rem", margin: 0 }}>
              <span>⚖️</span>
              <span>Comparador de Precios (Mercadona vs Carrefour vs Lidl)</span>
            </h2>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Compara el precio real de productos básicos según vuestros tickets escaneados
            </div>
          </div>
        </div>

        {priceComparisons.length === 0 ? (
          <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)" }}>
            ℹ️ Escanea tickets de al menos dos supermercados distintos para ver la comparativa de precios y el ahorro.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.85rem" }}>
            {priceComparisons.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: "0.95rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "0.6rem",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{item.item_name}</div>
                    {item.savings_percent > 0 && (
                      <span className="badge badge-emerald" style={{ fontSize: "0.72rem" }}>
                        Hasta {item.savings_percent}% ahorro
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.5rem" }}>
                    {item.prices.map((p, pIdx) => {
                      const isBest = p.store_name === item.best_store;
                      return (
                        <div
                          key={pIdx}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "0.82rem",
                            padding: "0.25rem 0.45rem",
                            borderRadius: "var(--radius-sm)",
                            background: isBest ? "rgba(16, 185, 129, 0.1)" : "transparent",
                          }}
                        >
                          <span style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.store_color }} />
                            <span>{p.store_name}:</span>
                          </span>
                          <span style={{ fontWeight: isBest ? 700 : 500, color: isBest ? "var(--accent-emerald)" : undefined }}>
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
      <div className="glass-card" style={{ padding: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.45rem", margin: 0 }}>
              <span>🧠</span>
              <span>Hábitos de Compra &amp; Predicción de Reposición</span>
            </h2>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              La IA aprende la cadencia de consumo de la familia y avisa antes de que se agoten
            </div>
          </div>
        </div>

        {habits.length === 0 ? (
          <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", background: "var(--bg-surface)", borderRadius: "var(--radius-md)" }}>
            ℹ️ A medida que escaneéis los tickets semanales, el sistema calculará vuestra frecuencia exacta de compra.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem" }}>
            {habits.map((h, idx) => {
              const isOverdue = h.status === "overdue";
              const isSoon = h.status === "soon";
              const badgeClass = isOverdue ? "badge-red" : isSoon ? "badge-amber" : "badge-blue";

              return (
                <div
                  key={idx}
                  style={{
                    padding: "0.85rem",
                    borderRadius: "var(--radius-md)",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                      <span className={`badge ${badgeClass}`} style={{ fontSize: "0.7rem" }}>
                        {isOverdue
                          ? "Toca reponer ya"
                          : isSoon
                          ? `Reponer en ~${h.days_until_needed}d`
                          : `En ~${h.days_until_needed} días`}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Cada ~{h.avg_days_between} días</span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: "0.92rem", marginTop: "0.2rem" }}>
                      {h.item_name}
                    </div>
                    <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                      Comprado {h.purchase_count} veces • Última vez: {h.last_purchase_date}
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
                    style={{ fontSize: "0.75rem", padding: "0.3rem 0.5rem", justifyContent: "center" }}
                  >
                    + Añadir a la lista de compra
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
