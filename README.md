# Technica Portal

Internal web portal for Technica International. Feature 1: Microsoft sign-in restricted to **@technicaintl.com** accounts.

## Stack
Next.js 14 (App Router) + Auth.js v5 with the Microsoft Entra ID provider. Routes are protected by middleware; unauthenticated users are sent to `/login`.

## Azure setup (one-time, ~5 minutes)

1. Go to [portal.azure.com](https://portal.azure.com) → **Microsoft Entra ID** → **App registrations** → **New registration**.
2. Name: `Technica Portal`. Supported account types: **Accounts in this organizational directory only (single tenant)** — this is what locks sign-in to your company.
3. Redirect URI: choose **Web** and enter `http://localhost:3000/api/auth/callback/microsoft-entra-id`. (Add your production URL later, e.g. `https://portal.technicaintl.com/api/auth/callback/microsoft-entra-id`.)
4. After creating: copy the **Application (client) ID** and **Directory (tenant) ID** from the Overview page.
5. Go to **Certificates & secrets** → **New client secret** → copy the secret **Value** immediately (it's only shown once).

## Local setup

```bash
cp .env.example .env.local   # fill in the three Azure values
npx auth secret              # generates AUTH_SECRET into .env.local
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to the login page, then to Microsoft, then back to the dashboard.

## How the domain restriction works

Two layers: the app registration is **single-tenant** (only your Azure directory), and the `signIn` callback in `lib/auth.ts` additionally rejects any account whose email doesn't end in `@technicaintl.com` (e.g. guest users invited into your tenant).

## Project structure

```
app/
  api/auth/[...nextauth]/route.ts   Auth.js endpoints
  login/page.tsx                    Sign-in page
  dashboard/page.tsx                Protected example page
lib/auth.ts                         Auth config (providers, callbacks)
middleware.ts                       Route protection
```

## Next features
Add them as new routes under `app/` — everything is already behind authentication by default.
