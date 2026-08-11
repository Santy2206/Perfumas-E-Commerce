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

### Excel import (full catalog)

From `PERFUMAS-E-COMMERCE/`:

```bash
npm run catalog:import -- --fragancias "C:\path\PRECIOS FRAGANCIAS 2026.xlsx" --perfumas "C:\path\PRECIOS PERFUMAS 2026.xlsx"
```

Writes:

- `scripts/output/catalog-seed.json` (Medusa seed / sync input)
- `lib/generated/catalog-data.ts` (storefront + `/crear` builder data)

Then seed a fresh DB:

```bash
npm run backend:seed
```

### Ongoing sync (create / update / unpublish)

With Medusa running and an admin API token:

```bash
set MEDUSA_ADMIN_API_TOKEN=...
npm run catalog:sync
npm run catalog:sync -- --prune          # draft products missing from Excel
npm run catalog:sync -- --dry-run --prune
```

Prefer Medusa Admin for one-off edits. Re-run Excel import + sync only for bulk refreshes.

### Bulk product images

Put JPEGs/PNGs in a folder named exactly like the product **handle** (e.g. `cloud-agrafe-100-ml-aaa.jpeg`). Then:

```bash
# preview matches
npm run catalog:images -- --dir "C:\Users\USUARIO\Capital Productive\Project\Archivosperfumas\Imagenes_perfumas" --dry-run

# upload + set thumbnail/images
npm run catalog:images -- --dir "C:\Users\USUARIO\Capital Productive\Project\Archivosperfumas\Imagenes_perfumas"

# also copy onto prepared-replica twin (handle-2)
npm run catalog:images -- --dir "..." --also-prepared

# replace existing thumbnails
npm run catalog:images -- --dir "..." --force
```

Files are stored under the Medusa local `static/` folder (`http://localhost:9000/static/...`) unless S3 is configured.

**Important:** if you upload images while Medusa runs on `localhost`, product thumbnails in the DB keep that host. Production storefront rewrites `localhost` → `NEXT_PUBLIC_MEDUSA_BACKEND_URL` (e.g. `https://api.perfumas.com.co`). Prefer uploading against the production API (or S3) so URLs are correct at the source.

### Production images (S3 / Supabase Storage / R2)

Set on the **Medusa host** (Railway):

```env
S3_BUCKET=medusa
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_FILE_URL=https://<project>.supabase.co/storage/v1/object/public/medusa
S3_ENDPOINT=https://<project>.supabase.co/storage/v1/s3
S3_FORCE_PATH_STYLE=true
```

Redeploy Medusa, then re-run `npm run catalog:images` so URLs point at the bucket. Without S3, images on ephemeral disk can disappear after redeploy.

### Inventory (launch policy)

At launch we **do not block sales** on stock: `catalog:sync` sets `manage_inventory: false`. Seed may create levels for reference only. When you want real stock later, turn `manage_inventory: true` on variants and maintain levels in Admin.

### Collections

`perfumeria` (réplicas preparadas), `insumos` (esencias, envases, alcohol, feromonas), `hogar`, `accesorios`.

### Departments UX

- `/crear` — build only (no component unit prices)
- `/tienda/perfumeria` — prepared replicas + essence → Crear
- `/tienda/insumos` — buy components with filters

## B2B (emprendedores)

Wholesale prices require a real Medusa customer in group **emprendedores** (demo login removed). Checkout rejects `isB2B` / wholesale lines unless `/store/perfumas/b2b/status` returns approved. Price list **Wholesale emprendedores** applies when the cart customer is in that group.

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
3. Storefront env (Vercel / `.env.local`):
   - `NEXT_PUBLIC_WOMPI_PUBLIC_KEY`
   - `WOMPI_PRIVATE_KEY`
   - `WOMPI_INTEGRITY_SECRET` (Widget)
   - `WOMPI_EVENTS_SECRET` (webhooks — different from integrity)
4. Backend env (Railway): same Wompi keys + `WOMPI_INTEGRITY_SECRET` + `WOMPI_EVENTS_SECRET`
5. Webhook (production): Dashboard Wompi → URL de eventos →  
   `POST https://tienda.perfumas.com.co/api/payments/wompi/webhook`  
   Flow: verify checksum → `POST {MEDUSA}/hooks/wompi` → capture payment + order metadata (`wompi_status`, `wompi_transaction_id`).
6. Checkout: if the shopper picks Wompi and the provider is enabled on the region, the cart uses `pp_wompi_wompi`; otherwise it falls back to **system**. Cart metadata still stores `payment_provider_local`.

### Local / system payment

Checkout uses Medusa `pp_system_default` when Wompi is unavailable so orders still appear under **Admin → Orders** without a card charge.

### Mercado Pago

Deferred — use transfer or Wompi for now.

## Shipping

### Free shipping (storefront)

- Pickup Fontibón / Bonanza: always **$0**
  - Fontibón: Calle 18 #103a-26
  - Bonanza: Av. Calle 72 #70-90
- Domicilio Bogotá: **$8.000**, free when cart has **perfumería** (prepared replicas or `/crear` builds), subtotal ≥ **$100.000**, and composition rules: hogar/accesorios may mix freely; insumos only if perfume line total **>** insumos line total
- Envío nacional (Envia): **$18.000**, free with the same category rule and subtotal ≥ **$200.000**
- Carts with only hogar / accesorios / insumos (no perfumería) do **not** get free delivery
- Medusa needs paid + free options (`Bogotá delivery` / `Bogotá delivery free`, `National shipping` / `National shipping free`). Re-run seed or create free options in Admin; set national paid amount to **18000** if an older seed left **15000**.

Storefront methods (base prices):

- Pickup Fontibón / Bonanza ($0)
- Domicilio Bogotá ($8.000) — requires **localidad**; routes to hub Bonanza (norte) or Fontibón (sur/default)
- Envío nacional ($18.000) — always prepares from **Fontibón**

Ops panel: `https://tienda.perfumas.com.co/ops/envios` (secret = `OPS_PANEL_SECRET`).

After Wompi `APPROVED`, order metadata includes `shipping_hub`, `shipping_status: pending_dispatch` (delivery) or `pickup_ready`, and emails fire via Resend when configured. **Picap bookings are not created on payment** — from Ops click **Crear envío Picap** (or paste tracking manually).

### Picap / Pibox (Bogotá)

Env (Vercel):

- `PIBOX_API_URL=https://turing.thetrancon.com`
- `PIBOX_API_KEY` — token query `t`
- `PIBOX_FONTIBON_LAT` / `PIBOX_FONTIBON_LON`
- `PIBOX_BONANZA_LAT` / `PIBOX_BONANZA_LON`

Webhooks in Picap (event_cd `0` booking + `1` package):  
`POST https://tienda.perfumas.com.co/api/shipping/pibox/webhook`

### Envia.com (nacional)

Envíos fuera de Bogotá. Cotiza/genera guía desde Ops (**Crear envío Envia**), no al pagar.

Env (Vercel):

- `ENVIA_TOKEN` — API key (nunca en git)
- `ENVIA_API_URL=https://api.envia.com`
- `ENVIA_QUERIES_URL=https://queries.envia.com`
- `ENVIA_DEFAULT_CARRIERS=…` — carriers a cotizar; se elige la tarifa más barata
- `ENVIA_ORIGIN_*` — dirección Fontibón (street, city `Bogota`, state `DC`, postal code)

Webhook tracking:

`POST https://tienda.perfumas.com.co/api/shipping/envia/webhook`

Registrar en el panel Envia (**Webhooks → + Agregar**) o en Ops con **Registrar webhook Envia**.

Create matching shipping options in Medusa for region Colombia (COP).

## Price updates

1. Update Excel lists → `npm run catalog:import` → `npm run catalog:sync` (or `backend:seed` on empty DB).
2. Prefer Medusa Admin for single SKU edits between bulk refreshes.
