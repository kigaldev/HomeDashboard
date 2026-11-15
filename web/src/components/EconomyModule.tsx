"use client";

import { useState, useTransition, useEffect } from "react";
import type {
  Receipt,
  PerishableAlert,
  PriceComparison,
  HabitInsight,
  EnergyContract,
  FamilyInsurance,
  Warranty,
  UtilityBill,
  MonthlyExpenses,
  RecurringExpense,
  MonthlyIncome,
  MonthlyEvolutionItem,
  Member,
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
  deleteReceiptAction,
  deleteUtilityBillAction,
  toggleRecurringExpenseActiveAction,
  deleteRecurringExpenseAction,
  updateReceiptItemCategoryAction,
  deleteMonthlyIncomeAction,
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
import { ManualExpenseModal } from "./ManualExpenseModal";
import { ManualUtilityBillModal } from "./ManualUtilityBillModal";
import { IncomeModal } from "./IncomeModal";
import { DocumentViewerModal } from "./DocumentViewerModal";
import { CategoryDonutChart, MonthCompareChart } from "./ChartsLazy";

export type ReceiptItemMonthly = {
  id: number;
  receipt_id: number;
  name: string;
  quantity: string | null;
  unit_price: number | null;
  total_price: number;
  category: string;
  store_name?: string | null;
  date?: string;
};

export function EconomyModule({
  receipts = [],
  perishables = [],
  monthlyExpenses = {
    current_month_total: 0,
    last_month_total: 0,
    receipts_total: 0,
    utilities_total: 0,
    insurances_total: 0,
    recurring_total: 0,
    current_month_income: 0,
    last_month_income: 0,
    net_savings: 0,
    savings_rate: 0,
    by_store: [],
    by_category: [],
    items: [],
  },
  priceComparisons = [],
  habits = [],
  energyContracts = [],
  todayWeather = null,
  insurances = [],
  warranties = [],
  utilityBills = [],
  recurringExpenses = [],
  monthlyIncomes = [],
  incomeEvolution = [],
  members = [],
}: {
  receipts: Receipt[];
  perishables: PerishableAlert[];
  monthlyExpenses: MonthlyExpenses;
  priceComparisons: PriceComparison[];
  habits: HabitInsight[];
  energyContracts: EnergyContract[];
  todayWeather: DayWeather | null;
  insurances: FamilyInsurance[];
  warranties: Warranty[];
  utilityBills?: UtilityBill[];
  recurringExpenses?: RecurringExpense[];
  monthlyIncomes?: MonthlyIncome[];
  incomeEvolution?: MonthlyEvolutionItem[];
  members?: Member[];
}) {
  const [activeTab, setActiveTab] = useState<"balance" | "incomes" | "energy" | "recurring" | "insurances" | "warranties" | "scan" | "perishables">("balance");
  const [manualExpenseType, setManualExpenseType] = useState<"supermarket" | "general" | "recurring">("supermarket");
  const [isPending, startTransition] = useTransition();

  // Estados interactivos para Categorías y Drag & Drop
  const [categories, setCategories] = useState(monthlyExpenses.by_category);
  const [monthItems, setMonthItems] = useState<ReceiptItemMonthly[]>(monthlyExpenses.items ?? []);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [draggedItemId, setDraggedItemId] = useState<number | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);
  const [isStoresBreakdownOpen, setIsStoresBreakdownOpen] = useState(false);
  const [isCategoriesListOpen, setIsCategoriesListOpen] = useState(false);

  useEffect(() => {
    setCategories(monthlyExpenses.by_category);
    setMonthItems(monthlyExpenses.items ?? []);
  }, [monthlyExpenses]);

  // Manejo de Drag & Drop y reclasificación inmediata
  const handleDrop = (targetCategory: string, itemIdInput?: number) => {
    const itemId = itemIdInput ?? draggedItemId;
    if (!itemId || itemId < 0) {
      setDragOverCategory(null);
      setDraggedItemId(null);
      return;
    }

    const item = monthItems.find((i) => i.id === itemId);
    if (!item || item.category === targetCategory) {
      setDragOverCategory(null);
      setDraggedItemId(null);
      return;
    }

    const oldCategory = item.category;
    const itemPrice = item.total_price;

    // Actualización inmediata del estado local para que los totales cambien al instante
    setMonthItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, category: targetCategory } : it))
    );

    setCategories((prev) => {
      let targetExists = false;
      const updated = prev.map((cat) => {
        if (cat.category === oldCategory) {
          return { ...cat, total: Math.max(0, cat.total - itemPrice) };
        }
        if (cat.category === targetCategory) {
          targetExists = true;
          return { ...cat, total: cat.total + itemPrice };
        }
        return cat;
      });

      if (!targetExists) {
        updated.push({
          category: targetCategory,
          total: itemPrice,
          percentage: 0,
        });
      }

      const totalSum = updated.reduce((sum, c) => sum + c.total, 0);
      return updated.map((c) => ({
        ...c,
        percentage: totalSum > 0 ? Math.round((c.total / totalSum) * 100) : 0,
      }));
    });

    setDragOverCategory(null);
    setDraggedItemId(null);

    // Invocación a la server action en una transición
    startTransition(async () => {
      try {
        await updateReceiptItemCategoryAction(itemId, targetCategory);
      } catch (err) {
        console.error("Error al actualizar categoría del producto:", err);
      }
    });
  };

  // Categorías estándar y activas para selector y zonas de soltado
  const standardCategories = [
    "Alimentación",
    "Frescos",
    "Lácteos",
    "Carnicería",
    "Pescadería",
    "Frutas y Verduras",
    "Panadería",
    "Bebidas",
    "Droguería y Limpieza",
    "Higiene",
    "Hogar",
    "Otros",
  ];
  const availableCategoryTargets = Array.from(
    new Set([...categories.map((c) => c.category), ...standardCategories])
  ).filter(Boolean);

  // Estados para Escáner de Tickets y Gastos Manuales
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isManualExpenseOpen, setIsManualExpenseOpen] = useState(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [selectedMonthFilter, setSelectedMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));
  const [ticketFilter, setTicketFilter] = useState<"all" | "with_ticket" | "manual" | "supermarket">("all");
  const [showScanner, setShowScanner] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);
  const [reconciliation, setReconciliation] = useState<ReceiptReconciliationResult | null>(null);

  // Estados para Energía y Facturación de Suministros
  const [isUtilityModalOpen, setIsUtilityModalOpen] = useState(false);
  const [billTextInput, setBillTextInput] = useState("");
  const [showBillUploader, setShowBillUploader] = useState(false);
  const [energyUploadStatus, setEnergyUploadStatus] = useState<string | null>(null);

  // Estados para formularios y visualizador de Pólizas y Garantías
  const [showAddInsurance, setShowAddInsurance] = useState(false);
  const [showAddWarranty, setShowAddWarranty] = useState(false);
  const [insuranceDocUrl, setInsuranceDocUrl] = useState<string | null>(null);
  const [isUploadingInsuranceDoc, setIsUploadingInsuranceDoc] = useState(false);
  const [warrantyDocUrl, setWarrantyDocUrl] = useState<string | null>(null);
  const [isUploadingWarrantyDoc, setIsUploadingWarrantyDoc] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ title: string; url: string } | null>(null);

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

  // Cálculos de ingresos familiares y ahorro neto
  const currentIncome = monthlyExpenses.current_month_income ?? 0;
  const lastIncome = monthlyExpenses.last_month_income ?? 0;
  const diffIncome = currentIncome - lastIncome;
  const diffIncomePercent = lastIncome > 0 ? ((diffIncome / lastIncome) * 100).toFixed(1) : null;
  const netSavings = monthlyExpenses.net_savings ?? (currentIncome - monthlyExpenses.current_month_total);
  const savingsRate = monthlyExpenses.savings_rate ?? (currentIncome > 0 ? (netSavings / currentIncome) * 100 : 0);

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
      <div className="liquid-glass liquid-specular" style={{ padding: "1.5rem" }}>
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

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setIsIncomeModalOpen(true)}
              className="btn-secondary"
              style={{
                fontSize: "0.82rem",
                padding: "0.45rem 0.95rem",
                gap: "0.4rem",
                border: "1px solid rgba(48, 209, 88, 0.4)",
                color: "#30d158",
                background: "rgba(48, 209, 88, 0.08)",
              }}
            >
              <IconPlus size={14} />
              <span>Registrar Ingreso</span>
            </button>
            <button
              onClick={() => setIsManualExpenseOpen(true)}
              className="btn-secondary"
              style={{ fontSize: "0.82rem", padding: "0.45rem 0.95rem", gap: "0.4rem" }}
            >
              <IconPlus size={14} />
              <span>Nuevo Gasto Manual</span>
            </button>
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
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.85rem",
            marginTop: "1.25rem",
          }}
        >
          {/* Ingreso Mensual Familiar */}
          <div
            onClick={() => setActiveTab("incomes")}
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-lg)",
              background: "var(--apple-surface-secondary)",
              border: "1px solid var(--apple-border)",
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)" }}>
                Ingresos del Mes
              </span>
              <span style={{ fontSize: "0.7rem", padding: "0.1rem 0.45rem", borderRadius: "var(--radius-full)", background: "rgba(48, 209, 88, 0.15)", color: "#30d158", fontWeight: 700 }}>
                Nóminas
              </span>
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, letterSpacing: "-0.03em", marginTop: "0.3rem", color: currentIncome > 0 ? "#30d158" : "var(--apple-text)" }}>
              {currentIncome.toFixed(2)} €
            </div>
            <div style={{ fontSize: "0.76rem", color: diffIncome >= 0 ? "var(--apple-green)" : "var(--apple-orange)", marginTop: "0.2rem", fontWeight: 600 }}>
              {diffIncomePercent ? (
                diffIncome >= 0 ? `▲ +${diffIncome.toFixed(0)} € (+${diffIncomePercent}%) vs mes ant.` : `▼ ${diffIncome.toFixed(0)} € (${diffIncomePercent}%) vs mes ant.`
              ) : (
                monthlyIncomes.length > 0 ? `${monthlyIncomes.length} fuentes activas` : "Pulsa para registrar nómina"
              )}
            </div>
          </div>

          {/* Gasto Mes Actual */}
          <div
            onClick={() => setActiveTab("balance")}
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-lg)",
              background: "var(--apple-surface-secondary)",
              border: "1px solid var(--apple-border)",
              cursor: "pointer",
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
            {(monthlyExpenses.receipts_total !== undefined || monthlyExpenses.utilities_total !== undefined) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.45rem", fontSize: "0.71rem", color: "var(--apple-text-secondary)" }}>
                <span>🛒 {(monthlyExpenses.receipts_total ?? 0).toFixed(0)} €</span>
                <span>·</span>
                <span>💡 {(monthlyExpenses.utilities_total ?? 0).toFixed(0)} €</span>
                {Boolean(monthlyExpenses.recurring_total && monthlyExpenses.recurring_total > 0) && (
                  <>
                    <span>·</span>
                    <span>🔄 {(monthlyExpenses.recurring_total ?? 0).toFixed(0)} €</span>
                  </>
                )}
                {Boolean(monthlyExpenses.insurances_total && monthlyExpenses.insurances_total > 0) && (
                  <>
                    <span>·</span>
                    <span>🛡️ {(monthlyExpenses.insurances_total ?? 0).toFixed(0)} €</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Balance Neto / Ahorro */}
          <div
            onClick={() => setActiveTab("balance")}
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-lg)",
              background: "var(--apple-surface-secondary)",
              border: "1px solid var(--apple-border)",
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)" }}>
                Ahorro Neto / Balance
              </span>
              <span
                style={{
                  fontSize: "0.7rem",
                  padding: "0.1rem 0.45rem",
                  borderRadius: "var(--radius-full)",
                  background: netSavings >= 0 ? "rgba(48, 209, 88, 0.15)" : "rgba(255, 69, 58, 0.15)",
                  color: netSavings >= 0 ? "#30d158" : "var(--apple-red)",
                  fontWeight: 700,
                }}
              >
                {netSavings >= 0 ? "Superávit" : "Déficit"}
              </span>
            </div>
            <div
              style={{
                fontSize: "1.6rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                marginTop: "0.3rem",
                color: netSavings >= 0 ? "#30d158" : "var(--apple-red)",
              }}
            >
              {netSavings >= 0 ? "+" : ""}{netSavings.toFixed(2)} €
            </div>
            <div style={{ fontSize: "0.76rem", color: netSavings >= 0 ? "var(--apple-green)" : "var(--apple-red)", marginTop: "0.2rem", fontWeight: 600 }}>
              {currentIncome > 0 ? `Tasa de ahorro: ${savingsRate.toFixed(1)}%` : "Requiere ingresos del mes"}
            </div>
          </div>

          {/* Suministros Naturgy */}
          <div
            onClick={() => setActiveTab("energy")}
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-lg)",
              background: "var(--apple-surface-secondary)",
              border: "1px solid var(--apple-border)",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)" }}>
              Suministros & Energía
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem", marginTop: "0.3rem" }}>
              <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--apple-text)" }}>
                {(monthlyExpenses.utilities_total ?? 0) > 0 ? `${(monthlyExpenses.utilities_total ?? 0).toFixed(2)} €` : `${elecPrice} €`}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--apple-text-secondary)" }}>
                {(monthlyExpenses.utilities_total ?? 0) > 0 ? "facturado" : "/kWh luz"}
              </span>
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--apple-green)", marginTop: "0.2rem", fontWeight: 600 }}>
              {(monthlyExpenses.utilities_total ?? 0) > 0 ? `${utilityBills?.length ?? 1} facturas este mes` : "Tarifa Plana Fija 24h activa"}
            </div>
          </div>

          {/* Cobertura de Seguros */}
          <div
            onClick={() => setActiveTab("insurances")}
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-lg)",
              background: "var(--apple-surface-secondary)",
              border: "1px solid var(--apple-border)",
              cursor: "pointer",
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
            onClick={() => setActiveTab("incomes")}
            className={`tab-btn ${activeTab === "incomes" ? "active" : ""}`}
            style={{ fontSize: "0.82rem", padding: "0.4rem 0.95rem" }}
          >
            Ingresos & Nóminas ({monthlyIncomes.length})
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
            onClick={() => setActiveTab("recurring")}
            className={`tab-btn ${activeTab === "recurring" ? "active" : ""}`}
            style={{ fontSize: "0.82rem", padding: "0.4rem 0.95rem" }}
          >
            Gastos Fijos & Hipoteca ({recurringExpenses.length})
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
          {/* Pestaña de Caducidades oculta a petición del usuario
          <button
            type="button"
            onClick={() => setActiveTab("perishables")}
            className={`tab-btn ${activeTab === "perishables" ? "active" : ""}`}
            style={{ fontSize: "0.82rem", padding: "0.4rem 0.95rem" }}
          >
            Caducidades ({perishables.length})
          </button> */}
        </div>
      </div>

      {/* ── VISTA 1: BALANCE & GASTOS ── */}
      {activeTab === "balance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* ── Evolución y Balance Financiero Mensual ── */}
          <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                    📊 Evolución Financiera & Tasa de Ahorro
                  </h3>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      padding: "0.15rem 0.55rem",
                      borderRadius: "var(--radius-full)",
                      background: "rgba(48, 209, 88, 0.12)",
                      color: "#30d158",
                      fontWeight: 700,
                    }}
                  >
                    Balance Familiar
                  </span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.2rem" }}>
                  Comparativa de ingresos netos vs gastos totales y evolución histórica mes a mes
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(true)}
                  className="btn-secondary"
                  style={{
                    fontSize: "0.78rem",
                    padding: "0.35rem 0.75rem",
                    gap: "0.35rem",
                    border: "1px solid rgba(48, 209, 88, 0.4)",
                    color: "#30d158",
                  }}
                >
                  <IconPlus size={13} />
                  <span>Añadir Ingreso</span>
                </button>
              </div>
            </div>

            {/* Barra de progreso / balance del mes actual */}
            <div
              style={{
                padding: "1rem",
                borderRadius: "var(--radius-lg)",
                background: "var(--apple-surface-secondary)",
                border: "1px solid var(--apple-border)",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>
                    Mes en curso · Balance Neto
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.15rem" }}>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: netSavings >= 0 ? "#30d158" : "var(--apple-red)" }}>
                      {netSavings >= 0 ? "+" : ""}{netSavings.toFixed(2)} €
                    </span>
                    <span
                      style={{
                        fontSize: "0.74rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: "var(--radius-full)",
                        background: netSavings >= 0 ? "rgba(48, 209, 88, 0.15)" : "rgba(255, 69, 58, 0.15)",
                        color: netSavings >= 0 ? "#30d158" : "var(--apple-red)",
                        fontWeight: 700,
                      }}
                    >
                      {currentIncome > 0 ? `${savingsRate.toFixed(1)}% tasa ahorro` : "Sin ingresos registrados"}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem", fontSize: "0.78rem" }}>
                  <div>
                    <span style={{ color: "var(--apple-text-secondary)" }}>Ingresos: </span>
                    <strong style={{ color: "#30d158" }}>{currentIncome.toFixed(2)} €</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--apple-text-secondary)" }}>Gastos: </span>
                    <strong style={{ color: "var(--apple-text)" }}>{monthlyExpenses.current_month_total.toFixed(2)} €</strong>
                  </div>
                </div>
              </div>

              {/* Barra de progreso de gastos vs ahorro */}
              {currentIncome > 0 ? (
                <div style={{ width: "100%", height: "10px", background: "rgba(255,255,255,0.06)", borderRadius: "var(--radius-full)", overflow: "hidden", display: "flex" }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.round((monthlyExpenses.current_month_total / currentIncome) * 100))}%`,
                      height: "100%",
                      background: monthlyExpenses.current_month_total > currentIncome ? "var(--apple-red)" : "var(--apple-blue)",
                      transition: "width 0.4s ease",
                    }}
                    title={`Gastos: ${monthlyExpenses.current_month_total.toFixed(2)} €`}
                  />
                  {netSavings > 0 && (
                    <div
                      style={{
                        width: `${Math.round((netSavings / currentIncome) * 100)}%`,
                        height: "100%",
                        background: "#30d158",
                        transition: "width 0.4s ease",
                      }}
                      title={`Ahorro: ${netSavings.toFixed(2)} €`}
                    />
                  )}
                </div>
              ) : (
                <div style={{ fontSize: "0.74rem", color: "var(--apple-orange)", marginTop: "0.3rem" }}>
                  ⚠️ Registra los ingresos familiares del mes para calcular y visualizar la tasa de ahorro familiar.
                </div>
              )}
            </div>

            {/* Evolución Histórica de los últimos meses */}
            {incomeEvolution.length > 0 && (
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--apple-text-secondary)", marginBottom: "0.6rem" }}>
                  Histórico Mensual Comparado (Últimos 6 Meses)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  {incomeEvolution.map((item) => {
                    const maxVal = Math.max(item.income, item.expenses, 1);
                    const incWidth = Math.min(100, Math.round((item.income / maxVal) * 100));
                    const expWidth = Math.min(100, Math.round((item.expenses / maxVal) * 100));

                    return (
                      <div
                        key={item.month}
                        style={{
                          padding: "0.75rem 0.95rem",
                          borderRadius: "var(--radius-md)",
                          background: "var(--apple-surface-secondary)",
                          border: "1px solid var(--apple-border)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem", fontSize: "0.82rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <strong style={{ color: "var(--apple-text)" }}>{item.label}</strong>
                            <span style={{ fontSize: "0.7rem", color: "var(--apple-text-tertiary)" }}>({item.month})</span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", fontSize: "0.78rem" }}>
                            <span>
                              Ingresos: <strong style={{ color: "#30d158" }}>{item.income.toFixed(0)} €</strong>
                            </span>
                            <span>
                              Gastos: <strong style={{ color: "var(--apple-text)" }}>{item.expenses.toFixed(0)} €</strong>
                            </span>
                            <span
                              style={{
                                fontWeight: 700,
                                color: item.savings >= 0 ? "#30d158" : "var(--apple-red)",
                              }}
                            >
                              {item.savings >= 0 ? "+" : ""}{item.savings.toFixed(0)} €
                              {item.income > 0 && (
                                <span style={{ fontSize: "0.7rem", fontWeight: 500, color: "var(--apple-text-secondary)", marginLeft: "0.25rem" }}>
                                  ({item.savings_rate.toFixed(0)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Barras visuales comparativas */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.68rem", width: "45px", color: "#30d158" }}>Ingreso</span>
                            <div style={{ flex: 1, height: "5px", background: "rgba(255,255,255,0.05)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                              <div style={{ width: `${incWidth}%`, height: "100%", background: "#30d158", borderRadius: "var(--radius-full)" }} />
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.68rem", width: "45px", color: "var(--apple-blue)" }}>Gasto</span>
                            <div style={{ flex: 1, height: "5px", background: "rgba(255,255,255,0.05)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                              <div style={{ width: `${expWidth}%`, height: "100%", background: "var(--apple-blue)", borderRadius: "var(--radius-full)" }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Desglose por Comercios (Plegable) */}
          <div className="liquid-glass liquid-specular" style={{ padding: "1.15rem 1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                  🏪 Desglose por Establecimiento Comercial
                </h3>
                <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
                  {monthlyExpenses.by_store.length} comercios registrados este mes
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStoresBreakdownOpen(!isStoresBreakdownOpen)}
                className="btn-ghost"
                style={{
                  fontSize: "0.76rem",
                  padding: "0.25rem 0.65rem",
                  borderRadius: "var(--radius-full)",
                  border: "1px solid var(--apple-border)",
                  background: "rgba(255, 255, 255, 0.05)",
                  cursor: "pointer",
                }}
              >
                {isStoresBreakdownOpen ? "Plegar ▲" : "Desplegar ▼"}
              </button>
            </div>

            {isStoresBreakdownOpen && (
              <div style={{ marginTop: "1rem" }}>
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
            )}
          </div>

          {/* Desglose por Categoría con Explorador y Drag & Drop */}
          {categories.length > 0 && (
            <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                    Distribución por Categoría de Consumo
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
                    Haz clic en una categoría para inspeccionar sus productos o arrastra para reclasificarlos.
                  </p>
                </div>
                {selectedCategory && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="btn-ghost"
                    style={{ fontSize: "0.75rem", padding: "0.25rem 0.65rem", borderRadius: "var(--radius-full)" }}
                  >
                    Ocultar productos ✕
                  </button>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                <CategoryDonutChart
                  data={categories}
                  onSelectCategory={(catName) => {
                    setSelectedCategory((prev) => (prev === catName ? null : catName));
                    setIsCategoriesListOpen(true);
                  }}
                />
                <MonthCompareChart
                  last={monthlyExpenses.last_month_total}
                  current={categories.reduce((acc, c) => acc + c.total, 0)}
                />
              </div>

              {/* Botón para desplegar la cuadrícula de categorías */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isCategoriesListOpen ? "0.85rem" : "0" }}>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--apple-text-secondary)" }}>
                  Reparto detallado por categorías ({categories.length})
                </span>
                <button
                  type="button"
                  onClick={() => setIsCategoriesListOpen(!isCategoriesListOpen)}
                  className="btn-ghost"
                  style={{
                    fontSize: "0.76rem",
                    padding: "0.25rem 0.65rem",
                    borderRadius: "var(--radius-full)",
                    border: "1px solid var(--apple-border)",
                    background: "rgba(255, 255, 255, 0.05)",
                    cursor: "pointer",
                  }}
                >
                  {isCategoriesListOpen ? "Plegar categorías ▲" : "Ver detalle de categorías ▼"}
                </button>
              </div>

              {/* Cuadrícula de tarjetas de categorías (Plegada por defecto) */}
              {isCategoriesListOpen && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.category;
                    const isDragOver = dragOverCategory === cat.category;

                    return (
                      <div
                        key={cat.category}
                        onClick={() => setSelectedCategory(isSelected ? null : cat.category)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                          if (dragOverCategory !== cat.category) {
                            setDragOverCategory(cat.category);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverCategory === cat.category) {
                            setDragOverCategory(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const idStr = e.dataTransfer.getData("text/plain");
                          const itemId = idStr ? Number(idStr) : draggedItemId;
                          if (itemId) {
                            handleDrop(cat.category, itemId);
                          }
                        }}
                        style={{
                          padding: "0.85rem",
                          borderRadius: "var(--radius-md)",
                          background: isDragOver
                            ? "rgba(10, 132, 255, 0.22)"
                            : isSelected
                            ? "rgba(10, 132, 255, 0.15)"
                            : "var(--liquid-glass-bg-subtle, rgba(255, 255, 255, 0.04))",
                          backdropFilter: "blur(14px)",
                          WebkitBackdropFilter: "blur(14px)",
                          border: isDragOver
                            ? "2px dashed var(--apple-blue)"
                            : isSelected
                            ? "1.5px solid var(--apple-blue)"
                            : "1px solid var(--liquid-glass-border, rgba(255, 255, 255, 0.09))",
                          boxShadow: isSelected
                            ? "0 4px 18px rgba(0, 113, 227, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                            : "inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.2)",
                          cursor: "pointer",
                          transition: "all 0.18s ease",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div style={{ fontSize: "0.74rem", fontWeight: 700, color: isSelected ? "var(--apple-blue)" : "var(--apple-text-secondary)" }}>
                            {cat.category}
                          </div>
                          <span style={{ fontSize: "0.72rem", color: isSelected ? "var(--apple-blue)" : "var(--apple-text-tertiary)" }}>
                            {isSelected ? "▲ Abierto" : "▼ Ver"}
                          </span>
                        </div>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: "0.2rem", color: "var(--apple-text)" }}>
                          {cat.total.toFixed(2)} €
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.1rem" }}>
                          <span style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)" }}>
                            {cat.percentage}% del total mensual
                          </span>
                          {isDragOver && (
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--apple-blue)" }}>
                              Soltar aquí
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Panel / Cajón inferior desplegable con los productos de la categoría seleccionada */}
              {selectedCategory && (
                <div
                  className="liquid-glass liquid-specular"
                  style={{
                    marginTop: "1.25rem",
                    padding: "1.15rem",
                    borderRadius: "var(--radius-lg)",
                    animation: "fadeSlideIn 0.25s var(--ease-spring)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.75rem",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.1rem" }}>🏷️</span>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                          Productos en &ldquo;{selectedCategory}&rdquo;
                        </h4>
                        <span className="badge badge-blue" style={{ fontSize: "0.7rem" }}>
                          Mes actual
                        </span>
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.2rem" }}>
                        Arrastra un producto hacia cualquier categoría de arriba o chips de abajo para reclasificarlo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(null)}
                      className="btn-ghost"
                      style={{ fontSize: "0.8rem", padding: "0.3rem 0.65rem", borderRadius: "var(--radius-full)" }}
                    >
                      ✕ Cerrar
                    </button>
                  </div>

                  {/* Chips de destino rápido */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      overflowX: "auto",
                      paddingBottom: "0.6rem",
                      marginBottom: "0.85rem",
                    }}
                  >
                    <span style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)", whiteSpace: "nowrap" }}>
                      Mover a:
                    </span>
                    {availableCategoryTargets.map((targetCat) => (
                      <button
                        key={targetCat}
                        type="button"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const idStr = e.dataTransfer.getData("text/plain");
                          const itemId = idStr ? Number(idStr) : draggedItemId;
                          if (itemId) handleDrop(targetCat, itemId);
                        }}
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "0.25rem 0.65rem",
                          borderRadius: "var(--radius-full)",
                          background: targetCat === selectedCategory ? "var(--apple-blue-subtle)" : "var(--apple-surface)",
                          border: targetCat === selectedCategory ? "1px solid var(--apple-blue)" : "1px dashed var(--apple-border)",
                          color: targetCat === selectedCategory ? "var(--apple-blue)" : "var(--apple-text)",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        title={`Arrastra o suelta aquí para reclasificar en ${targetCat}`}
                      >
                        {targetCat}
                      </button>
                    ))}
                  </div>

                  {/* Lista de productos de la categoría seleccionada */}
                  {monthItems.filter((i) => i.category === selectedCategory).length === 0 ? (
                    <div style={{ textAlign: "center", padding: "1.5rem 1rem", color: "var(--apple-text-secondary)", fontSize: "0.85rem" }}>
                      No hay productos registrados en esta categoría este mes. Puedes arrastrar productos aquí desde otra categoría.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "360px", overflowY: "auto", paddingRight: "0.25rem" }}>
                      {monthItems
                        .filter((i) => i.category === selectedCategory)
                        .map((item) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", String(item.id));
                              setDraggedItemId(item.id);
                            }}
                            onDragEnd={() => {
                              setDraggedItemId(null);
                              setDragOverCategory(null);
                            }}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "0.65rem 0.85rem",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--apple-surface)",
                              border: "1px solid var(--apple-border)",
                              cursor: "grab",
                              transition: "transform 0.15s ease, box-shadow 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flex: 1, minWidth: 0 }}>
                              <span
                                style={{
                                  color: "var(--apple-text-tertiary)",
                                  cursor: "grab",
                                  fontSize: "0.9rem",
                                  userSelect: "none",
                                }}
                                title="Arrastrar para mover de categoría"
                              >
                                ⋮⋮
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--apple-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {item.name}
                                </div>
                                <div style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)", display: "flex", gap: "0.4rem" }}>
                                  {item.store_name && <span>{item.store_name}</span>}
                                  {item.date && <span>· {item.date}</span>}
                                  {item.quantity && <span>· cant: {item.quantity}</span>}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginLeft: "0.75rem" }}>
                              <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--apple-text)" }}>
                                {item.total_price.toFixed(2)} €
                              </span>
                              <select
                                aria-label={`Mover categoría para ${item.name}`}
                                value={item.category}
                                onChange={(e) => handleDrop(e.target.value, item.id)}
                                style={{
                                  fontSize: "0.72rem",
                                  padding: "0.25rem 0.45rem",
                                  borderRadius: "var(--radius-sm)",
                                  background: "var(--apple-surface-elevated)",
                                  color: "var(--apple-text)",
                                  border: "1px solid var(--apple-border)",
                                  cursor: "pointer",
                                }}
                              >
                                <option value={item.category} disabled>
                                  Mover a...
                                </option>
                                {availableCategoryTargets.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── VISTA: INGRESOS & NÓMINAS FAMILIARES ── */}
      {activeTab === "incomes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Cabecera de la sección */}
          <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                    💼 Nóminas & Fuentes de Ingreso Familiar
                  </h3>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      padding: "0.15rem 0.55rem",
                      borderRadius: "var(--radius-full)",
                      background: "rgba(48, 209, 88, 0.15)",
                      color: "#30d158",
                      fontWeight: 700,
                    }}
                  >
                    {monthlyIncomes.length} fuentes
                  </span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.2rem" }}>
                  Configuración de nóminas periódicas de Kike y Lara, pagas extraordinarias y rendimientos de ahorro.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsIncomeModalOpen(true)}
                style={{
                  background: "#30d158",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  padding: "0.45rem 1rem",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
              >
                <IconPlus size={14} />
                <span>Registrar Nuevo Ingreso</span>
              </button>
            </div>

            {/* Tarjetas resumen de ingresos */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "0.85rem",
                marginTop: "1.25rem",
              }}
            >
              <div style={{ padding: "0.9rem", borderRadius: "var(--radius-md)", background: "var(--apple-surface-secondary)", border: "1px solid var(--apple-border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
                  Ingreso Total Este Mes
                </span>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#30d158", marginTop: "0.2rem" }}>
                  {currentIncome.toFixed(2)} €
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)" }}>
                  Base para cálculo de ahorro
                </span>
              </div>

              <div style={{ padding: "0.9rem", borderRadius: "var(--radius-md)", background: "var(--apple-surface-secondary)", border: "1px solid var(--apple-border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
                  Ingresos Mes Anterior
                </span>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--apple-text)", marginTop: "0.2rem" }}>
                  {lastIncome.toFixed(2)} €
                </div>
                <span style={{ fontSize: "0.72rem", color: diffIncome >= 0 ? "var(--apple-green)" : "var(--apple-orange)" }}>
                  {diffIncomePercent ? `${diffIncome >= 0 ? "+" : ""}${diffIncomePercent}% vs mes anterior` : "Mes previo"}
                </span>
              </div>

              <div style={{ padding: "0.9rem", borderRadius: "var(--radius-md)", background: "var(--apple-surface-secondary)", border: "1px solid var(--apple-border)" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>
                  Ahorro Neto Previsto
                </span>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: netSavings >= 0 ? "#30d158" : "var(--apple-red)", marginTop: "0.2rem" }}>
                  {netSavings >= 0 ? "+" : ""}{netSavings.toFixed(2)} €
                </div>
                <span style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)" }}>
                  Tras cubrir {monthlyExpenses.current_month_total.toFixed(0)} € de gastos
                </span>
              </div>
            </div>
          </div>

          {/* Listado de Ingresos */}
          <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--apple-text)", marginBottom: "0.85rem" }}>
              Registros de Ingresos Familiares ({monthlyIncomes.length})
            </div>

            {monthlyIncomes.length === 0 ? (
              <div style={{ padding: "2.5rem 1.5rem", textAlign: "center" }}>
                <span style={{ fontSize: "2.5rem" }}>💼</span>
                <h4 style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: "0.75rem", marginBottom: "0.35rem" }}>
                  Aún no hay ingresos registrados
                </h4>
                <p style={{ fontSize: "0.8rem", color: "var(--apple-text-secondary)", maxWidth: "420px", margin: "0 auto 1.25rem" }}>
                  Registra la nómina de Kike, la de Lara o cualquier otro ingreso familiar para activar la comparativa y el cálculo de ahorro en tiempo real.
                </p>
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(true)}
                  style={{
                    background: "#30d158",
                    color: "#000",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    padding: "0.55rem 1.25rem",
                    borderRadius: "var(--radius-md)",
                    border: "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                >
                  <IconPlus size={15} />
                  <span>Registrar Primera Nómina</span>
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {monthlyIncomes.map((inc) => (
                  <div
                    key={inc.id}
                    style={{
                      padding: "1rem",
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
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: "2.5rem",
                          height: "2.5rem",
                          borderRadius: "0.6rem",
                          background: "rgba(48, 209, 88, 0.15)",
                          color: "#30d158",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.2rem",
                        }}
                      >
                        💼
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <strong style={{ fontSize: "0.95rem", color: "var(--apple-text)" }}>
                            {inc.source}
                          </strong>
                          {inc.member_name && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                padding: "0.1rem 0.5rem",
                                borderRadius: "var(--radius-full)",
                                background: "rgba(0, 113, 227, 0.12)",
                                color: "var(--apple-blue)",
                                fontWeight: 600,
                              }}
                            >
                              👤 {inc.member_name}
                            </span>
                          )}
                          {inc.is_recurring && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                padding: "0.1rem 0.5rem",
                                borderRadius: "var(--radius-full)",
                                background: "rgba(48, 209, 88, 0.12)",
                                color: "#30d158",
                                fontWeight: 600,
                              }}
                            >
                              🔄 Mensual
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", marginTop: "0.2rem", display: "flex", gap: "0.5rem" }}>
                          <span>Mes: <strong>{inc.month}</strong></span>
                          {inc.notes && <span>· {inc.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#30d158" }}>
                          +{inc.amount.toFixed(2)} €
                        </div>
                        <span style={{ fontSize: "0.7rem", color: "var(--apple-text-tertiary)" }}>
                          Neto percibido
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`¿Eliminar el registro de ingreso "${inc.source}"?`)) {
                            startTransition(async () => {
                              await deleteMonthlyIncomeAction(inc.id);
                            });
                          }
                        }}
                        className="btn-ghost"
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--apple-text-tertiary)",
                        }}
                        title="Eliminar ingreso"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VISTA 2: SUMINISTROS & ENERGÍA (NATURGY) ── */}
      {activeTab === "energy" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Tarjeta de Contratos Activos */}
          <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
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

          {/* ── Facturación Mensual de Suministros (Luz, Agua, Gas, Internet, Teléfono...) ── */}
          <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                    Facturación Mensual de Suministros
                  </h3>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      padding: "0.1rem 0.45rem",
                      borderRadius: "var(--radius-full)",
                      background: "rgba(0, 113, 227, 0.12)",
                      color: "var(--apple-blue)",
                    }}
                  >
                    Control Manual Sin Factura
                  </span>
                </div>
                <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
                  Introduce directamente el importe del mes de tus recibos (luz, agua, gas, fibra, móvil...)
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsUtilityModalOpen(true)}
                className="btn-primary"
                style={{ fontSize: "0.78rem", padding: "0.4rem 0.85rem", gap: "0.35rem" }}
              >
                <IconPlus size={13} />
                <span>Registrar Factura del Mes</span>
              </button>
            </div>

            {/* KPI Resumen del Mes Actual */}
            {(() => {
              const currentMonthStr = new Date().toISOString().slice(0, 7);
              const thisMonthBills = utilityBills.filter((b) => b.billing_month === currentMonthStr);
              const thisMonthTotal = thisMonthBills.reduce((sum, b) => sum + b.amount, 0);

              const serviceBadges: Record<string, { icon: string; name: string; color: string }> = {
                luz: { icon: "💡", name: "Luz", color: "#f59e0b" },
                gas: { icon: "🔥", name: "Gas", color: "#ef4444" },
                agua: { icon: "💧", name: "Agua", color: "#06b6d4" },
                internet: { icon: "🌐", name: "Fibra / Internet", color: "#3b82f6" },
                telefono: { icon: "📱", name: "Teléfono Móvil", color: "#8b5cf6" },
                otro: { icon: "📦", name: "Otros", color: "#64748b" },
              };

              return (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                      padding: "0.85rem 1rem",
                      borderRadius: "var(--radius-md)",
                      background: "var(--apple-surface-secondary)",
                      border: "1px solid var(--apple-border)",
                      marginBottom: "1rem",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                        Total Suministros Mes en Curso ({new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" })})
                      </div>
                      <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--apple-text)", marginTop: "0.2rem" }}>
                        {thisMonthTotal > 0 ? `${thisMonthTotal.toFixed(2)} €` : "0.00 €"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      {Object.entries(serviceBadges).map(([svcKey, svcMeta]) => {
                        const billsForSvc = thisMonthBills.filter((b) => b.service === svcKey);
                        const sumForSvc = billsForSvc.reduce((acc, b) => acc + b.amount, 0);
                        if (sumForSvc <= 0) return null;
                        return (
                          <div
                            key={svcKey}
                            style={{
                              padding: "0.3rem 0.6rem",
                              borderRadius: "var(--radius-full)",
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid var(--apple-border)",
                              fontSize: "0.75rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                            }}
                          >
                            <span>{svcMeta.icon}</span>
                            <span style={{ fontWeight: 600, color: "var(--apple-text)" }}>{svcMeta.name}:</span>
                            <span style={{ fontWeight: 700, color: svcMeta.color }}>{sumForSvc.toFixed(2)} €</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Listado de Facturas Registradas */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                    {utilityBills.length === 0 ? (
                      <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--apple-text-secondary)", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-md)" }}>
                        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 500 }}>No hay facturas registradas todavía.</p>
                        <p style={{ margin: 0, marginTop: "0.2rem", fontSize: "0.76rem" }}>
                          Pulsa en <b>"Registrar Factura del Mes"</b> para añadir el recibo de este mes de luz, agua, gas o internet.
                        </p>
                      </div>
                    ) : (
                      utilityBills.map((ub) => {
                        const meta = serviceBadges[ub.service] || serviceBadges.otro;
                        // Formatear mes de facturación ej. 2026-11 -> Noviembre 2026
                        let formattedMonth = ub.billing_month;
                        try {
                          const [y, m] = ub.billing_month.split("-");
                          const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
                          formattedMonth = d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
                        } catch {}

                        return (
                          <div
                            key={ub.id}
                            style={{
                              padding: "0.75rem 1rem",
                              borderRadius: "var(--radius-md)",
                              background: "var(--apple-surface-secondary)",
                              border: "1px solid var(--apple-border)",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: "0.6rem",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
                              <span style={{ fontSize: "1.2rem" }}>{meta.icon}</span>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--apple-text)" }}>
                                    {meta.name}
                                  </span>
                                  {ub.provider && (
                                    <span
                                      style={{
                                        fontSize: "0.72rem",
                                        padding: "0.1rem 0.45rem",
                                        borderRadius: "var(--radius-full)",
                                        background: "rgba(255, 255, 255, 0.08)",
                                        color: "var(--apple-text-secondary)",
                                      }}
                                    >
                                      {ub.provider}
                                    </span>
                                  )}
                                  <span style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)" }}>
                                    · Mes: <b style={{ textTransform: "capitalize", color: "var(--apple-text-secondary)" }}>{formattedMonth}</b>
                                  </span>
                                </div>
                                <div style={{ fontSize: "0.74rem", color: "var(--apple-text-secondary)", marginTop: "0.15rem" }}>
                                  Fecha cargo: {ub.issue_date} {ub.notes ? `· ${ub.notes}` : ""}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                              <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--apple-text)" }}>
                                {ub.amount.toFixed(2)} €
                              </span>
                              <button
                                type="button"
                                onClick={() => startTransition(() => deleteUtilityBillAction(ub.id))}
                                className="btn-ghost"
                                style={{ width: "26px", height: "26px", borderRadius: "50%", padding: 0, justifyContent: "center", color: "var(--apple-text-tertiary)" }}
                                title="Eliminar factura"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Optimización de Horarios y Equipamiento */}
          <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, marginBottom: "0.85rem", letterSpacing: "-0.01em" }}>
              Recomendaciones de Optimización de Hábitos
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.85rem" }}>
              <div style={{ padding: "0.9rem", borderRadius: "var(--radius-md)", background: "var(--liquid-glass-bg-subtle)", border: "1px solid var(--liquid-glass-border)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--apple-blue)" }}>
                  Coche Eléctrico (VE)
                </div>
                <p style={{ fontSize: "0.82rem", margin: 0, marginTop: "0.3rem", color: "var(--apple-text)", lineHeight: 1.4 }}>
                  Ventana óptima: <b>00:00 - 07:30</b> (Periodo P2 Valle). Se evitan picos de potencia con cocina y calefacción.
                </p>
              </div>

              <div style={{ padding: "0.9rem", borderRadius: "var(--radius-md)", background: "var(--liquid-glass-bg-subtle)", border: "1px solid var(--liquid-glass-border)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--apple-blue)" }}>
                  Electrodomésticos de Alto Consumo
                </div>
                <p style={{ fontSize: "0.82rem", margin: 0, marginTop: "0.3rem", color: "var(--apple-text)", lineHeight: 1.4 }}>
                  Lavavajillas y secadora programados a partir de las <b>23:00</b> o fines de semana para maximizar el margen de potencia.
                </p>
              </div>

              <div style={{ padding: "0.9rem", borderRadius: "var(--radius-md)", background: "var(--liquid-glass-bg-subtle)", border: "1px solid var(--liquid-glass-border)" }}>
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

      {/* ── VISTA 3: GASTOS FIJOS, HIPOTECA & INVERSIONES ── */}
      {activeTab === "recurring" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.15rem", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                  Gastos Fijos, Hipoteca & Inversiones Periódicas
                </h3>
                <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
                  Compromisos recurrentes (hipoteca, inversiones, cuota de comunidad...) que se contabilizan automáticamente cada mes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setManualExpenseType("recurring");
                  setIsManualExpenseOpen(true);
                }}
                className="btn-primary"
                style={{ fontSize: "0.8rem", padding: "0.45rem 1rem", gap: "0.35rem" }}
              >
                <IconPlus size={14} />
                <span>Añadir Gasto Fijo</span>
              </button>
            </div>

            {/* Tarjeta de Resumen de Compromiso Fijo */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.85rem",
                marginBottom: "1.25rem",
              }}
            >
              <div
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                }}
              >
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)" }}>
                  Total Compromiso Mensual Fijo
                </div>
                <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--apple-text)", marginTop: "0.25rem" }}>
                  {(recurringExpenses ?? [])
                    .filter((r) => r.active)
                    .reduce((acc, r) => {
                      const amt = r.amount || 0;
                      if (r.frequency === "2_plazos") return acc + (amt * 2) / 12;
                      if (r.frequency === "3_plazos") return acc + (amt * 3) / 12;
                      if (r.frequency === "trimestral") return acc + (amt * 4) / 12;
                      if (r.frequency === "anual") return acc + amt / 12;
                      return acc + amt;
                    }, 0)
                    .toFixed(2)}{" "}
                  € <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--apple-text-secondary)" }}>/ mes</span>
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--apple-green)", marginTop: "0.2rem", fontWeight: 600 }}>
                  ✓ Se suma de forma automática a los totales y gráficos mensuales
                </div>
              </div>

              <div
                style={{
                  padding: "1rem",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                }}
              >
                <div style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--apple-text-secondary)" }}>
                  Gastos Fijos Activos
                </div>
                <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--apple-text)", marginTop: "0.25rem" }}>
                  {(recurringExpenses ?? []).filter((r) => r.active).length}{" "}
                  <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--apple-text-secondary)" }}>de {(recurringExpenses ?? []).length} registrados</span>
                </div>
                <div style={{ fontSize: "0.74rem", color: "var(--apple-text-secondary)", marginTop: "0.2rem" }}>
                  Puedes pausar o reactivar cualquier cuota en cualquier momento
                </div>
              </div>
            </div>

            {/* Listado de Gastos Fijos */}
            {(!recurringExpenses || recurringExpenses.length === 0) ? (
              <div
                style={{
                  padding: "2.5rem 1.5rem",
                  textAlign: "center",
                  borderRadius: "var(--radius-lg)",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px dashed var(--apple-border)",
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏠 📈 🏢</div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                  No tienes gastos fijos periódicos registrados todavía
                </h4>
                <p style={{ fontSize: "0.82rem", color: "var(--apple-text-secondary)", margin: "0.4rem 0 1rem 0" }}>
                  Añade aquí la hipoteca, aportaciones a fondos de inversión, cuota de la comunidad, seguro de moto o coche fraccionado, etc., y se contabilizarán automáticamente a partir del mes que indiques.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setManualExpenseType("recurring");
                    setIsManualExpenseOpen(true);
                  }}
                  className="btn-primary"
                  style={{ fontSize: "0.82rem", padding: "0.5rem 1.15rem", gap: "0.35rem" }}
                >
                  <IconPlus size={14} />
                  <span>Añadir Primer Gasto Fijo</span>
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {recurringExpenses.map((rec) => {
                  let freqDesc = "Cobro mensual";
                  let monthlyEquivalent = rec.amount;
                  if (rec.frequency === "2_plazos") {
                    freqDesc = `Fraccionado en 2 mensualidades (${rec.amount.toFixed(2)} €/cuota)`;
                    monthlyEquivalent = (rec.amount * 2) / 12;
                  } else if (rec.frequency === "3_plazos") {
                    freqDesc = `Fraccionado en 3 mensualidades (${rec.amount.toFixed(2)} €/cuota)`;
                    monthlyEquivalent = (rec.amount * 3) / 12;
                  } else if (rec.frequency === "trimestral") {
                    freqDesc = `Trimestral (${rec.amount.toFixed(2)} €/cuota)`;
                    monthlyEquivalent = (rec.amount * 4) / 12;
                  } else if (rec.frequency === "anual") {
                    freqDesc = `Pago único anual (${rec.amount.toFixed(2)} €/año)`;
                    monthlyEquivalent = rec.amount / 12;
                  }

                  const categoryEmoji =
                    rec.category.includes("Hipoteca") || rec.category.includes("Vivienda")
                      ? "🏠"
                      : rec.category.includes("Inversión") || rec.category.includes("Ahorro")
                      ? "📈"
                      : rec.category.includes("Comunidad")
                      ? "🏢"
                      : rec.category.includes("Colegio") || rec.category.includes("Educación")
                      ? "🎓"
                      : rec.category.includes("Seguro")
                      ? "🏍️"
                      : rec.category.includes("Suscripción")
                      ? "💳"
                      : "🔄";

                  return (
                    <div
                      key={rec.id}
                      style={{
                        padding: "1rem 1.2rem",
                        borderRadius: "var(--radius-lg)",
                        background: rec.active ? "var(--apple-surface-secondary)" : "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--apple-border)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.85rem",
                        opacity: rec.active ? 1 : 0.6,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                        <div
                          style={{
                            width: "2.4rem",
                            height: "2.4rem",
                            borderRadius: "0.65rem",
                            background: "rgba(94, 92, 230, 0.15)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.25rem",
                          }}
                        >
                          {categoryEmoji}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--apple-text)" }}>
                              {rec.title}
                            </span>
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: 600,
                                padding: "0.15rem 0.5rem",
                                borderRadius: "var(--radius-full)",
                                background: "rgba(94, 92, 230, 0.15)",
                                color: "#af52de",
                              }}
                            >
                              {rec.category}
                            </span>
                            {!rec.active && (
                              <span
                                style={{
                                  fontSize: "0.68rem",
                                  fontWeight: 600,
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "var(--radius-full)",
                                  background: "rgba(255, 255, 255, 0.1)",
                                  color: "var(--apple-text-tertiary)",
                                }}
                              >
                                Pausado
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", marginTop: "0.25rem" }}>
                            {rec.provider && <strong>{rec.provider} · </strong>}
                            {freqDesc} · Desde: {rec.start_month}
                            {rec.day_of_month ? ` (día ${rec.day_of_month})` : ""}
                          </div>
                          {rec.notes && (
                            <div style={{ fontSize: "0.72rem", color: "var(--apple-text-tertiary)", marginTop: "0.2rem" }}>
                              {rec.notes}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--apple-text)" }}>
                            {rec.amount.toFixed(2)} €
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--apple-text-secondary)" }}>
                            {rec.frequency === "mensual" ? "/ mes" : `~${monthlyEquivalent.toFixed(2)} €/mes`}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          <button
                            type="button"
                            onClick={() => startTransition(() => toggleRecurringExpenseActiveAction(rec.id))}
                            className="btn-secondary"
                            style={{ fontSize: "0.74rem", padding: "0.3rem 0.65rem" }}
                            title={rec.active ? "Pausar gasto" : "Reactivar gasto"}
                          >
                            {rec.active ? "Pausar" : "Activar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => startTransition(() => deleteRecurringExpenseAction(rec.id))}
                            className="btn-ghost"
                            style={{ width: "28px", height: "28px", borderRadius: "50%", padding: 0, justifyContent: "center", color: "var(--apple-text-tertiary)" }}
                            title="Eliminar gasto periódico"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VISTA 4: PÓLIZAS & SEGUROS ── */}
      {activeTab === "insurances" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                  Pólizas de Seguros Familiares
                </h3>
                <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                  Aviso automático 30 días antes de la renovación anual, desglose de cuotas y archivo de pólizas
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
                  setInsuranceDocUrl(null);
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
                <input type="text" name="title" placeholder="Título (ej. Seguro Hogar / Moto)" required className="input-field" />
                <select name="category" className="input-field">
                  <option value="hogar">Hogar</option>
                  <option value="coche">Coche / Moto</option>
                  <option value="salud">Salud Privada</option>
                  <option value="vida">Vida</option>
                  <option value="decesos">Decesos</option>
                  <option value="otro">Otro</option>
                </select>
                <input type="text" name="provider" placeholder="Compañía (ej. Mapfre / Mutua)" required className="input-field" />
                <input type="text" name="policyNumber" placeholder="Nº de Póliza" className="input-field" />
                <input type="number" step="0.01" name="annualCost" placeholder="Coste total año (€)" required className="input-field" />
                <select name="paymentFrequency" className="input-field">
                  <option value="anual">1 pago único anual</option>
                  <option value="2_plazos">Fraccionado en 2 mensualidades / semestral (ej. moto/coche)</option>
                  <option value="3_plazos">Fraccionado en 3 mensualidades (ej. coche/moto)</option>
                  <option value="trimestral">4 cuotas trimestrales</option>
                  <option value="mensual">12 mensualidades / mensual</option>
                </select>
                <input type="date" name="renewalDate" required className="input-field" />
                <input type="text" name="notes" placeholder="Notas (franquicia, cobertura...)" className="input-field" style={{ gridColumn: "1 / -1" }} />

                {/* Subir archivo de póliza */}
                <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", padding: "0.3rem 0" }}>
                  <label
                    className="btn-secondary"
                    style={{ fontSize: "0.78rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                  >
                    <span>📄</span>
                    <span>{isUploadingInsuranceDoc ? "Subiendo póliza..." : insuranceDocUrl ? "✓ Póliza adjuntada" : "Adjuntar Póliza (PDF o Foto)"}</span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      disabled={isUploadingInsuranceDoc}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingInsuranceDoc(true);
                        const fd = new FormData();
                        fd.append("file", file);
                        try {
                          const res = await fetch("/api/documents", { method: "POST", body: fd });
                          const data = await res.json();
                          if (data.url) setInsuranceDocUrl(data.url);
                        } catch (err) {
                          console.error("Error al subir póliza:", err);
                        } finally {
                          setIsUploadingInsuranceDoc(false);
                        }
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                  {insuranceDocUrl && (
                    <span style={{ fontSize: "0.75rem", color: "var(--apple-green)", fontWeight: 600 }}>
                      ✓ Póliza lista para guardar
                    </span>
                  )}
                  <input type="hidden" name="documentUrl" value={insuranceDocUrl || ""} />
                </div>

                <button type="submit" className="btn-primary" style={{ gridColumn: "1 / -1", padding: "0.45rem", fontSize: "0.8rem" }}>
                  Guardar Póliza
                </button>
              </form>
            )}

            {/* Lista de Pólizas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {insurances.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "var(--apple-text-secondary)", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-lg)" }}>
                  <div style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>🛡️</div>
                  <p style={{ fontWeight: 600, fontSize: "0.92rem", margin: 0, color: "var(--apple-text)" }}>
                    Sin pólizas registradas
                  </p>
                  <p style={{ fontSize: "0.78rem", margin: 0, marginTop: "0.25rem" }}>
                    Los datos de prueba han sido eliminados. Pulsa en <b>"Añadir Póliza"</b> para incorporar tus seguros reales (Hogar, Coche, Salud, Vida...) y adjuntar el documento o foto de la póliza.
                  </p>
                </div>
              ) : (
                insurances.map((pol) => {
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
                          Póliza: <code>{pol.policy_number || "S/N"}</code> · Vencimiento: {pol.renewal_date} ·{" "}
                          <span style={{ color: "var(--apple-text)", fontWeight: 600 }}>
                            {pol.payment_frequency === "2_plazos" || pol.payment_frequency === "semestral"
                              ? `Fraccionado en 2 mensualidades (2 x ${(pol.annual_cost / 2).toFixed(2)} €)`
                              : pol.payment_frequency === "3_plazos"
                              ? `Fraccionado en 3 mensualidades (3 x ${(pol.annual_cost / 3).toFixed(2)} €)`
                              : pol.payment_frequency === "trimestral"
                              ? `Trimestral (4 x ${(pol.annual_cost / 4).toFixed(2)} €)`
                              : pol.payment_frequency === "mensual"
                              ? `Mensual (12 x ${(pol.annual_cost / 12).toFixed(2)} €)`
                              : "Pago único anual"}
                          </span>
                        </div>
                        {pol.notes && (
                          <div style={{ fontSize: "0.74rem", color: "var(--apple-text-tertiary)", marginTop: "0.2rem" }}>
                            {pol.notes}
                          </div>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        {pol.document_url && (
                          <button
                            type="button"
                            onClick={() => setViewingDoc({ title: `Póliza: ${pol.title} (${pol.provider})`, url: pol.document_url! })}
                            className="btn-secondary"
                            style={{ fontSize: "0.74rem", padding: "0.28rem 0.65rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            <span>📄</span>
                            <span>Ver Póliza</span>
                          </button>
                        )}
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--apple-text)" }}>
                            {pol.annual_cost.toFixed(2)} €
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--apple-text-secondary)" }}>
                            {(pol.annual_cost / 12).toFixed(2)} €/mes
                          </div>
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
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA 4: GARANTÍAS DE COMPRAS DE VALOR ── */}
      {activeTab === "warranties" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                  Garantías & Bienes de Consumo (3 Años)
                </h3>
                <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                  Control de vigencia legal y tickets o facturas asociadas de electrodomésticos y tecnología
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
                  setWarrantyDocUrl(null);
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

                {/* Subir foto de ticket o factura */}
                <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", padding: "0.3rem 0" }}>
                  <label
                    className="btn-secondary"
                    style={{ fontSize: "0.78rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                  >
                    <span>🧾</span>
                    <span>{isUploadingWarrantyDoc ? "Subiendo ticket..." : warrantyDocUrl ? "✓ Ticket adjuntado" : "Adjuntar Foto del Ticket o Factura"}</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      disabled={isUploadingWarrantyDoc}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setIsUploadingWarrantyDoc(true);
                        const fd = new FormData();
                        fd.append("file", file);
                        try {
                          const res = await fetch("/api/documents", { method: "POST", body: fd });
                          const data = await res.json();
                          if (data.url) setWarrantyDocUrl(data.url);
                        } catch (err) {
                          console.error("Error al subir ticket de garantía:", err);
                        } finally {
                          setIsUploadingWarrantyDoc(false);
                        }
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                  {warrantyDocUrl && (
                    <span style={{ fontSize: "0.75rem", color: "var(--apple-green)", fontWeight: 600 }}>
                      ✓ Ticket listo para guardar
                    </span>
                  )}
                  <input type="hidden" name="documentUrl" value={warrantyDocUrl || ""} />
                </div>

                <button type="submit" className="btn-primary" style={{ gridColumn: "1 / -1", padding: "0.45rem", fontSize: "0.8rem" }}>
                  Guardar Garantía
                </button>
              </form>
            )}

            {/* Listado de Garantías */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "0.85rem" }}>
              {warranties.length === 0 ? (
                <div style={{ gridColumn: "1 / -1", padding: "2rem", textAlign: "center", color: "var(--apple-text-secondary)", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-lg)" }}>
                  <div style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>🧾</div>
                  <p style={{ fontWeight: 600, fontSize: "0.92rem", margin: 0, color: "var(--apple-text)" }}>
                    Sin garantías registradas
                  </p>
                  <p style={{ fontSize: "0.78rem", margin: 0, marginTop: "0.25rem" }}>
                    Los datos de prueba han sido eliminados. Pulsa en <b>"Registrar Garantía"</b> para añadir tus electrodomésticos, dispositivos o compras de valor con su foto de ticket.
                  </p>
                </div>
              ) : (
                warranties.map((w) => {
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

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
                        {w.document_url ? (
                          <button
                            type="button"
                            onClick={() => setViewingDoc({ title: `Ticket/Garantía: ${w.item_name}`, url: w.document_url! })}
                            className="btn-secondary"
                            style={{ fontSize: "0.72rem", padding: "0.25rem 0.6rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                          >
                            <span>🧾</span>
                            <span>Ver Ticket</span>
                          </button>
                        ) : <div />}

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
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VISTA 5: ESCANEAR & ARCHIVO DE TICKETS / GASTOS MANUALES ── */}
      {activeTab === "scan" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className="liquid-glass liquid-specular" style={{ padding: "1.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>
                  Tickets Digitalizados & Gastos Manuales
                </h3>
                <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                  Historial de tickets escaneados con cámara y compras de supermercado registradas sin ticket
                </p>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setIsManualExpenseOpen(true)}
                  className="btn-secondary"
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem", gap: "0.35rem" }}
                >
                  <IconPlus size={14} />
                  <span>+ Gasto Manual / Súper</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTicketModalOpen(true)}
                  className="btn-primary"
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.85rem", gap: "0.35rem" }}
                >
                  <IconCamera size={14} />
                  <span>📷 Escanear con Cámara</span>
                </button>
              </div>
            </div>

            {/* Filtros rápidos: Todos, Con Ticket, Gastos Manuales, Supermercados */}
            {(() => {
              const supermarketKeywords = ["mercadona", "carrefour", "lidl", "aldi", "día", "dia", "alcampo", "hipercor", "e.leclerc", "eroski", "ahorramas"];
              const isSupermarket = (name?: string | null) =>
                supermarketKeywords.some((sm) => (name || "").toLowerCase().includes(sm));

              const isManualReceipt = (r: Receipt) => Boolean(r.raw_text?.startsWith("Gasto manual"));
              const isScannedReceipt = (r: Receipt) => !isManualReceipt(r);

              const withTicketCount = receipts.filter(isScannedReceipt).length;
              const manualCount = receipts.filter(isManualReceipt).length;
              const supermarketCount = receipts.filter((r) => isSupermarket(r.store_name || r.company_name)).length;

              const filteredReceipts = receipts.filter((r) => {
                if (ticketFilter === "with_ticket") return isScannedReceipt(r);
                if (ticketFilter === "manual") return isManualReceipt(r);
                if (ticketFilter === "supermarket") return isSupermarket(r.store_name || r.company_name);
                return true;
              });

              return (
                <div>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.4rem",
                      marginBottom: "1rem",
                      overflowX: "auto",
                      scrollbarWidth: "none",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setTicketFilter("all")}
                      style={{
                        padding: "0.3rem 0.75rem",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.76rem",
                        fontWeight: ticketFilter === "all" ? 700 : 500,
                        background: ticketFilter === "all" ? "var(--apple-blue)" : "rgba(255, 255, 255, 0.05)",
                        color: ticketFilter === "all" ? "#fff" : "var(--apple-text-secondary)",
                        border: "1px solid var(--apple-border)",
                        cursor: "pointer",
                      }}
                    >
                      Todos ({receipts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketFilter("with_ticket")}
                      style={{
                        padding: "0.3rem 0.75rem",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.76rem",
                        fontWeight: ticketFilter === "with_ticket" ? 700 : 500,
                        background: ticketFilter === "with_ticket" ? "var(--apple-blue)" : "rgba(255, 255, 255, 0.05)",
                        color: ticketFilter === "with_ticket" ? "#fff" : "var(--apple-text-secondary)",
                        border: "1px solid var(--apple-border)",
                        cursor: "pointer",
                      }}
                    >
                      📸 Con Ticket ({withTicketCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketFilter("manual")}
                      style={{
                        padding: "0.3rem 0.75rem",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.76rem",
                        fontWeight: ticketFilter === "manual" ? 700 : 500,
                        background: ticketFilter === "manual" ? "var(--apple-blue)" : "rgba(255, 255, 255, 0.05)",
                        color: ticketFilter === "manual" ? "#fff" : "var(--apple-text-secondary)",
                        border: "1px solid var(--apple-border)",
                        cursor: "pointer",
                      }}
                    >
                      ✍️ Gastos Manuales ({manualCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setTicketFilter("supermarket")}
                      style={{
                        padding: "0.3rem 0.75rem",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.76rem",
                        fontWeight: ticketFilter === "supermarket" ? 700 : 500,
                        background: ticketFilter === "supermarket" ? "var(--apple-blue)" : "rgba(255, 255, 255, 0.05)",
                        color: ticketFilter === "supermarket" ? "#fff" : "var(--apple-text-secondary)",
                        border: "1px solid var(--apple-border)",
                        cursor: "pointer",
                      }}
                    >
                      🛒 Supermercados ({supermarketCount})
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

                  {/* Listado de Tickets y Gastos Manuales */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                    {filteredReceipts.length === 0 ? (
                      <div style={{ padding: "2rem", textAlign: "center", color: "var(--apple-text-secondary)", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-md)" }}>
                        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: "var(--apple-text)" }}>
                          No hay gastos en esta categoría
                        </p>
                        <p style={{ margin: 0, marginTop: "0.2rem", fontSize: "0.78rem" }}>
                          Puedes escanear un ticket con la cámara o añadir un gasto manual seleccionando el supermercado.
                        </p>
                      </div>
                    ) : (
                      filteredReceipts.map((r) => {
                        const isManual = isManualReceipt(r);
                        const displayName = r.store_name || r.company_name || "Comercio";

                        return (
                          <div
                            key={r.id}
                            style={{
                              padding: "0.9rem 1.1rem",
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
                                <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: r.store_color || "var(--apple-blue)" }} />
                                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--apple-text)" }}>
                                  {displayName}
                                </span>
                                {isManual ? (
                                  <span
                                    style={{
                                      fontSize: "0.68rem",
                                      fontWeight: 600,
                                      padding: "0.1rem 0.45rem",
                                      borderRadius: "var(--radius-full)",
                                      background: "rgba(255, 159, 10, 0.12)",
                                      color: "var(--apple-orange)",
                                    }}
                                  >
                                    ✍️ Gasto Manual (sin ticket)
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      fontSize: "0.68rem",
                                      fontWeight: 600,
                                      padding: "0.1rem 0.45rem",
                                      borderRadius: "var(--radius-full)",
                                      background: "rgba(52, 199, 89, 0.12)",
                                      color: "var(--apple-green)",
                                    }}
                                  >
                                    📸 Ticket digitalizado
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", marginTop: "0.2rem" }}>
                                Fecha: {r.date} · {r.items_count || 1} artículos registrados {r.items_summary ? `(${r.items_summary})` : ""}
                              </div>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                              {r.photo_url && (
                                <button
                                  type="button"
                                  onClick={() => setViewingDoc({ title: `Ticket: ${displayName} (${r.date})`, url: r.photo_url! })}
                                  className="btn-secondary"
                                  style={{ fontSize: "0.74rem", padding: "0.25rem 0.6rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                                >
                                  <span>📷</span>
                                  <span>Ver Ticket</span>
                                </button>
                              )}
                              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--apple-text)" }}>
                                {r.total_amount.toFixed(2)} €
                              </div>
                              <button
                                type="button"
                                onClick={() => startTransition(() => deleteReceiptAction(r.id))}
                                className="btn-ghost"
                                style={{ width: "26px", height: "26px", borderRadius: "50%", padding: 0, justifyContent: "center", color: "var(--apple-text-tertiary)" }}
                                title="Eliminar este gasto"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Modal Unificado de Gestión de Ticket (Cámara & Acciones) ── */}
      <TicketManagerModal
        isOpen={isTicketModalOpen}
        onClose={() => setIsTicketModalOpen(false)}
      />

      {/* ── Modal de Gasto Manual y Recurrente ── */}
      <ManualExpenseModal
        isOpen={isManualExpenseOpen}
        onClose={() => setIsManualExpenseOpen(false)}
        defaultType={manualExpenseType}
      />

      {/* ── Modal de Factura Mensual de Suministros ── */}
      <ManualUtilityBillModal
        isOpen={isUtilityModalOpen}
        onClose={() => setIsUtilityModalOpen(false)}
      />

      {/* ── Modal de Ingreso Mensual y Nóminas Familiares ── */}
      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
        members={members}
      />

      {/* ── Visor de Documentos (Pólizas, Tickets y Garantías) ── */}
      <DocumentViewerModal
        isOpen={Boolean(viewingDoc)}
        onClose={() => setViewingDoc(null)}
        title={viewingDoc?.title || "Documento"}
        url={viewingDoc?.url || null}
      />
    </div>
  );
}
