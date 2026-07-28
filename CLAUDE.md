# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev # storefront on http://localhost:3000
npm run backend:dev # Medusa on http://localhost:9000 (from ./backend)
npm run build # production build (also the fastest full type-check)
npm run start # serve the production build
npm run lint # eslint
npm run catalog:export # emit scripts/output/catalog-seed.json for Medusa import
```

## Repository layout

Parent repo `Perfumas-Web-Page-/`:

- **`website/`** — MAIN marketing site (perfumas.com.co `/`)
- **`PERFUMAS-E-COMMERCE/`** — SECOND: Next.js shop + Medusa in `backend/`

Open this folder for shop work. Marketing CTAs link to `/tienda`, `/crear`, `/carrito` on the same domain (see `../HOSTING.md`, `FUNNEL.md`).

## Architecture

Next.js 16 App Router + React 19 + TypeScript + Tailwind v4 + Zustand + shadcn/ui. Medusa v2 (`./backend`) is the commerce engine; Supabase hosts Postgres for Medusa via `backend/apps/backend/.env` → `DATABASE_URL`.

Four commercial departments share one cart: custom perfumery (`/crear`), insumos, hogar, accesorios (+ B2B `/mayoristas`).

### Domain rules

- Build price = `pricePerGram × capacityMl` + bottle + alcohol + pheromones + gift wrap — `computeBuildPrice` (server-validated)
- B2B: customer group `emprendedores`, ~20% wholesale discount, `min_qty` MOQ

## Conventions

- Spanish UI (`lang="es"`); English identifiers/comments
- Prices: COP via `formatCOP` in `lib/utils.ts`
- Theme tokens in `app/globals.css`
- See `CUTOVER.md` and `backend/ADMIN.md`
