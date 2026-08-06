-- Generar los 500 números de la rifa que faltaron
select public.create_raffle_tickets(r.id)
from public.raffles r
where r.slug = 'rifa-pro-salud';