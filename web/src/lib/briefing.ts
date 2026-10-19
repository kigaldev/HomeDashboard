import "server-only";
import { addDays, isoDate, longDate, timeOf } from "./dates";
import { daySnapshot, snapshotText, type Snapshot } from "./context";
import { llm } from "./llm";
import { saveBriefing } from "./repo";
import { kidsOutfit, weatherLabel } from "./weather";

export type BriefingKind = "evening" | "morning";

/** Plantilla determinista: se usa siempre como base y como respaldo si la IA no está. */
function template(kind: BriefingKind, s: Snapshot): string {
  const L: string[] = [];
  const x = escapeHtml;
  L.push(kind === "morning" ? `☀️ <b>Buenos días</b> · ${longDate(s.date)}` : `🌙 <b>Mañana</b> · ${longDate(s.date)}`);
  if (s.birthdays.length) L.push(`🎂 ¡Hoy es el cumple de ${s.birthdays.map((m) => m.name).join(" y ")}!`);
  if (s.day) {
    const w = weatherLabel(s.day.code);
    L.push(`\n${w.icon} <b>Tiempo:</b> ${w.text}, ${s.day.tMin}° → ${s.day.tMax}°${s.day.rainProb >= 30 ? `, lluvia ${s.day.rainProb}%` : ""}`);
    L.push(`👕 <b>Peques:</b> ${kidsOutfit(s.day).join(" · ")}`);
  }
  if (s.run) L.push(`\n🚸 <b>Cole:</b> lleva ${x(s.name(s.run.dropoff_id))} · recoge ${x(s.name(s.run.pickup_id))}${s.run.note ? ` (${x(s.run.note)})` : ""}`);
  if (s.lunch) L.push(`🍽️ <b>Comen en el cole:</b> ${x(s.lunch)}`);
  if (s.dinnerRec) L.push(`⭐ <b>Cena sugerida (*):</b> ${x(s.dinnerRec)}`);
  L.push(`\n📅 <b>Agenda</b>`);
  if (s.events.length)
    for (const e of s.events)
      L.push(`• ${e.all_day ? "Todo el día" : timeOf(e.starts_at)} — ${x(e.title)}${e.member_id ? ` (${x(s.name(e.member_id))})` : ""}`);
  else L.push("• Día tranquilo, sin citas 🙌");
  if (s.health.length) {
    L.push(`\n🩺 <b>Salud</b>`);
    for (const h of s.health.slice(0, 4)) L.push(`• ${x(h.title)} — ${x(s.name(h.member_id))}${h.due_date ? ` (${h.due_date.slice(8)}/${h.due_date.slice(5, 7)})` : ""}`);
  }
  if (s.tasksDue.length) {
    L.push(`\n✅ <b>Pendiente</b>`);
    for (const t of s.tasksDue.slice(0, 6)) L.push(`• ${x(t.title)} — ${x(s.name(t.assignee_id))}`);
  }
  const mambo = s.dinners.find((d) => d.option === "mambo");
  const std = s.dinners.find((d) => d.option === "estandar");
  L.push(`\n🍲 <b>Cena</b>`);
  if (mambo) L.push(`• Con Mambo: ${x(mambo.title)}`);
  if (std) L.push(`• Estándar: ${x(std.title)}`);
  const pending = s.shopping.filter((i) => !i.checked).length;
  if (pending) L.push(`\n🛒 ${pending} cosas en la lista de la compra`);
  if (kind === "evening") L.push(`\n🎒 Antes de dormir: mochila, ropa preparada y biberón/agua.`);
  return L.join("\n");
}

/**
 * Genera el briefing.
 * - evening: se lanza ~21:30 y prepara el día SIGUIENTE.
 * - morning: se lanza ~7:00 para HOY.
 * La IA local añade una frase de resumen con lo más importante.
 */
export async function generateBriefing(kind: BriefingKind): Promise<string> {
  const date = kind === "evening" ? addDays(isoDate(), 1) : isoDate();
  const s = await daySnapshot(date);
  const base = template(kind, s);

  const intro = await llm(
    [
      {
        role: "system",
        content:
          "Eres el asistente de una familia con dos niños pequeños. Escribe en español, tono cálido y práctico, " +
          "máximo 2 frases y sin emojis al principio. Destaca SOLO lo más importante o lo que requiere preparación " +
          "(lluvia, citas médicas, quién recoge, algo que comprar). No repitas todo el listado.",
      },
      { role: "user", content: `${kind === "morning" ? "Resumen para empezar el día" : "Resumen para preparar mañana"}:\n${snapshotText(s)}` },
    ],
    { timeoutMs: 120_000, temperature: 0.5 },
  );

  const content = intro ? base.replace("\n", `\n<i>${escapeHtml(intro)}</i>\n`) : base;
  await saveBriefing(kind, date, content);
  return content;
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
