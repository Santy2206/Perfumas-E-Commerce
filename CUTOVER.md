# Cutover checklist — perfumas.com.co

## Before DNS switch

1. [ ] Supabase project created; `DATABASE_URL` set on Medusa backend
2. [ ] Medusa migrations run; admin user created
3. [ ] Catalog imported (`npm run catalog:export` → Admin / seed)
4. [ ] Customer group `emprendedores` + wholesale price list configured
5. [ ] Region Colombia / currency COP + shipping options
6. [ ] Wompi or Mercado Pago keys in production env
7. [ ] Storefront env: `NEXT_PUBLIC_SITE_URL=https://perfumas.com.co`, Medusa URL + publishable key
8. [ ] `npm run build` succeeds on storefront
9. [ ] FAQ / contact / WhatsApp verified
10. [ ] Staff trained on Medusa Admin (see `perfumas-backend/ADMIN.md`)

## Deploy

- Storefront: Vercel / similar → root `PERFUMAS-E-COMMERCE`
- Backend: Railway / Render / Fly → `perfumas-backend/apps/backend` with Supabase Postgres

## DNS

1. Point `perfumas.com.co` (and `www`) to the Next.js storefront
2. Keep a staging subdomain for Medusa Admin if desired (`admin.perfumas.com.co` reverse-proxy to :9000)
3. Retire static `index.html` / `HTML/` legacy site after smoke tests

## Smoke tests

- [ ] Create custom perfume with pheromones → checkout
- [ ] Retail add SKU from `/tienda/hogar`
- [ ] B2B login demo → MOQ enforcement on insumos
- [ ] Pickup Fontibón order + transfer payment path
- [ ] Sitemap `/sitemap.xml` and robots.txt live
