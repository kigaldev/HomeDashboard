import { describe, it, expect, vi, beforeEach } from "vitest";

const llmMock = vi.hoisted(() => vi.fn());
vi.mock("./llm", () => ({
  llm: llmMock,
  geminiVision: vi.fn(async () => null),
  parseJson: <T,>(s: string | null): T | null => {
    if (!s) return null;
    try {
      return JSON.parse(s) as T;
    } catch {
      return null;
    }
  },
}));
vi.mock("./repo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./repo")>();
  return {
    ...actual,
    findStoreId: vi.fn(async () => null),
    recordReceipt: vi.fn(),
    getStores: vi.fn(async () => []),
  };
});
vi.mock("./db", () => ({ q: vi.fn(async () => []) }));

import { normalizeReceiptDate, estimatePerishable, parseReceiptText } from "./receipts";
import { isoDate } from "./dates";

describe("normalizeReceiptDate", () => {
  it("acepta ISO tal cual", () => {
    expect(normalizeReceiptDate("2026-03-05")).toBe("2026-03-05");
  });
  it("convierte dd/mm/yyyy, dd-mm-yy y dd.mm.yyyy", () => {
    expect(normalizeReceiptDate("5/3/2026")).toBe("2026-03-05");
    expect(normalizeReceiptDate("05-03-26")).toBe("2026-03-05");
    expect(normalizeReceiptDate("15.11.2025")).toBe("2025-11-15");
  });
  it("parsea fechas españolas con hora o texto y no sobreescribe con hoy si es válida", () => {
    expect(normalizeReceiptDate("25/10/2026 18:42:00")).toBe("2026-10-25");
    expect(normalizeReceiptDate("25-10-26 14:30")).toBe("2026-10-25");
    expect(normalizeReceiptDate("25 de octubre de 2026")).toBe("2026-10-25");
    expect(normalizeReceiptDate("25 oct 2026")).toBe("2026-10-25");
  });
  it("vacío o basura → hoy", () => {
    expect(normalizeReceiptDate(null)).toBe(isoDate());
    expect(normalizeReceiptDate("")).toBe(isoDate());
    expect(normalizeReceiptDate("ayer")).toBe(isoDate());
  });
});

describe("estimatePerishable", () => {
  it("por palabra clave", () => {
    expect(estimatePerishable("Merluza fresca", "Despensa")).toEqual({ isPerishable: true, expiryDays: 2 });
    expect(estimatePerishable("LECHE ENTERA", "Despensa")).toEqual({ isPerishable: true, expiryDays: 6 });
  });
  it("por categoría", () => {
    expect(estimatePerishable("Rúcula", "Fruta y Verdura")).toEqual({ isPerishable: true, expiryDays: 4 });
  });
  it("no perecedero", () => {
    expect(estimatePerishable("Arroz", "Despensa")).toEqual({ isPerishable: false, expiryDays: 30 });
  });
});

describe("parseReceiptText", () => {
  beforeEach(() => llmMock.mockReset());

  it("usa la respuesta de la IA normalizando claves en español y números con coma", async () => {
    llmMock.mockResolvedValue(
      JSON.stringify({
        ticket: {
          tienda: "Mercadona",
          fecha: "02/11/2026",
          productos: [
            { nombre: "Leche entera", precio: "1,05 €", categoria: "Lácteos" },
            { nombre: "Arroz", importe: 1.2 },
            { nombre: "" },
          ],
        },
      }),
    );
    const r = await parseReceiptText("lo que sea");
    expect(r.storeName).toBe("Mercadona");
    expect(r.date).toBe("2026-11-02");
    expect(r.items).toHaveLength(2);
    expect(r.items[0].totalPrice).toBe(1.05);
    expect(r.items[0].isPerishable).toBe(true);
    expect(r.items[1].category).toBe("Despensa");
    expect(r.totalAmount).toBe(2.25); // suma de items si no hay total
  });

  it("respeta isPerishable/total de la IA", async () => {
    llmMock.mockResolvedValue(
      JSON.stringify({
        storeName: "Lidl",
        date: "2026-01-02",
        totalAmount: 10,
        items: [{ name: "Leche", totalPrice: 1, isPerishable: false, expiryDays: 3 }],
      }),
    );
    const r = await parseReceiptText("x");
    expect(r.totalAmount).toBe(10);
    expect(r.items[0].isPerishable).toBe(false);
    expect(r.items[0].expiryDays).toBe(3);
  });

  it("sin IA cae a la heurística de líneas", async () => {
    llmMock.mockResolvedValue(null);
    const text = [
      "MERCADONA S.A.",
      "1 LECHE ENTERA 1,05",
      "POLLO ENTERO 5.50 €",
      "DETERGENTE 7,99",
      "TOTAL 14,54",
      "TARJETA 14,54",
    ].join("\n");
    const r = await parseReceiptText(text);
    expect(r.storeName).toBe("Mercadona");
    expect(r.items.map((i) => i.name)).toEqual(["1 LECHE ENTERA", "POLLO ENTERO", "DETERGENTE"]);
    expect(r.items[0].category).toBe("Lácteos");
    expect(r.items[1].category).toBe("Carnicería");
    expect(r.items[2].category).toBe("Limpieza");
    expect(r.totalAmount).toBe(14.54);
    expect(r.date).toBe(isoDate());
  });

  it("heurística: sin línea TOTAL suma los items", async () => {
    llmMock.mockResolvedValue("no es json");
    const r = await parseReceiptText("PAN 1,10\nHUEVOS 2,40");
    expect(r.totalAmount).toBe(3.5);
    expect(r.storeName).toBe("Otros");
  });

  it("ignora líneas de descuentos, promociones y números negativos en la respuesta de la IA", async () => {
    llmMock.mockResolvedValue(
      JSON.stringify({
        storeName: "Carrefour",
        date: "25/10/2026",
        totalAmount: 5.50,
        items: [
          { name: "Snack de queso", totalPrice: 2.50, category: "Lácteos" },
          { name: "DESCUENTO EN 2ª UNIDAD", totalPrice: -1.00, category: "Otros" },
          { name: "DTO CUPON FIDELIDAD", totalPrice: 0, category: "Promociones" },
          { name: "Plátanos", totalPrice: 4.00, category: "Fruta y Verdura" },
        ],
      }),
    );
    const r = await parseReceiptText("ticket raw");
    expect(r.date).toBe("2026-10-25");
    expect(r.items).toHaveLength(2);
    expect(r.items.map((i) => i.name)).toEqual(["Snack de queso", "Plátanos"]);
  });

  it("BUG conocido: 'MEDIA LUNA' se detecta como tienda Dia (includes('dia'))", async () => {
    llmMock.mockResolvedValue(null);
    const r = await parseReceiptText("MEDIA LUNA 3,00");
    // Debería ser "Otros"; se documenta el comportamiento actual.
    expect(r.storeName).toBe("Dia");
  });
});
