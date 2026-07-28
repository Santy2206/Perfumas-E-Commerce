# Perfumas Next.js storefront

Active storefront for perfumas.com.co. Medusa backend lives in **[`./backend`](./backend)**.

## Stack

- Next.js 16 App Router + React 19 + Tailwind v4 + shadcn/ui primitives
- Zustand cart (persisted) + perfume builder
- `@medusajs/js-sdk` for Medusa
- Local catalog + API routes work offline for development

## Commands

```bash
npm install
npm run dev              # http://localhost:3000
npm run backend:dev      # Medusa → http://localhost:9000
npm run build
npm run catalog:export   # writes scripts/output/catalog-seed.json for Medusa
```

## Database (Supabase)

Put the **Postgres connection URI** (not the https API URL) in:

`backend/apps/backend/.env`

```env
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

Storefront `.env.local` only needs:

```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=
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
| `/checkout` | Colombia checkout |
| `/cuenta` | Account / B2B profile |
| `/faq` | FAQ |

See [`CUTOVER.md`](./CUTOVER.md), [`FUNNEL.md`](./FUNNEL.md), and [`../HOSTING.md`](../HOSTING.md).
