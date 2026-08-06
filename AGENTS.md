@AGENTS.md

# Guía del proyecto

Proyecto **Rifas Pro Salud** — aplicación web para gestión y venta de boletos de rifas.

## Stack
- React 19 + Vite 8 + TypeScript + Tailwind CSS v4
- Backend / base de datos: **Supabase** (PostgreSQL)

## Configuración de Supabase

Copiá `.env.example` a `.env` y colocalá tus credenciales:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Las credenciales se obtienen en Supabase Dashboard → Project Settings → API.

### Proyecto actual
- URL: `https://rdwufwadgzrbfwebmkbc.supabase.co`
- Ref: `rdwufwadgzrbfwebmkbc`
- Región (pooler): `aws-1-us-west-2.pooler.supabase.com`
- La conexión directa (`db.<ref>.supabase.co`) es solo IPv6; usar el pooler IPv4 para CLI.

## Base de datos
El esquema vive en `database/schema.sql` y las migraciones en `supabase/migrations/`.
Para aplicar los cambios al proyecto remoto (requiere la contraseña de postgres):

```powershell
supabase db push --db-url "postgresql://postgres.<ref>:<password>@aws-1-us-west-2.pooler.supabase.com:5432/postgres"
```

## Scripts
- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run preview` — vista previa del build
- `npm run format` — formatear código