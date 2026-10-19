import "server-only";
import { addDays, ageLabel, isoDate, longDate, timeOf } from "./dates";
import {
  getEventsBetween, getHealthUpcoming, getMembers, getOpenTasks, getPantry, getSchoolMenu,
  getSchoolRun, getShopping, getStores, type Member,
} from "./repo";
import { getWeather, kidsOutfit, weatherLabel } from "./weather";
import { ensureDinnerPlans } from "./dinners";

/** Fotografía de un día: la usan el briefing, el chat IA y el bot. */
export async function daySnapshot(date: string) {
  const [members, events, run, schoolMenu, tasks, health, weather, dinners, shopping, pantry, stores] = await Promise.all([
    getMembers(), getEventsBetween(date, addDays(date, 1)), getSchoolRun(date), getSchoolMenu(date),
    getOpenTasks(), getHealthUpcoming(14), getWeather(), ensureDinnerPlans(date), getShopping(), getPantry(), getStores(),
  ]);
  const byId = new Map(members.map((m) => [m.id, m]));
  const name = (id: number | null) => (id ? byId.get(id)?.name ?? "?" : "los dos");
  const day = weather?.days.find((d) => d.date === date) ?? null;
  const birthdays = members.filter((m) => m.birthdate && m.birthdate.slice(5) === date.slice(5));
  const tasksDue = tasks.filter((t) => !t.done && (!t.due_date || t.due_date <= date));
  const lunch = schoolMenu?.lunch ?? null;
  const dinnerRec = schoolMenu?.dinner_recommendation ?? null;
  return { date, members, byId, name, events, run, lunch, dinnerRec, tasksDue, health, day, dinners, shopping, pantry, stores, birthdays };
}

export type Snapshot = Awaited<ReturnType<typeof daySnapshot>>;

/** Versión texto compacta para el contexto del LLM. */
export function snapshotText(s: Snapshot): string {
  const L: string[] = [];
  L.push(`Fecha: ${longDate(s.date)} (${s.date})`);
  L.push(
    "Familia: " +
      s.members.map((m: Member) => `${m.name} (${m.role === "child" ? "niño/a " + ageLabel(m.birthdate) : "adulto"})`).join(", "),
  );
  if (s.day) {
    const w = weatherLabel(s.day.code);
    L.push(`Tiempo: ${w.text}, ${s.day.tMin}°–${s.day.tMax}°, lluvia ${s.day.rainProb}%. Ropa niños: ${kidsOutfit(s.day).join("; ")}`);
  }
  if (s.run) L.push(`Cole: lleva ${s.name(s.run.dropoff_id)}, recoge ${s.name(s.run.pickup_id)}${s.run.note ? ` (${s.run.note})` : ""}`);
  L.push(`Menú del cole: ${s.lunch ?? "sin datos"}${s.dinnerRec ? ` (Cena recomendada *: ${s.dinnerRec})` : ""}`);
  L.push(
    "Agenda: " +
      (s.events.length
        ? s.events.map((e) => `${e.all_day ? "todo el día" : timeOf(e.starts_at)} ${e.title}${e.member_id ? ` [${s.name(e.member_id)}]` : ""}`).join("; ")
        : "nada"),
  );
  L.push("Tareas pendientes: " + (s.tasksDue.map((t) => `${t.title} [${s.name(t.assignee_id)}]`).join("; ") || "ninguna"));
  L.push(
    "Salud próximos 14 días: " +
      (s.health.map((h) => `${h.title} (${s.name(h.member_id)}${h.due_date ? ", " + h.due_date : ""})`).join("; ") || "nada"),
  );
  L.push("Cenas propuestas: " + s.dinners.map((d) => `${d.option === "mambo" ? "Mambo" : "Estándar"}: ${d.title}`).join(" | "));
  L.push("Lista de la compra: " + (s.shopping.filter((i) => !i.checked).map((i) => i.name).join(", ") || "vacía"));
  L.push("Despensa (se acaba): " + (s.pantry.filter((p) => p.status !== "ok").map((p) => p.name).join(", ") || "nada"));
  if (s.birthdays.length) L.push("Cumpleaños hoy: " + s.birthdays.map((m) => m.name).join(", "));
  return L.join("\n");
}

export const today = () => isoDate();
