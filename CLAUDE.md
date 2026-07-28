# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev # dev server on http://localhost:3000
npm run build # production build (also the fastest full type-check)
npm run start # serve the production build
npm run lint # eslint (flat config, extends next/core-web-vitals + next/typescript)
npm run catalog:export # emit scripts/output/catalog-seed.json for Medusa import
```

There is no test runner configured. `lib/filters.ts` and `lib/build-pricing.ts` are pure functions so a test harness can be added without touching components.

## Repository layout

The git repository root is the **parent** directory (`Perfumas-Web-Page-/`), which holds the Medusa backend (`perfumas-backend/`) and the archived legacy static site (`legacy-static/`). This Next.js app lives in `PERFUMAS-E-COMMERCE/` and is the active storefront.

## Architecture

Next.js 16 App Router + React 19 + TypeScript (strict) + Tailwind v4 + Zustand + shadcn/ui primitives. Medusa v2 (`../perfumas-backend`) is the commerce engine; Supabase hosts Postgres for Medusa.

Four commercial departments share one cart:

1. **Custom perfumery** — `/crear` builder (fragrance → bottle → pheromones/label/gift wrap)
2. **Insumos** — retail `/tienda/insumos` + B2B `/mayoristas/insumos` (MOQ + wholesale prices)
3. **Hogar** — `/tienda/hogar`
4. **Accesorios** — `/tienda/accesorios`

Layering:

- **`lib/types.ts`** / **`lib/catalog-types.ts`** — domain model
- **`lib/mock-data.ts`** / **`lib/catalog.ts`** — curated catalog + department mapping
- **`lib/filters.ts`** / **`lib/build-pricing.ts`** — pure pricing/filter math (server-validated)
- **`store/useBuilderStore.ts`** — wizard UI state
- **`store/useCartStore.ts`** — unified persisted cart (builds + SKUs + B2B)
- **`lib/medusa.ts`** — Medusa JS SDK client
- **`components/builder/*`** — builder steps; **`components/shop/*`** — catalog UI; **`components/ui/*`** — shadcn-style primitives

### Domain rules

- Olfactive groups: `citricas-frescas`, `maderas-orientales`, `intermedios`, `dulces`
- Bottle tiers AAA / AA / Genérico via `getBottleOptionsForFragrance`
- Build price = `pricePerGram × capacityMl` + bottle + alcohol + pheromones + optional gift wrap — computed in `computeBuildPrice` (never trust client alone)
- B2B: customer group `emprendedores`, default 20% wholesale discount, variant `min_qty` MOQ

### Step flow quirk

`BuilderStep` is `1 | 2 | 3 | 4`; steps 1–2 both render `FragranceStep`. `StepIndicator` shows three dots.

## Conventions

- Spanish UI (`lang="es"`); English identifiers/comments
- Prices: COP via `formatCOP` in `lib/utils.ts`
- Theme tokens in `app/globals.css` (`wine-*`, `gold-*`, `bone`, Fraunces / Work Sans)
- See `CUTOVER.md` for production launch checklist; `../perfumas-backend/ADMIN.md` for Medusa ops
