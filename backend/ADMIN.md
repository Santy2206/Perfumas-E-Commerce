# Perfumas Admin Guide — Medusa

## First boot

1. Set `DATABASE_URL` in `apps/backend/.env` to your **Supabase Postgres URI** (`postgresql://...`), **or** run `docker compose up -d` from this `backend/` folder for local Postgres.
2. Copy `apps/backend/.env.template` → `apps/backend/.env` if the file is missing, and fill secrets.
3. From `PERFUMAS-E-COMMERCE/`: `npm run backend:dev` (or from this folder: `npm run backend:dev` / `cd apps/backend && npm run dev`).
4. Open Admin at http://localhost:9000/app — create the first admin user.
5. Seed Colombia/COP, shipping, catalog, publishable key, and B2B:
   - From `PERFUMAS-E-COMMERCE/`: `npm run catalog:export` (if needed), then `npm run backend:seed`
   - Or from `apps/backend/`: `npm run seed`
   - Copy `PUBLISHABLE_KEY` from the log (or `apps/backend/.seed-output.json`) into storefront `.env.local`.

## Catalog

1. From `PERFUMAS-E-COMMERCE/`: `npx tsx scripts/import-catalog.ts` (or `npm run catalog:export`)
2. Prefer `npm run backend:seed` to create collections + products from `scripts/output/catalog-seed.json`.
3. Collections: `perfumeria`, `insumos`, `hogar`, `accesorios`.

## B2B (emprendedores)

1. Admin → Customer Groups → **emprendedores** (created by `npm run backend:seed`).
2. Create a **Price List** (type: override) targeting that group with wholesale prices (seed creates **Wholesale emprendedores**).
3. On each insumo variant, set metadata `min_qty` (e.g. 6) — already seeded from catalog.
4. Sales channel **wholesale**: assign productos as needed.
5. When a B2B application arrives (`POST /store/perfumas/b2b/register`), a **Customer** is created with `metadata.b2b_status=pending`. Review NIT in Admin → Customers, then assign the customer to **emprendedores** and set `b2b_status=approved`.

## Custom builds — fulfillment

Order line items with `metadata.type = "custom_build"` include `build_components` pick list:

- fragrance grams
- bottle
- alcohol
- pheromones
- gift wrap

Admin helper: `GET /admin/perfumas/fulfillment`

## Payments (Colombia)

### Wompi (preferred)

1. Medusa module: `apps/backend/src/modules/wompi-payment` registered in `medusa-config.ts` as `pp_wompi_wompi`.
2. After first boot with the module, run `npx medusa db:migrate` from `apps/backend`, then in **Admin → Settings → Regions → Colombia** enable **Wompi** (keep **System** for manual/transfer).
3. Storefront env (`PERFUMAS-E-COMMERCE/.env.local`):
   - `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`
   - `WOMPI_PRIVATE_KEY`
4. Webhook (production): `POST https://perfumas.com.co/api/payments/wompi/webhook`
5. Checkout: if the shopper picks Wompi and the provider is enabled on the region, the cart uses `pp_wompi_wompi`; otherwise it falls back to **system**. Cart metadata still stores `payment_provider_local`.

### Local / system payment

Checkout uses Medusa `pp_system_default` when Wompi is unavailable so orders still appear under **Admin → Orders** without a card charge.

### Mercado Pago

Deferred — use transfer or Wompi for now.

## Shipping

Offer:

- Pickup Fontibón
- Pickup Bonanza
- Bogotá delivery
- National shipping

Create matching shipping options in Medusa for region Colombia (COP).

## Price updates

Prefer Medusa Admin over editing Excel once live. Re-run import only for bulk refreshes.
