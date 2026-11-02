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
});
