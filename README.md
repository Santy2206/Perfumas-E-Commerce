# Perfumas E-Commerce

Next.js storefront + Medusa backend for [perfumas.com.co](https://perfumas.com.co).

Marketing site lives in a separate repo: [Perfumas-Web-Page-](https://github.com/Santy2206/Perfumas-Web-Page-) (`website/` → Hostinger).

## Stack

- Next.js 16 App Router + React 19 + Tailwind v4
- Zustand cart + perfume builder
- Medusa v2 in [`./backend`](./backend)
- `@medusajs/js-sdk` for Store API

## Develop

```bash
npm install
npm run backend:install   # once
npm run backend:dev       # Medusa → http://localhost:9000
npm run dev               # Shop → http://localhost:3000
```

Copy env templates:

- `.env.example` → `.env.local` (storefront)
- `backend/apps/backend/.env.template` → `backend/apps/backend/.env` (Medusa + Supabase)

## Deploy

See [`DEPLOY.md`](./DEPLOY.md) and marketing repo [`HOSTING.md`](https://github.com/Santy2206/Perfumas-Web-Page-/blob/main/HOSTING.md):

| App | Host |
|-----|------|
| Shop | Vercel (this repo root) |
| Medusa | Railway / Render / Fly (`backend/apps/backend`) |
| Marketing | Hostinger (`Perfumas-Web-Page-`) |

Production shop domain: `https://tienda.perfumas.com.co`  
Medusa API: `https://api.perfumas.com.co`

## Routes

| Path | Purpose |
|------|---------|
| `/` | Home — departments |
| `/crear` | Custom perfume builder |
| `/tienda/*` | Retail catalog |
| `/producto/[handle]` | Product detail |
| `/mayoristas` | B2B |
| `/carrito` / `/checkout` | Cart + checkout |
| `/cuenta` | Account |
