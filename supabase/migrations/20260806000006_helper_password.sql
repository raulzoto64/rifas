-- ============================================================
-- Login por número + contraseña para el admin general y los
-- familiares/amigos. El admin general asigna la contraseña.
-- ============================================================
alter table public.helpers add column if not exists password varchar(100);
