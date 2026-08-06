# Rifas Pro Salud

Aplicación web para gestión y venta de boletos de rifas con efecto multiplicador.

## Stack
- React 19 + Vite 8 + TypeScript + Tailwind CSS v4
- Backend/Base de datos: Supabase (PostgreSQL)

## Características
- Venta de boletos por números con reserva y confirmación de pago por código único.
- Sistema de familiares/amigos (colaboradores) con enlace personal `?ref=...` para vender con efecto multiplicador.
- Login por número + contraseña: admin general y familiares con acceso a sus propios compradores.
- Panel de administración completo (pagos, tickets, participantes, familiares).

## Configuración
Copiá `.env.example` a `.env` y colocá tus credenciales de Supabase:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Scripts
- `npm run dev` — servidor de desarrollo
- `npm run build` — build de producción
- `npm run preview` — vista previa del build
- `npm run format` — formatear código