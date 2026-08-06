-- Ampliar la rifa a 1000 números (1 a 1000)
update public.raffles
set total_tickets = 1000
where slug = 'rifa-pro-salud';

-- Eliminar boletos existentes y regenerar los 1000
delete from public.tickets
where raffle_id in (select id from public.raffles where slug = 'rifa-pro-salud');

insert into public.tickets (raffle_id, ticket_number, status)
select r.id, gs, 'available'
from public.raffles r
cross join generate_series(1, 1000) as gs
where r.slug = 'rifa-pro-salud'
on conflict (raffle_id, ticket_number) do nothing;