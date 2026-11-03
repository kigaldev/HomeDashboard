import { describe, it, expect, beforeAll } from "vitest";

// VERCEL=1 fuerza PGlite en memoria; sin DATABASE_URL no se toca ningún Postgres real.
process.env.VERCEL = "1";
delete process.env.DATABASE_URL;

describe("repo + db (PGlite en memoria)", () => {
  let repo: typeof import("./repo");
  let db: typeof import("./db");

  beforeAll(async () => {
    db = await import("./db");
    repo = await import("./repo");
    await db.getDb();
  });

  it("aplica esquema y semillas", async () => {
    const members = await repo.getMembers();
    expect(members.length).toBeGreaterThan(0);
    const stores = await repo.getStores();
    expect(stores.length).toBeGreaterThan(0);
  });

  it("addShopping capitaliza, normaliza espacios y evita duplicados", async () => {
    await repo.addShopping("  pan   de   molde ");
    await repo.addShopping("Pan de molde");
    const items = (await repo.getShopping()).filter((i) => i.name === "Pan de molde");
    expect(items).toHaveLength(1);
  });

  it("addShopping ignora cadenas vacías", async () => {
    const before = (await repo.getShopping()).length;
    await repo.addShopping("   ");
    expect((await repo.getShopping()).length).toBe(before);
  });

  it("toggleShopping marca comprado y restablece la despensa", async () => {
    await repo.setPantry("zumo test", "out"); // añade a la compra
    const item = (await repo.getShopping()).find((i) => i.name === "Zumo test");
    expect(item).toBeTruthy();
    await repo.toggleShopping(item!.id);
    const pantry = (await repo.getPantry()).find((p) => p.name === "Zumo test");
    expect(pantry?.status).toBe("ok");
    const after = (await repo.getShopping()).find((i) => i.id === item!.id);
    expect(after?.checked).toBe(true);
  });

  it("findStoreId encuentra tienda por nombre dentro del texto", async () => {
    const stores = await repo.getStores();
    const s = stores[0];
    expect(await repo.findStoreId(`compra en ${s.name.toUpperCase()} hoy`)).toBe(s.id);
    expect(await repo.findStoreId("zzz-no-existe")).toBeNull();
  });

  it("addTask + toggleTask", async () => {
    await repo.addTask("Tarea de prueba", null, "2026-11-03");
    const tasks = await repo.getOpenTasks();
    const t = tasks.find((x) => x.title === "Tarea de prueba");
    expect(t).toBeTruthy();
    await repo.toggleTask(t!.id);
    // las completadas permanecen visibles 12 h, marcadas como done
    const after = (await repo.getOpenTasks()).find((x) => x.id === t!.id);
    expect(after?.done).toBe(true);
  });

  it("syncFrequentStaples auto-promueve productos comprados más de 3 veces en los últimos 30 días", async () => {
    // Verificar deducción de emojis
    expect(repo.inferStapleEmoji("Yogur natural", "Lácteos")).toBe("🥛");
    expect(repo.inferStapleEmoji("Baguette rústica", "Panadería")).toBe("🥖");
    expect(repo.inferStapleEmoji("Pechuga de pollo", "Carnicería")).toBe("🥩");
    expect(repo.inferStapleEmoji("Plátano de Canarias", "Fruta y Verdura")).toBe("🍎");

    const stores = await repo.getStores();
    const storeId = stores[0].id;
    const testItem = "Kéfir ecológico";

    // Registrar 3 compras: aún no debe promoverse (requiere más de 3 veces)
    for (let i = 0; i < 3; i++) {
      await repo.recordReceipt({
        storeId,
        date: "2026-11-01",
        totalAmount: 4.5,
        items: [
          {
            name: testItem,
            totalPrice: 1.5,
            category: "Lácteos",
            isPerishable: true,
          },
        ],
      });
    }

    let currentStaples = await repo.getStaples();
    expect(currentStaples.find((s) => s.name.toLowerCase() === testItem.toLowerCase())).toBeUndefined();

    // 4ª compra: al superar 3 veces en 30 días, recordReceipt ejecuta syncFrequentStaples automáticamente
    await repo.recordReceipt({
      storeId,
      date: "2026-11-02",
      totalAmount: 4.5,
      items: [
        {
          name: testItem,
          totalPrice: 1.5,
          category: "Lácteos",
          isPerishable: true,
        },
      ],
    });

    currentStaples = await repo.getStaples();
    const promoted = currentStaples.find((s) => s.name.toLowerCase() === testItem.toLowerCase());
    expect(promoted).toBeDefined();
    expect(promoted?.emoji).toBe("🥛");
    expect(promoted?.store_id).toBe(storeId);

    // Una llamada adicional no lo duplica ni lo re-promueve
    const secondSync = await repo.syncFrequentStaples();
    expect(secondSync).not.toContain(promoted?.name);
  });

  describe("normalizeItemCanonical", () => {
    it("normaliza nombres crudos, abreviados y marcas a denominaciones canónicas", () => {
      expect(repo.normalizeItemCanonical("BANANA GRANEL")).toBe("Plátano");
      expect(repo.normalizeItemCanonical("Plátanos de Canarias")).toBe("Plátano");
      expect(repo.normalizeItemCanonical("SNACK QUESO CRF 200G")).toBe("Snack de queso");
      expect(repo.normalizeItemCanonical("CLARA LIQUIDA PASTEU")).toBe("Clara de huevo líquida");
      expect(repo.normalizeItemCanonical("Manzana Roja 2 kg")).toBe("Manzana");
      expect(repo.normalizeItemCanonical("MANZANA GOLDEN")).toBe("Manzana");
      expect(repo.normalizeItemCanonical("Leche entera 1L")).toBe("Leche entera");
      expect(repo.normalizeItemCanonical("LECHE ENTERA HACENDADO")).toBe("Leche entera");
      expect(repo.normalizeItemCanonical("Leche semidesnatada")).toBe("Leche semidesnatada");
      expect(repo.normalizeItemCanonical("HUEVOS L 12 UD")).toBe("Huevos");
      expect(repo.normalizeItemCanonical("Huevos camperos")).toBe("Huevos");
      expect(repo.normalizeItemCanonical("Pan de molde blanco")).toBe("Pan de molde");
      expect(repo.normalizeItemCanonical("PAN MOLDE FAMILIAR")).toBe("Pan de molde");
      expect(repo.normalizeItemCanonical("PECHUGA POLLO CORRAL")).toBe("Pechuga de pollo");
      expect(repo.normalizeItemCanonical("Pechuga de pollo filetes")).toBe("Pechuga de pollo");
      expect(repo.normalizeItemCanonical("Arroz redondo 1kg")).toBe("Arroz");
      expect(repo.normalizeItemCanonical("ARROZ EXTRA")).toBe("Arroz");
      expect(repo.normalizeItemCanonical("ACEITE OLIVA VIRGEN EXTRA")).toBe("Aceite de oliva virgen extra");
      expect(repo.normalizeItemCanonical("Aceite de oliva suave 1L")).toBe("Aceite de oliva");
      expect(repo.normalizeItemCanonical("Yogur natural pack 4")).toBe("Yogur natural");
      expect(repo.normalizeItemCanonical("Yogures naturales")).toBe("Yogur natural");
    });
  });

  describe("syncPantryFromReceiptItems y recordReceipt", () => {
    it("solo añade categorías de alimentación a la despensa e ignora descuentos", async () => {
      await repo.recordReceipt({
        storeId: 1,
        date: "25/10/2026",
        totalAmount: 14.5,
        items: [
          { name: "Arroz redondo", totalPrice: 1.2, category: "Despensa", isPerishable: false },
          { name: "Detergente lavadora", totalPrice: 8.5, category: "Limpieza", isPerishable: false },
          { name: "Pañales recién nacido", totalPrice: 6.0, category: "Bebé / Higiene", isPerishable: false },
          { name: "DESCUENTO EN 2ª UNIDAD", totalPrice: -1.2, category: "Descuento", isPerishable: false },
        ],
      });

      const pantry = await repo.getPantry();
      // "Arroz" debe estar en la despensa
      expect(pantry.some((p) => p.name === "Arroz" || p.name === "Arroz redondo")).toBe(true);
      // Ni detergente, ni pañales, ni descuentos deben autollenar la despensa
      expect(pantry.some((p) => p.name.toLowerCase().includes("detergente"))).toBe(false);
      expect(pantry.some((p) => p.name.toLowerCase().includes("pañales"))).toBe(false);
      expect(pantry.some((p) => p.name.toLowerCase().includes("descuento"))).toBe(false);
    });

    it("unifica productos similares en la despensa para no duplicar (ej: Banana vs Plátanos)", async () => {
      // Establecer 'Plátanos' en la despensa como 'low'
      await repo.setPantry("Plátanos", "low");

      // Comprar 'BANANA GRANEL' en un ticket
      await repo.recordReceipt({
        storeId: 1,
        date: "2026-10-25",
        totalAmount: 2.1,
        items: [
          { name: "BANANA GRANEL", totalPrice: 2.1, category: "Fruta y Verdura", isPerishable: true },
        ],
      });

      const pantry = await repo.getPantry();
      const bananaEntries = pantry.filter((p) => /pl[áa]tano|banana/i.test(p.name));
      // Debe haber una única entrada unificada, y su estado debe haber pasado a 'ok'
      expect(bananaEntries).toHaveLength(1);
      expect(bananaEntries[0].status).toBe("ok");
    });

    it("guarda la fecha real de emisión en receipts y price_history", async () => {
      const stores = await repo.getStores();
      const s = stores[0];

      await repo.recordReceipt({
        storeId: s.id,
        date: "25/10/2026 18:45:00",
        totalAmount: 3.5,
        items: [
          { name: "Leche entera fresca", totalPrice: 3.5, category: "Lácteos", isPerishable: true },
        ],
      });

      const receipts = await repo.getReceipts(5);
      const r = receipts.find((x) => x.total_amount === 3.5);
      expect(r).toBeDefined();
      expect(r?.date).toBe("2026-10-25");
    });
  });

  describe("getPriceComparisons con productos compatibles", () => {
    it("agrupa productos equivalentes entre diferentes supermercados (ej: Manzana Roja Lidl vs MANZANA GOLDEN Carrefour)", async () => {
      const stores = await repo.getStores();
      const mercadona = stores.find((s) => s.name === "Mercadona") || stores[0];
      const carrefour = stores.find((s) => s.name === "Carrefour") || stores[1];

      // Insertar en price_history con nombres crudos pero canónicamente idénticos
      await repo.recordReceipt({
        storeId: mercadona.id,
        date: "2026-10-20",
        totalAmount: 1.5,
        items: [
          { name: "Manzana Roja 2 kg", totalPrice: 1.5, unitPrice: 1.5, category: "Fruta y Verdura", isPerishable: true },
        ],
      });

      await repo.recordReceipt({
        storeId: carrefour.id,
        date: "2026-10-22",
        totalAmount: 2.0,
        items: [
          { name: "MANZANA GOLDEN", totalPrice: 2.0, unitPrice: 2.0, category: "Fruta y Verdura", isPerishable: true },
        ],
      });

      const comparisons = await repo.getPriceComparisons();
      const manzanaComp = comparisons.find((c) => c.item_name === "Manzana");

      expect(manzanaComp).toBeDefined();
      expect(manzanaComp?.prices).toHaveLength(2);
      expect(manzanaComp?.best_price).toBe(1.5);
      expect(manzanaComp?.max_price).toBe(2.0);
      expect(manzanaComp?.best_store).toBe(mercadona.name);
      expect(manzanaComp?.savings_percent).toBe(25);
    });
  });
});
