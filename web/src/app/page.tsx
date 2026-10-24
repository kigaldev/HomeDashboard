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
  getEnergyContracts,
  getFamilyInsurances,
  getWarranties,
} from "@/lib/repo";
import { getWeather } from "@/lib/weather";
import { ensureDinnerPlans } from "@/lib/dinners";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { DashboardClient } from "@/components/DashboardClient";

export const instant = false;

export default async function HomePage() {
  await connection();
  const today = isoDate();
  const formattedDate = longDate(today);
  const currentGreeting = greeting();

  const cookieStore = await cookies();
  const activeMemberStr = cookieStore.get("hd_active_member")?.value;
  const currentMemberId = activeMemberStr ? parseInt(activeMemberStr, 10) : null;

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
    getEventsBetween(today, addDays(today, 60)),
    getReceipts(15),
    getExpiringPerishables(7),
    getMonthlyExpenses(),
    getPriceComparisons(),
    getShoppingHabits(),
    getEnergyContracts(),
    getFamilyInsurances(),
    getWarranties(),
  ]);

  const todayWeather = weather?.days.find((d) => d.date === today) ?? null;
  const schoolLunch = schoolMenuRow?.lunch ?? null;
  const schoolDinnerRec = schoolMenuRow?.dinner_recommendation ?? null;

  return (
    <DashboardClient
      members={members}
      currentMemberId={currentMemberId}
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
      energyContracts={energyContracts}
      insurances={insurances}
      warranties={warranties}
    />
  );
}
