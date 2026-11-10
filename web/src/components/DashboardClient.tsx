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
import { EconomyModule } from "./EconomyModule";
import { TipsModule } from "./TipsModule";
import { NewsWidget } from "./NewsWidget";
import { WeatherDetailWidget } from "./WeatherDetailWidget";
import { FamilyPhotoFrame } from "./FamilyPhotoFrame";
import { MiniUpcomingAgenda } from "./MiniUpcomingAgenda";
import { AiAssistantModal } from "./AiAssistantModal";
import { SettingsModal } from "./SettingsModal";
import { ProfileLoginModal } from "./ProfileLoginModal";
import type { NewsItem } from "@/lib/news";
import {
  IconHome,
  IconCart,
  IconEconomy,
  IconFamily,
  IconCalendar,
  IconSparkles,
  IconClock,
  IconEnergy,
  IconLocation,
  IconChevronDown,
  IconChevronRight,
} from "./Icons";
import { timeOf } from "@/lib/dates";
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
  FamilyInsurance,
  Warranty,
} from "@/lib/repo";
import type { Weather, DayWeather } from "@/lib/weather";

const CARDS = [
  { id: "resumen", label: "Hoy", icon: (s = 16) => <IconHome size={s} /> },
  { id: "cenas", label: "Cenas", icon: (s = 16) => <span style={{ fontSize: `${s}px`, lineHeight: 1 }}>🍽️</span> },
  { id: "compra", label: "Compra", icon: (s = 16) => <IconCart size={s} /> },
  { id: "economia", label: "Economía", icon: (s = 16) => <IconEconomy size={s} /> },
  { id: "tips", label: "Tips", icon: (s = 16) => <span style={{ fontSize: `${s}px`, lineHeight: 1 }}>💡</span> },
  { id: "familia", label: "Familia", icon: (s = 16) => <IconFamily size={s} /> },
] as const;

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
  insurances = [],
  warranties = [],
  news = { espana: [], cyl: [] },
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
  insurances: FamilyInsurance[];
  warranties: Warranty[];
  news?: { espana: NewsItem[]; cyl: NewsItem[] };
}) {
  const activeMember = members.find((m) => m.id === currentMemberId);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const deckRef = useRef<HTMLDivElement>(null);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isProgrammaticScroll = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [assistantInitialPrompt, setAssistantInitialPrompt] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleOpenAssistant = (prompt?: string) => {
    setAssistantInitialPrompt(prompt || "");
    setIsAssistantOpen(true);
  };

  // Estados colapsables para los módulos de la pestaña Familia
  const [familyKidsOpen, setFamilyKidsOpen] = useState(true);
  const [familyTasksOpen, setFamilyTasksOpen] = useState(true);
  const [familyAgendaOpen, setFamilyAgendaOpen] = useState(false);
  const agendaSectionRef = useRef<HTMLDivElement>(null);

  const lowStockItems = (pantry || []).filter(
    (p) => (p.quantity_level ?? (p.status === "out" ? 0 : p.status === "low" ? 25 : 100)) <= 25
  );
  const pendingTasksCount = (tasks || []).filter((t) => !t.done).length;

  const memberMap = new Map((members || []).map((m) => [m.id, m]));

  const todayEvents = (events || [])
    .filter((ev) => ev.starts_at && ev.starts_at.slice(0, 10) === today)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  // Abrir la sección de Agenda dentro de Familia
  const openFamilyAgenda = () => {
    setFamilyAgendaOpen(true);
    const targetIdx = CARDS.findIndex((c) => c.id === "familia");
    goToCard(targetIdx >= 0 ? targetIdx : 5);
    setTimeout(() => {
      agendaSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 450);
  };

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
      if (pref === "agenda") {
        setFamilyAgendaOpen(true);
      }
      const target = CARDS.findIndex(
        (c) =>
          c.id === pref ||
          (pref === "cenas" && c.id === "cenas") ||
          (pref === "tips" && c.id === "tips") ||
          (pref === "energia" && c.id === "tips") ||
          (pref === "tickets" && c.id === "economia") ||
          (pref === "peques" && c.id === "familia") ||
          (pref === "tareas" && c.id === "familia") ||
          (pref === "agenda" && c.id === "familia")
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
        onOpenAssistant={() => handleOpenAssistant()}
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
              className={`deck-nav-btn touch-target ${activeCardIndex === idx ? "active" : ""}`}
            >
              <div className="deck-nav-icon-box">
                {card.icon(18)}
                {card.id === "compra" && lowStockItems.length > 0 && (
                  <span className="deck-badge-counter deck-badge-amber">
                    {lowStockItems.length}
                  </span>
                )}
                {card.id === "familia" && pendingTasksCount > 0 && (
                  <span className="deck-badge-counter deck-badge-gray">
                    {pendingTasksCount}
                  </span>
                )}
              </div>
              <span className="deck-nav-label">{card.label}</span>
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
          <div className="deck-card wall-kiosk-card">
            {lowStockItems.length > 0 && (
              <div
                onClick={() => goToCard(1)}
                className="wall-alert-banner touch-target"
                style={{
                  cursor: "pointer",
                  padding: "0.85rem 1.25rem",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--apple-surface-secondary)",
                  borderLeft: "4px solid var(--apple-orange)",
                  boxShadow: "var(--shadow-sm)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  minHeight: "48px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.85rem" }}>
                  <IconCart size={16} className="text-orange" />
                  <div>
                    <p style={{ fontWeight: 600, color: "var(--apple-text)", margin: 0 }}>
                      Reposición en Despensa · {lowStockItems.length} {lowStockItems.length === 1 ? "producto con stock bajo" : "productos con stock bajo"} (≤ 25%)
                    </p>
                    <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                      Stock crítico: {lowStockItems.slice(0, 3).map((p) => p.name).join(", ")}
                    </p>
                  </div>
                </div>
                <span className="badge badge-amber" style={{ fontSize: "0.76rem" }}>
                  Ver en Despensa →
                </span>
              </div>
            )}



            <div className="wall-dashboard-grid">
              {/* Columna Izquierda: Briefing + Agenda de Hoy compacta */}
              <div className="wall-grid-col wall-grid-col-left">
                <BriefingCard
                  initialContent={latestBriefing}
                  todayWeather={todayWeather}
                />

                <MiniUpcomingAgenda
                  events={events}
                  members={members}
                  today={today}
                  onOpenFullAgenda={openFamilyAgenda}
                />

                <NewsWidget
                  espanaNews={news?.espana || []}
                  cylNews={news?.cyl || []}
                />
              </div>

              {/* Columna Derecha: Clima Salamanca Ampliado + Fotografía Familiar */}
              <div className="wall-grid-col wall-grid-col-right">
                <WeatherDetailWidget
                  weather={weather}
                  todayWeather={todayWeather}
                />

                <FamilyPhotoFrame />
              </div>
            </div>
          </div>
        </div>

        {/* 🃏 Tarjeta 2: Cenas & Menú Escolar Montessori */}
        <div className="deck-slide">
          <div className="deck-card">
            <DinnerCard
              date={today}
              initialPlans={dinners}
              schoolLunch={schoolLunch}
              schoolDinnerRec={schoolDinnerRec}
            />
          </div>
        </div>

        {/* 🃏 Tarjeta 3: Compra & Despensa */}
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

        {/* 🃏 Tarjeta 4: Economía & Patrimonio Familiar (Unificada) */}
        <div className="deck-slide">
          <div className="deck-card">
            <EconomyModule
              receipts={receipts}
              perishables={perishables}
              monthlyExpenses={monthlyExpenses}
              priceComparisons={priceComparisons}
              habits={habits}
              energyContracts={energyContracts}
              todayWeather={todayWeather}
              insurances={insurances}
              warranties={warranties}
            />
          </div>
        </div>

        {/* 🃏 Tarjeta 5: Tips & Consejos de Optimización */}
        <div className="deck-slide">
          <div className="deck-card">
            <TipsModule
              energyContracts={energyContracts}
              insurances={insurances}
              warranties={warranties}
              priceComparisons={priceComparisons}
            />
          </div>
        </div>

        {/* 🃏 Tarjeta 6: Familia & Hogar (Peques, Tareas & Agenda Integradas) */}
        <div className="deck-slide">
          <div className="deck-card">
            {/* Sección 1: Peques (Cole & Salud) */}
            <div style={{ marginBottom: "1rem" }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFamilyKidsOpen(!familyKidsOpen)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFamilyKidsOpen(!familyKidsOpen);
                  }
                }}
                aria-expanded={familyKidsOpen}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem 1.15rem",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                  cursor: "pointer",
                  userSelect: "none",
                  boxShadow: "var(--shadow-sm)",
                  marginBottom: familyKidsOpen ? "0.75rem" : "0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    className="squircle-icon"
                    style={{
                      background: "var(--apple-orange-subtle)",
                      color: "var(--apple-orange)",
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                    }}
                  >
                    🧒
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                        Peques (Cole & Salud)
                      </h2>
                      <span className="badge badge-amber" style={{ fontSize: "0.72rem" }}>
                        Montessori Salamanca
                      </span>
                    </div>
                    <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: "0.1rem 0 0 0" }}>
                      Turnos de recogida, menú del cole y citas médicas
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "var(--radius-full)",
                    background: "var(--apple-surface)",
                    border: "1px solid var(--apple-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--apple-text-secondary)",
                    flexShrink: 0,
                  }}
                >
                  {familyKidsOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                </div>
              </div>

              {familyKidsOpen && (
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
            </div>

            {/* Sección 2: Tareas del Hogar */}
            <div style={{ marginBottom: "1rem" }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFamilyTasksOpen(!familyTasksOpen)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFamilyTasksOpen(!familyTasksOpen);
                  }
                }}
                aria-expanded={familyTasksOpen}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem 1.15rem",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                  cursor: "pointer",
                  userSelect: "none",
                  boxShadow: "var(--shadow-sm)",
                  marginBottom: familyTasksOpen ? "0.75rem" : "0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    className="squircle-icon"
                    style={{
                      background: "var(--apple-blue-subtle)",
                      color: "var(--apple-blue)",
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                    }}
                  >
                    ✅
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                        Tareas del Hogar
                      </h2>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          padding: "0.12rem 0.5rem",
                          borderRadius: "var(--radius-full)",
                          background: pendingTasksCount > 0 ? "rgba(59, 130, 246, 0.12)" : "rgba(52, 199, 89, 0.12)",
                          color: pendingTasksCount > 0 ? "var(--apple-blue)" : "var(--apple-green)",
                          fontWeight: 600,
                        }}
                      >
                        {pendingTasksCount > 0 ? `${pendingTasksCount} pendientes` : "¡Todo al día!"}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: "0.1rem 0 0 0" }}>
                      Responsabilidades y organización del hogar
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "var(--radius-full)",
                    background: "var(--apple-surface)",
                    border: "1px solid var(--apple-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--apple-text-secondary)",
                    flexShrink: 0,
                  }}
                >
                  {familyTasksOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                </div>
              </div>

              {familyTasksOpen && (
                <TasksModule
                  tasks={tasks}
                  members={members}
                  currentMemberId={currentMemberId}
                />
              )}
            </div>

            {/* Sección 3: Agenda & Cronograma */}
            <div ref={agendaSectionRef} style={{ marginBottom: "1rem" }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setFamilyAgendaOpen(!familyAgendaOpen)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFamilyAgendaOpen(!familyAgendaOpen);
                  }
                }}
                aria-expanded={familyAgendaOpen}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem 1.15rem",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--apple-surface-secondary)",
                  border: "1px solid var(--apple-border)",
                  cursor: "pointer",
                  userSelect: "none",
                  boxShadow: "var(--shadow-sm)",
                  marginBottom: familyAgendaOpen ? "0.75rem" : "0",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div
                    className="squircle-icon"
                    style={{
                      background: "rgba(0, 113, 227, 0.12)",
                      color: "var(--apple-blue)",
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.1rem",
                    }}
                  >
                    📅
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                        Agenda & Cronograma
                      </h2>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          padding: "0.12rem 0.5rem",
                          borderRadius: "var(--radius-full)",
                          background: "var(--apple-surface)",
                          color: "var(--apple-text-secondary)",
                          fontWeight: 600,
                          border: "1px solid var(--apple-border)",
                        }}
                      >
                        {events.length} compromisos
                      </span>
                    </div>
                    <p style={{ fontSize: "0.76rem", color: "var(--apple-text-secondary)", margin: "0.1rem 0 0 0" }}>
                      Sincronización con Google Calendar y eventos del hogar
                    </p>
                  </div>
                </div>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "var(--radius-full)",
                    background: "var(--apple-surface)",
                    border: "1px solid var(--apple-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--apple-text-secondary)",
                    flexShrink: 0,
                  }}
                >
                  {familyAgendaOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                </div>
              </div>

              {familyAgendaOpen && (
                <CalendarModule
                  events={events}
                  members={members}
                  today={today}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Globo / Botón Flotante con Icono de Chatbot (Asistente por Voz y Texto) ── */}
      <button
        type="button"
        onClick={() => handleOpenAssistant()}
        className="fab-apple-ai"
        title="Hablar o escribir al Asistente del Hogar"
        aria-label="Asistente Chatbot del Hogar"
      >
        <span style={{ fontSize: "1.1rem", display: "inline-flex", alignItems: "center" }}>💬</span>
        <span>Asistente</span>
        <span className="status-dot-live" style={{ width: "6px", height: "6px" }} />
      </button>

      {/* Modales */}
      <AiAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        initialPrompt={assistantInitialPrompt}
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
