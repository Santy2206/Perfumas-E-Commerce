# Perfumas Backend (Medusa v2)

Commerce engine for the Perfumas Next.js storefront (parent folder).

## Stack

- Medusa 2.x (`apps/backend`)
- Postgres via **Supabase** (`DATABASE_URL`) or local Docker Compose
- Custom routes:
  - `POST /store/builds/add-to-cart`
  - `POST /store/perfumas/b2b/register`
  - `POST /store/perfumas/orders`
  - `GET /admin/perfumas/fulfillment`

## Database

Copy `apps/backend/.env.template` → `apps/backend/.env` if needed, then set:

```env
DATABASE_URL=postgresql://...   # Supabase → Database → Connection string → URI
STORE_CORS=http://localhost:3000,https://perfumas.com.co
```

Use the **Postgres URI** (`postgresql://...`), not the project `https://xxxx.supabase.co` URL.

## Quick start

From `PERFUMAS-E-COMMERCE/`:

```bash
npm run backend:dev
```

Or from this folder:

```bash
npm install
npm run backend:dev
```

Admin: http://localhost:9000/app

See [ADMIN.md](./ADMIN.md).
