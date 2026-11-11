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
  in_cart boolean not null default false,
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
  quantity_level int not null default 100 check (quantity_level >= 0 and quantity_level <= 100),
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
  company_name text,
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

create table if not exists energy_contracts (
  id serial primary key,
  service text not null check (service in ('electricity', 'gas')),
  provider text not null default 'Naturgy',
  tariff_name text not null,
  access_toll text,
  energy_price_kwh numeric(8,4) not null,
  power_p1_kw numeric(8,4),
  power_p2_kw numeric(8,4),
  fixed_monthly_price numeric(8,4),
  contract_date date default current_date,
  active boolean not null default true,
  notes text,
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists family_insurances (
  id serial primary key,
  title text not null,
  category text not null check (category in ('hogar', 'coche', 'salud', 'vida', 'decesos', 'otro')),
  provider text not null,
  policy_number text,
  annual_cost numeric(8,2) not null,
  payment_frequency text default 'anual',
  renewal_date date not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists warranties (
  id serial primary key,
  item_name text not null,
  store_name text,
  purchase_date date not null,
  warranty_years int not null default 3,
  price numeric(8,2),
  status text not null default 'vigente',
  notes text,
  created_at timestamptz not null default now()
);

-- Migraciones seguras para columnas y tiendas actualizadas
alter table school_menu add column if not exists dinner_recommendation text;
alter table receipts add column if not exists company_name text;
alter table members add column if not exists pin text;
alter table members add column if not exists preferred_tab text default 'resumen';
alter table shopping_items add column if not exists in_cart boolean not null default false;
alter table pantry add column if not exists quantity_level int not null default 100;
alter table school_run_defaults add column if not exists pickup_noon_id int references members(id) on delete set null;
alter table school_run_overrides add column if not exists pickup_noon_id int references members(id) on delete set null;
delete from stores where name in ('Eroski', 'BM');

-- Menú escolar Montessori Noviembre 2026 garantizado
insert into school_menu (date, lunch, dinner_recommendation) values
  ('2026-11-02', 'Arroz a la napolitana + Filete de lenguadina a la plancha con ensalada fresca con maíz dulce', 'Verdura Huevos Patatas Fruta'),
  ('2026-11-03', 'Alubias pintas guisadas + Pechuga de pollo al ajillo con patatas dado', 'Verdura Pescado Verdura Lácteos'),
  ('2026-11-04', 'Judías verdes salteadas + Salchichas al horno con ensalada fresca de lechuga con tomate', 'Patatas Carne Pasta Fruta'),
  ('2026-11-05', 'Macarrones con chorizo + Merluza rebozada con limón con ensalada fresca con lechuga y cebolla', 'Verdura Carne Legumbres Fruta'),
  ('2026-11-06', 'Paella de verduras + Jamoncitos de pollo asados con ensalada', 'Verdura Carne Legumbres Fruta'),
  ('2026-11-09', 'Paella mixta + Filetes rusos caseros con parmentier de patata al romero', 'Verdura Pescado Verdura Fruta'),
  ('2026-11-10', 'Lentejas estofadas con verduras + Palometa en salsa con ensalada fresca de lechuga con tomate', 'Verdura Carne Pasta Fruta'),
  ('2026-11-11', 'Crema de verduras (eco.) + Jamoncitos de pollo asados con patatas dado', 'Pasta Pescado Verdura Fruta'),
  ('2026-11-12', 'Patatas a la riojana con chorizo + Huevos revueltos con queso fundido y ensalada fresca', 'Verdura Pescado Arroz Fruta'),
  ('2026-11-13', 'Sopa casera de cocido + Cocido completo con verdura y carne', 'Verdura Huevos Verdura Lácteos'),
  ('2026-11-16', 'Crema de calabacín (eco.) + Macarrones con boloñesa de soja', 'Pasta Carne Verdura Lácteos'),
  ('2026-11-17', 'Alubias estofadas con verduras + Medallón de salmón y calabaza con salsa de tomate', 'Verdura Carne Arroz Fruta'),
  ('2026-11-18', 'Judías verdes con tomate + Tortilla de patatas con ensalada fresca de lechuga con tomate', 'Pasta Carne Legumbres Lácteos'),
  ('2026-11-19', 'Lentejas estofadas con verduras + Delicias de bacalao con ensalada de col', 'Verdura Huevos Pasta Fruta'),
  ('2026-11-20', 'Arroz con salsa de tomate + Pechuga de pollo a la plancha con patatas dado', 'Verdura Pescado Verdura Fruta'),
  ('2026-11-23', 'Crema de zanahoria (eco.) + Merluza rebozada con limón con ensalada fresca con lechuga y zanahoria', 'Verdura Carne Pasta Lácteos'),
  ('2026-11-24', 'Lentejas a la castellana + Tortilla francesa con ensalada fresca con lechuga y cebolla', 'Verdura Carne Patatas Fruta'),
  ('2026-11-25', 'Arroz a la napolitana + Albóndigas veggie a la jardinera con ensalada fresca de lechuga con tomate', 'Verdura Carne Patatas Fruta'),
  ('2026-11-26', 'Sopa casera de cocido + Cocido completo con verdura y carne', 'Verdura Pescado Verdura Fruta'),
  ('2026-11-27', 'Espaguetis con salsa boloñesa + Abadejo al estilo griego con patatas panaderas', 'Verdura Carne Verdura Lácteos'),
  ('2026-11-30', 'Paella de verduras + Jamoncitos de pollo asados al romero con ensalada fresca con maíz dulce', 'Verdura Pescado Legumbres Lácteos')
on conflict (date) do update set lunch=excluded.lunch, dinner_recommendation=excluded.dinner_recommendation;
`;

/**
 * Datos iniciales adaptados a la familia de Kike, Lara, Fabio y Bruno.
 * Supermercados: Mercadona, Carrefour, Lidl, Aldi, E.Leclerc, Farmacia, Otros.
 */
export const SEED_SQL = /* sql */ `
insert into members (id, name, role, color, emoji) values
  (0, 'Ambos', 'adult', '#8b5cf6', '👥')
on conflict (id) do nothing;

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
  ('Aldi', '#00205b', 4),
  ('E.Leclerc', '#0066b3', 5),
  ('Farmacia', '#2bb3a3', 6),
  ('Otros', '#64748b', 99)
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

insert into energy_contracts (service, provider, tariff_name, access_toll, energy_price_kwh, power_p1_kw, power_p2_kw, fixed_monthly_price, notes, metadata) values
  ('electricity', 'Naturgy', 'Tarifa Por Uso Luz', '2.0TD', 0.1230, 0.1230, 0.0615, null,
   'Precio fijo de energía 24h garantizado 12 meses. Potencia P1 (Punta: 08:00-00:00 lun-vie) y P2 (Valle: 00:00-08:00 lun-vie y 24h fines de semana). Carga de VE recomendada en P2 para evitar sobrecostes de potencia y disparos de ICP.',
   '{"ev_recommended_hours": "00:00 - 07:30", "appliances_avoid_hours": ["13:30-15:00", "20:30-22:30"], "battery_kwh_standard": 50, "ev_charger_power_kw": 3.7}'::jsonb),
  ('gas', 'Naturgy', 'Tarifa Por Uso Gas', 'RL.2', 0.0899, null, null, 9.55,
   'Tarifa fija 24h para calefacción de gas y ACS (peaje RL.2). Optimización térmica adaptada a Salamanca: 20°C día y 17.5°C noche. Ventilación óptima de 13:00 a 15:00.',
   '{"comfort_temp": 20.0, "eco_temp": 17.5, "ventilation_hours": "13:00 - 15:00", "boiler_kw_avg": 9.0}'::jsonb)
on conflict do nothing;

insert into family_insurances (title, category, provider, policy_number, annual_cost, payment_frequency, renewal_date, notes) values
  ('Seguro Multirriesgo Hogar', 'hogar', 'Mapfre', 'MAP-HG-884920', 285.00, 'anual', '2027-06-15', 'Continente 180.000€, contenido 45.000€. Asistencia 24h y daños por agua.'),
  ('Póliza Automóvil Todo Riesgo', 'coche', 'Línea Directa', 'LD-AUTO-4921', 440.00, 'anual', '2026-11-20', 'Franquicia 150€. Vehículo de sustitución y lunas sin penalización.'),
  ('Cuadro Médico Familiar', 'salud', 'Sanitas', 'SAN-FAM-9912', 1320.00, 'mensual (110€/mes)', '2027-01-01', 'Sin copagos. Incluye cobertura dental y pediatría integral para Fabio y Bruno.')
on conflict do nothing;

insert into warranties (item_name, store_name, purchase_date, warranty_years, price, notes) values
  ('Lavadora Serie 6 EcoSilence', 'El Corte Inglés', '2024-03-10', 3, 629.00, 'Motor garantizado 10 años por Bosch. Ticket archivado.'),
  ('Frigorífico Combi No Frost', 'MediaMarkt', '2024-05-18', 3, 799.00, 'Garantía oficial hasta mayo 2027.'),
  ('Silla de Paseo Infantil Doble', 'Bebés Victoria', '2025-06-02', 3, 480.00, 'Garantía de chasis y textiles hasta junio 2028.')
on conflict do nothing;
`;
