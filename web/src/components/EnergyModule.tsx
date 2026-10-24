"use client";

import { useState, useTransition } from "react";
import type { EnergyContract } from "@/lib/repo";
import type { DayWeather } from "@/lib/weather";
import {
  getEnergyRecommendations,
  getCurrentPeriodInfo,
  type DeviceRecommendation,
} from "@/lib/energyShared";
import {
  updateEnergyContractAction,
  ingestEnergyBillTextAction,
  ingestEnergyBillImageAction,
} from "@/app/actions";

export function EnergyModule({
  contracts = [],
  todayWeather = null,
}: {
  contracts: EnergyContract[];
  todayWeather: DayWeather | null;
}) {
  const [activeSubTab, setActiveSubTab] = useState<"ev" | "appliances" | "heating" | "tariffs">("ev");
  const [isEditingTariffs, setIsEditingTariffs] = useState(false);
  const [elecPriceInput, setElecPriceInput] = useState<string>("");
  const [gasPriceInput, setGasPriceInput] = useState<string>("");
  const [billTextInput, setBillTextInput] = useState("");
  const [showBillUploader, setShowBillUploader] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const recs = getEnergyRecommendations(contracts, todayWeather);
  const elecContract = recs.electricityContract;
  const gasContract = recs.gasContract;

  const elecKwhPrice = elecContract?.energy_price_kwh ?? 0.1230;
  const gasKwhPrice = gasContract?.energy_price_kwh ?? 0.0899;

  const handleManualTariffSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (elecContract && elecPriceInput) {
        const val = parseFloat(elecPriceInput.replace(",", "."));
        if (!isNaN(val) && val > 0) {
          await updateEnergyContractAction(elecContract.id, { energy_price_kwh: val });
        }
      }
      if (gasContract && gasPriceInput) {
        const val = parseFloat(gasPriceInput.replace(",", "."));
        if (!isNaN(val) && val > 0) {
          await updateEnergyContractAction(gasContract.id, { energy_price_kwh: val });
        }
      }
      setIsEditingTariffs(false);
    });
  };

  const handleTextBillUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billTextInput.trim()) return;
    setUploadStatus("Analizando factura con Gemini...");
    startTransition(async () => {
      try {
        const res = await ingestEnergyBillTextAction(billTextInput);
        if (res.success) {
          setUploadStatus(`✅ ${res.summary}`);
          setBillTextInput("");
          setTimeout(() => setShowBillUploader(false), 3000);
        } else {
          setUploadStatus(`❌ ${res.summary}`);
        }
      } catch (err: any) {
        setUploadStatus(`❌ Error al procesar factura: ${err.message}`);
      }
    });
  };

  const handleImageBillUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus("Leyendo factura con Gemini Vision...");
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      startTransition(async () => {
        try {
          const res = await ingestEnergyBillImageAction(base64, file.type || "image/jpeg");
          if (res.success) {
            setUploadStatus(`✅ ${res.summary}`);
            setTimeout(() => setShowBillUploader(false), 3000);
          } else {
            setUploadStatus(`❌ ${res.summary}`);
          }
        } catch (err: any) {
          setUploadStatus(`❌ Error en escaneo: ${err.message}`);
        }
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", minWidth: 0 }}>
      {/* ── Banner Superior: Semáforo Energético en Tiempo Real ── */}
      <div
        className="card-apple"
        style={{
          background: "var(--apple-surface-secondary)",
          border: "1px solid var(--apple-border)",
          borderLeft: `5px solid ${recs.periodInfo.period === "P2" ? "var(--apple-green)" : "var(--apple-orange)"}`,
          padding: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
              <span style={{ fontSize: "1.25rem" }}>⚡</span>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                Gestor Energético Inteligente
              </h2>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "0.2rem 0.55rem",
                  borderRadius: "var(--radius-full)",
                  background: recs.periodInfo.period === "P2" ? "var(--apple-green-subtle)" : "var(--apple-orange-subtle)",
                  color: recs.periodInfo.period === "P2" ? "var(--apple-green)" : "var(--apple-orange)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Franja {recs.periodInfo.name} ({recs.periodInfo.period})
              </span>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--apple-text-secondary)", margin: 0, lineHeight: 1.4 }}>
              Tarifas activas con <b>Naturgy</b>: Luz a <b>{elecKwhPrice} €/kWh</b> (precio plano 24h) y Gas a <b>{gasKwhPrice} €/kWh</b>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowBillUploader(!showBillUploader)}
            className="apple-button-secondary"
            style={{ fontSize: "0.8rem", padding: "0.45rem 0.85rem" }}
          >
            📄 {showBillUploader ? "Cerrar Ingesta" : "Actualizar con Factura"}
          </button>
        </div>

        {/* Resumen del semáforo actual */}
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            background: "var(--apple-surface)",
            border: "1px solid var(--apple-border)",
            fontSize: "0.82rem",
            color: "var(--apple-text)",
            lineHeight: 1.45,
          }}
        >
          {recs.generalSummary}
        </div>
      </div>

      {/* ── Desplegable de Ingesta Inteligente de Factura con Gemini ── */}
      {showBillUploader && (
        <div
          className="card-apple"
          style={{
            border: "2px dashed var(--apple-blue)",
            background: "var(--apple-blue-subtle)",
            padding: "1.25rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "1.3rem" }}>🤖</span>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--apple-blue)" }}>
              Agente de Memoria: Ingesta de Facturas y Contratos
            </h3>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--apple-text-secondary)", margin: "0 0 1rem 0" }}>
            Sube una foto o PDF de tu última factura de Naturgy (o pega el texto). El agente extraerá el precio del kWh, términos de potencia y peajes para adaptar automáticamente las recomendaciones del hogar.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label
                htmlFor="bill-image-input"
                className="apple-button-primary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                📸 Seleccionar foto o captura de factura
              </label>
              <input
                id="bill-image-input"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleImageBillUpload}
                disabled={isPending}
                style={{ display: "none" }}
              />
            </div>

            <div style={{ textAlign: "center", fontSize: "0.75rem", color: "var(--apple-text-tertiary)" }}>
              — o pega el texto / detalles de tu contrato —
            </div>

            <form onSubmit={handleTextBillUpload} style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <textarea
                value={billTextInput}
                onChange={(e) => setBillTextInput(e.target.value)}
                placeholder="Pega aquí el texto de tu factura o email de Naturgy (ej. 'Tarifa por uso luz: 0,123 €/kWh, potencia punta 0,123 €/kW día...')"
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--apple-border)",
                  fontSize: "0.82rem",
                  fontFamily: "inherit",
                }}
              />
              <button
                type="submit"
                disabled={isPending || !billTextInput.trim()}
                className="apple-button-primary"
                style={{ alignSelf: "flex-end", fontSize: "0.82rem" }}
              >
                Analizar y Guardar en Memoria →
              </button>
            </form>

            {uploadStatus && (
              <div
                style={{
                  padding: "0.6rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  background: "var(--apple-surface)",
                  border: "1px solid var(--apple-border)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  marginTop: "0.5rem",
                }}
              >
                {uploadStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sub-navegador Segmentado Apple para Dispositivos ── */}
      <div className="segmented-control" role="tablist" style={{ width: "100%" }}>
        <button
          type="button"
          onClick={() => setActiveSubTab("ev")}
          className={`segmented-btn ${activeSubTab === "ev" ? "active" : ""}`}
        >
          <span>🚗</span>
          <span>Coche Eléctrico</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("appliances")}
          className={`segmented-btn ${activeSubTab === "appliances" ? "active" : ""}`}
        >
          <span>🧺</span>
          <span>Lavadora & Electro</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("heating")}
          className={`segmented-btn ${activeSubTab === "heating" ? "active" : ""}`}
        >
          <span>♨️</span>
          <span>Calefacción Gas</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("tariffs")}
          className={`segmented-btn ${activeSubTab === "tariffs" ? "active" : ""}`}
        >
          <span>📋</span>
          <span>Tarifas Naturgy</span>
        </button>
      </div>

      {/* ── Pestaña 1: Coche Eléctrico ── */}
      {activeSubTab === "ev" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card-apple" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "12px",
                    background: "rgba(52, 199, 89, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.4rem",
                  }}
                >
                  🚗
                </div>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Coche Eléctrico (VE)</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--apple-text-secondary)", margin: 0 }}>
                    Optimización de recarga doméstica
                  </p>
                </div>
              </div>

              <span
                style={{
                  padding: "0.35rem 0.75rem",
                  borderRadius: "var(--radius-full)",
                  background: recs.ev.status === "optimal" ? "var(--apple-green-subtle)" : "var(--apple-orange-subtle)",
                  color: recs.ev.statusColor,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                }}
              >
                ● {recs.ev.statusLabel}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div
                style={{
                  background: "var(--apple-surface)",
                  padding: "0.95rem 1.1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--apple-border)",
                }}
              >
                <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-text)" }}>
                  ⏰ Ventana recomendada: <span style={{ color: "var(--apple-green)" }}>{recs.ev.bestHours}</span>
                </p>
                <p style={{ margin: "0.45rem 0 0 0", fontSize: "0.82rem", color: "var(--apple-text-secondary)", lineHeight: 1.5 }}>
                  {recs.ev.tip}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pestaña 2: Lavadora & Electrodomésticos ── */}
      {activeSubTab === "appliances" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Tarjeta Lavadora */}
          <div className="card-apple" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.5rem" }}>🧺</span>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Lavadora & Secadora</h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0 }}>
                    Coste estimado: {recs.washer.estimatedCost}
                  </p>
                </div>
              </div>
              <span
                style={{
                  padding: "0.3rem 0.7rem",
                  borderRadius: "var(--radius-full)",
                  background: recs.washer.status === "avoid" ? "rgba(255, 59, 48, 0.12)" : "var(--apple-green-subtle)",
                  color: recs.washer.statusColor,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                }}
              >
                ● {recs.washer.statusLabel}
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--apple-text)", margin: "0 0 0.5rem 0", lineHeight: 1.45 }}>
              {recs.washer.tip}
            </p>
            <div style={{ background: "var(--apple-surface-secondary)", padding: "0.65rem 0.85rem", borderRadius: "var(--radius-md)", fontSize: "0.78rem" }}>
              💡 <b>Franjas ideales:</b> 10:00–12:30, 15:30–19:30 o programa el temporizador nocturno.
            </div>
          </div>

          {/* Tarjeta Lavavajillas */}
          <div className="card-apple" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.5rem" }}>🍽️</span>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Lavavajillas</h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0 }}>
                    Coste estimado: {recs.dishwasher.estimatedCost}
                  </p>
                </div>
              </div>
              <span
                style={{
                  padding: "0.3rem 0.7rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--apple-blue-subtle)",
                  color: "var(--apple-blue)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                }}
              >
                ● {recs.dishwasher.statusLabel}
              </span>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--apple-text)", margin: 0, lineHeight: 1.45 }}>
              {recs.dishwasher.tip}
            </p>
          </div>

          {/* Semáforo Horario del Día */}
          <div className="card-apple" style={{ padding: "1.25rem" }}>
            <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 0.75rem 0" }}>
              Distribución Horaria del Día (Evitar picos de potencia en cocina)
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem" }}>
              <div style={{ padding: "0.6rem", borderRadius: "8px", background: "rgba(52, 199, 89, 0.1)", border: "1px solid rgba(52, 199, 89, 0.2)" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.78rem", color: "#34c759" }}>🌙 00:00 – 08:00</p>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.72rem", color: "var(--apple-text-secondary)" }}>Valle P2 · Coche y programables</p>
              </div>
              <div style={{ padding: "0.6rem", borderRadius: "8px", background: "rgba(0, 113, 227, 0.08)", border: "1px solid rgba(0, 113, 227, 0.2)" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.78rem", color: "#0071e3" }}>☀️ 08:00 – 13:30</p>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.72rem", color: "var(--apple-text-secondary)" }}>Despejado · Lavadoras coladas</p>
              </div>
              <div style={{ padding: "0.6rem", borderRadius: "8px", background: "rgba(255, 59, 48, 0.1)", border: "1px solid rgba(255, 59, 48, 0.2)" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.78rem", color: "#ff3b30" }}>🍳 13:30 – 15:00</p>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.72rem", color: "var(--apple-text-secondary)" }}>Pico cocina · Evitar lavadora</p>
              </div>
              <div style={{ padding: "0.6rem", borderRadius: "8px", background: "rgba(0, 113, 227, 0.08)", border: "1px solid rgba(0, 113, 227, 0.2)" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.78rem", color: "#0071e3" }}>🌤️ 15:00 – 20:30</p>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.72rem", color: "var(--apple-text-secondary)" }}>Tarde · Lavavajillas o secadora</p>
              </div>
              <div style={{ padding: "0.6rem", borderRadius: "8px", background: "rgba(255, 59, 48, 0.1)", border: "1px solid rgba(255, 59, 48, 0.2)" }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.78rem", color: "#ff3b30" }}>🍽️ 20:30 – 22:30</p>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.72rem", color: "var(--apple-text-secondary)" }}>Pico cenas · Cero aparatos pesados</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pestaña 3: Calefacción Gas ── */}
      {activeSubTab === "heating" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card-apple" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                <span style={{ fontSize: "1.5rem" }}>♨️</span>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>Calefacción de Gas (Naturgy RL.2)</h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0 }}>
                    Salamanca · {todayWeather ? `Mínima ${todayWeather.tMin}°C / Máxima ${todayWeather.tMax}°C` : "Clima local"}
                  </p>
                </div>
              </div>
              <span
                style={{
                  padding: "0.3rem 0.7rem",
                  borderRadius: "var(--radius-full)",
                  background: "var(--apple-orange-subtle)",
                  color: "var(--apple-orange)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                }}
              >
                ● {recs.heating.statusLabel}
              </span>
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--apple-text)", margin: "0 0 0.85rem 0", lineHeight: 1.45 }}>
              {recs.heating.tip}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
              <div style={{ background: "var(--apple-surface-secondary)", padding: "0.85rem", borderRadius: "var(--radius-md)" }}>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--apple-text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>
                  Consigna Recomendada
                </p>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "1rem", fontWeight: 700, color: "var(--apple-text)" }}>
                  20,0°C día / 17,5°C noche
                </p>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.75rem", color: "var(--apple-text-secondary)" }}>
                  Evita apagarla en Salamanca
                </p>
              </div>

              <div style={{ background: "var(--apple-surface-secondary)", padding: "0.85rem", borderRadius: "var(--radius-md)" }}>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--apple-text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>
                  Ventilación Eficiente
                </p>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "1rem", fontWeight: 700, color: "var(--apple-orange)" }}>
                  13:00 a 15:00 (10 min)
                </p>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.75rem", color: "var(--apple-text-secondary)" }}>
                  Horas centrales con sol
                </p>
              </div>

              <div style={{ background: "var(--apple-surface-secondary)", padding: "0.85rem", borderRadius: "var(--radius-md)" }}>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--apple-text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>
                  Coste Caldera Activa
                </p>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "1rem", fontWeight: 700, color: "var(--apple-text)" }}>
                  {recs.heating.estimatedCost}
                </p>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.75rem", color: "var(--apple-text-secondary)" }}>
                  Modulación estándar (9 kW)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Pestaña 4: Ficha de Tarifas Naturgy ── */}
      {activeSubTab === "tariffs" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="card-apple" style={{ padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>
                Condiciones de tus Contratos Naturgy
              </h3>
              <button
                type="button"
                onClick={() => {
                  setElecPriceInput(elecKwhPrice.toString());
                  setGasPriceInput(gasKwhPrice.toString());
                  setIsEditingTariffs(!isEditingTariffs);
                }}
                className="apple-button-secondary"
                style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
              >
                {isEditingTariffs ? "Cancelar" : "✏️ Ajustar Precios"}
              </button>
            </div>

            {isEditingTariffs ? (
              <form onSubmit={handleManualTariffSave} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>
                    Precio kWh Luz (€/kWh):
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={elecPriceInput}
                    onChange={(e) => setElecPriceInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--apple-border)",
                      marginTop: "0.25rem",
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>
                    Precio kWh Gas (€/kWh):
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={gasPriceInput}
                    onChange={(e) => setGasPriceInput(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--apple-border)",
                      marginTop: "0.25rem",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="apple-button-primary"
                  style={{ alignSelf: "flex-end", marginTop: "0.5rem" }}
                >
                  Guardar Cambios
                </button>
              </form>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {/* Ficha Luz */}
                <div style={{ background: "var(--apple-surface-secondary)", padding: "0.85rem", borderRadius: "var(--radius-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>⚡ {elecContract?.tariff_name || "Tarifa Por Uso Luz"}</div>
                    <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", background: "var(--apple-green-subtle)", color: "var(--apple-green)", fontWeight: 700 }}>
                      Peaje {elecContract?.access_toll || "2.0TD"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.8rem" }}>
                    <div>
                      <span style={{ color: "var(--apple-text-tertiary)" }}>Término Energía:</span>{" "}
                      <b>{elecKwhPrice} €/kWh</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--apple-text-tertiary)" }}>Potencia P1 / P2:</span>{" "}
                      <b>{elecContract?.power_p1_kw ?? 0.123} / {elecContract?.power_p2_kw ?? 0.0615} €/kW día</b>
                    </div>
                  </div>
                  <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.75rem", color: "var(--apple-text-secondary)" }}>
                    {elecContract?.notes}
                  </p>
                </div>

                {/* Ficha Gas */}
                <div style={{ background: "var(--apple-surface-secondary)", padding: "0.85rem", borderRadius: "var(--radius-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>♨️ {gasContract?.tariff_name || "Tarifa Por Uso Gas"}</div>
                    <span style={{ fontSize: "0.75rem", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-full)", background: "var(--apple-orange-subtle)", color: "var(--apple-orange)", fontWeight: 700 }}>
                      Peaje {gasContract?.access_toll || "RL.2"}
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginTop: "0.5rem", fontSize: "0.8rem" }}>
                    <div>
                      <span style={{ color: "var(--apple-text-tertiary)" }}>Término Variable:</span>{" "}
                      <b>{gasKwhPrice} €/kWh</b>
                    </div>
                    <div>
                      <span style={{ color: "var(--apple-text-tertiary)" }}>Término Fijo:</span>{" "}
                      <b>{gasContract?.fixed_monthly_price ?? 9.55} €/mes</b>
                    </div>
                  </div>
                  <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.75rem", color: "var(--apple-text-secondary)" }}>
                    {gasContract?.notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
