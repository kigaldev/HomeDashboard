import "server-only";
import { askAssistant } from "./assistant";
import { generateBriefing, escapeHtml } from "./briefing";
import { isoDate, parseRelativeDay } from "./dates";
import { addShopping, addTask, findStoreId, getMembers, getOpenTasks, getShopping, getStores, setPantry } from "./repo";

/** Divide "leche, huevos y pan" → ["leche","huevos","pan"] */
function splitItems(s: string): string[] {
  return s
    .split(/,|\by\b|\be\b|\n/i)
    .map((x) => x.trim().replace(/[.!]+$/, ""))
    .filter(Boolean);
}

/**
 * Procesa un mensaje que llega por Telegram (texto o nota de voz ya transcrita).
 * Devuelve la respuesta en HTML de Telegram.
 */
export async function handleBotMessage(text: string, telegramUserId?: string): Promise<string> {
  const members = await getMembers();
  const me = members.find((m) => m.telegram_user_id && m.telegram_user_id === telegramUserId) ?? null;
  const t = text.trim();
  const low = t.toLowerCase();

  // ── Compra: "añade leche, huevos y pan [en mercadona]"
  let m = low.match(/^(?:añade|añadir|apunta|compra|comprar|pon)\s+(.+)$/i);
  if (m) {
    const stores = await getStores();
    let rest = t.slice(t.length - m[1].length);
    const storeId = await findStoreId(rest);
    if (storeId) {
      const st = stores.find((s) => s.id === storeId)!;
      rest = rest.replace(new RegExp(`\\s*(en|de|del|de la)?\\s*(el |la )?${st.name}`, "i"), "");
    }
    rest = rest.replace(/\s*a la (lista|compra)\b/i, "");
    const items = splitItems(rest);
    for (const it of items) await addShopping(it, { storeId, by: me?.id });
    return `🛒 Añadido: <b>${items.map(escapeHtml).join(", ")}</b>`;
  }

  // ── Despensa: "se acaba el aceite" / "no queda leche"
  m = low.match(/^(?:se (?:acaba|está acabando|terminó|ha acabado)|no queda|queda poco|falta)\s+(?:el |la |los |las |de )?(.+)$/i);
  if (m) {
    const out = /no queda|terminó|ha acabado/.test(low);
    for (const it of splitItems(m[1])) await setPantry(it, out ? "out" : "low");
    return `📦 Anotado en despensa y añadido a la compra: <b>${escapeHtml(m[1])}</b>`;
  }

  // ── Ver lista
  if (/^(lista|compra|qué hay que comprar|que hay que comprar)\??$/.test(low)) {
    const items = (await getShopping()).filter((i) => !i.checked);
    return items.length ? `🛒 <b>Lista (${items.length})</b>\n` + items.map((i) => `• ${escapeHtml(i.name)}`).join("\n") : "🛒 La lista está vacía 🎉";
  }

  // ── Tareas: "tarea llamar al pediatra para Mamá mañana"
  m = t.match(/^(?:tarea|recuérdame|recuerdame|recordar)\s+(.+)$/i);
  if (m) {
    let title = m[1];
    const who = members.find((x) => x.role === "adult" && new RegExp(`\\bpara ${x.name}\\b`, "i").test(title));
    if (who) title = title.replace(new RegExp(`\\s*para ${who.name}\\b`, "i"), "");
    const due = parseRelativeDay(title);
    title = title.replace(/\s*(pasado mañana|mañana|hoy|el (lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo))\b/i, "").trim();
    await addTask(title, who?.id ?? me?.id ?? null, due ?? isoDate());
    return `✅ Tarea creada: <b>${escapeHtml(title)}</b>${who ? ` para ${escapeHtml(who.name)}` : ""}${due ? ` (${due})` : ""}`;
  }

  if (/^tareas\??$/.test(low)) {
    const tasks = (await getOpenTasks()).filter((x) => !x.done);
    const name = (id: number | null) => members.find((x) => x.id === id)?.name ?? "ambos";
    return tasks.length ? "✅ <b>Pendientes</b>\n" + tasks.map((x) => `• ${escapeHtml(x.title)} — ${escapeHtml(name(x.assignee_id))}`).join("\n") : "Nada pendiente 🙌";
  }

  if (/^(briefing|resumen|buenos días|buenos dias)$/.test(low)) return generateBriefing("morning");
  if (/^(mañana|resumen de mañana)\??$/.test(low)) return generateBriefing("evening");

  if (/^(\/start|\/help|ayuda)$/.test(low))
    return [
      "👋 <b>Soy el asistente de casa.</b> Puedes decirme:",
      "• <i>añade leche, huevos y pan en Mercadona</i>",
      "• <i>se acaba el aceite</i>",
      "• <i>lista</i> · <i>tareas</i>",
      "• <i>tarea llamar al pediatra para Mamá mañana</i>",
      "• <i>briefing</i> · <i>mañana</i>",
      "• O pregúntame cualquier cosa: <i>¿quién recoge a los peques el jueves?</i>",
      `\nTu ID de Telegram es <code>${escapeHtml(telegramUserId ?? "?")}</code> (ponlo en Ajustes).`,
    ].join("\n");

  // ── Cualquier otra cosa: consulta al Asistente Inteligente
  return escapeHtml(await askAssistant(t));
}
