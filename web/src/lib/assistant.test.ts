import { describe, it, expect, vi, beforeEach } from "vitest";

const addEventMock = vi.hoisted(() => vi.fn());
const updateEventMock = vi.hoisted(() => vi.fn());
const deleteEventMock = vi.hoisted(() => vi.fn());
const findEventsByQueryMock = vi.hoisted(() => vi.fn());
const addTaskMock = vi.hoisted(() => vi.fn());
const completeTaskByQueryMock = vi.hoisted(() => vi.fn());
const addShoppingMock = vi.hoisted(() => vi.fn());
const setPantryMock = vi.hoisted(() => vi.fn());
const checkShoppingItemByNameMock = vi.hoisted(() => vi.fn());
const setSchoolRunOverrideMock = vi.hoisted(() => vi.fn());
const chooseDinnerMock = vi.hoisted(() => vi.fn());

vi.mock("./repo", () => ({
  getMembers: vi.fn(async () => [
    { id: 1, name: "Kike", role: "adult" },
    { id: 2, name: "Lara", role: "adult" },
    { id: 3, name: "Fabio", role: "child" },
    { id: 4, name: "Bruno", role: "child" },
  ]),
  getStores: vi.fn(async () => [
    { id: 1, name: "Mercadona" },
    { id: 2, name: "Carrefour" },
    { id: 3, name: "Lidl" },
    { id: 4, name: "Farmacia" },
  ]),
  getEventsBetween: vi.fn(async () => []),
  getSchoolMenuRange: vi.fn(async () => []),
  getOpenTasks: vi.fn(async () => []),
  getShopping: vi.fn(async () => []),
  getPantry: vi.fn(async () => []),
  getEnergyContracts: vi.fn(async () => []),
  addEvent: addEventMock,
  updateEvent: updateEventMock,
  deleteEvent: deleteEventMock,
  findEventsByQuery: findEventsByQueryMock,
  addTask: addTaskMock,
  completeTaskByQuery: completeTaskByQueryMock,
  deleteTaskByQuery: vi.fn(),
  findTasksByQuery: vi.fn(async () => []),
  addShopping: addShoppingMock,
  setPantry: setPantryMock,
  checkShoppingItemByName: checkShoppingItemByNameMock,
  setSchoolRunOverride: setSchoolRunOverrideMock,
  chooseDinner: chooseDinnerMock,
  upsertEnergyContract: vi.fn(),
}));

vi.mock("./context", () => ({
  daySnapshot: vi.fn(async () => ({ day: "2026-11-03" })),
  snapshotText: vi.fn(() => "Contexto del hogar"),
}));

const llmWithToolsMock = vi.hoisted(() => vi.fn());
const llmToolFollowUpMock = vi.hoisted(() => vi.fn());
const llmMock = vi.hoisted(() => vi.fn());

vi.mock("./llm", () => ({
  llmWithTools: llmWithToolsMock,
  llmToolFollowUp: llmToolFollowUpMock,
  llm: llmMock,
  parseJson: (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  },
}));

import { JARVIS_TOOLS, runAgentInstruction } from "./assistant";

describe("JARVIS Assistant & Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    llmWithToolsMock.mockReset();
    llmMock.mockReset();
    llmToolFollowUpMock.mockReset();
  });

  it("define el catálogo formal de herramientas JARVIS_TOOLS", () => {
    const names = JARVIS_TOOLS.map((t) => t.name);
    expect(names).toContain("create_calendar_event");
    expect(names).toContain("update_calendar_event");
    expect(names).toContain("delete_calendar_event");
    expect(names).toContain("get_calendar_events");
    expect(names).toContain("create_task");
    expect(names).toContain("complete_task");
    expect(names).toContain("add_shopping_items");
    expect(names).toContain("mark_shopping_items_bought");
    expect(names).toContain("update_pantry");
    expect(names).toContain("set_school_run");
    expect(names).toContain("set_dinner");
  });

  it("procesa compra inmediata mediante heurística rápida con tienda", async () => {
    const res = await runAgentInstruction("añade leche entera y yogures a mercadona");
    expect(addShoppingMock).toHaveBeenCalledTimes(2);
    expect(res.actionExecuted?.type).toBe("shopping");
    expect(res.actionExecuted?.ok).toBe(true);
    expect(res.actionExecuted?.description).toContain("Mercadona");
    expect(res.message).toContain("leche entera, yogures");
  });

  it("procesa despensa agotada y añade a la compra para reponer", async () => {
    const res = await runAgentInstruction("se ha acabado el aceite de oliva");
    expect(setPantryMock).toHaveBeenCalledWith("aceite de oliva", "out");
    expect(res.actionExecuted?.type).toBe("pantry");
    expect(res.actionExecuted?.ok).toBe(true);
    expect(res.message).toContain("agotado");
  });

  it("ejecuta create_calendar_event cuando Gemini devuelve la llamada a la herramienta", async () => {
    llmWithToolsMock.mockResolvedValueOnce({
      toolCalls: [
        {
          name: "create_calendar_event",
          args: {
            title: "Cita dentista",
            date: "2026-11-06",
            time: "17:30",
            member_name: "Lara",
            location: "Clínica Dental",
          },
        },
      ],
    });

    const res = await runAgentInstruction("Apunta dentista para Lara el viernes a las 17:30 en la clínica");
    expect(addEventMock).toHaveBeenCalledWith({
      title: "Cita dentista",
      date: "2026-11-06",
      time: "17:30",
      memberId: 2,
      location: "Clínica Dental",
    });
    expect(res.actionExecuted?.type).toBe("calendar");
    expect(res.actionExecuted?.ok).toBe(true);
    expect(res.message).toContain("17:30");
  });

  it("ejecuta complete_task cuando se marca una tarea como completada", async () => {
    llmWithToolsMock.mockResolvedValueOnce({
      toolCalls: [
        {
          name: "complete_task",
          args: {
            search_title: "lavadora",
          },
        },
      ],
    });
    completeTaskByQueryMock.mockResolvedValueOnce({
      success: true,
      task: { id: 10, title: "Poner lavadora blanca", done: true },
    });

    const res = await runAgentInstruction("Ya he puesto la lavadora");
    expect(completeTaskByQueryMock).toHaveBeenCalledWith("lavadora");
    expect(res.actionExecuted?.type).toBe("task");
    expect(res.actionExecuted?.ok).toBe(true);
    expect(res.message).toContain("Poner lavadora blanca");
  });

  it("ejecuta mark_shopping_items_bought cuando se compran productos de la lista", async () => {
    llmWithToolsMock.mockResolvedValueOnce({
      toolCalls: [
        {
          name: "mark_shopping_items_bought",
          args: {
            items: ["leche", "huevos"],
          },
        },
      ],
    });
    checkShoppingItemByNameMock.mockImplementation(async (name: string) => ({
      matched: true,
      item: { id: 1, name, checked: true },
    }));

    const res = await runAgentInstruction("Hemos comprado la leche y los huevos");
    expect(checkShoppingItemByNameMock).toHaveBeenCalledWith("leche");
    expect(checkShoppingItemByNameMock).toHaveBeenCalledWith("huevos");
    expect(res.actionExecuted?.type).toBe("shopping");
    expect(res.actionExecuted?.ok).toBe(true);
    expect(res.message).toContain("leche, huevos");
  });

  it("devuelve la respuesta conversacional normal cuando no hay llamadas a herramientas", async () => {
    llmWithToolsMock.mockResolvedValueOnce({
      text: "Hoy para comer en el cole hay lentejas y de cena toca tortilla de patatas.",
    });

    const res = await runAgentInstruction("¿Qué come hoy Fabio?");
    expect(res.actionExecuted).toBeUndefined();
    expect(res.message).toContain("lentejas");
  });
});
