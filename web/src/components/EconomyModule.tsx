"use client";

import { useState, useTransition } from "react";
import type {
  Receipt,
  PerishableAlert,
  PriceComparison,
  HabitInsight,
  EnergyContract,
  FamilyInsurance,
  Warranty,
} from "@/lib/repo";
import type { DayWeather } from "@/lib/weather";
import type { ReceiptReconciliationResult } from "@/lib/receiptShared";
import { getEnergyRecommendations } from "@/lib/energyShared";
import {
  processReceiptAction,
  processReceiptImageAction,
  markPerishableConsumedAction,
  seedDemoReceiptsAction,
  updateEnergyContractAction,
  ingestEnergyBillTextAction,
  ingestEnergyBillImageAction,
  addFamilyInsuranceAction,
  deleteFamilyInsuranceAction,
  addWarrantyAction,
  deleteWarrantyAction,
} from "@/app/actions";
import {
  IconEconomy,
  IconEnergy,
  IconShield,
  IconWarranty,
  IconCamera,
  IconPlus,
  IconCheck,
  IconClock,
  IconPieChart,
} from "./Icons";
import { TicketManagerModal } from "./TicketManagerModal";

export function EconomyModule({
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
  energyContracts = [],
  todayWeather = null,
  insurances = [],
  warranties = [],
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
  energyContracts: EnergyContract[];
  todayWeather: DayWeather | null;
  insurances: FamilyInsurance[];
  warranties: Warranty[];
}) {
  const [activeTab, setActiveTab] = useState<"balance" | "energy" | "insurances" | "warranties" | "scan" | "perishables">("balance");
  const [isPending, startTransition] = useTransition();

  // Estados para Escáner de Tickets
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<ReceiptReconciliationResult | null>(null);

  // Estados para Energía
  const [billTextInput, setBillTextInput] = useState("");
  const [showBillUploader, setShowBillUploader] = useState(false);
  const [energyUploadStatus, setEnergyUploadStatus] = useState<string | null>(null);

  // Estados para formularios de Pólizas y Garantías
  const [showAddInsurance, setShowAddInsurance] = useState(false);
  const [showAddWarranty, setShowAddWarranty] = useState(false);

  const energyRecs = getEnergyRecommendations(energyContracts, todayWeather);
  const elecContract = energyRecs.electricityContract;
  const gasContract = energyRecs.gasContract;
  const elecPrice = elecContract?.energy_price_kwh ?? 0.1230;
  const gasPrice = gasContract?.energy_price_kwh ?? 0.0899;

  // Cálculos de variación mensual
  const diffMonth = monthlyExpenses.current_month_total - monthlyExpenses.last_month_total;
  const diffPercent = monthlyExpenses.last_month_total > 0
    ? ((diffMonth / monthlyExpenses.last_month_total) * 100).toFixed(1)
    : "0.0";

  // Total anual de seguros
  const totalAnnualInsurance = insurances.reduce((acc, curr) => acc + (curr.active ? curr.annual_cost : 0), 0);

  const handleProcessTicketText = (text: string) => {
    if (!text.trim() || isPending) return;
    startTransition(async () => {
      try {
        const parsed = await processReceiptAction(text);
        if (parsed.reconciliation) {
          setReconciliation(parsed.reconciliation);
        }
        setScanFeedback(
          parsed.reconciliation?.summaryMessage ||
            `Ticket de ${parsed.storeName} (${parsed.totalAmount.toFixed(2)} €) procesado con éxito.`
        );
        setRawInput("");
        setShowScanner(false);
      } catch {
        setScanFeedback("Error al procesar el ticket. Revisa el texto.");
      }
    });
  };

  const handleTicketImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanFeedback("Analizando ticket con Gemini Vision...");
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      startTransition(async () => {
        try {
          const res = await processReceiptImageAction(base64, file.type || "image/jpeg");
          if (res.reconciliation) {
            setReconciliation(res.reconciliation);
          }
          setScanFeedback(
            res.reconciliation?.summaryMessage ||
              `Ticket de ${res.storeName} procesado (${res.totalAmount} €).`
          );
          setShowScanner(false);
        } catch {
          setScanFeedback("Error al analizar la imagen del ticket.");
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const handleEnergyBillTextUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billTextInput.trim()) return;
    setEnergyUploadStatus("Analizando factura de energía con IA...");
    startTransition(async () => {
      try {
        const res = await ingestEnergyBillTextAction(billTextInput);
        setEnergyUploadStatus(res.summary);
        if (res.success) {
          setBillTextInput("");
          setTimeout(() => setShowBillUploader(false), 2500);
        }
      } catch (err: unknown) {
        setEnergyUploadStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  };

  const handleEnergyBillImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnergyUploadStatus("Leyendo factura con Gemini Vision...");
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      startTransition(async () => {
        try {
          const res = await ingestEnergyBillImageAction(base64, file.type || "image/jpeg");
          setEnergyUploadStatus(res.summary);
          if (res.success) {
            setTimeout(() => setShowBillUploader(false), 2500);
          }
        } catch (err: unknown) {
          setEnergyUploadStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
        }
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.35rem", width: "100%", minWidth: 0 }}>
      {/* ── Cabecera Ejecutiva de Economía ── */}
      <div className="card-apple" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.25rem" }}>
              <div
                className="squircle-icon"
                style={{
                  background: "var(--apple-surface-secondary)",
                  color: "var(--apple-text)",
                  border: "1px solid var(--apple-border)",
                }}
              >
                <IconEconomy size={20} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>
                    Economía & Patrimonio Familiar
                  </h2>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      padding: "0.15rem 0.55rem",
                      borderRadius: "var(--radius-full)",
                      background: "rgba(0, 113, 227, 0.1)",
                      color: "var(--apple-blue)",
                      fontWeight: 700,
                    }}
                  >
                    Gestión Integral
                  </span>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
                  Supervisión de gastos, suministros de Naturgy, pólizas activas y archivo de garantías
                </p>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => setIsTicketModalOpen(true)}
              className="btn-primary"
              style={{ fontSize: "0.82rem", padding: "0.45rem 0.95rem", gap: "0.4rem" }}
            >
              <IconCamera size={14} />
              <span>Escanear Ticket</span>
            </button>
          </div>
        </div>

        {/* ── Métricas Clave de Alto Nivel ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "0.85rem",
            marginTop: "1.25rem",
          }}
        >
          {/* Gasto Mes Actual */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-lg)",
              background: "var(--apple-surface-secondary)",
              border: "1px solid var(--apple-border)",
            }}
          >
            <div style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)" }}>
              Gasto Acumulado Mes
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.03em", marginTop: "0.3rem", color: "var(--apple-text)" }}>
              {monthlyExpenses.current_month_total.toFixed(2)} €
            </div>
            <div style={{ fontSize: "0.76rem", color: diffMonth <= 0 ? "var(--apple-green)" : "var(--apple-orange)", marginTop: "0.2rem", fontWeight: 600 }}>
              {diffMonth <= 0 ? `▼ ${diffPercent}% vs mes anterior` : `▲ +${diffPercent}% vs mes anterior`}
            </div>
          </div>

          {/* Suministros Naturgy */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-lg)",
              background: "var(--apple-surface-secondary)",
              border: "1px solid var(--apple-border)",
            }}
          >
            <div style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)" }}>
              Suministros Naturgy
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.3rem" }}>
              <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--apple-text)" }}>
                {elecPrice} €
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)" }}>/kWh luz</span>
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--apple-green)", marginTop: "0.2rem", fontWeight: 600 }}>
              Tarifa Plana Fija 24h activa
            </div>
          </div>

          {/* Cobertura de Seguros */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-lg)",
              background: "var(--apple-surface-secondary)",
              border: "1px solid var(--apple-border)",
            }}
          >
            <div style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)" }}>
              Pólizas & Seguros
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em", marginTop: "0.3rem", color: "var(--apple-text)" }}>
              {(totalAnnualInsurance / 12).toFixed(0)} € <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>/mes</span>
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", marginTop: "0.2rem" }}>
              {insurances.filter((i) => i.active).length} pólizas vigentes ({totalAnnualInsurance.toFixed(0)} €/año)
            </div>
          </div>

          {/* Bienes en Garantía */}
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-lg)",
              background: "var(--apple-surface-secondary)",
              border: "1px solid var(--apple-border)",
            }}
          >
            <div style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)" }}>
              Garantías Legales
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, letterSpacing: "-0.02em", marginTop: "0.3rem", color: "var(--apple-text)" }}>
              {warranties.length} artículos
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--apple-green)", marginTop: "0.2rem", fontWeight: 600 }}>
              100% de tickets y compras cubiertas
            </div>
          </div>
        </div>

        {/* ── Segmentos de Navegación Estilo Apple ── */}
        <div
          style={{
            display: "flex",
            gap: "0.35rem",
            marginTop: "1.4rem",
            paddingTop: "0.85rem",
            borderTop: "1px solid var(--apple-border)",
            overflowX: "auto",
            scrollbarWidth: "none",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("balance")}
            className={`tab-btn ${activeTab === "balance" ? "active" : ""}`}
            style={{ fontSize: "0.82rem", padding: "0.4rem 0.95rem" }}
          >
            Balance & Gastos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("energy")}
            className={`tab-btn ${activeTab === "energy" ? "active" : ""}`}
            style={{ fontSize: "0.82rem", padding: "0.4rem 0.95rem" }}
          >
            Suministros & Energía
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("insurances")}
            className={`tab-btn ${activeTab === "insurances" ? "active" : ""}`}
            style={{ fontSize: "0.82rem", padding: "0.4rem 0.95rem" }}
          >
            Pólizas & Seguros ({insurances.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("warranties")}
            className={`tab-btn ${activeTab === "warranties" ? "active" : ""}`}
            style={{ fontSize: "0.82rem", padding: "0.4rem 0.95rem" }}
          >
            Garantías ({warranties.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("scan")}
            className={`tab-btn ${activeTab === "scan" ? "active" : ""}`}
            style={{ fontSize: "0.82rem", padding: "0.4rem 0.95rem" }}
          >
            Tickets Digitalizados ({receipts.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("perishables")}
            className={`tab-btn ${activeTab === "perishables" ? "active" : ""}`}
            style={{ fontSize: "0.82rem", padding: "0.4rem 0.95rem" }}
          >
            Caducidades ({perishables.length})
          </button>
        </div>
      </div>

      {/* ── VISTA 1: BALANCE & GASTOS ── */}
      {activeTab === "balance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Desglose por Comercios */}
          <div className="card-apple" style={{ padding: "1.35rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, marginBottom: "0.85rem", letterSpacing: "-0.01em" }}>
              Desglose por Establecimiento Comercial
            </h3>

            {monthlyExpenses.by_store.length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--apple-text-secondary)" }}>
                <p style={{ margin: 0, fontSize: "0.85rem" }}>Aún no hay compras registradas este mes.</p>
                <button
                  onClick={() => startTransition(() => seedDemoReceiptsAction())}
                  disabled={isPending}
                  className="btn-secondary"
                  style={{ fontSize: "0.78rem", marginTop: "0.6rem" }}
                >
                  Cargar demostración de tickets
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {monthlyExpenses.by_store.map((st) => {
                  const pct = monthlyExpenses.current_month_total > 0
                    ? Math.round((st.total / monthlyExpenses.current_month_total) * 100)
                    : 0;

                  return (
                    <div key={st.store_name}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem", fontSize: "0.82rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 600 }}>
                          <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: st.color || "var(--apple-blue)" }} />
                          <span style={{ color: "var(--apple-text)" }}>{st.store_name}</span>
                          <span style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)" }}>({st.count} compras)</span>
                        </div>
                        <div style={{ fontWeight: 700, color: "var(--apple-text)" }}>
                          {st.total.toFixed(2)} € <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)", fontWeight: 500 }}>({pct}%)</span>
                        </div>
                      </div>
                      <div style={{ width: "100%", height: "7px", background: "var(--apple-surface-secondary)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: st.color || "var(--apple-blue)",
                            borderRadius: "var(--radius-full)",
                            transition: "width 0.4s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desglose por Categoría */}
          {monthlyExpenses.by_category.length > 0 && (
            <div className="card-apple" style={{ padding: "1.35rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, marginBottom: "0.85rem", letterSpacing: "-0.01em" }}>
                Distribución por Categoría de Consumo
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                {monthlyExpenses.by_category.map((cat) => (
                  <div
                    key={cat.category}
                    style={{
                      padding: "0.85rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--apple-surface-secondary)",
                      border: "1px solid var(--apple-border)",
                    }}
                  >
                    <div style={{ fontSize: "0.74rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>
                      {cat.category}
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "0.2rem", color: "var(--apple-text)" }}>
                      {cat.total.toFixed(2)} €
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)", marginTop: "0.1rem" }}>
                      {cat.percentage}% del total mensual
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── VISTA 2: SUMINISTROS & ENERGÍA (NATURGY) ── */}
      {activeTab === "energy" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Tarjeta de Contratos Activos */}
          <div className="card-apple" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                Contratos de Suministro Energético (Naturgy)
              </h3>
              <button
                onClick={() => setShowBillUploader(!showBillUploader)}
                className="btn-secondary"
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
              >
                {showBillUploader ? "Cerrar Escáner" : "Analizar Factura con IA"}
              </button>
            </div>

            {/* Subida de Facturas de Luz / Gas */}
            {showBillUploader && (
              <div
                style={{
                  padding: "1rem",
                  background: "var(--apple-surface-secondary)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--apple-border)",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.4rem", color: "var(--apple-text)" }}>
                  Importar factura de Naturgy u otra comercializadora
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)", marginBottom: "0.75rem" }}>
                  Sube una foto/PDF o pega el texto para actualizar las tarifas y potencias contratadas automáticamente.
                </p>

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <label
                    className="btn-secondary"
                    style={{ fontSize: "0.78rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <IconCamera size={14} />
                    <span>Subir Foto / PDF de Factura</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleEnergyBillImageUpload}
                      style={{ display: "none" }}
                    />
                  </label>
                </div>

                <form onSubmit={handleEnergyBillTextUpload} style={{ marginTop: "0.75rem" }}>
                  <textarea
                    rows={2}
                    placeholder="O pega aquí el desglose de tu factura..."
                    value={billTextInput}
                    onChange={(e) => setBillTextInput(e.target.value)}
                    className="input-field"
                    style={{ fontSize: "0.78rem" }}
                  />
                  <button
                    type="submit"
                    disabled={isPending || !billTextInput.trim()}
                    className="btn-primary"
                    style={{ fontSize: "0.76rem", padding: "0.35rem 0.85rem", marginTop: "0.4rem" }}
                  >
                    Analizar Texto
                  </button>
                </form>

                {energyUploadStatus && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "var(--apple-blue)", fontWeight: 500 }}>
                    {energyUploadStatus}
                  </div>
                )}
              </div>
            )}

            {/* Tabla de Tarifas Actuales */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.85rem" }}>
              {/* Electricidad */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--apple-text-secondary)" }}>
                    Electricidad 2.0TD
                  </span>
                  <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: "var(--radius-full)", background: "rgba(52, 199, 89, 0.12)", color: "var(--apple-green)", fontWeight: 700 }}>
                    Vigente
                  </span>
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: "0.4rem", color: "var(--apple-text)" }}>
                  {elecPrice} € <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>/kWh</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)", marginTop: "0.25rem", lineHeight: 1.4 }}>
                  Naturgy (Tarifa Por Uso). Precio fijo 24h. Potencia Punta 0.123 € / Valle 0.061 €.
                </div>
              </div>

              {/* Gas */}
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "var(--apple-text-secondary)" }}>
                    Gas Natural RL.2
                  </span>
                  <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: "var(--radius-full)", background: "rgba(52, 199, 89, 0.12)", color: "var(--apple-green)", fontWeight: 700 }}>
                    Vigente
                  </span>
                </div>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, marginTop: "0.4rem", color: "var(--apple-text)" }}>
                  {gasPrice} € <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>/kWh</span>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)", marginTop: "0.25rem", lineHeight: 1.4 }}>
                  Naturgy (Tarifa Por Uso Gas). Calefacción y ACS. Término fijo: 9.55 €/mes.
                </div>
              </div>
            </div>
          </div>

          {/* Optimización de Horarios y Equipamiento */}
          <div className="card-apple" style={{ padding: "1.35rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, marginBottom: "0.85rem", letterSpacing: "-0.01em" }}>
              Recomendaciones de Optimización de Hábitos
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.85rem" }}>
              <div style={{ padding: "0.9rem", borderRadius: "var(--radius-md)", background: "var(--apple-surface-secondary)", border: "1px solid var(--apple-border)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--apple-blue)" }}>
                  Coche Eléctrico (VE)
                </div>
                <p style={{ fontSize: "0.82rem", margin: 0, marginTop: "0.3rem", color: "var(--apple-text)", lineHeight: 1.4 }}>
                  Ventana óptima: <b>00:00 - 07:30</b> (Periodo P2 Valle). Se evitan picos de potencia con cocina y calefacción.
                </p>
              </div>

              <div style={{ padding: "0.9rem", borderRadius: "var(--radius-md)", background: "var(--apple-surface-secondary)", border: "1px solid var(--apple-border)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--apple-blue)" }}>
                  Electrodomésticos de Alto Consumo
                </div>
                <p style={{ fontSize: "0.82rem", margin: 0, marginTop: "0.3rem", color: "var(--apple-text)", lineHeight: 1.4 }}>
                  Lavavajillas y secadora programados a partir de las <b>23:00</b> o fines de semana para maximizar el margen de potencia.
                </p>
              </div>

              <div style={{ padding: "0.9rem", borderRadius: "var(--radius-md)", background: "var(--apple-surface-secondary)", border: "1px solid var(--apple-border)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--apple-blue)" }}>
                  Climatización Térmica
                </div>
                <p style={{ fontSize: "0.82rem", margin: 0, marginTop: "0.3rem", color: "var(--apple-text)", lineHeight: 1.4 }}>
                  Termostato a <b>20.0 °C día</b> y <b>17.5 °C noche</b>. Ventilación natural recomendada entre 13:00 y 15:00.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA 3: PÓLIZAS & SEGUROS ── */}
      {activeTab === "insurances" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card-apple" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                  Pólizas de Seguros Familiares
                </h3>
                <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                  Aviso automático 30 días antes de la renovación anual
                </p>
              </div>
              <button
                onClick={() => setShowAddInsurance(!showAddInsurance)}
                className="btn-primary"
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.85rem", gap: "0.35rem" }}
              >
                <IconPlus size={13} />
                <span>{showAddInsurance ? "Cerrar" : "Añadir Póliza"}</span>
              </button>
            </div>

            {/* Formulario Añadir Póliza */}
            {showAddInsurance && (
              <form
                action={async (fd) => {
                  await addFamilyInsuranceAction(fd);
                  setShowAddInsurance(false);
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.6rem",
                  padding: "1rem",
                  background: "var(--apple-surface-secondary)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--apple-border)",
                  marginBottom: "1.25rem",
                }}
              >
                <input type="text" name="title" placeholder="Título (ej. Seguro Hogar)" required className="input-field" />
                <select name="category" className="input-field">
                  <option value="hogar">Hogar</option>
                  <option value="coche">Coche / Moto</option>
                  <option value="salud">Salud Privada</option>
                  <option value="vida">Vida</option>
                  <option value="decesos">Decesos</option>
                  <option value="otro">Otro</option>
                </select>
                <input type="text" name="provider" placeholder="Compañía (ej. Mapfre)" required className="input-field" />
                <input type="text" name="policyNumber" placeholder="Nº de Póliza" className="input-field" />
                <input type="number" step="0.01" name="annualCost" placeholder="Coste total año (€)" required className="input-field" />
                <input type="date" name="renewalDate" required className="input-field" />
                <input type="text" name="notes" placeholder="Notas (franquicia, cobertura...)" className="input-field" style={{ gridColumn: "1 / -1" }} />
                <button type="submit" className="btn-primary" style={{ gridColumn: "1 / -1", padding: "0.45rem", fontSize: "0.8rem" }}>
                  Guardar Póliza
                </button>
              </form>
            )}

            {/* Lista de Pólizas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {insurances.map((pol) => {
                const renewal = new Date(pol.renewal_date);
                const daysUntilRenewal = Math.round((renewal.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isRenewingSoon = daysUntilRenewal <= 45 && daysUntilRenewal >= 0;

                return (
                  <div
                    key={pol.id}
                    style={{
                      padding: "0.95rem 1.1rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--apple-surface-secondary)",
                      border: "1px solid var(--apple-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--apple-text)" }}>
                          {pol.title}
                        </span>
                        <span style={{ fontSize: "0.72rem", padding: "0.1rem 0.45rem", borderRadius: "var(--radius-full)", background: "rgba(255, 255, 255, 0.08)", color: "var(--apple-text-secondary)", textTransform: "capitalize" }}>
                          {pol.provider}
                        </span>
                        {isRenewingSoon && (
                          <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: "var(--radius-full)", background: "rgba(255, 159, 10, 0.15)", color: "var(--apple-orange)", fontWeight: 700 }}>
                            Renovación en {daysUntilRenewal} días
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", marginTop: "0.25rem" }}>
                        Póliza: <code>{pol.policy_number || "S/N"}</code> · Vencimiento: {pol.renewal_date} · Pago {pol.payment_frequency}
                      </div>
                      {pol.notes && (
                        <div style={{ fontSize: "0.74rem", color: "var(--apple-text-tertiary)", marginTop: "0.2rem" }}>
                          {pol.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--apple-text)" }}>
                          {pol.annual_cost.toFixed(2)} €
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--apple-text-secondary)" }}>/ año</div>
                      </div>
                      <button
                        onClick={() => startTransition(() => deleteFamilyInsuranceAction(pol.id))}
                        className="btn-ghost"
                        style={{ width: "26px", height: "26px", borderRadius: "50%", padding: 0, justifyContent: "center", color: "var(--apple-text-tertiary)" }}
                        title="Eliminar póliza"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA 4: GARANTÍAS DE COMPRAS DE VALOR ── */}
      {activeTab === "warranties" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card-apple" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                  Garantías & Bienes de Consumo (3 Años)
                </h3>
                <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                  Control de vigencia legal y tickets asociados de electrodomésticos y tecnología
                </p>
              </div>
              <button
                onClick={() => setShowAddWarranty(!showAddWarranty)}
                className="btn-primary"
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.85rem", gap: "0.35rem" }}
              >
                <IconPlus size={13} />
                <span>{showAddWarranty ? "Cerrar" : "Registrar Garantía"}</span>
              </button>
            </div>

            {/* Formulario Añadir Garantía */}
            {showAddWarranty && (
              <form
                action={async (fd) => {
                  await addWarrantyAction(fd);
                  setShowAddWarranty(false);
                }}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.6rem",
                  padding: "1rem",
                  background: "var(--apple-surface-secondary)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--apple-border)",
                  marginBottom: "1.25rem",
                }}
              >
                <input type="text" name="itemName" placeholder="Artículo (ej. Portátil Apple)" required className="input-field" />
                <input type="text" name="storeName" placeholder="Tienda (ej. El Corte Inglés)" className="input-field" />
                <input type="date" name="purchaseDate" required className="input-field" />
                <input type="number" name="warrantyYears" defaultValue={3} placeholder="Años garantía" className="input-field" />
                <input type="number" step="0.01" name="price" placeholder="Importe de compra (€)" className="input-field" />
                <input type="text" name="notes" placeholder="Notas adicionales..." className="input-field" style={{ gridColumn: "1 / -1" }} />
                <button type="submit" className="btn-primary" style={{ gridColumn: "1 / -1", padding: "0.45rem", fontSize: "0.8rem" }}>
                  Guardar Garantía
                </button>
              </form>
            )}

            {/* Listado de Garantías */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "0.85rem" }}>
              {warranties.map((w) => {
                const pDate = new Date(w.purchase_date);
                const expiry = new Date(pDate);
                expiry.setFullYear(expiry.getFullYear() + w.warranty_years);
                const daysRemaining = Math.round((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const isValid = daysRemaining > 0;

                return (
                  <div
                    key={w.id}
                    style={{
                      padding: "1rem",
                      borderRadius: "var(--radius-lg)",
                      background: "var(--apple-surface-secondary)",
                      border: "1px solid var(--apple-border)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.65rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "var(--radius-full)",
                            background: isValid ? "rgba(52, 199, 89, 0.12)" : "rgba(255, 69, 58, 0.12)",
                            color: isValid ? "var(--apple-green)" : "var(--apple-red)",
                          }}
                        >
                          {isValid ? `${Math.round(daysRemaining / 30)} meses restantes` : "Garantía expirada"}
                        </span>
                        {w.store_name && (
                          <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)" }}>
                            {w.store_name}
                          </span>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--apple-text)", letterSpacing: "-0.01em" }}>
                        {w.item_name}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", marginTop: "0.2rem" }}>
                        Comprado: {w.purchase_date} {w.price ? `· ${w.price.toFixed(2)} €` : ""}
                      </div>
                      {w.notes && (
                        <div style={{ fontSize: "0.74rem", color: "var(--apple-text-tertiary)", marginTop: "0.25rem" }}>
                          {w.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => startTransition(() => deleteWarrantyAction(w.id))}
                        className="btn-ghost"
                        style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)", padding: "0.2rem 0.4rem" }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA 5: ESCANEAR & ARCHIVO DE TICKETS ── */}
      {activeTab === "scan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card-apple" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                  Digitalización y Conciliación de Tickets
                </h3>
                <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                  Actualiza despensa y tacha la compra automáticamente tras subir tu ticket
                </p>
              </div>
              <button
                onClick={() => setIsTicketModalOpen(true)}
                className="btn-primary"
                style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem", gap: "0.35rem" }}
              >
                <IconCamera size={14} />
                <span>📷 Nuevo Ticket con Cámara</span>
              </button>
            </div>

            {/* Banner de Reconciliación */}
            {reconciliation && (
              <div
                style={{
                  padding: "1rem",
                  background: "rgba(52, 199, 89, 0.12)",
                  border: "1px solid rgba(52, 199, 89, 0.35)",
                  borderRadius: "var(--radius-lg)",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--apple-green)", marginBottom: "0.3rem" }}>
                  Conciliación de Compra Completada
                </div>
                <div style={{ fontSize: "0.82rem", color: "var(--apple-text)", lineHeight: 1.4 }}>
                  {reconciliation.summaryMessage}
                </div>
              </div>
            )}

            {scanFeedback && !reconciliation && (
              <div style={{ padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", background: "rgba(0, 113, 227, 0.1)", color: "var(--apple-text)", fontSize: "0.82rem", marginBottom: "1rem" }}>
                {scanFeedback}
              </div>
            )}

            {showScanner && (
              <div
                style={{
                  padding: "1.1rem",
                  background: "var(--apple-surface-secondary)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--apple-border)",
                  marginBottom: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(true)}
                  className="btn-primary"
                  style={{ alignSelf: "flex-start", cursor: "pointer", fontSize: "0.85rem", gap: "0.45rem", padding: "0.5rem 1rem" }}
                >
                  <IconCamera size={16} />
                  <span>📸 Abrir Gestor de Ticket con Cámara en Vivo</span>
                </button>

                <textarea
                  rows={3}
                  placeholder="O pega el texto del ticket aquí..."
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  className="input-field"
                  style={{ fontSize: "0.8rem" }}
                />

                <button
                  type="button"
                  onClick={() => handleProcessTicketText(rawInput)}
                  disabled={isPending || !rawInput.trim()}
                  className="btn-primary"
                  style={{ alignSelf: "flex-start", fontSize: "0.8rem", padding: "0.45rem 1rem" }}
                >
                  Procesar Ticket
                </button>
              </div>
            )}

            {/* Listado de Tickets Recientes */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {receipts.length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--apple-text-secondary)" }}>
                  No hay tickets digitalizados aún.
                </div>
              ) : (
                receipts.map((r) => (
                  <div
                    key={r.id}
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--apple-surface-secondary)",
                      border: "1px solid var(--apple-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--apple-text)" }}>
                        {r.store_name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)", marginTop: "0.15rem" }}>
                        Fecha: {r.date} · {r.items_count || 0} artículos registrados
                      </div>
                    </div>
                    <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--apple-text)" }}>
                      {r.total_amount.toFixed(2)} €
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA 6: CADUCIDADES & FRESCOS ── */}
      {activeTab === "perishables" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="card-apple" style={{ padding: "1.35rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, marginBottom: "0.85rem", letterSpacing: "-0.01em" }}>
              Control de Caducidades & Alimentos Frescos
            </h3>
            {perishables.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--apple-text-secondary)", background: "var(--apple-surface-secondary)", borderRadius: "var(--radius-lg)" }}>
                <p style={{ fontWeight: 600, fontSize: "0.92rem", margin: 0, color: "var(--apple-text)" }}>
                  Despensa al día
                </p>
                <p style={{ fontSize: "0.8rem", margin: 0, marginTop: "0.2rem" }}>
                  No hay alimentos próximos a caducar en los próximos 7 días.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                {perishables.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: "0.9rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--apple-surface-secondary)",
                      border: "1px solid var(--apple-border)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.6rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "0.15rem 0.5rem",
                            borderRadius: "var(--radius-full)",
                            background: item.days_left <= 1 ? "rgba(255, 69, 58, 0.15)" : "rgba(255, 159, 10, 0.15)",
                            color: item.days_left <= 1 ? "var(--apple-red)" : "var(--apple-orange)",
                          }}
                        >
                          {item.days_left === 0 ? "Caduca HOY" : item.days_left === 1 ? "Caduca MAÑANA" : `${item.days_left} días`}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)" }}>
                          {item.store_name}
                        </span>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--apple-text)", marginTop: "0.4rem" }}>
                        {item.name}
                      </div>
                    </div>

                    <button
                      onClick={() => startTransition(() => markPerishableConsumedAction(item.id))}
                      disabled={isPending}
                      className="btn-secondary"
                      style={{ fontSize: "0.74rem", padding: "0.3rem 0.6rem", justifyContent: "center" }}
                    >
                      ✓ Marcar consumido
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Unificado de Gestión de Ticket (Cámara & Acciones) ── */}
      <TicketManagerModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
      />
    </div>
  );
}
