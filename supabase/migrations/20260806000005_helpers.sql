-- ============================================================
-- Familiares y amigos (colaboradores) — efecto multiplicador
-- Se registran en el admin con nombre, apellido y celular.
-- Cada uno tiene un enlace único (?ref=...) para vender la rifa.
-- ============================================================

create table if not exists public.helpers (
  id          uuid primary key default uuid_generate_v4(),
  first_name  varchar(100) not null,
  last_name   varchar(100) not null,
  whatsapp    varchar(20) not null,
  link_token  varchar(64) unique not null,
  created_at  timestamptz not null default now()
);

create unique index if not exists idx_helpers_whatsapp on public.helpers(whatsapp);

alter table public.helpers enable row level security;

-- RLS: acceso público (el panel admin usa credenciales anónimas)
drop policy if exists "help_read" on public.helpers;
create policy "help_read" on public.helpers for select using (true);
drop policy if exists "help_insert" on public.helpers;
create policy "help_insert" on public.helpers for insert with check (true);
drop policy if exists "help_update" on public.helpers;
create policy "help_update" on public.helpers for update using (true) with check (true);
drop policy if exists "help_delete" on public.helpers;
create policy "help_delete" on public.helpers for delete using (true);

-- ============================================================
-- Vínculo del boleto con el familiar/amigo que lo vendió
-- ============================================================
alter table public.tickets add column if not exists referred_by uuid references public.helpers(id);

create index if not exists idx_tickets_referred_by on public.tickets(referred_by);

-- ============================================================
-- Habilitar ELIMINACIÓN desde el admin
-- (antes solo había lecturas/inserts/updates)
-- ============================================================
drop policy if exists "tic_delete" on public.tickets;
create policy "tic_delete" on public.tickets for delete using (true);

drop policy if exists "par_delete" on public.participants;
create policy "par_delete" on public.participants for delete using (true);

drop policy if exists "pay_delete" on public.payments;
create policy "pay_delete" on public.payments for delete using (true);
