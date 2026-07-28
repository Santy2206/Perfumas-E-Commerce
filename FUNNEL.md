# Funnel: marketing → shop on perfumas.com.co

## Roles

1. **Marketing** ([`website/`](../website/)) — brand story; primary landing at `/`
2. **Shop** (this folder) — buy/build at `/tienda`, `/crear`, …
3. **Medusa** (`backend/`) — commerce API + Supabase DB

## Smoke test (production domain)

1. Open `https://perfumas.com.co/` — marketing hero loads
2. Click **Crear mi fragancia** → `/crear` (Next builder)
3. Click **Tienda** / **Comprar** → `/tienda`
4. Bag icon → `/carrito`
5. From shop header, **Volver a Perfumas** → marketing home
6. WhatsApp **Escríbenos** still opens WhatsApp

## Local smoke

```bash
cd website && npx serve -p 5000
cd PERFUMAS-E-COMMERCE && npm run dev
```

Shop CTAs on marketing use absolute paths (`/tienda`). With static `serve`, those paths 404 until hosting rewrites are live — use production or temporarily point CTAs to `http://localhost:3000/...` for local QA.

## Deploy checklist

See [`../HOSTING.md`](../HOSTING.md) and [`CUTOVER.md`](./CUTOVER.md).
