import "server-only";
import { llm, geminiVision, parseJson } from "./llm";
import { addDays, isoDate } from "./dates";
import { findStoreId, recordReceipt, getStores } from "./repo";
import { q } from "./db";
export type {
  ParsedReceiptItem,
  ParsedReceipt,
  ReceiptReconciliationResult,
  MatchedShoppingItem,
  ParsedReceiptWithMatches,
  ReceiptActionConfig,
  ReceiptExecutionResult,
} from "./receiptShared";
import type {
  ParsedReceiptItem,
  ParsedReceipt,
  ReceiptReconciliationResult,
  MatchedShoppingItem,
  ReceiptActionConfig,
  ReceiptExecutionResult,
} from "./receiptShared";

export function normalizeReceiptDate(raw?: string | null): string {
  if (!raw) return isoDate();
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}`;
  }
  return isoDate();
}

const PERISHABLE_SHELF_LIFE: Record<string, number> = {
  pescado: 2,
  merluza: 2,
  salmon: 2,
  salmón: 2,
  carne: 3,
  pollo: 3,
  ternera: 3,
  cerdo: 3,
  plátano: 3,
  platano: 3,
  fresa: 2,
  fresas: 2,
  leche: 6,
  yogur: 7,
  yogures: 7,
  queso: 8,
  tomate: 5,
  lechuga: 4,
  pan: 2,
  huevos: 14,
  huevo: 14,
  zanahoria: 7,
  calabacín: 5,
  calabacin: 5,
};

export function estimatePerishable(name: string, category: string): { isPerishable: boolean; expiryDays: number } {
  const n = name.toLowerCase();
  const c = category.toLowerCase();

  for (const [key, days] of Object.entries(PERISHABLE_SHELF_LIFE)) {
    if (n.includes(key)) {
      return { isPerishable: true, expiryDays: days };
    }
  }

  if (c.includes("pesca") || c.includes("carne") || c.includes("fruta") || c.includes("verdura") || c.includes("lácteo")) {
    return { isPerishable: true, expiryDays: 4 };
  }

  return { isPerishable: false, expiryDays: 30 };
}

function parseFlexibleNumber(val: any): number {
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).replace(/[^0-9.,]/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function normalizeParsedAiReceipt(rawAi: any, defaultStore: string = "Otros"): ParsedReceipt | null {
  if (!rawAi || typeof rawAi !== "object") return null;
  const root = rawAi.ticket || rawAi.receipt || rawAi;
  const rawItems: any[] =
    root.items ||
    root.productos ||
    root.articulos ||
    root.products ||
    root.line_items ||
    root.lineItems ||
    [];

  const storeName = (root.storeName || root.tienda || root.comercio || root.supermercado || defaultStore || "Otros").trim();
  const date = normalizeReceiptDate(root.date || root.fecha);

  const items: ParsedReceiptItem[] = [];
  for (const i of rawItems) {
    const name = (i.name || i.nombre || i.producto || i.articulo || i.description || i.descripcion || "").trim();
    if (!name) continue;
    const totalPrice = parseFlexibleNumber(i.totalPrice ?? i.price ?? i.precio ?? i.total ?? i.importe);
    const unitPrice = i.unitPrice != null ? parseFlexibleNumber(i.unitPrice) : undefined;
    const category = i.category || i.categoria || "Despensa";
    const perish = estimatePerishable(name, category);

    items.push({
      name,
      quantity: i.quantity ? String(i.quantity) : undefined,
      unitPrice,
      totalPrice,
      category,
      isPerishable: i.isPerishable != null ? Boolean(i.isPerishable) : perish.isPerishable,
      expiryDays: i.expiryDays ? Number(i.expiryDays) : perish.expiryDays,
    });
  }

  const rawTotal = parseFlexibleNumber(root.totalAmount ?? root.total ?? root.importeTotal ?? root.importe_total);
  const itemsTotal = items.reduce((s, it) => s + it.totalPrice, 0);
  const totalAmount = Math.round((rawTotal > 0 ? rawTotal : itemsTotal) * 100) / 100;

  if (items.length > 0 || totalAmount > 0 || (storeName && storeName.toLowerCase() !== "otros")) {
    return {
      storeName: storeName || "Otros",
      date,
      totalAmount,
      items,
    };
  }

  return null;
}

/**
 * Parsea el texto escaneado de un ticket (Mercadona, Carrefour, Lidl)
 * usando IA o heurística inteligente con formato español.
 */
export async function parseReceiptText(rawText: string): Promise<ParsedReceipt> {
  const prompt = [
    {
      role: "system" as const,
      content:
        "Eres un analizador OCR experto de tickets de compra de supermercados españoles (Mercadona, Carrefour, Lidl, Dia, Alcampo). " +
        "Extrae en JSON válido la tienda ('Mercadona', 'Carrefour', 'Lidl' u 'Otros'), la fecha (YYYY-MM-DD), el importe total numérico, " +
        "y la lista 'items' con: 'name' (nombre limpio y claro en español), 'quantity' (opcional), 'unitPrice' (numérico), " +
        "'totalPrice' (numérico), 'category' ('Fruta y Verdura', 'Carnicería', 'Pescadería', 'Lácteos', 'Huevos', 'Panadería', 'Despensa', 'Bebé / Higiene', 'Limpieza'), " +
        "'isPerishable' (true si es fresco que caduca en menos de 10 días), 'expiryDays' (días estimados hasta caducar, ej. 2 para pescado, 3 para pollo, 4 para fruta, 6 para leche).",
    },
    {
      role: "user" as const,
      content: `Analiza este texto de ticket y responde ÚNICAMENTE con un objeto JSON válido:\n\n${rawText}`,
    },
  ];

  const aiResp = await llm(prompt, { timeoutMs: 30_000, json: true });
  const parsedAi = parseJson<any>(aiResp);
  const normalized = normalizeParsedAiReceipt(parsedAi, detectStoreFromText(rawText));

  if (normalized && normalized.items.length > 0) {
    return normalized;
  }

  // Heurística de fallback si la IA no está disponible o no detectó items
  const heuristic = parseReceiptHeuristic(rawText);
  if (normalized && normalized.totalAmount > 0 && heuristic.items.length === 0) {
    return normalized;
  }
  return heuristic;
}

function detectStoreFromText(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("mercadona")) return "Mercadona";
  if (lower.includes("carrefour")) return "Carrefour";
  if (lower.includes("lidl")) return "Lidl";
  if (lower.includes("farmacia")) return "Farmacia";
  if (lower.includes("alcampo")) return "Alcampo";
  if (lower.includes("dia")) return "Dia";
  if (lower.includes("aldi")) return "Aldi";
  if (lower.includes("decathlon")) return "Decathlon";
  if (lower.includes("primor")) return "Primor";
  if (lower.includes("ikea")) return "Ikea";
  if (lower.includes("leroy")) return "Leroy Merlin";
  return "Otros";
}

function parseReceiptHeuristic(text: string): ParsedReceipt {
  const today = isoDate();
  const storeName = detectStoreFromText(text);
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const items: ParsedReceiptItem[] = [];
  let totalAmount = 0;

  for (const line of lines) {
    // Buscar patrones como "PRODUCTO 2.50" o "1 LECHE ENTERA 1.05"
    const match = line.match(/^(.+?)\s+(\d+[.,]\d{2})\s*€?$/);
    if (match) {
      const rawName = match[1].trim();
      const price = parseFloat(match[2].replace(",", "."));

      // Ignorar totales o subtotales
      if (rawName.toLowerCase().includes("total") || rawName.toLowerCase().includes("tarjeta") || rawName.toLowerCase().includes("iva")) {
        if (price > totalAmount) totalAmount = price;
        continue;
      }

      let category = "Despensa";
      const lName = rawName.toLowerCase();
      if (lName.includes("leche") || lName.includes("yogur") || lName.includes("queso")) category = "Lácteos";
      else if (lName.includes("pollo") || lName.includes("carne") || lName.includes("lomo")) category = "Carnicería";
      else if (lName.includes("merluza") || lName.includes("salmon") || lName.includes("pescado")) category = "Pescadería";
      else if (lName.includes("platan") || lName.includes("manzana") || lName.includes("tomate") || lName.includes("zanahoria")) category = "Fruta y Verdura";
      else if (lName.includes("pañal") || lName.includes("toallit") || lName.includes("champu")) category = "Bebé / Higiene";
      else if (lName.includes("huevo")) category = "Huevos";
      else if (lName.includes("pan")) category = "Panadería";
      else if (lName.includes("detergente") || lName.includes("papel")) category = "Limpieza";

      const perish = estimatePerishable(rawName, category);

      items.push({
        name: rawName,
        totalPrice: price,
        unitPrice: price,
        category,
        isPerishable: perish.isPerishable,
        expiryDays: perish.expiryDays,
      });
    }
  }

  if (totalAmount === 0) {
    totalAmount = items.reduce((acc, i) => acc + i.totalPrice, 0);
  }

  return {
    storeName,
    date: today,
    totalAmount: Math.round(totalAmount * 100) / 100,
    items,
  };
}

/**
 * Parsea directamente una foto o imagen de ticket (Mercadona, Carrefour, Lidl, Alcampo u otros)
 * usando Gemini Vision.
 */
export async function parseReceiptImage(base64Image: string, mimeType: string = "image/jpeg"): Promise<ParsedReceipt> {
  const prompt =
    "Eres un analizador OCR visual experto de tickets de compra de comercios y supermercados españoles. " +
    "Analiza la foto del ticket y extrae en JSON:\n" +
    "- 'storeName': el nombre del comercio o supermercado (ej. 'Mercadona', 'Carrefour', 'Lidl', 'Farmacia', 'Alcampo', 'Dia', 'Aldi', 'Decathlon', etc. Si no se distingue claramente el nombre, usa 'Otros')\n" +
    "- 'date': fecha en formato YYYY-MM-DD\n" +
    "- 'totalAmount': importe total numérico\n" +
    "- 'items': lista con 'name' (nombre limpio del producto), 'quantity' (opcional), 'unitPrice' (opcional numérico), " +
    "'totalPrice' (numérico), 'category' ('Fruta y Verdura', 'Carnicería', 'Pescadería', 'Lácteos', 'Huevos', 'Panadería', 'Despensa', 'Bebé / Higiene', 'Limpieza', 'Otros'), " +
    "'isPerishable' (boolean), 'expiryDays' (número de días estimados hasta caducidad, ej. 2 para pescado, 3 para pollo, 4 para fruta, 6 para leche).\n" +
    "Devuelve ÚNICAMENTE el objeto JSON sin texto adicional ni formato markdown.";

  const aiResp = await geminiVision(prompt, base64Image, mimeType, { json: true });
  const parsedAi = parseJson<any>(aiResp);
  const normalized = normalizeParsedAiReceipt(parsedAi);

  if (normalized && normalized.items.length > 0) {
    return normalized;
  }

  // Si falló el JSON pero Gemini Vision devolvió texto con líneas de productos
  if (aiResp && aiResp.length > 20) {
    const fallbackParsed = parseReceiptHeuristic(aiResp);
    if (fallbackParsed.items.length > 0) {
      return {
        ...fallbackParsed,
        storeName: normalized?.storeName !== "Otros" ? (normalized?.storeName || fallbackParsed.storeName) : fallbackParsed.storeName,
        totalAmount: normalized?.totalAmount || fallbackParsed.totalAmount,
      };
    }
  }

  if (normalized && (normalized.items.length > 0 || normalized.totalAmount > 0)) {
    return normalized;
  }

  if (!aiResp) {
    throw new Error(
      "No se pudo procesar la foto con el analizador de visión IA. Comprueba que el ticket esté bien iluminado y enfocado."
    );
  }

  throw new Error(
    "No se han detectado importes ni productos claros en la imagen. Intenta repetir la foto con mayor nitidez o introduce el texto."
  );
}

/**
 * Normaliza nombres de productos quitando marcas y acentos para comparación semántica.
 */
function cleanProductName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(hacendado|carrefour|lidl|aldi|leclerc|bio|pack|extra|clasica|entera|desnatada|fresca|1l|6x1l|1kg|500g|kg|g|ud)\b/gi, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Guarda un ticket procesado en la base de datos, realizando:
 * 1. Registro del ticket y desglose de items
 * 2. Historial de precios por tienda
 * 3. Reconciliación semántica con la lista de la compra pendiente (tacha lo comprado)
 * 4. Actualización del inventario de despensa y nevera a 'ok' con fechas de caducidad
 * 5. Auto-detección y promoción de tiendas si procede
 */
export async function saveProcessedReceipt(parsed: ParsedReceipt, rawText?: string): Promise<ReceiptReconciliationResult> {
  const stores = await getStores();
  const rawStore = (parsed.storeName || "Otros").trim();
  const storeLower = rawStore.toLowerCase();

  // Buscar coincidencia en tiendas existentes
  let matched = stores.find((s) => s.name.toLowerCase() === storeLower);
  if (!matched && storeLower !== "otros") {
    matched = stores.find((s) => storeLower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(storeLower));
  }

  const otrosStore = stores.find((s) => s.name.toLowerCase() === "otros") || { id: 5, name: "Otros" };

  let storeId: number;
  let companyName: string;

  if (matched && matched.name.toLowerCase() !== "otros") {
    storeId = matched.id;
    companyName = matched.name;
  } else {
    storeId = otrosStore.id;
    companyName = rawStore.toLowerCase() === "otros" ? "Otros" : (rawStore.charAt(0).toUpperCase() + rawStore.slice(1));
  }

  const receiptDate = parsed.date || isoDate();

  const items = parsed.items.map((i) => ({
    name: i.name,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    totalPrice: i.totalPrice,
    category: i.category,
    isPerishable: i.isPerishable,
    expiryDate: i.isPerishable && i.expiryDays ? addDays(receiptDate, i.expiryDays) : null,
  }));

  const receiptId = await recordReceipt({
    storeId,
    companyName,
    date: receiptDate,
    totalAmount: parsed.totalAmount,
    rawText: rawText || JSON.stringify(parsed),
    items,
  });

  // Reconciliación semántica con los productos actualmente pendientes en la lista de la compra
  const pendingItems = await q<{ id: number; name: string }>(
    "select id, name from shopping_items where not checked",
  );

  const matchedIds: number[] = [];
  const matchedNames: string[] = [];

  const receiptCleanNames = parsed.items.map((it) => ({
    original: it.name,
    clean: cleanProductName(it.name),
  }));

  for (const pending of pendingItems) {
    const pendingClean = cleanProductName(pending.name);
    if (!pendingClean) continue;

    // Comprobar coincidencia por inclusión de raíz o palabras clave
    const isMatched = receiptCleanNames.some((r) => {
      if (!r.clean) return false;
      if (r.clean.includes(pendingClean) || pendingClean.includes(r.clean)) return true;
      // Comprobar palabras compartidas significativas
      const pWords = pendingClean.split(" ").filter((w) => w.length > 2);
      const rWords = r.clean.split(" ").filter((w) => w.length > 2);
      return pWords.some((pw) => rWords.includes(pw));
    });

    if (isMatched) {
      matchedIds.push(pending.id);
      matchedNames.push(pending.name);
    }
  }

  // Tachar de la lista de la compra los productos reconciliados
  if (matchedIds.length > 0) {
    await q(
      "update shopping_items set checked = true, in_cart = false, checked_at = now() where id = any($1)",
      [matchedIds],
    );
  }

  // Actualizar la despensa con todos los productos del ticket a estado 'ok'
  for (const item of parsed.items) {
    await q(
      `insert into pantry (name, status, updated_at)
       values ($1, 'ok', now())
       on conflict (name) do update set status = 'ok', updated_at = now()`,
      [item.name],
    );
  }

  const remainingItems = pendingItems.filter((p) => !matchedIds.includes(p.id));
  const remainingNames = remainingItems.map((r) => r.name);

  const summaryMessage = `Ticket de ${companyName} procesado (${parsed.totalAmount.toFixed(2)} €). ${matchedNames.length} productos tachados de la lista. Quedan ${remainingNames.length} pendientes. Despensa actualizada con ${parsed.items.length} artículos.`;

  return {
    receiptId: receiptId || 0,
    storeName: companyName,
    totalAmount: parsed.totalAmount,
    matchedCount: matchedNames.length,
    pendingRemainingCount: remainingNames.length,
    matchedNames,
    remainingNames,
    pantryUpdatedCount: parsed.items.length,
    summaryMessage,
  };
}

/**
 * Busca de forma semántica los productos de la lista de la compra pendientes
 * que coinciden con los artículos detectados en el ticket.
 */
export async function findMatchingShoppingItems(
  items: { name: string }[]
): Promise<MatchedShoppingItem[]> {
  const pendingItems = await q<{ id: number; name: string }>(
    "select id, name from shopping_items where not checked"
  );
  if (!pendingItems.length || !items.length) return [];

  const receiptCleanNames = items.map((it) => ({
    original: it.name,
    clean: cleanProductName(it.name),
  }));

  const matches: MatchedShoppingItem[] = [];

  for (const pending of pendingItems) {
    const pendingClean = cleanProductName(pending.name);
    if (!pendingClean) continue;

    const matched = receiptCleanNames.find((r) => {
      if (!r.clean) return false;
      if (r.clean.includes(pendingClean) || pendingClean.includes(r.clean)) return true;
      const pWords = pendingClean.split(" ").filter((w) => w.length > 2);
      const rWords = r.clean.split(" ").filter((w) => w.length > 2);
      return pWords.some((pw) => rWords.includes(pw));
    });

    if (matched) {
      matches.push({
        id: pending.id,
        name: pending.name,
        matchedWith: matched.original,
      });
    }
  }

  return matches;
}

/**
 * Ejecuta en la base de datos únicamente las acciones que el usuario seleccionó
 * en la ventana única de gestión de ticket.
 */
export async function executeReceiptActions(
  parsed: ParsedReceipt,
  config: ReceiptActionConfig,
  rawText?: string
): Promise<ReceiptExecutionResult> {
  const receiptDate = normalizeReceiptDate(parsed.date);
  let receiptId: number | undefined;

  // 1. Guardar en Economía / Gastos si está seleccionado
  if (config.saveExpense) {
    const stores = await getStores();
    const rawStore = (parsed.storeName || "Otros").trim();
    const storeLower = rawStore.toLowerCase();

    let matched = stores.find((s) => s.name.toLowerCase() === storeLower);
    if (!matched && storeLower !== "otros") {
      matched = stores.find((s) => storeLower.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(storeLower));
    }

    const otrosStore = stores.find((s) => s.name.toLowerCase() === "otros") || { id: 5, name: "Otros" };
    let storeId: number;
    let companyName: string;

    if (matched && matched.name.toLowerCase() !== "otros") {
      storeId = matched.id;
      companyName = matched.name;
    } else {
      storeId = otrosStore.id;
      companyName = rawStore.toLowerCase() === "otros" ? "Otros" : (rawStore.charAt(0).toUpperCase() + rawStore.slice(1));
    }

    const items = parsed.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: Number(i.totalPrice) || 0,
      category: i.category,
      isPerishable: Boolean(i.isPerishable),
      expiryDate: i.isPerishable && i.expiryDays ? addDays(receiptDate, i.expiryDays) : null,
    }));

    const recId = await recordReceipt({
      storeId,
      companyName,
      date: receiptDate,
      totalAmount: Math.round((Number(parsed.totalAmount) || 0) * 100) / 100,
      rawText: rawText || JSON.stringify(parsed),
      items,
    });
    if (recId) receiptId = recId;
  }

  // 2. Tachar de la lista de la compra los items seleccionados por el usuario
  let checkedShoppingCount = 0;
  const checkedShoppingNames: string[] = [];
  if (config.shoppingItemIds && config.shoppingItemIds.length > 0) {
    const itemsToMark = await q<{ id: number; name: string }>(
      "select id, name from shopping_items where id = any($1)",
      [config.shoppingItemIds]
    );
    if (itemsToMark.length > 0) {
      await q(
        "update shopping_items set checked = true, in_cart = false, checked_at = now() where id = any($1)",
        [config.shoppingItemIds]
      );
      checkedShoppingCount = itemsToMark.length;
      checkedShoppingNames.push(...itemsToMark.map((i) => i.name));
    }
  }

  // 3. Actualizar despensa si está seleccionado
  let pantryCount = 0;
  if (config.updatePantry && parsed.items.length > 0) {
    for (const item of parsed.items) {
      await q(
        `insert into pantry (name, status, updated_at)
         values ($1, 'ok', now())
         on conflict (name) do update set status = 'ok', updated_at = now()`,
        [item.name.trim()]
      );
    }
    pantryCount = parsed.items.length;
  }

  // 4. Registro de garantía opcional si se especificó
  let warrantyCreated = false;
  if (config.registerWarranty && config.registerWarranty.itemName) {
    await q(
      `insert into warranties (item_name, store_name, purchase_date, warranty_years, price, status, notes)
       values ($1, $2, $3, $4, $5, 'vigente', $6)`,
      [
        config.registerWarranty.itemName,
        parsed.storeName || "Otros",
        receiptDate,
        config.registerWarranty.warrantyYears || 3,
        config.registerWarranty.price || parsed.totalAmount,
        `Registrado automáticamente desde ticket`,
      ]
    );
    warrantyCreated = true;
  }

  const parts: string[] = [];
  if (config.saveExpense) {
    parts.push(`Gasto de ${parsed.storeName} (${parsed.totalAmount.toFixed(2)} €) registrado en Economía`);
  }
  if (checkedShoppingCount > 0) {
    parts.push(`${checkedShoppingCount} productos tachados de la lista de compra (${checkedShoppingNames.join(", ")})`);
  }
  if (pantryCount > 0) {
    parts.push(`Despensa y nevera actualizadas (${pantryCount} artículos puestos a OK)`);
  }
  if (warrantyCreated) {
    parts.push(`Garantía de ${config.registerWarranty?.itemName} archivada (3 años)`);
  }

  const summaryMessage = parts.length > 0
    ? `✅ ¡Acciones completadas! ${parts.join(" · ")}.`
    : "Ticket procesado sin acciones seleccionadas.";

  return {
    receiptId,
    expensesSaved: Boolean(config.saveExpense),
    checkedShoppingCount,
    checkedShoppingNames,
    pantryCount,
    perishablesCount: parsed.items.filter((i) => i.isPerishable).length,
    warrantyCreated,
    summaryMessage,
  };
}

