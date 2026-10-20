import { isoDate, longDate, greeting, addDays } from "@/lib/dates";
import {
  getMembers,
  getLatestBriefing,
  getSchoolMenu,
  getShopping,
  getStores,
  getStaples,
  getPantry,
  getOpenTasks,
  getSchoolRun,
  getHealthUpcoming,
  getEventsBetween,
  getReceipts,
  getExpiringPerishables,
  getMonthlyExpenses,
  getPriceComparisons,
  getShoppingHabits,
  ensureDemoReceipts,
} from "@/lib/repo";
import { getWeather } from "@/lib/weather";
import { ensureDinnerPlans } from "@/lib/dinners";
import { connection } from "next/server";
import { DashboardClient } from "@/components/DashboardClient";

export const instant = false;

export default async function HomePage() {
  await connection();
  const today = isoDate();
  const formattedDate = longDate(today);
  const currentGreeting = greeting();

  // Asegurar tickets demo iniciales si no hay
  try {
    await ensureDemoReceipts();
  } catch (e) {
    console.warn("[page] Error no bloqueante al cargar tickets demo:", e);
  }

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
    getOpenTasks(),
    getSchoolRun(today),
    getHealthUpcoming(30),
    getEventsBetween(today, addDays(today, 8)),
    getReceipts(15),
    getExpiringPerishables(7),
    getMonthlyExpenses(),
    getPriceComparisons(),
    getShoppingHabits(),
  ]);

  const todayWeather = weather?.days.find((d) => d.date === today) ?? null;
  const schoolLunch = schoolMenuRow?.lunch ?? null;
  const schoolDinnerRec = schoolMenuRow?.dinner_recommendation ?? null;

  return (
    <DashboardClient
      members={members}
      weather={weather}
      today={today}
      formattedDate={formattedDate}
      greeting={currentGreeting}
      latestBriefing={latestBriefingRow?.content ?? null}
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
    />
  );
}
