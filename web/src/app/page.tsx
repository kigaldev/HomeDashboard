export const maxDuration = 60;

import { isoDate, longDate, greeting, addDays } from "@/lib/dates";
import {
  getMembers,
  getLatestBriefing,
  getSchoolMenu,
  getShopping,
  getStores,
  getStaples,
  getPantry,
  getTasksWithHistory,
  getSchoolRun,
  getHealthUpcoming,
  getEventsBetween,
  getReceipts,
  getExpiringPerishables,
  getMonthlyExpenses,
  getPriceComparisons,
  getShoppingHabits,
  getEnergyContracts,
  getFamilyInsurances,
  getWarranties,
  getUtilityBills,
  getRecurringExpenses,
  getMonthlyIncomes,
  getFinancialEvolution,
  syncFrequentStaples,
  getPantryLastUpdated,
} from "@/lib/repo";
import { getWeather } from "@/lib/weather";
import { ensureDinnerPlans } from "@/lib/dinners";
import { getLatestNews } from "@/lib/news";
import { getSchoolCommuteTraffic } from "@/lib/traffic";
import { syncMontessoriMenu } from "@/lib/schoolMenu";
import { generateBriefing } from "@/lib/briefing";
import { connection } from "next/server";
import { getActiveMemberId } from "@/lib/session";
import { DashboardClient } from "@/components/DashboardClient";

export const instant = false;

export default async function HomePage() {
  await connection();
  // Sincronizaciones no bloqueantes en segundo plano
  syncFrequentStaples().catch(() => {});

  const today = isoDate();
  const formattedDate = longDate(today);
  const currentGreeting = greeting();

  const currentMemberId = await getActiveMemberId();

  const [
    members,
    weather,
    latestBriefingRow,
    dinners,
    schoolMenuRow,
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
    energyContracts,
    insurances,
    warranties,
    utilityBills,
    recurringExpenses,
    monthlyIncomes,
    incomeEvolution,
    news,
    traffic,
    lastPantryUpdate,
  ] = await Promise.all([
    getMembers(),
    getWeather(),
    getLatestBriefing(),
    ensureDinnerPlans(today),
    getSchoolMenu(today),
    getShopping(),
    getStores(),
    getStaples(),
    getPantry(),
    getTasksWithHistory(),
    getSchoolRun(today),
    getHealthUpcoming(30),
    getEventsBetween(today, addDays(today, 60)),
    getReceipts(50),
    getExpiringPerishables(7),
    getMonthlyExpenses(),
    getPriceComparisons(),
    getShoppingHabits(),
    getEnergyContracts(),
    getFamilyInsurances(),
    getWarranties(),
    getUtilityBills(50),
    getRecurringExpenses(),
    getMonthlyIncomes(),
    getFinancialEvolution(6),
    getLatestNews(),
    getSchoolCommuteTraffic(),
    getPantryLastUpdated(),
  ]);

  const pantryNeedsInventory =
    !lastPantryUpdate ||
    Date.now() - new Date(lastPantryUpdate).getTime() > 7 * 24 * 60 * 60 * 1000;

  const todayWeather = weather?.days.find((d) => d.date === today) ?? null;
  const schoolLunch = schoolMenuRow?.lunch ?? null;
  const schoolDinnerRec = schoolMenuRow?.dinner_recommendation ?? null;

  // Solo si es día lectivo (Lunes a Viernes) y no hay menú, programar sync en segundo plano
  const dayOfWeek = new Date().getDay();
  const isSchoolDay = dayOfWeek >= 1 && dayOfWeek <= 5;
  if (!schoolLunch && isSchoolDay) {
    syncMontessoriMenu().catch((e) => {
      console.warn("[page] Auto-sync menú escolar en segundo plano:", e);
    });
  }

  // Briefing: Usar el último generado sin bloquear la respuesta HTTP con llamadas lentas a Gemini
  let latestBriefing = latestBriefingRow?.content ?? null;
  if (!latestBriefing) {
    const isEvening = new Date().getHours() >= 20;
    const kind = isEvening ? "evening" : "morning";
    generateBriefing(kind).catch((e) => {
      console.warn("[page] Auto-briefing en segundo plano:", e);
    });
    latestBriefing = `☀️ **${currentGreeting}**. Bienvenido al centro de mandos de tu hogar. Todo en orden para hoy ${formattedDate}.`;
  }

  return (
    <DashboardClient
      members={members}
      currentMemberId={currentMemberId}
      weather={weather}
      today={today}
      formattedDate={formattedDate}
      greeting={currentGreeting}
      latestBriefing={latestBriefing}
      todayWeather={todayWeather}
      dinners={dinners}
      schoolLunch={schoolLunch}
      schoolDinnerRec={schoolDinnerRec}
      shoppingItems={shoppingItems}
      stores={stores}
      staples={staples}
      pantry={pantry}
      tasks={tasks}
      schoolRun={schoolRun}
      healthUpcoming={healthUpcoming}
      events={events}
      receipts={receipts}
      perishables={perishables}
      monthlyExpenses={monthlyExpenses}
      priceComparisons={priceComparisons}
      habits={habits}
      energyContracts={energyContracts}
      insurances={insurances}
      warranties={warranties}
      utilityBills={utilityBills}
      recurringExpenses={recurringExpenses}
      monthlyIncomes={monthlyIncomes}
      incomeEvolution={incomeEvolution}
      news={news}
      traffic={traffic}
      pantryNeedsInventory={pantryNeedsInventory}
    />
  );
}
