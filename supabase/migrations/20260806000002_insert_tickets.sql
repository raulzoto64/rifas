-- Insertar directamente los 500 números (evita depender del seed previo)
insert into public.tickets (raffle_id, ticket_number, status)
select r.id, gs, 'available'
from public.raffles r
cross join generate_series(1, r.total_tickets::int) as gs
where r.slug = 'rifa-pro-salud'
on conflict (raffle_id, ticket_number) do nothing;