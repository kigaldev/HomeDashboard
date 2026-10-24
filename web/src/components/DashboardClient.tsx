"use client";

import { useState, useRef, useEffect } from "react";
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

const CARDS: Array<{
  id: "resumen" | "compra" | "energia" | "tickets" | "familia" | "agenda";
  label: string;
  icon: string;
}> = [
  { id: "resumen", label: "Hoy", icon: "🏠" },
  { id: "compra", label: "Compra", icon: "🛒" },
  { id: "energia", label: "Energía", icon: "⚡" },
  { id: "tickets", label: "Gastos", icon: "🧾" },
  { id: "familia", label: "Familia", icon: "🧒" },
  { id: "agenda", label: "Agenda", icon: "📅" },
];

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
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const deckRef = useRef<HTMLDivElement>(null);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const urgentPerishablesCount = (perishables || []).filter((p) => p.days_left <= 3).length;
  const pendingTasksCount = (tasks || []).filter((t) => !t.done).length;

  // Desplazamiento suave hacia la tarjeta seleccionada
  const goToCard = (index: number) => {
    if (index < 0 || index >= CARDS.length) return;
    setActiveCardIndex(index);
    isProgrammaticScroll.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    if (deckRef.current) {
      const cardWidth = deckRef.current.clientWidth;
      deckRef.current.scrollTo({
        left: index * cardWidth,
        behavior: "smooth",
      });
    }

    scrollTimeout.current = setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 450);
  };

  // Detector de gesto Swipe táctil horizontal
  const handleDeckScroll = () => {
    if (isProgrammaticScroll.current || !deckRef.current) return;
    const { scrollLeft, clientWidth } = deckRef.current;
    if (clientWidth <= 0) return;
    const newIndex = Math.round(scrollLeft / clientWidth);
    if (newIndex >= 0 && newIndex < CARDS.length && newIndex !== activeCardIndex) {
      setActiveCardIndex(newIndex);
    }
  };

  // Auto-centrado de la pestaña activa en la barra superior
  useEffect(() => {
    const btn = tabBtnRefs.current[activeCardIndex];
    if (btn) {
      btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [activeCardIndex]);

  // Selección inicial según pestaña favorita de perfil
  useEffect(() => {
    const pref = activeMember?.preferred_tab;
    if (pref) {
      const target = CARDS.findIndex(
        (c) => c.id === pref || (pref === "peques" && c.id === "familia") || (pref === "tareas" && c.id === "familia")
      );
      if (target > 0) {
        goToCard(target);
      }
    }
  }, []);

  return (
    <div className="container">
      {/* Header compacto con estatus e identidad familiar */}
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

      {/* ── Menú Superior Sticky Fácil de Acceder (Apple Pill Bar) ── */}
      <div className="deck-sticky-header">
        <nav className="deck-top-nav" aria-label="Tarjetas principales">
          {CARDS.map((card, idx) => (
            <button
              key={card.id}
              ref={(el) => {
                tabBtnRefs.current[idx] = el;
              }}
              type="button"
              onClick={() => goToCard(idx)}
              className={`deck-nav-btn ${activeCardIndex === idx ? "active" : ""}`}
            >
              <span>{card.icon}</span>
              <span>{card.label}</span>
              {card.id === "tickets" && urgentPerishablesCount > 0 && (
                <span
                  style={{
                    marginLeft: "0.2rem",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "var(--radius-full)",
                    background: "var(--apple-orange)",
                    color: "#ffffff",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                  }}
                >
                  {urgentPerishablesCount}
                </span>
              )}
              {card.id === "familia" && pendingTasksCount > 0 && (
                <span
                  style={{
                    marginLeft: "0.2rem",
                    padding: "0.1rem 0.4rem",
                    borderRadius: "var(--radius-full)",
                    background: "var(--apple-surface-tertiary)",
                    color: "var(--apple-text-secondary)",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                  }}
                >
                  {pendingTasksCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Indicador de puntos de paginación sutiles */}
        <div className="deck-dots-bar" aria-hidden="true">
          {CARDS.map((card, idx) => (
            <span
              key={card.id}
              onClick={() => goToCard(idx)}
              className={`deck-dot ${activeCardIndex === idx ? "active" : ""}`}
              title={`Ir a ${card.label}`}
            />
          ))}
        </div>
      </div>

      {/* ── Viewport Horizontal de Tarjetas Maestras (Desplazamiento por Swipe o Tap) ── */}
      <div
        ref={deckRef}
        onScroll={handleDeckScroll}
        className="deck-viewport"
      >
        {/* 🃏 Tarjeta 1: Hoy (Centro de Mando) */}
        <div className="deck-slide">
          <div className="deck-card">
            {urgentPerishablesCount > 0 && (
              <div
                onClick={() => goToCard(3)}
                style={{
                  cursor: "pointer",
                  padding: "0.85rem 1.25rem",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--apple-surface-secondary)",
                  borderLeft: "5px solid var(--apple-orange)",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.875rem" }}>
                  <span style={{ fontSize: "1.2rem" }}>⏳</span>
                  <div>
                    <p style={{ fontWeight: 600, color: "var(--apple-text)", margin: 0 }}>
                      Atención en despensa · {urgentPerishablesCount} alimentos perecederos
                    </p>
                    <p style={{ fontSize: "0.8rem", color: "var(--apple-text-secondary)", margin: 0 }}>
                      Consumir pronto: {perishables.slice(0, 3).map((p) => p.name).join(", ")}
                    </p>
                  </div>
                </div>
                <span className="badge badge-amber" style={{ fontSize: "0.78rem" }}>
                  Ver en Gastos →
                </span>
              </div>
            )}

            <BriefingCard
              initialContent={latestBriefing}
              todayWeather={todayWeather}
            />

            {/* Widget Rápido: Semáforo Energético Naturgy */}
            <div
              onClick={() => goToCard(2)}
              style={{
                cursor: "pointer",
                padding: "0.85rem 1.15rem",
                borderRadius: "var(--radius-lg)",
                background: "var(--apple-surface-secondary)",
                borderLeft: "4px solid var(--apple-green)",
                boxShadow: "var(--shadow-sm)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.85rem" }}>
                <span style={{ fontSize: "1.25rem" }}>⚡</span>
                <div>
                  <p style={{ fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                    Naturgy Tarifas Por Uso · Recomendaciones Activas
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: "0.15rem 0 0 0" }}>
                    🚗 Coche (00:00–07:30) · 🧺 Lavadora (Despejado) · ♨️ Calefacción (20°C diurna)
                  </p>
                </div>
              </div>
              <span className="badge badge-blue" style={{ fontSize: "0.76rem" }}>
                Ver Tarjeta Energía →
              </span>
            </div>

            <DinnerCard
              date={today}
              initialPlans={dinners}
              schoolLunch={schoolLunch}
              schoolDinnerRec={schoolDinnerRec}
            />
          </div>
        </div>

        {/* 🃏 Tarjeta 2: Compra & Despensa */}
        <div className="deck-slide">
          <div className="deck-card">
            <ShoppingModule
              items={shoppingItems}
              stores={stores}
              staples={staples}
              members={members}
              currentMemberId={currentMemberId}
            />
            <PantryModule items={pantry} />
          </div>
        </div>

        {/* 🃏 Tarjeta 3: Energía Naturgy */}
        <div className="deck-slide">
          <div className="deck-card">
            <EnergyModule
              contracts={energyContracts}
              todayWeather={todayWeather}
            />
          </div>
        </div>

        {/* 🃏 Tarjeta 4: Gastos & Tickets */}
        <div className="deck-slide">
          <div className="deck-card">
            <ReceiptsModule
              receipts={receipts}
              perishables={perishables}
              monthlyExpenses={monthlyExpenses}
              priceComparisons={priceComparisons}
              habits={habits}
            />
          </div>
        </div>

        {/* 🃏 Tarjeta 5: Familia (Peques & Tareas) */}
        <div className="deck-slide">
          <div className="deck-card">
            <KidsModule
              members={members}
              today={today}
              schoolRun={schoolRun}
              schoolLunch={schoolLunch}
              schoolDinnerRec={schoolDinnerRec}
              healthUpcoming={healthUpcoming}
              currentMemberId={currentMemberId}
            />
            <TasksModule
              tasks={tasks}
              members={members}
              currentMemberId={currentMemberId}
            />
          </div>
        </div>

        {/* 🃏 Tarjeta 6: Agenda */}
        <div className="deck-slide">
          <div className="deck-card">
            <CalendarModule
              events={events}
              members={members}
              today={today}
            />
          </div>
        </div>
      </div>

      {/* ── Botón Flotante Apple Intelligence (Segundo Cerebro por Voz / Chat) ── */}
      <button
        type="button"
        onClick={() => setIsAssistantOpen(true)}
        className="fab-apple-ai"
        title="Hablar o escribir al Segundo Cerebro"
        aria-label="Segundo Cerebro con Inteligencia Artificial"
      >
        <span style={{ fontSize: "1.2rem" }}>✨</span>
        <span>Segundo Cerebro</span>
      </button>

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
