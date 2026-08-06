-- ============================================================
-- RIFAS PRO SALUD — Esquema de base de datos (Supabase/PostgreSQL)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. RAFFLES — rifas activas/terminadas
-- ============================================================
create table if not exists public.raffles (
  id            uuid primary key default uuid_generate_v4(),
  title         varchar(255) not null,
  slug          varchar(255) unique not null,
  description   text,
  image_url     text,
  ticket_price  numeric(12, 2) not null check (ticket_price > 0),
  total_tickets integer not null check (total_tickets > 0),
  draw_date     timestamptz not null,
  status        varchar(20) not null default 'active'
                  check (status in ('active', 'ended')),
  prize         text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_raffles_status on public.raffles(status);

-- ============================================================
-- 2. PARTICIPANTS
-- ============================================================
create table if not exists public.participants (
  id          uuid primary key default uuid_generate_v4(),
  first_name  varchar(100) not null,
  last_name   varchar(100) not null,
  whatsapp    varchar(20) not null,
  created_at  timestamptz not null default now(),
  unique (whatsapp)
);

create index if not exists idx_participants_whatsapp on public.participants(whatsapp);

-- ============================================================
-- 3. TICKETS (boletos/números por rifa)
-- ============================================================
create table if not exists public.tickets (
  id             uuid primary key default uuid_generate_v4(),
  raffle_id      uuid not null references public.raffles(id) on delete cascade,
  ticket_number  integer not null,
  status         varchar(20) not null default 'available'
                   check (status in ('available', 'reserved', 'paid')),
  participant_id uuid references public.participants(id),
  payment_code   varchar(100),
  created_at     timestamptz not null default now(),
  unique (raffle_id, ticket_number)
);

create index if not exists idx_tickets_raffle_status on public.tickets(raffle_id, status);
create index if not exists idx_tickets_participant on public.tickets(participant_id);
create index if not exists idx_tickets_payment_code on public.tickets(payment_code);

-- ============================================================
-- 4. PAYMENTS (una reserva puede agrupar varios números)
-- ============================================================
create table if not exists public.payments (
  id             uuid primary key default uuid_generate_v4(),
  raffle_id      uuid not null references public.raffles(id) on delete cascade,
  ticket_ids     uuid[] not null,
  participant_id uuid not null references public.participants(id),
  payment_code   varchar(100),
  status         varchar(20) not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  amount_paid    numeric(12, 2) not null,
  created_at     timestamptz not null default now()
);

create index if not exists idx_payments_raffle on public.payments(raffle_id);
create index if not exists idx_payments_participant on public.payments(participant_id);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_code on public.payments(payment_code);

-- ============================================================
-- TRIGGER: genera automáticamente los números de una rifa
-- ============================================================
create or replace function public.create_raffle_tickets(p_raffle_id uuid)
returns void
language plpgsql
as $$
declare
  v_total integer;
  i integer;
begin
  select total_tickets into v_total from public.raffles where id = p_raffle_id;
  for i in 1..v_total loop
    insert into public.tickets (raffle_id, ticket_number, status)
    values (p_raffle_id, i, 'available')
    on conflict do nothing;
  end loop;
end;
$$;

-- ============================================================
-- RLS (Row Level Security) — acceso público de solo lectura/insert
-- ============================================================
alter table public.raffles     enable row level security;
alter table public.participants enable row level security;
alter table public.tickets     enable row level security;
alter table public.payments    enable row level security;

-- raffles: lectura pública, nadie inserta desde la app
drop policy if exists "rai_read" on public.raffles;
create policy "rai_read" on public.raffles for select using (true);

-- participants: lectura + insert público (upsert por whatsapp)
drop policy if exists "par_read" on public.participants;
create policy "par_read" on public.participants for select using (true);
drop policy if exists "par_insert" on public.participants;
create policy "par_insert" on public.participants for insert with check (true);

-- tickets: lectura pública, update del propio usuario/estado
drop policy if exists "tic_read" on public.tickets;
create policy "tic_read" on public.tickets for select using (true);
drop policy if exists "tic_update" on public.tickets;
create policy "tic_update" on public.tickets for update using (true) with check (true);

-- payments: insert/lectura pública (para el flujo de reserva)
drop policy if exists "pay_read" on public.payments;
create policy "pay_read" on public.payments for select using (true);
drop policy if exists "pay_insert" on public.payments;
create policy "pay_insert" on public.payments for insert with check (true);
drop policy if exists "pay_update" on public.payments;
create policy "pay_update" on public.payments for update using (true) with check (true);

-- ============================================================
-- DATOS INICIALES (seed)
-- ============================================================
insert into public.raffles (title, slug, description, image_url, ticket_price, total_tickets, draw_date, status, prize)
values (
  '¡Gran Rifa con 4 Premios!',
  'rifa-pro-salud',
  'Sorteamos 4 espectaculares premios. Transferencia inmediata a los ganadores y el iPhone lo enviamos a cualquier parte del país.',
  'https://images.unsplash.com/photo-1512054502232-10a0a035d672?w=900&h=500&fit=crop&auto=format',
  10, 500, date '2026-08-30' + time '20:00', 'active',
  'iPhone 15 · S/600 · S/300 · Premio Sorpresa'
)
on conflict (slug) do nothing;

-- Generar los 500 números de la rifa inicial
select public.create_raffle_tickets(r.id)
from public.raffles r
where r.slug = 'rifa-pro-salud';