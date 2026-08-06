-- Restaurar los tickets 1 y 2 que fueron borrados por error.
-- Los números de una rifa no se eliminan: solo se liberan (status = available).
insert into public.tickets (raffle_id, ticket_number, status)
select r.id, n, 'available'
from public.raffles r
cross join (values (1), (2)) as v(n)
where r.slug = 'rifa-pro-salud'
on conflict (raffle_id, ticket_number) do nothing;
