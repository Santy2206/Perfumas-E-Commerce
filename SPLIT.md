# Local notes after monorepo split (not committed)

## Push this repo to GitHub

1. Create an empty repo on GitHub named **Perfumas-E-Commerce** (no README).
2. In PowerShell:

```powershell
cd "C:\Users\USUARIO\Capital Productive\Project\Perfumas-E-Commerce"
git remote add origin https://github.com/Santy2206/Perfumas-E-Commerce.git
git push -u origin main
```

## Env files

- `.env.local` was restored with your previous publishable key (gitignored).
- Recreate `backend/apps/backend/.env` from `.env.template` + your Supabase `DATABASE_URL` (the old file was removed with the monorepo folder).
