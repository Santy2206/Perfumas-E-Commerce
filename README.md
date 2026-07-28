# Perfumas E-commerce (Next.js storefront)

Active storefront for perfumas.com.co. Companion Medusa backend lives in `../perfumas-backend`.

## Stack

- Next.js 16 App Router + React 19 + Tailwind v4 + shadcn/ui primitives
- Zustand cart (persisted) + perfume builder
- `@medusajs/js-sdk` for Medusa (optional until backend is up)
- Local catalog + API routes work offline for development

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run catalog:export   # writes scripts/output/catalog-seed.json for Medusa
```

## Routes

| Path | Purpose |
|------|---------|
| `/` | Home — 4 departments |
| `/crear` | Custom perfume builder (+ pheromones) |
| `/tienda/*` | Retail catalog by department |
| `/producto/[handle]` | Product detail |
| `/mayoristas` | B2B registration / login |
| `/mayoristas/insumos` | Wholesale catalog (MOQ) |
| `/carrito` | Unified cart |
| `/checkout` | Colombia checkout (pickup + delivery + Wompi/MP/transfer) |
| `/cuenta` | Account / B2B profile |
| `/faq` | FAQ (from legacy site) |

## Env

Copy `.env.example` → `.env.local` and set Medusa URL + publishable key when ready.
