# Base44 Dev Environment

## Stack
- **Runtime:** Bun 1.2 (via `oven/bun:1.2` Docker image)
- **Framework:** TanStack Start + Vite 7 (SSR dev server)
- **Package manager:** Bun (`bun.lock`)
- **UI:** React 19, Tailwind CSS 4, shadcn/ui (new-york), Radix primitives
- **Auth:** Supabase (credentials in committed `.env`)
- **AI:** OpenRouter (server-side proxy in `src/lib/openrouter.functions.ts`)

## Running the app
```sh
docker compose -f docker-compose.base44.yml up -d
```
The dev server listens on port 3000 with live reload. Vite serves unhashed source modules (SSR via TanStack Start / Nitro).

## Key details
- The `bun.lock` has drift; `bun install` (not `--frozen-lockfile`) is used in compose to resolve it.
- Supabase anon/publishable keys are committed in `.env` and loaded by Vite automatically — no secrets needed to boot.
- AI features (`AI_API_KEY`, `AI_API_KEY_2`, `AI_API_KEY_3`) are **optional** — the app boots without them; AI pages show a "key missing" message.
- `SUPABASE_SERVICE_ROLE_KEY` and `PREMIUM_CIPHER_SALT` are also optional (lazy-initialized via Proxy).
- `bunfig.toml` enforces a 24h supply-chain guard (`minimumReleaseAge = 86400`) with an exclusion for `@lovable.dev/vite-tanstack-config`.
- The Vite config (`vite.config.ts`) uses `@lovable.dev/vite-tanstack-config` which bundles TanStack Start, React, Tailwind, Cloudflare, and sandbox detection plugins.
- `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` is passed via compose env so Vite accepts the preview proxy host.

## Verifying it works
```sh
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/  # should be 200
```
The homepage renders the GradeCalc dashboard with GPA monitor, navigation cards, and workspace nav.
