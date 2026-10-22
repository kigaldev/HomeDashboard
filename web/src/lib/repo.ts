import "server-only";
import { q } from "./db";
import { addDays, isoDate, weekday } from "./dates";

export type Member = {
  id: number;
  name: string;
  role: "adult" | "child";
  birthdate: string | null;
  color: string;
  emoji: string;
  telegram_user_id: string | null;
  allergies: string | null;
  pin?: string | null;
  preferred_tab?: string | null;
};
export type Store = { id: number; name: string; color: string; sort: number };
export type ShoppingItem = {
  id: number; name: string; quantity: string | null; store_id: number | null;
  added_by: number | null; checked: boolean;
};
export type Staple = { id: number; name: string; emoji: string; store_id: number | null };
export type PantryItem = { id: number; name: string; status: "ok" | "low" | "out" };
export type Task = {
  id: number; title: string; assignee_id: number | null; due_date: string | null;
  recurrence: "daily" | "weekly" | "monthly" | null; done: boolean;
};
export type CalEvent = {
  id: number; title: string; starts_at: string; ends_at: string | null; all_day: boolean;
  member_id: number | null; location: string | null; source: string;
};
export type HealthItem = {
  id: number; member_id: number; kind: string; title: string; due_date: string | null; notes: string | null; done: boolean;
};
export type SchoolRun = { dropoff_id: number | null; pickup_id: number | null; note: string | null };
export type DinnerPlan = { option: "mambo" | "estandar"; title: string; description: string | null; chosen: boolean };

export const DEFAULT_MEMBERS: Member[] = [
  { id: 1, name: "Kike", role: "adult", birthdate: "1991-03-13", color: "#3b82f6", emoji: "👨", telegram_user_id: null, allergies: null, preferred_tab: "resumen" },
  { id: 2, name: "Lara", role: "adult", birthdate: "1999-06-19", color: "#ec4899", emoji: "👩", telegram_user_id: null, allergies: null, preferred_tab: "resumen" },
  { id: 3, name: "Fabio", role: "child", birthdate: "2023-09-06", color: "#f59e0b", emoji: "🧒", telegram_user_id: null, allergies: null, preferred_tab: "resumen" },
  { id: 4, name: "Bruno", role: "child", birthdate: "2025-05-22", color: "#10b981", emoji: "👶", telegram_user_id: null, allergies: null, preferred_tab: "resumen" },
];

export const DEFAULT_STORES: Store[] = [
  { id: 1, name: "Mercadona", color: "#00a650", sort: 1 },
  { id: 2, name: "Carrefour", color: "#0055b8", sort: 2 },
  { id: 3, name: "Lidl", color: "#e6a100", sort: 3 },
  { id: 4, name: "Farmacia", color: "#2bb3a3", sort: 4 },
  { id: 5, name: "Otros", color: "#64748b", sort: 99 },
];

// ── Miembros ──────────────────────────────────────────────
export async function getMembers(): Promise<Member[]> {
  const rows = await q<Member>("select id,name,role,birthdate::text,color,emoji,telegram_user_id,allergies,pin,preferred_tab from members order by role, id");
  return rows && rows.length > 0 ? rows : DEFAULT_MEMBERS;
}

export async function updateMember(id: number, f: Partial<Pick<Member, "name" | "birthdate" | "emoji" | "color" | "telegram_user_id" | "allergies" | "pin" | "preferred_tab">>) {
  await q(
    `update members set name=coalesce($2,name), birthdate=$3, emoji=coalesce($4,emoji), color=coalesce($5,color),
     telegram_user_id=$6, allergies=$7, pin=coalesce($8,pin), preferred_tab=coalesce($9,preferred_tab) where id=$1`,
    [id, f.name ?? null, f.birthdate || null, f.emoji ?? null, f.color ?? null, f.telegram_user_id || null, f.allergies || null, f.pin ?? null, f.preferred_tab ?? null],
  );
}

export async function updateMemberPreference(memberId: number, preferredTab: string) {
  await q("update members set preferred_tab = $2 where id = $1", [memberId, preferredTab]);
}

export async function setMemberPin(memberId: number, pin: string) {
  await q("update members set pin = $2 where id = $1", [memberId, pin]);
}

export async function verifyMemberPin(memberId: number, pin: string): Promise<boolean> {
  const rows = await q<{ pin: string | null }>("select pin from members where id = $1", [memberId]);
  if (!rows[0] || !rows[0].pin) return true;
  return rows[0].pin === pin;
}

// ── Compra ────────────────────────────────────────────────
export async function getStores(): Promise<Store[]> {
  const rows = await q<Store>("select * from stores order by sort, name");
  return rows && rows.length > 0 ? rows : DEFAULT_STORES;
}

export const getStaples = () => q<Staple>("select * from staples order by name");

export async function createStaple(name: string, emoji: string = "🛒", storeId?: number | null) {
  const clean = name.trim();
  if (!clean) return;
  await q(
    `insert into staples (name, emoji, store_id)
     values ($1, $2, $3)
     on conflict (name) do update set emoji = excluded.emoji, store_id = coalesce(excluded.store_id, staples.store_id)`,
    [clean, emoji || "🛒", storeId ?? null],
  );
}

export async function deleteStaple(id: number) {
  await q("delete from staples where id = $1", [id]);
}

export async function toggleStapleByName(name: string, emoji: string = "🛒", storeId?: number | null): Promise<boolean> {
  const clean = name.trim();
  if (!clean) return false;
  const existing = await q<{ id: number }>("select id from staples where lower(name) = lower($1)", [clean]);
  if (existing.length > 0) {
    await q("delete from staples where id = $1", [existing[0].id]);
    return false;
  } else {
    await q(
      "insert into staples (name, emoji, store_id) values ($1, $2, $3) on conflict (name) do nothing",
      [clean, emoji, storeId ?? null],
    );
    return true;
  }
}
export const getShopping = () =>
  q<ShoppingItem>(
    `select id,name,quantity,store_id,added_by,checked from shopping_items
     where not checked or checked_at > now() - interval '6 hours'
     order by checked, created_at desc`,
  );

export async function findStoreId(text: string): Promise<number | null> {
  const stores = await getStores();
  const t = text.toLowerCase();
  return stores.find((s) => t.includes(s.name.toLowerCase()))?.id ?? null;
}

export async function addShopping(name: string, opts: { storeId?: number | null; quantity?: string | null; by?: number | null } = {}) {
  const clean = name.trim().replace(/\s+/g, " ");
  if (!clean) return;
  const pretty = clean[0].toUpperCase() + clean.slice(1);
  const exists = await q("select 1 from shopping_items where lower(name)=lower($1) and not checked", [pretty]);
  if (exists.length) return;
  let storeId = opts.storeId ?? null;
  if (storeId == null) {
    const st = await q<{ store_id: number | null }>("select store_id from staples where lower(name)=lower($1)", [pretty]);
    storeId = st[0]?.store_id ?? null;
  }
  await q("insert into shopping_items (name, quantity, store_id, added_by) values ($1,$2,$3,$4)", [
    pretty, opts.quantity ?? null, storeId, opts.by ?? null,
  ]);
}

export async function toggleShopping(id: number) {
  await q(
    "update shopping_items set checked = not checked, checked_at = case when checked then null else now() end where id=$1",
    [id],
  );
  // Al comprar algo de la despensa, vuelve a estado OK
  await q(
    `update pantry set status='ok', updated_at=now()
     where lower(name) in (select lower(name) from shopping_items where id=$1 and checked)`,
    [id],
  );
}
export const deleteShopping = (id: number) => q("delete from shopping_items where id=$1", [id]);
export const clearChecked = () => q("delete from shopping_items where checked");

// ── Despensa ──────────────────────────────────────────────
export const getPantry = () => q<PantryItem>("select id,name,status from pantry order by status desc, name");
export async function setPantry(name: string, status: PantryItem["status"]) {
  const pretty = name.trim()[0].toUpperCase() + name.trim().slice(1);
  await q(
    `insert into pantry (name,status) values ($1,$2)
     on conflict (name) do update set status=excluded.status, updated_at=now()`,
    [pretty, status],
  );
  if (status !== "ok") await addShopping(pretty);
}

// ── Tareas ────────────────────────────────────────────────
export const getOpenTasks = () =>
  q<Task>(
    `select id,title,assignee_id,due_date::text,recurrence,done from tasks
     where not done or done_at > now() - interval '12 hours'
     order by done, due_date nulls last, created_at`,
  );

export async function addTask(title: string, assigneeId: number | null, due: string | null, recurrence: Task["recurrence"] = null) {
  await q("insert into tasks (title, assignee_id, due_date, recurrence) values ($1,$2,$3,$4)", [
    title.trim(), assigneeId, due, recurrence,
  ]);
}

export async function toggleTask(id: number) {
  const [t] = await q<Task>("select id,title,assignee_id,due_date::text,recurrence,done from tasks where id=$1", [id]);
  if (!t) return;
  if (!t.done && t.recurrence) {
    // Recurrente: se marca hecha y se crea la siguiente ocurrencia
    const base = t.due_date ?? isoDate();
    const next = t.recurrence === "daily" ? addDays(base, 1) : t.recurrence === "weekly" ? addDays(base, 7) : addDays(base, 30);
    await addTask(t.title, t.assignee_id, next, t.recurrence);
  }
  await q("update tasks set done = not done, done_at = case when done then null else now() end where id=$1", [id]);
}
export const deleteTask = (id: number) => q("delete from tasks where id=$1", [id]);

// ── Agenda ────────────────────────────────────────────────
export const getEventsBetween = (fromIso: string, toIso: string) =>
  q<CalEvent>(
    `select id,title,starts_at::text,ends_at::text,all_day,member_id,location,source from events
     where starts_at >= ($1::date)::timestamp at time zone 'Europe/Madrid'
       and starts_at <  ($2::date)::timestamp at time zone 'Europe/Madrid'
     order by all_day desc, starts_at`,
    [fromIso, toIso],
  );

export async function addEvent(e: { title: string; date: string; time?: string | null; memberId?: number | null; location?: string | null }) {
  const allDay = !e.time;
  await q(
    `insert into events (title, starts_at, all_day, member_id, location)
     values ($1, ($2::date + coalesce($3::time, '00:00'))::timestamp at time zone 'Europe/Madrid', $4, $5, $6)`,
    [e.title, e.date, e.time || null, allDay, e.memberId ?? null, e.location ?? null],
  );
}

/** Inserta/actualiza eventos que llegan de n8n (Google Calendar / iCloud). */
export async function upsertExternalEvents(
  events: { source: string; external_id: string; title: string; starts_at: string; ends_at?: string | null; all_day?: boolean; member_id?: number | null; location?: string | null }[],
) {
  for (const e of events) {
    await q(
      `insert into events (source, external_id, title, starts_at, ends_at, all_day, member_id, location)
       values ($1,$2,$3,$4,$5,$6,$7,$8)
       on conflict (external_id) do update set title=excluded.title, starts_at=excluded.starts_at,
         ends_at=excluded.ends_at, all_day=excluded.all_day, member_id=excluded.member_id, location=excluded.location`,
      [e.source, e.external_id, e.title, e.starts_at, e.ends_at ?? null, e.all_day ?? false, e.member_id ?? null, e.location ?? null],
    );
  }
}
export const deleteEvent = (id: number) => q("delete from events where id=$1 and source='manual'", [id]);

// ── Cole ──────────────────────────────────────────────────
export async function getSchoolRun(date: string): Promise<SchoolRun | null> {
  const [o] = await q<SchoolRun>("select dropoff_id,pickup_id,note from school_run_overrides where date=$1", [date]);
  if (o) return o;
  const wd = weekday(date);
  if (wd > 5) return null;
  const [d] = await q<SchoolRun>("select dropoff_id,pickup_id,null as note from school_run_defaults where weekday=$1", [wd]);
  return d ?? null;
}
export async function setSchoolRunOverride(date: string, dropoff: number | null, pickup: number | null, note: string | null) {
  await q(
    `insert into school_run_overrides (date,dropoff_id,pickup_id,note) values ($1,$2,$3,$4)
     on conflict (date) do update set dropoff_id=excluded.dropoff_id, pickup_id=excluded.pickup_id, note=excluded.note`,
    [date, dropoff, pickup, note],
  );
}
export const getSchoolRunDefaults = () =>
  q<{ weekday: number; dropoff_id: number | null; pickup_id: number | null }>("select * from school_run_defaults order by weekday");
export async function setSchoolRunDefault(wd: number, dropoff: number | null, pickup: number | null) {
  await q(
    `insert into school_run_defaults (weekday,dropoff_id,pickup_id) values ($1,$2,$3)
     on conflict (weekday) do update set dropoff_id=excluded.dropoff_id, pickup_id=excluded.pickup_id`,
    [wd, dropoff, pickup],
  );
}

export async function getSchoolMenu(date: string): Promise<{ lunch: string; dinner_recommendation: string | null } | null> {
  const [r] = await q<{ lunch: string; dinner_recommendation: string | null }>(
    "select lunch, dinner_recommendation from school_menu where date=$1",
    [date],
  );
  return r ?? null;
}
export const getSchoolMenuRange = (from: string, to: string) =>
  q<{ date: string; lunch: string; dinner_recommendation: string | null }>(
    "select date::text, lunch, dinner_recommendation from school_menu where date between $1 and $2 order by date",
    [from, to],
  );
export async function setSchoolMenu(date: string, lunch: string, dinnerRec: string | null = null) {
  await q(
    `insert into school_menu (date,lunch,dinner_recommendation) values ($1,$2,$3)
     on conflict (date) do update set lunch=excluded.lunch, dinner_recommendation=coalesce(excluded.dinner_recommendation, school_menu.dinner_recommendation)`,
    [date, lunch, dinnerRec],
  );
}

// ── Salud ─────────────────────────────────────────────────
export const getHealthUpcoming = (days = 45) =>
  q<HealthItem>(
    `select id,member_id,kind,title,due_date::text,notes,done from health_items
     where not done and (due_date is null or due_date <= current_date + $1::int)
     order by due_date nulls last`,
    [days],
  );
export async function addHealth(memberId: number, kind: string, title: string, due: string | null, notes: string | null) {
  await q("insert into health_items (member_id,kind,title,due_date,notes) values ($1,$2,$3,$4,$5)", [memberId, kind, title, due, notes]);
}
export const completeHealth = (id: number) => q("update health_items set done=true where id=$1", [id]);

// ── Cenas ─────────────────────────────────────────────────
export const getDinnerPlans = (date: string) =>
  q<DinnerPlan>("select option,title,description,chosen from dinner_plans where date=$1 order by option", [date]);
export async function saveDinnerPlans(date: string, plans: { option: string; title: string; description: string }[]) {
  for (const p of plans) {
    await q(
      `insert into dinner_plans (date,option,title,description) values ($1,$2,$3,$4)
       on conflict (date,option) do update set title=excluded.title, description=excluded.description, chosen=false`,
      [date, p.option, p.title, p.description],
    );
  }
}
export async function chooseDinner(date: string, option: string) {
  await q("update dinner_plans set chosen = (option=$2) where date=$1", [date, option]);
}
export const getRecentDinners = (days = 10) =>
  q<{ title: string }>(
    "select title from dinner_plans where chosen and date >= current_date - $1::int order by date desc",
    [days],
  );

// ── Briefings ─────────────────────────────────────────────
export const getLatestBriefing = () =>
  q<{ kind: string; for_date: string; content: string; created_at: string }>(
    "select kind, for_date::text, content, created_at::text from briefings order by created_at desc limit 1",
  ).then((r) => r[0] ?? null);
export async function saveBriefing(kind: "evening" | "morning", forDate: string, content: string) {
  await q("insert into briefings (kind, for_date, content) values ($1,$2,$3)", [kind, forDate, content]);
}

// ── Ajustes ───────────────────────────────────────────────
export async function getSetting(key: string) {
  const [r] = await q<{ value: string }>("select value from settings where key=$1", [key]);
  return r?.value ?? null;
}
export async function setSetting(key: string, value: string) {
  await q("insert into settings (key,value) values ($1,$2) on conflict (key) do update set value=excluded.value", [key, value]);
}

// ── Tickets, Gastos, Perecederos y Comparador de Precios ──
export type Receipt = {
  id: number;
  store_id: number | null;
  company_name?: string | null;
  store_name?: string;
  store_color?: string;
  date: string;
  total_amount: number;
  photo_url: string | null;
  raw_text: string | null;
  items_count?: number;
};

export type ReceiptItem = {
  id: number;
  receipt_id: number;
  name: string;
  quantity: string | null;
  unit_price: number | null;
  total_price: number;
  category: string;
  is_perishable: boolean;
  expiry_date: string | null;
  consumed: boolean;
};

export type PerishableAlert = {
  id: number;
  name: string;
  expiry_date: string;
  days_left: number;
  category: string;
  store_name: string;
  total_price: number;
  receipt_id: number;
};

export type PriceComparison = {
  item_name: string;
  prices: { store_name: string; store_color: string; price: number; date: string }[];
  best_store: string;
  best_price: number;
  max_price: number;
  savings_percent: number;
};

export type HabitInsight = {
  item_name: string;
  category: string;
  purchase_count: number;
  avg_days_between: number;
  last_purchase_date: string;
  estimated_next_purchase: string;
  days_until_needed: number;
  status: "ok" | "soon" | "overdue";
};

export async function getReceipts(limit = 20): Promise<Receipt[]> {
  return q<Receipt>(
    `select r.id, r.store_id, r.company_name, s.name as store_name, s.color as store_color,
            r.date::text, r.total_amount::float as total_amount, r.photo_url, r.raw_text,
            (select count(*) from receipt_items ri where ri.receipt_id = r.id)::int as items_count
     from receipts r
     left join stores s on s.id = r.store_id
     order by r.date desc, r.created_at desc
     limit $1`,
    [limit],
  );
}

export async function getReceiptItems(receiptId: number): Promise<ReceiptItem[]> {
  return q<ReceiptItem>(
    `select id, receipt_id, name, quantity, unit_price::float, total_price::float,
            category, is_perishable, expiry_date::text, consumed
     from receipt_items
     where receipt_id = $1
     order by is_perishable desc, name`,
    [receiptId],
  );
}

export async function getExpiringPerishables(daysAhead = 7): Promise<PerishableAlert[]> {
  const items = await q<{
    id: number;
    name: string;
    expiry_date: string;
    category: string;
    store_name: string | null;
    total_price: number;
    receipt_id: number;
    days_left: number;
  }>(
    `select ri.id, ri.name, ri.expiry_date::text, ri.category, coalesce(s.name, 'Supermercado') as store_name,
            ri.total_price::float as total_price, ri.receipt_id,
            (ri.expiry_date - current_date)::int as days_left
     from receipt_items ri
     join receipts r on r.id = ri.receipt_id
     left join stores s on s.id = r.store_id
     where ri.is_perishable = true
       and ri.consumed = false
       and ri.expiry_date is not null
       and ri.expiry_date <= current_date + $1::int
     order by ri.expiry_date asc, ri.name asc`,
    [daysAhead],
  );

  return items.map((i) => ({
    ...i,
    store_name: i.store_name || "Supermercado",
  }));
}

export async function markItemConsumed(id: number) {
  await q("update receipt_items set consumed = true where id = $1", [id]);
}

export async function getMonthlyExpenses() {
  const byStore = await q<{ store_name: string; color: string; total: number; count: number }>(
    `select coalesce(s.name, 'Otros') as store_name, coalesce(s.color, '#64748b') as color,
            sum(r.total_amount)::float as total, count(r.id)::int as count
     from receipts r
     left join stores s on s.id = r.store_id
     where r.date >= date_trunc('month', current_date)
     group by s.name, s.color
     order by total desc`,
  );

  const byCategory = await q<{ category: string; total: number }>(
    `select ri.category, sum(ri.total_price)::float as total
     from receipt_items ri
     join receipts r on r.id = ri.receipt_id
     where r.date >= date_trunc('month', current_date)
     group by ri.category
     order by total desc`,
  );

  const [currentMonth] = await q<{ total: number }>(
    "select coalesce(sum(total_amount), 0)::float as total from receipts where date >= date_trunc('month', current_date)",
  );

  const [lastMonth] = await q<{ total: number }>(
    `select coalesce(sum(total_amount), 0)::float as total from receipts
     where date >= date_trunc('month', current_date - interval '1 month')
       and date < date_trunc('month', current_date)`,
  );

  const currentTotal = currentMonth?.total ?? 0;
  const categoriesWithPercent = byCategory.map((c) => ({
    ...c,
    percentage: currentTotal > 0 ? Math.round((c.total / currentTotal) * 100) : 0,
  }));

  return {
    current_month_total: currentTotal,
    last_month_total: lastMonth?.total ?? 0,
    by_store: byStore,
    by_category: categoriesWithPercent,
  };
}

export async function getPriceComparisons(): Promise<PriceComparison[]> {
  const rows = await q<{ item_name: string; store_name: string; store_color: string; price: number; date: string }>(
    `select ph.item_name, s.name as store_name, coalesce(s.color, '#3b82f6') as store_color,
            ph.price::float as price, ph.date::text as date
     from price_history ph
     join stores s on s.id = ph.store_id
     where ph.date >= current_date - 60
     order by ph.item_name, ph.price asc, ph.date desc`,
  );

  // Agrupar por item
  const map = new Map<string, { store_name: string; store_color: string; price: number; date: string }[]>();
  for (const r of rows) {
    const list = map.get(r.item_name) || [];
    // Mantener el más reciente por tienda
    if (!list.some((existing) => existing.store_name === r.store_name)) {
      list.push(r);
    }
    map.set(r.item_name, list);
  }

  const result: PriceComparison[] = [];
  for (const [itemName, prices] of map.entries()) {
    if (prices.length >= 2) {
      const sorted = [...prices].sort((a, b) => a.price - b.price);
      const best = sorted[0];
      const max = sorted[sorted.length - 1];
      const savings = max.price > 0 ? Math.round(((max.price - best.price) / max.price) * 100) : 0;
      result.push({
        item_name: itemName,
        prices: sorted,
        best_store: best.store_name,
        best_price: best.price,
        max_price: max.price,
        savings_percent: savings,
      });
    }
  }

  return result.sort((a, b) => b.savings_percent - a.savings_percent);
}

export async function getShoppingHabits(): Promise<HabitInsight[]> {
  // Analizar compras frecuentes para estimar recurrencia (ej. Leche, Pañales, Huevos)
  const rows = await q<{
    name: string;
    category: string;
    count: number;
    last_date: string;
    first_date: string;
  }>(
    `select ri.name, ri.category, count(*)::int as count,
            max(r.date)::text as last_date, min(r.date)::text as first_date
     from receipt_items ri
     join receipts r on r.id = ri.receipt_id
     group by ri.name, ri.category
     having count(*) >= 2
     order by count desc
     limit 8`,
  );

  const today = isoDate();
  const todayDate = new Date(today);

  return rows.map((r) => {
    const first = new Date(r.first_date);
    const last = new Date(r.last_date);
    const daySpan = Math.max(1, Math.round((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24)));
    const avgDays = Math.max(2, Math.round(daySpan / (r.count - 1)));

    const nextDate = new Date(last);
    nextDate.setDate(nextDate.getDate() + avgDays);
    const estNext = nextDate.toISOString().slice(0, 10);
    const daysUntil = Math.round((nextDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

    let status: HabitInsight["status"] = "ok";
    if (daysUntil <= 1) status = "overdue";
    else if (daysUntil <= 3) status = "soon";

    return {
      item_name: r.name,
      category: r.category,
      purchase_count: r.count,
      avg_days_between: avgDays,
      last_purchase_date: r.last_date,
      estimated_next_purchase: estNext,
      days_until_needed: daysUntil,
      status,
    };
  });
}

const DYNAMIC_STORE_COLORS = [
  "#8b5cf6", // Purple
  "#f97316", // Orange
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#14b8a6", // Teal
  "#84cc16", // Lime
  "#e11d48", // Rose
  "#6366f1", // Indigo
];

/**
 * Detecta si una compañía introducida en "Otros" tiene 3 o más tickets.
 * Si es así, crea automáticamente la nueva tienda y reasigna los tickets y su histórico.
 */
export async function checkAndPromoteCompanyStores(): Promise<string[]> {
  const otrosRows = await q<{ id: number }>("select id from stores where lower(name) = 'otros'");
  const otrosId = otrosRows[0]?.id;
  if (!otrosId) return [];

  const candidates = await q<{ company_name: string; count: number }>(
    `select company_name, count(*)::int as count
     from receipts
     where store_id = $1 and company_name is not null and trim(company_name) != ''
     group by company_name
     having count(*) >= 3`,
    [otrosId],
  );

  if (!candidates || candidates.length === 0) return [];

  const promoted: string[] = [];

  for (const cand of candidates) {
    const rawName = cand.company_name.trim();
    if (!rawName || rawName.toLowerCase() === "otros") continue;

    const storeName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
    const existing = await q<{ id: number }>("select id from stores where lower(name) = lower($1)", [storeName]);
    let storeId: number;

    if (existing.length > 0) {
      storeId = existing[0].id;
    } else {
      const colorIndex = Math.abs(
        storeName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
      ) % DYNAMIC_STORE_COLORS.length;
      const color = DYNAMIC_STORE_COLORS[colorIndex];

      const maxSortRes = await q<{ max_sort: number }>("select coalesce(max(sort), 5) as max_sort from stores where name != 'Otros'");
      const nextSort = (maxSortRes[0]?.max_sort ?? 5) + 1;

      const created = await q<{ id: number }>(
        `insert into stores (name, color, sort)
         values ($1, $2, $3)
         on conflict (name) do update set name = excluded.name
         returning id`,
        [storeName, color, nextSort],
      );
      storeId = created[0]?.id;
    }

    if (storeId) {
      await q(
        `update receipts
         set store_id = $1
         where store_id = $2 and lower(company_name) = lower($3)`,
        [storeId, otrosId, rawName],
      );

      const items = await q<{ name: string }>(
        `select distinct ri.name
         from receipt_items ri
         join receipts r on r.id = ri.receipt_id
         where r.store_id = $1`,
        [storeId],
      );

      for (const item of items) {
        await q(
          `update price_history
           set store_id = $1
           where store_id = $2 and lower(item_name) = lower($3)`,
          [storeId, otrosId, item.name],
        );
      }

      promoted.push(storeName);
    }
  }

  return promoted;
}

export async function recordReceipt(data: {
  storeId: number | null;
  companyName?: string | null;
  date: string;
  totalAmount: number;
  rawText?: string;
  photoUrl?: string;
  items: {
    name: string;
    quantity?: string;
    unitPrice?: number;
    totalPrice: number;
    category: string;
    isPerishable: boolean;
    expiryDate?: string | null;
  }[];
}) {
  const [receipt] = await q<{ id: number }>(
    `insert into receipts (store_id, company_name, date, total_amount, photo_url, raw_text)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [data.storeId, data.companyName ?? null, data.date, data.totalAmount, data.photoUrl ?? null, data.rawText ?? null],
  );

  if (!receipt?.id) return null;
  const receiptId = receipt.id;

  for (const item of data.items) {
    // 1. Guardar línea de ticket
    await q(
      `insert into receipt_items (receipt_id, name, quantity, unit_price, total_price, category, is_perishable, expiry_date)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        receiptId,
        item.name,
        item.quantity ?? null,
        item.unitPrice ?? null,
        item.totalPrice,
        item.category,
        item.isPerishable,
        item.expiryDate ?? null,
      ],
    );

    // 2. Historial de precios si tenemos tienda
    if (data.storeId) {
      await q(
        `insert into price_history (item_name, store_id, price, date)
         values ($1, $2, $3, $4)`,
        [item.name, data.storeId, item.unitPrice ?? item.totalPrice, data.date],
      );
    }

    // 3. Auto-actualización de Despensa a 'ok'
    await q(
      `insert into pantry (name, status, updated_at)
       values ($1, 'ok', now())
       on conflict (name) do update set status = 'ok', updated_at = now()`,
      [item.name],
    );

    // 4. Si estaba en la lista de la compra pendiente, marcarlo como comprado
    await q(
      `update shopping_items
       set checked = true, checked_at = now()
       where not checked and lower(name) = lower($1)`,
      [item.name],
    );
  }

  // 5. Comprobar si corresponde auto-crear nueva tienda por alcanzar 3 tickets
  try {
    await checkAndPromoteCompanyStores();
  } catch (err) {
    console.warn("[repo] Error al comprobar auto-promoción de tiendas:", err);
  }

  return receiptId;
}

/**
 * Semilla de tickets desactivada para permitir al usuario comenzar con inventario limpio.
 */
export async function ensureDemoReceipts() {
  return;
}
