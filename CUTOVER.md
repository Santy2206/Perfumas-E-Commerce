# Cutover checklist — perfumas.com.co

## Before DNS switch

1. [ ] Supabase project created; `DATABASE_URL` set in `backend/apps/backend/.env` (Postgres URI, not https API URL)
2. [ ] Medusa migrations run; admin user created (`npm run backend:dev`)
3. [ ] Catalog imported (`npm run catalog:export` → Admin / seed)
4. [ ] Customer group `emprendedores` + wholesale price list configured
5. [ ] Region Colombia / currency COP + shipping options
6. [ ] Wompi or Mercado Pago keys in production env
7. [ ] Storefront `.env.local`: `NEXT_PUBLIC_SITE_URL=https://perfumas.com.co`, Medusa URL + publishable key
8. [ ] `npm run build` succeeds on storefront
9. [ ] FAQ / contact / WhatsApp verified
10. [ ] Staff trained on Medusa Admin (see `backend/ADMIN.md`)

## Deploy

- Marketing: static host root directory `website/` → `perfumas.com.co/`
- Storefront: Next.js `PERFUMAS-E-COMMERCE` → path rewrites (see `../HOSTING.md` + `../vercel.json`)
- Backend: Railway / Render / Fly → `PERFUMAS-E-COMMERCE/backend/apps/backend` with Supabase Postgres

## Funnel smoke tests

- [ ] Land on marketing `/` (hero + brand look)
- [ ] **Crear mi fragancia** → `/crear`
- [ ] **Tienda / Comprar** → `/tienda`
- [ ] Bag → `/carrito`
- [ ] Shop **Volver a Perfumas** → marketing home
- [ ] WhatsApp CTA still works
- [ ] Sitemap `/sitemap.xml` on shop deploy
