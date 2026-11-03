import { describe, it, expect, vi, beforeEach } from "vitest";

const runAgentMock = vi.hoisted(() => vi.fn());
const parseReceiptImageMock = vi.hoisted(() => vi.fn());
const saveProcessedReceiptMock = vi.hoisted(() => vi.fn());

vi.mock("./assistant", () => ({
  runAgentInstruction: runAgentMock,
  askAssistant: vi.fn(),
}));

vi.mock("./receipts", () => ({
  parseReceiptImage: parseReceiptImageMock,
  saveProcessedReceipt: saveProcessedReceiptMock,
}));

vi.mock("./repo", () => ({
  getMembers: vi.fn(async () => [
    { id: 1, name: "Kike", role: "adult", telegram_user_id: "123" },
    { id: 2, name: "Lara", role: "adult", telegram_user_id: "456" },
  ]),
  getStores: vi.fn(async () => [
    { id: 1, name: "Mercadona" },
    { id: 2, name: "Carrefour" },
    { id: 3, name: "Lidl" },
  ]),
  getShopping: vi.fn(async () => []),
  getOpenTasks: vi.fn(async () => []),
  findStoreId: vi.fn(async () => null),
  addShopping: vi.fn(),
  addTask: vi.fn(),
  setPantry: vi.fn(),
}));

import { handleBotMessage, handleBotPhoto } from "./bot";

describe("handleBotMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("responde a comandos informativos directamente (/start)", async () => {
    const res = await handleBotMessage("/start", "123");
    expect(res).toContain("Soy Pepe, tu asistente de hogar");
    expect(res).toContain("123");
  });

  it("delega en runAgentInstruction cuando no coincide ninguna regex y formatea acción ejecutada", async () => {
    runAgentMock.mockResolvedValueOnce({
      message: "He añadido **leche y huevos** a la lista.",
      actionExecuted: {
        type: "shopping",
        description: "Añadido a la compra: leche y huevos (Mercadona)",
      },
    });

    const res = await handleBotMessage("¿puedes apuntar leche y huevos porfa?", "123");
    expect(runAgentMock).toHaveBeenCalledWith("¿puedes apuntar leche y huevos porfa?");
    expect(res).toContain("🛒 <i>Acción realizada:</i> Añadido a la compra: leche y huevos (Mercadona)");
    expect(res).toContain("He añadido <b>leche y huevos</b> a la lista.");
  });

  it("devuelve la respuesta normal cuando runAgentInstruction no ejecuta acción", async () => {
    runAgentMock.mockResolvedValueOnce({
      message: "Hoy cenamos **ensalada con pollo** según la planificación.",
      actionExecuted: undefined,
    });

    const res = await handleBotMessage("¿qué cenamos hoy?", "123");
    expect(res).not.toContain("Acción realizada:");
    expect(res).toContain("Hoy cenamos <b>ensalada con pollo</b> según la planificación.");
  });
});

describe("handleBotPhoto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("procesa un Buffer, llama a parseReceiptImage y saveProcessedReceipt, y devuelve resumen completo", async () => {
    const fakeBuffer = Buffer.from("fake-image-bytes");

    parseReceiptImageMock.mockResolvedValueOnce({
      storeName: "Mercadona",
      date: "2026-11-03",
      totalAmount: 18.45,
      items: [
        { name: "Leche entera", totalPrice: 1.05, category: "Lácteos" },
        { name: "Pechuga de pollo", totalPrice: 5.5, category: "Carnicería" },
        { name: "Plátanos", totalPrice: 2.1, category: "Fruta y Verdura" },
      ],
    });

    saveProcessedReceiptMock.mockResolvedValueOnce({
      receiptId: 101,
      storeName: "Mercadona",
      totalAmount: 18.45,
      matchedCount: 2,
      matchedNames: ["Leche entera", "Plátanos"],
      pendingRemainingCount: 3,
      pantryUpdatedCount: 3,
    });

    const reply = await handleBotPhoto(fakeBuffer, "image/jpeg", "Ticket de hoy");

    expect(parseReceiptImageMock).toHaveBeenCalledWith(fakeBuffer.toString("base64"), "image/jpeg");
    expect(saveProcessedReceiptMock).toHaveBeenCalledWith(
      expect.objectContaining({ storeName: "Mercadona", totalAmount: 18.45 }),
      "Ticket de hoy"
    );

    expect(reply).toContain("🧾 <b>Ticket de Mercadona</b>");
    expect(reply).toContain("📅 <b>Fecha:</b> 2026-11-03 · <b>Total:</b> 18.45 €");
    expect(reply).toContain("• Leche entera — 1.05 €");
    expect(reply).toContain("• Pechuga de pollo — 5.50 €");
    expect(reply).toContain("✅ <b>Lista de la compra:</b> 2 productos tachados (Leche entera, Plátanos).");
    expect(reply).toContain("📦 <b>Despensa:</b> 3 productos actualizados a OK.");
    expect(reply).toContain("Quedan <b>3</b> productos pendientes");
  });

  it("acepta una cadena base64 directamente o data URI", async () => {
    const rawBase64 = Buffer.from("test-content").toString("base64");
    const dataUri = `data:image/png;base64,${rawBase64}`;

    parseReceiptImageMock.mockResolvedValueOnce({
      storeName: "Lidl",
      date: "2026-11-03",
      totalAmount: 9.99,
      items: [{ name: "Pan", totalPrice: 0.99 }],
    });

    saveProcessedReceiptMock.mockResolvedValueOnce({
      receiptId: 102,
      storeName: "Lidl",
      totalAmount: 9.99,
      matchedCount: 0,
      matchedNames: [],
      pendingRemainingCount: 0,
      pantryUpdatedCount: 1,
    });

    const reply = await handleBotPhoto(dataUri, "image/png");
    expect(parseReceiptImageMock).toHaveBeenCalledWith(rawBase64, "image/png");
    expect(reply).toContain("Ticket de Lidl");
    expect(reply).toContain("9.99 €");
  });

  it("captura errores de análisis y devuelve un mensaje informativo para Telegram", async () => {
    parseReceiptImageMock.mockRejectedValueOnce(new Error("Imagen borrosa no legible"));

    const reply = await handleBotPhoto(Buffer.from("blur"), "image/jpeg");
    expect(reply).toContain("❌ <b>Error al procesar el ticket:</b> Imagen borrosa no legible");
    expect(reply).toContain("Asegúrate de que la foto esté bien iluminada y enfocada.");
  });
});
