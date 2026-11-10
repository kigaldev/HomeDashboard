import "server-only";
import { runAgentInstruction } from "./assistant";
import { generateBriefing, escapeHtml } from "./briefing";
import { isoDate, parseRelativeDay } from "./dates";
import { addShopping, addTask, findStoreId, getMembers, getOpenTasks, getShopping, getStores, setPantry } from "./repo";
import { parseReceiptImage, saveProcessedReceipt } from "./receipts";

/** Convierte markdown básico (**negrita**, *cursiva*, `código`) a etiquetas HTML seguras para Telegram */
function formatTelegramHtml(text: string): string {
  let s = escapeHtml(text);
  s = s.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");
  s = s.replace(/\*(.*?)\*/g, "<i>$1</i>");
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  return s;
}

/** Divide "leche, huevos y pan" → ["leche","huevos","pan"] */
function splitItems(s: string): string[] {
  return s
    .split(/,|\by\b|\be\b|\n/i)
    .map((x) => x.trim().replace(/^[-*•\d.)\s]+/, "").replace(/[.!]+$/, ""))
    .filter(Boolean);
}

/** Infiere la tienda más idónea para un producto */
function inferStoreId(name: string, stores: { id: number; name: string }[]): number | null {
  const n = name.toLowerCase();
  if (/jeringa|medicamento|paracetamol|ibuprofeno|gasas|tiritas|suero|termómetro|farmacia|crema|vacuna/i.test(n)) {
    const s = stores.find((st) => /farmacia/i.test(st.name));
    if (s) return s.id;
  }
  if (/pepinillos|conserva|conservas|lata|latas|bazar|herramienta/i.test(n)) {
    const s = stores.find((st) => /lidl/i.test(st.name));
    if (s) return s.id;
  }
  if (/fruta|verdura|verduras|piña|fresa|fresas|plátano|platanos|manzana|manzanas|aguacate|ecológico|bio/i.test(n)) {
    const s = stores.find((st) => /carrefour/i.test(st.name));
    if (s) return s.id;
  }
  const mercadona = stores.find((st) => /mercadona/i.test(st.name));
  return mercadona ? mercadona.id : stores[0]?.id ?? null;
}

/**
 * Procesa un mensaje que llega por Telegram (texto o nota de voz ya transcrita).
 * Devuelve la respuesta en HTML de Telegram.
 */
export async function handleBotMessage(text: string, telegramUserId?: string): Promise<string> {
  const members = await getMembers();
  const me = members.find((m) => m.telegram_user_id && m.telegram_user_id === telegramUserId) ?? null;
  // Limpiar menciones de bot (ej. @Kike_pepe_homebot)
  let t = text.replace(/@\w+bot\b/gi, "").trim();
  const low = t.toLowerCase();

  // ── Compra en Bloque / Lista Multilínea (ej. "Pendientes para la compra:\nGarrafas agua\nLeche...")
  const isMultiLineList =
    /^(?:pendientes\s+(?:para\s+)?(?:la\s+)?compra|lista\s+(?:de\s+)?(?:la\s+)?compra|para\s+comprar|a\s+comprar|compra):?\s*$/im.test(
      t.split("\n")[0] || ""
    ) ||
    (/(?:pendientes\s+para\s+la\s+compra|lista\s+de\s+la\s+compra|para\s+la\s+compra)/i.test(low) && t.includes("\n"));

  if (isMultiLineList) {
    const stores = await getStores();
    const rawLines = t.split("\n");
    // Filtrar cabeceras
    const itemLines = rawLines
      .map((l) => l.trim())
      .filter((l) => l && !/^(?:pendientes|lista|para\s+comprar|compra)/i.test(l))
      .map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim())
      .filter(Boolean);

    if (itemLines.length > 0) {
      const addedByStore = new Map<string, string[]>();

      for (const rawItem of itemLines) {
        let cleanItem = rawItem;
        let assignedStoreId = await findStoreId(cleanItem);
        if (assignedStoreId) {
          const st = stores.find((s) => s.id === assignedStoreId);
          if (st) {
            cleanItem = cleanItem.replace(new RegExp(`\\s*(en|de|del|de la)?\\s*(el |la )?${st.name}`, "i"), "").trim();
          }
        } else {
          assignedStoreId = inferStoreId(cleanItem, stores);
        }

        await addShopping(cleanItem, { storeId: assignedStoreId, by: me?.id });
        const stName = stores.find((s) => s.id === assignedStoreId)?.name || "General";
        const currentList = addedByStore.get(stName) || [];
        currentList.push(cleanItem);
        addedByStore.set(stName, currentList);
      }

      const storeSummaries: string[] = [];
      for (const [stName, stItems] of addedByStore.entries()) {
        storeSummaries.push(`<b>${escapeHtml(stName)}</b>:\n• ` + stItems.map(escapeHtml).join(", "));
      }

      return (
        `🛒 <b>¡Anotado! Añadidos ${itemLines.length} productos a la compra:</b>\n\n` +
        storeSummaries.join("\n\n") +
        `\n\n<i>✓ Ya están disponibles en la pestaña Compras del Dashboard.</i>`
      );
    }
  }

  // ── Compra en Línea Simple: "añade leche, huevos y pan [en mercadona]"
  let m = low.match(/^(?:añade|añadir|apunta|compra|comprar|pon)\s+(.+)$/i);
  if (m && !/(?:agenda|calendario|cita|médico|medico|dentista|pediatra|reunión|reunion|evento|tarea|recordar|cole)/i.test(m[1])) {
    const stores = await getStores();
    let rest = t.slice(t.length - m[1].length);
    const storeId = await findStoreId(rest);
    if (storeId) {
      const st = stores.find((s) => s.id === storeId)!;
      rest = rest.replace(new RegExp(`\\s*(en|de|del|de la)?\\s*(el |la )?${st.name}`, "i"), "");
    }
    rest = rest.replace(/\s*a la (lista|compra)\b/i, "");
    const items = splitItems(rest);
    for (const it of items) {
      const targetStore = storeId || inferStoreId(it, stores);
      await addShopping(it, { storeId: targetStore, by: me?.id });
    }
    const storeLabel = storeId ? ` (${stores.find((s) => s.id === storeId)?.name})` : "";
    return [
      `✅ <b>[OK — Procesado en la App]</b>`,
      `🛒 <i>Acción realizada:</i> Añadido a la compra: ${escapeHtml(items.join(", "))}${storeLabel}`,
      ``,
      `🛒 Añadido a la lista de la compra: <b>${items.map(escapeHtml).join(", ")}</b>`,
      ``,
      `📱 <i>Visible en tiempo real en tu pantalla táctil y dashboard.</i>`,
    ].join("\n");
  }

  // ── Despensa: "se acaba el aceite" / "no queda leche"
  m = low.match(/^(?:se (?:acaba|está acabando|terminó|ha acabado)|no queda|queda poco|falta)\s+(?:el |la |los |las |de )?(.+)$/i);
  if (m) {
    const out = /no queda|terminó|ha acabado/.test(low);
    for (const it of splitItems(m[1])) await setPantry(it, out ? "out" : "low");
    return [
      `✅ <b>[OK — Procesado en la App]</b>`,
      `📦 <i>Acción realizada:</i> Despensa: ${escapeHtml(m[1])} marcado como ${out ? "agotado" : "quedando poco"}`,
      ``,
      `📦 Anotado en despensa y añadido a la compra: <b>${escapeHtml(m[1])}</b>`,
      ``,
      `📱 <i>Visible en tiempo real en tu pantalla táctil y dashboard.</i>`,
    ].join("\n");
  }

  // ── Marcar comprado / tachar de la lista: "ya he comprado la leche" / "tachado el pan"
  m = low.match(/^(?:ya he comprado|comprado|comprada|tachad[oa]|marca(?:r)? como comprad[oa])\s+(.+)$/i);
  if (m) {
    const rawItems = splitItems(m[1]);
    const marked: string[] = [];
    for (const item of rawItems) {
      const res = await (await import("./repo")).checkShoppingItemByName(item);
      if (res.matched && res.item) {
        marked.push(res.item.name);
      }
    }
    if (marked.length > 0) {
      return (
        `✅ <b>[OK — Procesado en la App]</b>\n` +
        `🛒 <i>Acción realizada:</i> Marcado como comprado en la app: ${escapeHtml(marked.join(", "))}\n\n` +
        `✓ Tachado(s) de la lista de la compra y stock de despensa restaurado a OK.\n\n` +
        `📱 <i>Visible en tiempo real en tu pantalla táctil y dashboard.</i>`
      );
    }
    return `ℹ️ No encontré ningún producto pendiente en la lista que coincida con: <b>${escapeHtml(rawItems.join(", "))}</b>.`;
  }

  // ── Ver lista
  if (/^(lista|compra|qué hay que comprar|que hay que comprar)\??$/.test(low)) {
    const items = (await getShopping()).filter((i) => !i.checked);
    return items.length ? `🛒 <b>Lista (${items.length})</b>\n` + items.map((i) => `• ${escapeHtml(i.name)}`).join("\n") : "🛒 La lista está vacía 🎉";
  }

  // ── Ver Agenda
  if (/^(agenda|calendario|eventos|qué tenemos hoy|que tenemos hoy|planes)\??$/.test(low)) {
    const today = isoDate();
    const events = await (await import("./repo")).getEventsBetween(today, (await import("./dates")).addDays(today, 7));
    if (events.length === 0) return "📅 No hay eventos previstos para los próximos 7 días en la agenda familiar.";
    const list = events.map((e) => `• <b>${e.starts_at.slice(0, 10)}</b>${e.all_day ? "" : ` ${e.starts_at.slice(11, 16)}`}: ${escapeHtml(e.title)}`).join("\n");
    return `📅 <b>Agenda familiar próximos 7 días:</b>\n\n${list}`;
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
    const assignText = who ? ` para ${escapeHtml(who.name)}` : "";
    const dueText = due ? ` (${due})` : "";
    return [
      `✅ <b>[OK — Procesado en la App]</b>`,
      `✅ <i>Acción realizada:</i> Tarea creada: ${escapeHtml(title)}${assignText}${dueText}`,
      ``,
      `✅ Tarea creada: <b>${escapeHtml(title)}</b>${assignText}${dueText}`,
      ``,
      `📱 <i>Visible en tiempo real en tu pantalla táctil y dashboard.</i>`,
    ].join("\n");
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
      "👋 <b>Soy Pepe, tu asistente de hogar.</b>",
      "Estoy conectado a la aplicación del hogar y ejecuto cambios en tiempo real:",
      "",
      "📅 <b>Agenda familiar:</b>",
      "• <i>Apunta dentista para Lara el viernes a las 17:30</i>",
      "• <i>Pasa la reunión del cole al lunes a las 16:00</i>",
      "• <i>¿Qué tenemos en la agenda esta semana?</i>",
      "",
      "🛒 <b>Lista de la compra y despensa:</b>",
      "• <i>Añade leche y plátanos a Mercadona</i>",
      "• <i>Se ha acabado el aceite en la despensa</i>",
      "• <i>Ya he comprado la leche y los huevos</i>",
      "• <i>¿Qué hay que comprar?</i>",
      "",
      "✅ <b>Tareas del hogar:</b>",
      "• <i>Tarea para Kike: llamar al seguro mañana</i>",
      "• <i>Marca como hecha la tarea de la lavadora</i>",
      "• <i>tareas</i>",
      "",
      "🏫 <b>Colegio y Cenas:</b>",
      "• <i>Mañana Kike lleva a Fabio y Lara lo recoge</i>",
      "• <i>Cenamos la opción Cecotec Mambo</i>",
      "",
      "⚡ <b>Energía:</b>",
      "• <i>¿A qué hora cargo el coche eléctrico?</i>",
      "• <i>¿Cuándo pongo la lavadora?</i>",
      "",
      `Tu ID de Telegram es <code>${escapeHtml(telegramUserId ?? "?")}</code>.`,
    ].join("\n");

  // ── Cualquier otra cosa: consulta al Agente JARVIS con Function Calling nativo
  const result = await runAgentInstruction(t);
  if (result.actionExecuted) {
    const icon = {
      calendar: "📅",
      shopping: "🛒",
      pantry: "📦",
      task: "✅",
      school_run: "🏫",
      dinner: "🍲",
      energy: "⚡",
      info: "ℹ️",
      expense: "💶",
    }[result.actionExecuted.type] || "✅";

    return [
      `✅ <b>[OK — Procesado en la App]</b>`,
      `${icon} <i>Acción realizada:</i> ${escapeHtml(result.actionExecuted.description)}`,
      ``,
      formatTelegramHtml(result.message),
      ``,
      `📱 <i>Visible en tiempo real en tu pantalla táctil y dashboard.</i>`,
    ].join("\n");
  }

  return formatTelegramHtml(result.message);
}

/**
 * Procesa una foto de ticket de compra recibida por Telegram.
 * Convierte a Base64, analiza con Gemini Vision (parseReceiptImage),
 * guarda y concilia automáticamente con la BD (saveProcessedReceipt)
 * y devuelve un resumen formateado en HTML para Telegram.
 */
export async function handleBotPhoto(
  fileUrlOrBuffer: Buffer | string,
  mimeType: string = "image/jpeg",
  caption?: string,
  telegramUserId?: string,
): Promise<string> {
  try {
    let base64: string;
    if (Buffer.isBuffer(fileUrlOrBuffer)) {
      base64 = fileUrlOrBuffer.toString("base64");
    } else if (typeof fileUrlOrBuffer === "string") {
      if (fileUrlOrBuffer.startsWith("http://") || fileUrlOrBuffer.startsWith("https://")) {
        const resp = await fetch(fileUrlOrBuffer);
        if (!resp.ok) {
          throw new Error(`Error descargando la imagen de la URL (${resp.status})`);
        }
        const arr = await resp.arrayBuffer();
        base64 = Buffer.from(arr).toString("base64");
      } else if (fileUrlOrBuffer.startsWith("data:")) {
        const commaIdx = fileUrlOrBuffer.indexOf(",");
        base64 = commaIdx !== -1 ? fileUrlOrBuffer.slice(commaIdx + 1) : fileUrlOrBuffer;
      } else if (fileUrlOrBuffer.startsWith("/") || fileUrlOrBuffer.startsWith("./")) {
        const fs = await import("fs/promises");
        const fileData = await fs.readFile(fileUrlOrBuffer);
        base64 = fileData.toString("base64");
      } else {
        base64 = fileUrlOrBuffer;
      }
    } else {
      throw new Error("Formato de imagen inválido: se esperaba un Buffer o string.");
    }

    const parsed = await parseReceiptImage(base64, mimeType);
    const result = await saveProcessedReceipt(parsed, caption);

    const storeName = result.storeName || parsed.storeName || "Comercio";
    const dateStr = parsed.date || isoDate();
    const totalStr = parsed.totalAmount != null ? `${parsed.totalAmount.toFixed(2)} €` : "0.00 €";

    const lines: string[] = [
      `✅ <b>[OK — Ticket incorporado a la App]</b>`,
      `🧾 <b>Ticket de ${escapeHtml(storeName)}</b>`,
      `📅 <b>Fecha:</b> ${escapeHtml(dateStr)} · <b>Total:</b> ${escapeHtml(totalStr)}`,
    ];

    if (parsed.items && parsed.items.length > 0) {
      lines.push(`\n🛒 <b>Artículos detectados (${parsed.items.length}):</b>`);
      const limit = 25;
      const itemsToShow = parsed.items.slice(0, limit);
      for (const item of itemsToShow) {
        const priceStr = item.totalPrice > 0 ? ` — ${item.totalPrice.toFixed(2)} €` : "";
        const qtyStr = item.quantity ? ` (${escapeHtml(item.quantity)})` : "";
        lines.push(`• ${escapeHtml(item.name)}${qtyStr}${priceStr}`);
      }
      if (parsed.items.length > limit) {
        lines.push(`<i>...y ${parsed.items.length - limit} productos más.</i>`);
      }
    }

    const extra: string[] = [];
    if (result.matchedCount > 0) {
      extra.push(
        `✅ <b>Lista de la compra:</b> ${result.matchedCount} productos tachados (${result.matchedNames.map(escapeHtml).join(", ")}).`
      );
    }
    if (result.pantryUpdatedCount > 0) {
      extra.push(`📦 <b>Despensa:</b> ${result.pantryUpdatedCount} productos actualizados a OK.`);
    }
    if (result.pendingRemainingCount > 0) {
      extra.push(`📝 Quedan <b>${result.pendingRemainingCount}</b> productos pendientes en la lista de la compra.`);
    }

    if (extra.length > 0) {
      lines.push(`\n${extra.join("\n")}`);
    }

    lines.push(`\n📱 <i>Disponible en tiempo real en la pantalla táctil, módulo de Economía y Despensa de la app.</i>`);

    return lines.join("\n");
  } catch (err: any) {
    console.error("[bot] Error procesando ticket:", err);
    return `❌ <b>Error al procesar el ticket:</b> ${escapeHtml(err?.message || "No se ha podido leer la imagen.")}\n\n<i>Asegúrate de que la foto esté bien iluminada y enfocada.</i>`;
  }
}

/**
 * Procesa un archivo o documento (Ticket en PDF o imagen sin comprimir) recibido por Telegram.
 */
export async function handleBotDocument(
  fileUrlOrBuffer: Buffer | string,
  fileName: string = "ticket.pdf",
  mimeType: string = "application/pdf",
  caption?: string,
  telegramUserId?: string,
): Promise<string> {
  try {
    const isPdf = mimeType.toLowerCase().includes("pdf") || fileName.toLowerCase().endsWith(".pdf");

    if (isPdf) {
      let buf: Buffer;
      if (Buffer.isBuffer(fileUrlOrBuffer)) {
        buf = fileUrlOrBuffer;
      } else if (typeof fileUrlOrBuffer === "string") {
        if (fileUrlOrBuffer.startsWith("http://") || fileUrlOrBuffer.startsWith("https://")) {
          const resp = await fetch(fileUrlOrBuffer);
          if (!resp.ok) throw new Error(`Error descargando el PDF de Telegram (${resp.status})`);
          buf = Buffer.from(await resp.arrayBuffer());
        } else {
          const fs = await import("fs/promises");
          buf = await fs.readFile(fileUrlOrBuffer);
        }
      } else {
        throw new Error("Formato de documento inválido");
      }

      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buf });
      const parsedPdf = await parser.getText();
      const text = (parsedPdf.text || "").trim();

      if (text.length < 15) {
        throw new Error("El PDF no contiene texto digital legible. Si es un ticket escaneado como imagen dentro del PDF, prueba a enviarlo como foto normal.");
      }

      const { parseReceiptText } = await import("./receipts");
      const parsed = await parseReceiptText(text);
      const result = await saveProcessedReceipt(parsed, caption || `[Ticket PDF: ${fileName}]`);

      const storeName = result.storeName || parsed.storeName || "Comercio";
      const dateStr = parsed.date || isoDate();
      const totalStr = parsed.totalAmount != null ? `${parsed.totalAmount.toFixed(2)} €` : "0.00 €";

      const lines: string[] = [
        `✅ <b>[OK — Ticket PDF incorporado a la App]</b>`,
        `🧾 <b>Ticket de ${escapeHtml(storeName)}</b>`,
        `📅 <b>Fecha:</b> ${escapeHtml(dateStr)} · <b>Total:</b> ${escapeHtml(totalStr)}`,
      ];

      if (parsed.items && parsed.items.length > 0) {
        lines.push(`\n🛒 <b>Artículos procesados (${parsed.items.length}):</b>`);
        const limit = 25;
        for (const item of parsed.items.slice(0, limit)) {
          const priceStr = item.totalPrice > 0 ? ` — ${item.totalPrice.toFixed(2)} €` : "";
          lines.push(`• ${escapeHtml(item.name)}${priceStr}`);
        }
      }

      if (result.matchedCount > 0) {
        lines.push(`\n✅ <b>Lista de la compra:</b> ${result.matchedCount} productos tachados.`);
      }
      if (result.pantryUpdatedCount > 0) {
        lines.push(`📦 <b>Despensa:</b> ${result.pantryUpdatedCount} productos actualizados a OK.`);
      }

      lines.push(`\n📱 <i>Incorporado al control de gastos y visible en la pantalla táctil del hogar.</i>`);
      return lines.join("\n");
    }

    // Si es un documento de tipo imagen (ej. subido sin comprimir como archivo)
    return await handleBotPhoto(fileUrlOrBuffer, mimeType, caption, telegramUserId);
  } catch (err: any) {
    console.error("[bot] Error procesando documento:", err);
    return `❌ <b>Error al procesar el archivo:</b> ${escapeHtml(err?.message || "No se ha podido procesar el ticket.")}`;
  }
}
