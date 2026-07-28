# Perfumas Admin Guide — Medusa

## First boot

1. Start Postgres (Docker Desktop + `docker compose up -d` in `perfumas-backend/`, **or** set `DATABASE_URL` to Supabase).
2. Copy `apps/backend/.env.template` → `apps/backend/.env` and fill secrets.
3. From `perfumas-backend/`: `npm run backend:dev` (or `cd apps/backend && npm run dev`).
4. Open Admin at http://localhost:9000/app — create the first admin user.

## Catalog

1. From `PERFUMAS-E-COMMERCE/`: `npx tsx scripts/import-catalog.ts`
2. Upload / create products from `scripts/output/catalog-seed.json` via Admin, or extend the seed script to call Admin API.
3. Collections: `perfumeria`, `insumos`, `hogar`, `accesorios`.

## B2B (emprendedores)

1. Admin → Customer Groups → create **emprendedores**.
2. Create a **Price List** (type: override) targeting that group with wholesale prices (default 20% off retail).
3. On each insumo variant, set metadata `min_qty` (e.g. 6).
4. Sales channel **wholesale**: assign insumos (+ optional home/accessories).
5. When a B2B application arrives (`POST /store/perfumas/b2b/register`), review NIT and assign the customer to **emprendedores**.

## Custom builds — fulfillment

Order line items with `metadata.type = "custom_build"` include `build_components` pick list:

- fragrance grams
- bottle
- alcohol
- pheromones
- gift wrap

Admin helper: `GET /admin/perfumas/fulfillment`

## Payments (Colombia)

Configure Wompi or Mercado Pago as a Medusa payment provider module when going live.
Until then, the Next.js checkout records `paymentProviderId` and status `pending_payment`.

## Shipping

Offer:

- Pickup Fontibón
- Pickup Bonanza
- Bogotá delivery
- National shipping

Create matching shipping options in Medusa for region Colombia (COP).

## Price updates

Prefer Medusa Admin over editing Excel once live. Re-run import only for bulk refreshes.
