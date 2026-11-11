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
  await syncFrequentStaples().catch((err) => {
    console.warn("[page] Error al sincronizar básicos frecuentes:", err);
  });
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
    getReceipts(15),
    getExpiringPerishables(7),
    getMonthlyExpenses(),
    getPriceComparisons(),
    getShoppingHabits(),
    getEnergyContracts(),
    getFamilyInsurances(),
    getWarranties(),
    getLatestNews(),
    getSchoolCommuteTraffic(),
    getPantryLastUpdated(),
  ]);

  const pantryNeedsInventory =
    !lastPantryUpdate ||
    Date.now() - new Date(lastPantryUpdate).getTime() > 7 * 24 * 60 * 60 * 1000;

  const todayWeather = weather?.days.find((d) => d.date === today) ?? null;
  let schoolLunch = schoolMenuRow?.lunch ?? null;
  let schoolDinnerRec = schoolMenuRow?.dinner_recommendation ?? null;

  if (!schoolLunch) {
    try {
      await syncMontessoriMenu();
      const updatedMenu = await getSchoolMenu(today);
      if (updatedMenu) {
        schoolLunch = updatedMenu.lunch;
        schoolDinnerRec = updatedMenu.dinner_recommendation;
      }
    } catch (e) {
      console.warn("[page] Error auto-sincronizando menú escolar:", e);
    }
  }

  let latestBriefing = latestBriefingRow?.content ?? null;
  if (!latestBriefing || latestBriefingRow?.for_date !== today) {
    try {
      const isEvening = new Date().getHours() >= 20;
      const kind = isEvening ? "evening" : "morning";
      latestBriefing = await generateBriefing(kind);
    } catch (e) {
      console.warn("[page] Error auto-generando briefing diario:", e);
    }
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
      news={news}
      traffic={traffic}
      pantryNeedsInventory={pantryNeedsInventory}
    />
  );
}
