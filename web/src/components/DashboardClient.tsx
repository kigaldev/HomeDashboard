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
  members,
  weather,
  today,
  formattedDate,
  greeting,
  latestBriefing,
  todayWeather,
  dinners,
  schoolLunch,
  schoolDinnerRec,
  shoppingItems,
  stores,
  staples,
  pantry,
  tasks,
  schoolRun,
  healthUpcoming,
  events,
  receipts,
  perishables,
  monthlyExpenses,
  priceComparisons,
  habits,
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

  const urgentPerishablesCount = perishables.filter((p) => p.days_left <= 3).length;

  return (
    <div className="container">
      {/* Header */}
      <Header
        members={members}
        weather={weather}
        greeting={greeting}
        formattedDate={formattedDate}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Banner de alerta si hay frescos a punto de caducar */}
      {urgentPerishablesCount > 0 && activeTab !== "tickets" && (
        <div
          onClick={() => setActiveTab("tickets")}
          style={{
            cursor: "pointer",
            padding: "0.65rem 1rem",
            marginBottom: "1rem",
            borderRadius: "var(--radius-md)",
            background: "rgba(245, 158, 11, 0.12)",
            border: "1px solid rgba(245, 158, 11, 0.4)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
            <span>⚠️</span>
            <span>
              <strong>Atención despensa:</strong> Hay <strong>{urgentPerishablesCount}</strong> alimentos frescos que caducan en los próximos 3 días (
              {perishables.slice(0, 2).map((p) => p.name).join(", ")}
              {urgentPerishablesCount > 2 ? "..." : ""}).
            </span>
          </div>
          <span className="badge badge-amber" style={{ fontSize: "0.75rem" }}>
            Ver en Tickets &amp; Caducidades →
          </span>
        </div>
      )}

      {/* Tabs de navegación rápida */}
      <nav className="tab-nav" aria-label="Secciones del dashboard">
        <button
          onClick={() => setActiveTab("resumen")}
          className={`tab-btn ${activeTab === "resumen" ? "active" : ""}`}
        >
          ✨ Resumen &amp; Cenas
        </button>
        <button
          onClick={() => setActiveTab("compra")}
          className={`tab-btn ${activeTab === "compra" ? "active" : ""}`}
        >
          🛒 Compra &amp; Despensa
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`tab-btn ${activeTab === "tickets" ? "active" : ""}`}
          style={{ position: "relative" }}
        >
          🧾 Tickets &amp; Gastos
          {urgentPerishablesCount > 0 && (
            <span
              style={{
                marginLeft: "0.4rem",
                padding: "0.1rem 0.35rem",
                borderRadius: "var(--radius-full)",
                background: "#f59e0b",
                color: "#1e1b4b",
                fontSize: "0.68rem",
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
          ✅ Tareas ({tasks.filter((t) => !t.done).length})
        </button>
        <button
          onClick={() => setActiveTab("peques")}
          className={`tab-btn ${activeTab === "peques" ? "active" : ""}`}
        >
          🧒 Peques (Cole &amp; Salud)
        </button>
        <button
          onClick={() => setActiveTab("agenda")}
          className={`tab-btn ${activeTab === "agenda" ? "active" : ""}`}
        >
          📅 Agenda
        </button>
      </nav>

      {/* Vista interactiva según tab */}
      <main className="dashboard-grid">
        {/* Columna Principal Izquierda */}
        <section style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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

        {/* Columna Secundaria Derecha (Resumen lateral en desktop) */}
        <aside style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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
