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
AUTH_CORS=http://localhost:3000,http://localhost:9000

# Customer auth — email/password is enabled by default (emailpass).
# Google OAuth (optional until credentials are set):
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

Use the **Postgres URI** (`postgresql://...`), not the project `https://xxxx.supabase.co` URL.

For Google login, create an OAuth 2.0 Client ID in Google Cloud Console and set the authorized redirect URI to `GOOGLE_CALLBACK_URL` (storefront callback page).

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
