# Cutover checklist — perfumas.com.co

## Before DNS switch

1. [x] Supabase project created; `DATABASE_URL` set in `backend/apps/backend/.env` (Postgres URI, not https API URL)
2. [x] Medusa migrations run; admin user created (`npm run backend:dev`)
3. [x] Catalog imported (`npm run catalog:export` → `npm run backend:seed`)
4. [x] Customer group `emprendedores` + wholesale price list configured
5. [x] Region Colombia / currency COP + shipping options
6. [ ] Wompi keys in production env (`NEXT_PUBLIC_WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`) + webhook URL
7. [ ] Storefront production `.env`: `NEXT_PUBLIC_SITE_URL=https://perfumas.com.co`, Medusa URL + publishable key
8. [ ] `npm run build` succeeds on storefront
9. [ ] FAQ / contact / WhatsApp verified
10. [ ] Staff trained on Medusa Admin (see `backend/ADMIN.md`)

## Local commerce loop (dev)

1. [x] `/tienda` loads Medusa products (`lib/medusa-catalog.ts`)
2. [x] Cart syncs SKUs to Medusa Store cart (`lib/medusa-cart.ts` + `useCartStore`) — requires `sales_channel_id` (auto via `/store/perfumas/config` or `NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID`)
3. [x] Checkout completes Medusa cart → Admin **Orders** (system payment; local fallback if Medusa fails)
4. [x] Custom builds → `POST /store/builds/add-to-cart` (`metadata.type=custom_build`)
5. [x] B2B register creates Medusa customer (Admin assigns `emprendedores`)
6. [x] Wompi payment module scaffold (`src/modules/wompi-payment`) + storefront helpers / webhook stub

## Deploy

- Marketing (Hostinger): `powershell -File scripts/package-hostinger.ps1` → upload `deploy/hostinger-public_html/*` into `public_html/` (see `../HOSTING.md`)
- Storefront: Vercel root `PERFUMAS-E-COMMERCE` + domain `tienda.perfumas.com.co` (see `DEPLOY.md`)
- Backend: Railway / Render / Fly → `PERFUMAS-E-COMMERCE/backend/apps/backend` with Supabase Postgres (`api.perfumas.com.co`)
- Set Medusa `STORE_CORS` / `AUTH_CORS` to include `https://perfumas.com.co` and `https://tienda.perfumas.com.co`
- Run `npm run backend:seed` once against production DB after migrate
- Enable Wompi on region Colombia in Admin after migrate
- Production checklist items 6–10 above remain ops steps (keys, build, FAQ, staff training)

## Funnel smoke tests

- [ ] Land on marketing `/` (hero + brand look)
- [ ] **Crear mi fragancia** → `/crear`
- [ ] **Tienda / Comprar** → `/tienda` (label “Catálogo en vivo”)
- [ ] Bag → `/carrito` → `/checkout` → order appears in Medusa Admin
- [ ] Shop **Volver a Perfumas** → marketing home
- [ ] WhatsApp CTA still works
- [ ] Sitemap `/sitemap.xml` on shop deploy
