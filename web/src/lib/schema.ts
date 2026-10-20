/**
 * Esquema de la base de datos. Idempotente (create … if not exists) para que
 * el arranque lo aplique siempre.
 */
export const SCHEMA_SQL = /* sql */ `
create table if not exists members (
  id serial primary key,
  name text not null,
  role text not null check (role in ('adult','child')),
  birthdate date,
  color text not null default '#7c9cff',
  emoji text not null default '🙂',
  telegram_user_id text,
  allergies text
);

create table if not exists stores (
  id serial primary key,
  name text not null unique,
  color text not null default '#888',
  sort int not null default 0
);

create table if not exists shopping_items (
  id serial primary key,
  name text not null,
  quantity text,
  store_id int references stores(id) on delete set null,
  added_by int references members(id) on delete set null,
  checked boolean not null default false,
  created_at timestamptz not null default now(),
  checked_at timestamptz
);

create table if not exists staples (
  id serial primary key,
  name text not null unique,
  emoji text not null default '🛒',
  store_id int references stores(id) on delete set null
);

create table if not exists pantry (
  id serial primary key,
  name text not null unique,
  status text not null default 'ok' check (status in ('ok','low','out')),
  updated_at timestamptz not null default now()
);

create table if not exists tasks (
  id serial primary key,
  title text not null,
  assignee_id int references members(id) on delete set null,
  due_date date,
  recurrence text check (recurrence in ('daily','weekly','monthly')),
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id serial primary key,
  source text not null default 'manual',
  external_id text unique,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  member_id int references members(id) on delete set null,
  location text
);

create table if not exists school_run_defaults (
  weekday int primary key check (weekday between 1 and 5),
  dropoff_id int references members(id) on delete set null,
  pickup_id int references members(id) on delete set null
);

create table if not exists school_run_overrides (
  date date primary key,
  dropoff_id int references members(id) on delete set null,
  pickup_id int references members(id) on delete set null,
  note text
);

create table if not exists health_items (
  id serial primary key,
  member_id int references members(id) on delete cascade,
  kind text not null check (kind in ('vacuna','pediatra','medicacion','otro')),
  title text not null,
  due_date date,
  notes text,
  done boolean not null default false
);

create table if not exists school_menu (
  date date primary key,
  lunch text not null,
  dinner_recommendation text
);

create table if not exists dinner_plans (
  date date not null,
  option text not null check (option in ('mambo','estandar')),
  title text not null,
  description text,
  chosen boolean not null default false,
  primary key (date, option)
);

create table if not exists briefings (
  id serial primary key,
  kind text not null check (kind in ('evening','morning')),
  for_date date not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists settings (
  key text primary key,
  value text not null
);

create table if not exists receipts (
  id serial primary key,
  store_id int references stores(id) on delete set null,
  date date not null default current_date,
  total_amount numeric(8,2) not null,
  photo_url text,
  raw_text text,
  created_at timestamptz not null default now()
);

create table if not exists receipt_items (
  id serial primary key,
  receipt_id int references receipts(id) on delete cascade,
  name text not null,
  quantity text,
  unit_price numeric(8,2),
  total_price numeric(8,2) not null,
  category text not null default 'general',
  is_perishable boolean not null default false,
  expiry_date date,
  consumed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists price_history (
  id serial primary key,
  item_name text not null,
  store_id int references stores(id) on delete set null,
  price numeric(8,2) not null,
  date date not null default current_date
);

-- Migraciones seguras para columnas y tiendas actualizadas
alter table school_menu add column if not exists dinner_recommendation text;
delete from stores where name in ('Eroski', 'BM');
`;

/**
 * Datos iniciales adaptados a la familia de Kike, Lara, Fabio y Bruno.
 * Supermercados: Mercadona, Carrefour, Lidl, Farmacia.
 */
export const SEED_SQL = /* sql */ `
insert into members (name, role, birthdate, color, emoji) values
  ('Kike', 'adult', '1991-03-13', '#3b82f6', '👨'),
  ('Lara', 'adult', '1999-06-19', '#ec4899', '👩'),
  ('Fabio', 'child', '2023-09-06', '#f59e0b', '🧒'),
  ('Bruno', 'child', '2025-05-22', '#10b981', '👶')
on conflict do nothing;

insert into stores (name, color, sort) values
  ('Mercadona', '#00a650', 1),
  ('Carrefour', '#0055b8', 2),
  ('Lidl', '#e6a100', 3),
  ('Farmacia', '#2bb3a3', 4)
on conflict (name) do update set color=excluded.color, sort=excluded.sort;

insert into staples (name, emoji, store_id)
select s.name, s.emoji, st.id from (values
  ('Leche', '🥛', 'Mercadona'),
  ('Pan', '🥖', 'Lidl'),
  ('Huevos', '🥚', 'Mercadona'),
  ('Fruta variada', '🍎', 'Carrefour'),
  ('Yogures naturales', '🍶', 'Mercadona'),
  ('Pañales para Bruno', '🧷', 'Mercadona'),
  ('Toallitas húmedas', '🧻', 'Mercadona'),
  ('Papel higiénico', '🧻', 'Lidl'),
  ('Verdura fresca', '🥦', 'Carrefour'),
  ('Pescado fresco', '🐟', 'Carrefour'),
  ('Dalsy / Apiretal', '💊', 'Farmacia'),
  ('Suero fisiológico', '💧', 'Farmacia')
) as s(name, emoji, store_name)
left join stores st on st.name = s.store_name
on conflict (name) do nothing;

insert into school_run_defaults (weekday, dropoff_id, pickup_id) values
  (1, 1, 2), (2, 2, 1), (3, 1, 2), (4, 2, 1), (5, 1, 1)
on conflict do nothing;

insert into settings (key, value) values ('family_name', 'Familia Kike y Lara')
on conflict do nothing;
`;
