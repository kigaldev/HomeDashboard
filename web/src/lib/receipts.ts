import "server-only";
import { llm, geminiVision, parseJson } from "./llm";
import { addDays, isoDate } from "./dates";
import { findStoreId, recordReceipt, getStores } from "./repo";

export type ParsedReceiptItem = {
  name: string;
  quantity?: string;
  unitPrice?: number;
  totalPrice: number;
  category: string;
  isPerishable: boolean;
  expiryDays?: number;
};

export type ParsedReceipt = {
  storeName: string;
  date: string;
  totalAmount: number;
  items: ParsedReceiptItem[];
  notes?: string;
};

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

/**
 * Parsea el texto escaneado de un ticket (Mercadona, Carrefour, Lidl)
 * usando IA o heurística inteligente con formato español.
 */
export async function parseReceiptText(rawText: string): Promise<ParsedReceipt> {
  const today = isoDate();

  // Intento con LLM local si está disponible
  const prompt = [
    {
      role: "system" as const,
      content:
        "Eres un analizador OCR experto de tickets de compra de supermercados españoles (Mercadona, Carrefour, Lidl). " +
        "Extrae en JSON válido la tienda ('Mercadona', 'Carrefour', 'Lidl' u 'Otros'), la fecha (YYYY-MM-DD), el importe total numérico, " +
        "y la lista de productos con: 'name' (nombre limpio y claro en español), 'quantity' (opcional), 'unitPrice' (numérico), " +
        "'totalPrice' (numérico), 'category' ('Fruta y Verdura', 'Carnicería', 'Pescadería', 'Lácteos', 'Huevos', 'Panadería', 'Despensa', 'Bebé / Higiene', 'Limpieza'), " +
        "'isPerishable' (true si es fresco que caduca en menos de 10 días), 'expiryDays' (días estimados hasta caducar, ej. 2 para pescado, 3 para pollo, 4 para fruta, 6 para leche).",
    },
    {
      role: "user" as const,
      content: `Analiza este texto de ticket y responde SOLO con JSON:\n\n${rawText}`,
    },
  ];

  const aiResp = await llm(prompt, { timeoutMs: 30_000, json: true });
  const parsedAi = parseJson<ParsedReceipt>(aiResp);

  if (parsedAi && parsedAi.items && parsedAi.items.length > 0) {
    return {
      storeName: parsedAi.storeName || detectStoreFromText(rawText),
      date: parsedAi.date || today,
      totalAmount: Number(parsedAi.totalAmount) || parsedAi.items.reduce((s, i) => s + (Number(i.totalPrice) || 0), 0),
      items: parsedAi.items.map((i) => {
        const perish = estimatePerishable(i.name, i.category || "");
        return {
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice ? Number(i.unitPrice) : undefined,
          totalPrice: Number(i.totalPrice) || 0,
          category: i.category || "Despensa",
          isPerishable: i.isPerishable ?? perish.isPerishable,
          expiryDays: i.expiryDays ?? perish.expiryDays,
        };
      }),
    };
  }

  // Heurística de fallback si la IA no está disponible
  return parseReceiptHeuristic(rawText);
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
  const parsedAi = parseJson<ParsedReceipt>(aiResp);

  if (parsedAi && parsedAi.items && parsedAi.items.length > 0) {
    const today = isoDate();
    return {
      storeName: parsedAi.storeName || "Otros",
      date: parsedAi.date || today,
      totalAmount: Number(parsedAi.totalAmount) || parsedAi.items.reduce((s, i) => s + (Number(i.totalPrice) || 0), 0),
      items: parsedAi.items.map((i) => {
        const perish = estimatePerishable(i.name, i.category || "");
        return {
          name: i.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice ? Number(i.unitPrice) : undefined,
          totalPrice: Number(i.totalPrice) || 0,
          category: i.category || "Despensa",
          isPerishable: i.isPerishable ?? perish.isPerishable,
          expiryDays: i.expiryDays ?? perish.expiryDays,
        };
      }),
    };
  }

  return {
    storeName: "Otros",
    date: isoDate(),
    totalAmount: 0,
    items: [],
  };
}

/**
 * Guarda un ticket procesado en la base de datos, actualizando:
 * - Tabla de tickets y desglose de items
 * - Historial de precios para comparación
 * - Estado de la despensa a 'ok'
 * - Tachado de productos de la lista de la compra si estaban pendientes
 * - Auto-detección y promoción de tiendas si una compañía alcanza 3 o más tickets
 */
export async function saveProcessedReceipt(parsed: ParsedReceipt, rawText?: string) {
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

  return receiptId;
}
