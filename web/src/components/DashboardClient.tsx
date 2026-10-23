"use client";

import { useState } from "react";
import { Header } from "./Header";
import { BriefingCard } from "./BriefingCard";
import { DinnerCard } from "./DinnerCard";
import { ShoppingModule } from "./ShoppingModule";
import { PantryModule } from "./PantryModule";
import { TasksModule } from "./TasksModule";
import { KidsModule } from "./KidsModule";
import { CalendarModule } from "./CalendarModule";
import { ReceiptsModule } from "./ReceiptsModule";
import { AiAssistantModal } from "./AiAssistantModal";
import { SettingsModal } from "./SettingsModal";
import { ProfileLoginModal } from "./ProfileLoginModal";
import { EnergyModule } from "./EnergyModule";
import type {
  Member,
  ShoppingItem,
  Store,
  Staple,
  PantryItem,
  Task,
  DinnerPlan,
  SchoolRun,
  HealthItem,
  CalEvent,
  Receipt,
  PerishableAlert,
  PriceComparison,
  HabitInsight,
  EnergyContract,
} from "@/lib/repo";
import type { Weather, DayWeather } from "@/lib/weather";

export function DashboardClient({
  members = [],
  currentMemberId = null,
  weather = null,
  today,
  formattedDate,
  greeting,
  latestBriefing = null,
  todayWeather = null,
  dinners = [],
  schoolLunch = null,
  schoolDinnerRec = null,
  shoppingItems = [],
  stores = [],
  staples = [],
  pantry = [],
  tasks = [],
  schoolRun = null,
  healthUpcoming = [],
  events = [],
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
}: {
  members: Member[];
  currentMemberId?: number | null;
  weather: Weather | null;
  today: string;
  formattedDate: string;
  greeting: string;
  latestBriefing: string | null;
  todayWeather: DayWeather | null;
  dinners: DinnerPlan[];
  schoolLunch: string | null;
  schoolDinnerRec?: string | null;
  shoppingItems: ShoppingItem[];
  stores: Store[];
  staples: Staple[];
  pantry: PantryItem[];
  tasks: Task[];
  schoolRun: SchoolRun | null;
  healthUpcoming: HealthItem[];
  events: CalEvent[];
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
}) {
  const activeMember = members.find((m) => m.id === currentMemberId);
  const [activeTab, setActiveTab] = useState<"resumen" | "compra" | "tickets" | "tareas" | "peques" | "agenda" | "energia">(
    (activeMember?.preferred_tab as any) || "resumen"
  );
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const urgentPerishablesCount = (perishables || []).filter((p) => p.days_left <= 3).length;
  const pendingTasksCount = (tasks || []).filter((t) => !t.done).length;

  return (
    <div className="container">
      {/* Header estilo Apple Status Island */}
      <Header
        members={members}
        currentMemberId={currentMemberId}
        weather={weather}
        greeting={greeting}
        formattedDate={formattedDate}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Banner de alerta estilo Apple Notification Card */}
      {urgentPerishablesCount > 0 && activeTab !== "tickets" && (
        <div
          onClick={() => setActiveTab("tickets")}
          style={{
            cursor: "pointer",
            padding: "0.85rem 1.25rem",
            marginBottom: "1.25rem",
            borderRadius: "var(--radius-lg)",
            background: "var(--apple-surface)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--apple-border)",
            borderLeft: "5px solid var(--apple-orange)",
            boxShadow: "var(--shadow-sm)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            transition: "all 0.2s var(--ease-spring)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.875rem" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "10px",
                background: "var(--apple-orange-subtle)",
                color: "var(--apple-orange)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
                flexShrink: 0,
              }}
            >
              ⏳
            </div>
            <div>
              <p style={{ fontWeight: 600, color: "var(--apple-text)", margin: 0, letterSpacing: "-0.01em" }}>
                Atención en despensa · {urgentPerishablesCount} {urgentPerishablesCount === 1 ? "alimento perecedero" : "alimentos perecederos"}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.15rem" }}>
                Consumir en los próximos 3 días: {perishables.slice(0, 3).map((p) => p.name).join(", ")}
                {urgentPerishablesCount > 3 ? "..." : ""}
              </p>
            </div>
          </div>
          <span
            className="badge badge-amber"
            style={{
              padding: "0.4rem 0.85rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              boxShadow: "0 2px 6px rgba(255, 149, 0, 0.2)",
            }}
          >
            Ver Radar de Caducidades →
          </span>
        </div>
      )}

      {/* Segmented Control iOS Tabs (Visible en desktop y como selector horizontal suave en mobile) */}
      <nav className="tab-nav" aria-label="Secciones del dashboard">
        <button
          onClick={() => setActiveTab("resumen")}
          className={`tab-btn ${activeTab === "resumen" ? "active" : ""}`}
        >
          <span>✨</span>
          <span>Resumen</span>
        </button>
        <button
          onClick={() => setActiveTab("compra")}
          className={`tab-btn ${activeTab === "compra" ? "active" : ""}`}
        >
          <span>🛒</span>
          <span>Compra & Despensa</span>
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`tab-btn ${activeTab === "tickets" ? "active" : ""}`}
          style={{ position: "relative" }}
        >
          <span>🧾</span>
          <span>Tickets & Gastos</span>
          {urgentPerishablesCount > 0 && (
            <span
              style={{
                marginLeft: "0.25rem",
                padding: "0.12rem 0.45rem",
                borderRadius: "var(--radius-full)",
                background: "var(--apple-orange)",
                color: "#ffffff",
                fontSize: "0.7rem",
                fontWeight: 700,
              }}
            >
              {urgentPerishablesCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("tareas")}
          className={`tab-btn ${activeTab === "tareas" ? "active" : ""}`}
        >
          <span>✅</span>
          <span>Tareas</span>
          {pendingTasksCount > 0 && (
            <span
              style={{
                marginLeft: "0.25rem",
                padding: "0.12rem 0.45rem",
                borderRadius: "var(--radius-full)",
                background: "var(--apple-surface-tertiary)",
                color: "var(--apple-text-secondary)",
                fontSize: "0.7rem",
                fontWeight: 700,
              }}
            >
              {pendingTasksCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("peques")}
          className={`tab-btn ${activeTab === "peques" ? "active" : ""}`}
        >
          <span>🧒</span>
          <span>Peques & Cole</span>
        </button>
        <button
          onClick={() => setActiveTab("agenda")}
          className={`tab-btn ${activeTab === "agenda" ? "active" : ""}`}
        >
          <span>📅</span>
          <span>Agenda</span>
        </button>
        <button
          onClick={() => setActiveTab("energia")}
          className={`tab-btn ${activeTab === "energia" ? "active" : ""}`}
        >
          <span>⚡</span>
          <span>Energía Naturgy</span>
        </button>
      </nav>

      {/* Barra de Navegación Inferior Nativa iOS para Smartphone (UITabBar con Thumb Zone) */}
      <nav className="mobile-bottom-bar" aria-label="Navegación móvil inferior">
        <button
          type="button"
          onClick={() => setActiveTab("resumen")}
          className={`mobile-tab-item ${activeTab === "resumen" ? "active" : ""}`}
        >
          <span className="mobile-tab-icon">🏠</span>
          <span className="mobile-tab-label">Hoy</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("compra")}
          className={`mobile-tab-item ${activeTab === "compra" ? "active" : ""}`}
        >
          <span className="mobile-tab-icon">🛒</span>
          <span className="mobile-tab-label">Compra</span>
        </button>

        {/* Botón Central Apple Intelligence (Segundo Cerebro por Voz / Chat) */}
        <button
          type="button"
          onClick={() => setIsAssistantOpen(true)}
          className="mobile-tab-center-ai"
          title="Hablar o escribir al Segundo Cerebro"
          aria-label="Segundo Cerebro con Inteligencia Artificial"
        >
          <div className="mobile-tab-center-glow" />
          <div className="mobile-tab-center-inner">
            <span style={{ fontSize: "1.25rem", lineHeight: 1 }}>✨</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tickets")}
          className={`mobile-tab-item ${activeTab === "tickets" ? "active" : ""}`}
          style={{ position: "relative" }}
        >
          <span className="mobile-tab-icon">🧾</span>
          <span className="mobile-tab-label">Tickets</span>
          {urgentPerishablesCount > 0 && (
            <span className="mobile-tab-badge">
              {urgentPerishablesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("peques")}
          className={`mobile-tab-item ${activeTab === "peques" || activeTab === "agenda" || activeTab === "tareas" || activeTab === "energia" ? "active" : ""}`}
        >
          <span className="mobile-tab-icon">🧒</span>
          <span className="mobile-tab-label">Familia</span>
        </button>
      </nav>

      {/* Bento Grid Principal */}
      <main className="dashboard-grid">
        {/* Columna Principal Izquierda */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0, width: "100%" }}>
          {/* Sub-navegador Segmentado Móvil para Familia (Cole / Agenda / Tareas / Energía) */}
          {(activeTab === "peques" || activeTab === "agenda" || activeTab === "tareas" || activeTab === "energia") && (
            <div className="family-subnav-segmented" role="tablist">
              <button
                type="button"
                onClick={() => setActiveTab("peques")}
                className={`family-subnav-btn ${activeTab === "peques" ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === "peques"}
              >
                <span>🚸</span>
                <span>Cole</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("agenda")}
                className={`family-subnav-btn ${activeTab === "agenda" ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === "agenda"}
              >
                <span>📅</span>
                <span>Agenda</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tareas")}
                className={`family-subnav-btn ${activeTab === "tareas" ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === "tareas"}
              >
                <span>✅</span>
                <span>Tareas</span>
                {pendingTasksCount > 0 && (
                  <span style={{ fontSize: "0.72rem", opacity: 0.85, fontWeight: 700 }}>({pendingTasksCount})</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("energia")}
                className={`family-subnav-btn ${activeTab === "energia" ? "active" : ""}`}
                role="tab"
                aria-selected={activeTab === "energia"}
              >
                <span>⚡</span>
                <span>Energía</span>
              </button>
            </div>
          )}

          {activeTab === "resumen" && (
            <BriefingCard
              initialContent={latestBriefing}
              todayWeather={todayWeather}
            />
          )}

          {/* Widget Rápido Apple: Semáforo Energético Naturgy */}
          {activeTab === "resumen" && (
            <div
              onClick={() => setActiveTab("energia")}
              style={{
                cursor: "pointer",
                padding: "0.85rem 1.15rem",
                borderRadius: "var(--radius-lg)",
                background: "var(--apple-surface)",
                border: "1px solid var(--apple-border)",
                borderLeft: "4px solid var(--apple-green)",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
                transition: "all 0.2s var(--ease-spring)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.85rem" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "10px",
                    background: "rgba(52, 199, 89, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.1rem",
                    flexShrink: 0,
                  }}
                >
                  ⚡
                </div>
                <div>
                  <p style={{ fontWeight: 700, margin: 0, color: "var(--apple-text)", letterSpacing: "-0.01em" }}>
                    Naturgy Tarifas Por Uso · Recomendaciones Activas
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: "0.15rem 0 0 0" }}>
                    🚗 Coche (00:00–07:30) · 🧺 Lavadora (Despejado) · ♨️ Calefacción (20°C diurna)
                  </p>
                </div>
              </div>
              <span
                className="badge badge-blue"
                style={{ fontSize: "0.76rem", padding: "0.35rem 0.75rem", fontWeight: 600 }}
              >
                Abrir Gestor →
              </span>
            </div>
          )}

          {activeTab === "resumen" && (
            <DinnerCard
              date={today}
              initialPlans={dinners}
              schoolLunch={schoolLunch}
              schoolDinnerRec={schoolDinnerRec}
            />
          )}

          {activeTab === "tickets" && (
            <ReceiptsModule
              receipts={receipts}
              perishables={perishables}
              monthlyExpenses={monthlyExpenses}
              priceComparisons={priceComparisons}
              habits={habits}
            />
          )}

          {(activeTab === "compra" || activeTab === "resumen") && (
            <ShoppingModule
              items={shoppingItems}
              stores={stores}
              staples={staples}
              members={members}
              currentMemberId={currentMemberId}
            />
          )}

          {activeTab === "compra" && (
            <PantryModule items={pantry} />
          )}

          {activeTab === "tareas" && (
            <TasksModule
              tasks={tasks}
              members={members}
              currentMemberId={currentMemberId}
            />
          )}

          {activeTab === "peques" && (
            <KidsModule
              members={members}
              today={today}
              schoolRun={schoolRun}
              schoolLunch={schoolLunch}
              schoolDinnerRec={schoolDinnerRec}
              healthUpcoming={healthUpcoming}
              currentMemberId={currentMemberId}
            />
          )}

          {activeTab === "agenda" && (
            <CalendarModule
              events={events}
              members={members}
              today={today}
            />
          )}

          {activeTab === "energia" && (
            <EnergyModule
              contracts={energyContracts}
              todayWeather={todayWeather}
            />
          )}
        </section>

        {/* Columna Secundaria Derecha (Widgets Bento en desktop) */}
        <aside
          className={activeTab !== "resumen" ? "hide-on-mobile" : ""}
          style={{ display: "flex", flexDirection: "column", gap: "1.25rem", minWidth: 0, width: "100%" }}
        >
          {activeTab === "resumen" && (
            <>
              <EnergyModule
                contracts={energyContracts}
                todayWeather={todayWeather}
              />
              <KidsModule
                members={members}
                today={today}
                schoolRun={schoolRun}
                schoolLunch={schoolLunch}
                schoolDinnerRec={schoolDinnerRec}
                healthUpcoming={healthUpcoming}
                currentMemberId={currentMemberId}
              />
              <CalendarModule
                events={events}
                members={members}
                today={today}
              />
              <TasksModule
                tasks={tasks}
                members={members}
                currentMemberId={currentMemberId}
              />
            </>
          )}

          {activeTab === "compra" && (
            <DinnerCard
              date={today}
              initialPlans={dinners}
              schoolLunch={schoolLunch}
              schoolDinnerRec={schoolDinnerRec}
            />
          )}

          {activeTab === "tickets" && (
            <>
              <PantryModule items={pantry} />
              <ShoppingModule
                items={shoppingItems}
                stores={stores}
                staples={staples}
                members={members}
                currentMemberId={currentMemberId}
              />
            </>
          )}

          {(activeTab === "tareas" || activeTab === "agenda" || activeTab === "peques" || activeTab === "energia") && (
            <ShoppingModule
              items={shoppingItems}
              stores={stores}
              staples={staples}
              members={members}
              currentMemberId={currentMemberId}
            />
          )}
        </aside>
      </main>

      {/* Modales */}
      <AiAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        members={members}
      />

      <ProfileLoginModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        members={members}
        currentMemberId={currentMemberId ?? null}
      />
    </div>
  );
}
