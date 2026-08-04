# Deploy notes — Next.js shop (Vercel) + Medusa (Railway/Render/Fly)

Use with [HOSTING.md](../HOSTING.md) Hostinger section. Marketing stays on Hostinger `public_html`.

## Vercel — storefront

1. Import this Git repo in Vercel.
2. **Root Directory:** `PERFUMAS-E-COMMERCE`
3. Framework: Next.js (auto).
4. Environment variables:

```
NEXT_PUBLIC_SITE_URL=https://tienda.perfumas.com.co
NEXT_PUBLIC_MARKETING_URL=https://perfumas.com.co
NEXT_PUBLIC_MEDUSA_BACKEND_URL=https://api.perfumas.com.co
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_MEDUSA_SALES_CHANNEL_ID=sc_...
NEXT_PUBLIC_MEDUSA_WHOLESALE_CHANNEL_ID=sc_...
NEXT_PUBLIC_WOMPI_PUBLIC_KEY=
WOMPI_PRIVATE_KEY=
WOMPI_INTEGRITY_SECRET=
WOMPI_EVENTS_SECRET=
```

Copy channel IDs / publishable key from `backend/apps/backend/.seed-output.json` after production seed.

Wompi Events URL (Dashboard → URL de eventos):  
`https://tienda.perfumas.com.co/api/payments/wompi/webhook`  
(or your real storefront domain). That route verifies the checksum, forwards to Medusa `POST /hooks/wompi` to capture the payment, then assigns Fontibón/Bonanza hub and emails ops/customer.

Also set on **Vercel + Railway**:
- `PERFUMAS_INTERNAL_SECRET` (shared; shipping hooks)
- `OPS_PANEL_SECRET` (panel `/ops/envios`)
- `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (optional until email is ready)
- `OPS_EMAIL` / `OPS_EMAIL_FONTIBON` / `OPS_EMAIL_BONANZA`
- Pibox (phase 2): `PIBOX_API_*` when you have a corporate account

5. Deploy → note the `*.vercel.app` URL.
6. In Vercel → Domains, add `tienda.perfumas.com.co` (or `shop.`).
7. In Hostinger DNS, create CNAME:
   - Host: `tienda`
   - Points to: `cname.vercel-dns.com` (or the value Vercel shows)

## Medusa — API + Admin

1. Create a Node service on Railway / Render / Fly from `PERFUMAS-E-COMMERCE/backend/apps/backend`.
2. Set env from `backend/apps/backend/.env.template`:
   - `DATABASE_URL` (Supabase Session pooler + `uselibpqcompat=true&sslmode=require`)
   - `JWT_SECRET`, `COOKIE_SECRET`
   - `STORE_CORS=https://perfumas.com.co,https://tienda.perfumas.com.co`
   - `AUTH_CORS=https://perfumas.com.co,https://tienda.perfumas.com.co,https://api.perfumas.com.co`
   - `ADMIN_CORS` include your Admin origin
   - `WOMPI_PUBLIC_KEY` / `WOMPI_PRIVATE_KEY`
   - `WOMPI_INTEGRITY_SECRET` (same as Vercel; Widget integrity)
   - `WOMPI_EVENTS_SECRET` (Dashboard → secreto de eventos `prod_events_...` / `test_events_...`)
   - `PERFUMAS_INTERNAL_SECRET` (same as Vercel)
   - Build env: set `NPM_CONFIG_PRODUCTION=false` (or remove it). `true` skips deps and breaks `medusa build`.
   - Keep `DISABLE_MEDUSA_ADMIN=false` (or delete it) if you need Admin at `/app`.
3. Build/start (Railway Root `/backend`):
   - Build: `npm run build --workspace=@dtc/backend` (includes post-build `public/` link for Admin)
   - Start: `cd apps/backend && npx medusa db:migrate && npm run start`
   - If Admin `index.html` is still missing, set Start to `cd apps/backend && npx medusa db:migrate && npm run start:server`
   - Seed once via Console: `cd apps/backend && npm run seed`
4. Attach domain `api.perfumas.com.co` → that service.
5. Put storefront publishable key into Vercel env; enable Wompi on region Colombia in Admin when ready.

## Smoke after deploy

- `https://perfumas.com.co/` → marketing
- `https://perfumas.com.co/tienda` → redirects to `https://tienda.perfumas.com.co/tienda`
- Shop catalog shows Medusa products
- Checkout → order in Medusa Admin
