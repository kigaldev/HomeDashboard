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
import { AgentSquadMissionControl } from "./AgentSquadMissionControl";
import { AiAssistantModal } from "./AiAssistantModal";
import { SettingsModal } from "./SettingsModal";
import { ProfileLoginModal } from "./ProfileLoginModal";
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
  { id: "compra", label: "Compra", icon: (s = 16) => <IconCart size={s} /> },
  { id: "economia", label: "Economía", icon: (s = 16) => <IconEconomy size={s} /> },
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

  const urgentPerishablesCount = (perishables || []).filter((p) => p.days_left <= 3).length;
  const pendingTasksCount = (tasks || []).filter((t) => !t.done).length;

  const memberMap = new Map((members || []).map((m) => [m.id, m]));

  const todayEvents = (events || [])
    .filter((ev) => ev.starts_at && ev.starts_at.slice(0, 10) === today)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  // Abrir la sección de Agenda dentro de Familia
  const openFamilyAgenda = () => {
    setFamilyAgendaOpen(true);
    goToCard(3);
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
          (pref === "energia" && c.id === "economia") ||
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
                {card.id === "economia" && urgentPerishablesCount > 0 && (
                  <span className="deck-badge-counter deck-badge-amber">
                    {urgentPerishablesCount}
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
            {urgentPerishablesCount > 0 && (
              <div
                onClick={() => goToCard(2)}
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
                  <IconClock size={16} className="text-orange" />
                  <div>
                    <p style={{ fontWeight: 600, color: "var(--apple-text)", margin: 0 }}>
                      Atención en despensa · {urgentPerishablesCount} alimentos perecederos
                    </p>
                    <p style={{ fontSize: "0.78rem", color: "var(--apple-text-secondary)", margin: 0, marginTop: "0.1rem" }}>
                      Consumir pronto: {perishables.slice(0, 3).map((p) => p.name).join(", ")}
                    </p>
                  </div>
                </div>
                <span className="badge badge-amber" style={{ fontSize: "0.76rem" }}>
                  Ver en Economía →
                </span>
              </div>
            )}

            {/* 🤖 Squad Multiagente del Hogar (Mission Control · FortIA Architecture) */}
            <AgentSquadMissionControl
              receipts={receipts}
              events={events}
              perishables={perishables}
              energyContracts={energyContracts}
              onOpenAssistant={handleOpenAssistant}
              onNavigateTab={(tabId) => {
                const targetIdx = CARDS.findIndex((c) => c.id === tabId);
                if (targetIdx >= 0) goToCard(targetIdx);
              }}
            />

            <div className="wall-dashboard-grid">
              {/* Columna Izquierda: Briefing + Agenda de Hoy compacta */}
              <div className="wall-grid-col wall-grid-col-left">
                <BriefingCard
                  initialContent={latestBriefing}
                  todayWeather={todayWeather}
                />

                {/* Widget Rápido: Agenda de Hoy */}
                <div
                  className="liquid-glass wall-agenda-widget liquid-specular"
                  style={{
                    padding: "1rem 1.25rem",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--liquid-glass-bg-subtle)",
                    boxShadow: "var(--liquid-shadow-ambient), inset 0 1px 0.5px var(--liquid-specular-top)",
                    border: "1px solid var(--apple-border)",
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
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: "rgba(0, 113, 227, 0.15)",
                          color: "var(--apple-blue)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconCalendar size={16} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                        <h3 style={{ fontSize: "0.98rem", fontWeight: 700, margin: 0, color: "var(--apple-text)" }}>
                          📅 Agenda de Hoy
                        </h3>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.12rem 0.5rem",
                            borderRadius: "var(--radius-full)",
                            background: todayEvents.length > 0 ? "rgba(0, 113, 227, 0.12)" : "var(--apple-surface)",
                            color: todayEvents.length > 0 ? "var(--apple-blue)" : "var(--apple-text-secondary)",
                            fontWeight: 600,
                          }}
                        >
                          {todayEvents.length} {todayEvents.length === 1 ? "evento" : "eventos"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={openFamilyAgenda}
                      className="btn-ghost touch-target"
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--apple-blue)",
                        fontWeight: 600,
                        padding: "0.35rem 0.6rem",
                        minHeight: "44px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        cursor: "pointer",
                      }}
                    >
                      Ver agenda completa →
                    </button>
                  </div>

                  {todayEvents.length === 0 ? (
                    <div
                      style={{
                        padding: "0.85rem 1rem",
                        textAlign: "center",
                        borderRadius: "var(--radius-md)",
                        background: "var(--apple-surface)",
                        color: "var(--apple-text-secondary)",
                        fontSize: "0.85rem",
                        border: "1px dashed var(--apple-border)",
                      }}
                    >
                      Sin eventos programados para hoy ✨
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                      {todayEvents.map((ev) => {
                        const member = ev.member_id ? memberMap.get(ev.member_id) : null;
                        const accent = member?.color || "var(--apple-blue)";
                        return (
                          <div
                            key={ev.id}
                            onClick={openFamilyAgenda}
                            className="touch-target"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.65rem 0.85rem",
                              borderRadius: "var(--radius-md)",
                              background: "var(--apple-surface)",
                              border: "1px solid var(--apple-border)",
                              borderLeft: `3px solid ${accent}`,
                              cursor: "pointer",
                              gap: "0.65rem",
                              minHeight: "44px",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  fontSize: "0.78rem",
                                  fontWeight: 700,
                                  color: accent,
                                  flexShrink: 0,
                                  minWidth: "64px",
                                }}
                              >
                                <IconClock size={12} />
                                <span>{ev.all_day ? "Todo el día" : timeOf(ev.starts_at)}</span>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span
                                  style={{
                                    fontSize: "0.88rem",
                                    fontWeight: 600,
                                    color: "var(--apple-text)",
                                    display: "block",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {ev.title}
                                </span>
                                {ev.location && (
                                  <span
                                    style={{
                                      fontSize: "0.74rem",
                                      color: "var(--apple-text-secondary)",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.2rem",
                                      marginTop: "0.1rem",
                                    }}
                                  >
                                    <IconLocation size={11} />
                                    <span>{ev.location}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {member && (
                              <span
                                style={{
                                  fontSize: "0.74rem",
                                  padding: "0.15rem 0.5rem",
                                  borderRadius: "var(--radius-full)",
                                  background: `${member.color}15`,
                                  color: member.color,
                                  fontWeight: 600,
                                  border: `1px solid ${member.color}30`,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  flexShrink: 0,
                                }}
                              >
                                <span>{member.emoji}</span>
                                <span>{member.name}</span>
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Columna Derecha: Cena de Hoy + Widget de Suministros/Economía */}
              <div className="wall-grid-col wall-grid-col-right">
                <DinnerCard
                  date={today}
                  initialPlans={dinners}
                  schoolLunch={schoolLunch}
                  schoolDinnerRec={schoolDinnerRec}
                />

                {/* Widget Rápido: Economía & Suministros Naturgy */}
                <div
                  onClick={() => goToCard(2)}
                  className="liquid-glass wall-card-quick-eco touch-target liquid-specular"
                  style={{
                    cursor: "pointer",
                    padding: "0.95rem 1.25rem",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--liquid-glass-bg-subtle)",
                    borderLeft: "4px solid var(--apple-green)",
                    boxShadow: "var(--liquid-shadow-ambient), inset 0 1px 0.5px var(--liquid-specular-top)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.75rem",
                    minHeight: "56px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.85rem" }}>
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "rgba(52, 199, 89, 0.15)",
                        color: "var(--apple-green)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconEnergy size={16} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, margin: 0, color: "var(--apple-text)", fontSize: "0.92rem" }}>
                        Economía Familiar & Suministros Naturgy
                      </p>
                      <p style={{ fontSize: "0.8rem", color: "var(--apple-text-secondary)", margin: "0.15rem 0 0 0" }}>
                        Luz fija 24h a 0.123 €/kWh · Carga recomendada de VE en Valle P2 (00:00–07:30)
                      </p>
                    </div>
                  </div>
                  <span className="badge badge-blue" style={{ fontSize: "0.78rem" }}>
                    Ver Módulo Economía →
                  </span>
                </div>
              </div>
            </div>
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

        {/* 🃏 Tarjeta 3: Economía & Patrimonio Familiar (Unificada) */}
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

        {/* 🃏 Tarjeta 4: Familia & Hogar (Peques, Tareas & Agenda Integradas) */}
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

      {/* ── Botón Flotante Apple Intelligence (Asistente por Voz / Chat) ── */}
      <button
        type="button"
        onClick={() => handleOpenAssistant()}
        className="fab-apple-ai"
        title="Hablar o escribir al Asistente"
        aria-label="Asistente con Inteligencia Artificial"
      >
        <IconSparkles size={16} />
        <span>Asistente</span>
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
