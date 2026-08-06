-- Código interno de dispositivo para reconocimiento de visitantes
alter table public.participants add column if not exists client_code uuid;

create unique index if not exists idx_participants_client_code
  on public.participants(client_code) where client_code is not null;

-- Permitir que el código interno se vincule tras identificarse por WhatsApp
drop policy if exists "par_update" on public.participants;
create policy "par_update" on public.participants
  for update using (true) with check (true);