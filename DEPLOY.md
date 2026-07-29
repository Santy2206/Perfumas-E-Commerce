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
```

Copy channel IDs / publishable key from `backend/apps/backend/.seed-output.json` after production seed.

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
   - `WOMPI_PRIVATE_KEY` (optional)
3. Build/start: `npm install` at backend workspace, then in `apps/backend`: `npx medusa db:migrate` then `npm run seed` once, then `npm run start` / `medusa start`.
4. Attach domain `api.perfumas.com.co` → that service.
5. Put storefront publishable key into Vercel env; enable Wompi on region Colombia in Admin when ready.

## Smoke after deploy

- `https://perfumas.com.co/` → marketing
- `https://perfumas.com.co/tienda` → redirects to `https://tienda.perfumas.com.co/tienda`
- Shop catalog shows Medusa products
- Checkout → order in Medusa Admin
