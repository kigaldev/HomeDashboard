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
} from "@/lib/repo";
import type { Weather, DayWeather } from "@/lib/weather";

export function DashboardClient({
  members = [],
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
}: {
  members: Member[];
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
}) {
  const [activeTab, setActiveTab] = useState<"resumen" | "compra" | "tickets" | "tareas" | "peques" | "agenda">("resumen");
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const urgentPerishablesCount = (perishables || []).filter((p) => p.days_left <= 3).length;
  const pendingTasksCount = (tasks || []).filter((t) => !t.done).length;

  return (
    <div className="container">
      {/* Header estilo Apple Status Island */}
      <Header
        members={members}
        weather={weather}
        greeting={greeting}
        formattedDate={formattedDate}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
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
          className={`mobile-tab-item ${activeTab === "peques" || activeTab === "agenda" || activeTab === "tareas" ? "active" : ""}`}
        >
          <span className="mobile-tab-icon">🧒</span>
          <span className="mobile-tab-label">Familia</span>
        </button>
      </nav>

      {/* Bento Grid Principal */}
      <main className="dashboard-grid">
        {/* Columna Principal Izquierda */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
          {(activeTab === "resumen" || activeTab === "peques") && (
            <BriefingCard
              initialContent={latestBriefing}
              todayWeather={todayWeather}
            />
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
            />
          )}

          {activeTab === "compra" && (
            <PantryModule items={pantry} />
          )}

          {activeTab === "tareas" && (
            <TasksModule tasks={tasks} members={members} />
          )}

          {activeTab === "peques" && (
            <KidsModule
              members={members}
              today={today}
              schoolRun={schoolRun}
              schoolLunch={schoolLunch}
              schoolDinnerRec={schoolDinnerRec}
              healthUpcoming={healthUpcoming}
            />
          )}

          {activeTab === "agenda" && (
            <CalendarModule
              events={events}
              members={members}
              today={today}
            />
          )}
        </section>

        {/* Columna Secundaria Derecha (Widgets Bento en desktop) */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "1.35rem" }}>
          {activeTab === "resumen" && (
            <>
              <KidsModule
                members={members}
                today={today}
                schoolRun={schoolRun}
                schoolLunch={schoolLunch}
                schoolDinnerRec={schoolDinnerRec}
                healthUpcoming={healthUpcoming}
              />
              <CalendarModule
                events={events}
                members={members}
                today={today}
              />
              <TasksModule tasks={tasks} members={members} />
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
              />
            </>
          )}

          {(activeTab === "tareas" || activeTab === "agenda" || activeTab === "peques") && (
            <ShoppingModule
              items={shoppingItems}
              stores={stores}
              staples={staples}
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
    </div>
  );
}
