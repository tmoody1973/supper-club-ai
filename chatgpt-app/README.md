# Supper Club AI ChatGPT App

This package exposes Supper Club AI as a standards-based MCP App. ChatGPT can create or open a shared dinner-party plan, and the Creative Host gets an interactive form inside the conversation instead of editing raw tool arguments.

## How state is shared

The MCP server does not keep its own plan database. Every tool calls the website's versioned PlanStore API:

```text
ChatGPT conversation
  ↕ MCP tools + interactive resource
chatgpt-app/server.ts
  ↕ authenticated server-to-server HTTP
Next.js /api/plans
  ↕ PlanStore interface
RedisPlanStore (production) / MemoryPlanStore (local fallback)
```

The browser workspace opens the same plan through `/?plan=<planId>`. Both interfaces must provide the current plan version when saving, so a stale change cannot overwrite a newer one.

## Tools

- `create_party_plan` — creates a fresh anonymous plan and opens the interactive planner. The website researches the requested inspiration, then curates a new menu, pairings, Apple Music soundtrack, prep schedule, and shopping list before the plan is stored.
- `get_party_plan` — reads the latest version without changing it.
- `configure_party` — saves inspiration, guests, budget, dietary needs, tone, and date.
- `search_recipes` — returns reviewed course alternatives with diet, time, and unverified budget preferences.
- `price_recipe_candidates` — compares up to three searched recipes against a course cap using package prices from one selected Kroger location, with coverage and confidence.
- `set_menu_course` — selects one searched recipe and rebuilds dependent shopping and prep data.
- `replace_menu_course` — replaces only one course while preserving the rest of the evening.
- `suggest_ingredient_substitutions` — returns host-reviewed swaps for allergies, diets, availability, or cost.
- `create_prep_timeline` — rebuilds and saves the practical cooking schedule.
- `find_grocery_stores` — finds nearby Kroger-family locations for an explicit host choice.
- `price_shopping_list` — returns a paginated, location-specific package-price estimate with coverage and confidence.
- `search_wines` — searches GrapeMinds and reviewed wine catalogs with explicit price and inventory warnings.
- `set_wine_pairing` — selects one searched wine candidate for a course.
- `create_zero_proof_pairings` — gives every course a substantial non-alcoholic option.
- `search_music` — searches Apple Music for tracks, artwork, and available previews without changing the plan.
- `refresh_music_metadata` — updates each selected soundtrack track independently, preserves successful matches, and saves Apple Music album, artwork, preview, and source metadata.
- `finalize_party_plan` — validates completeness and requires the literal input `confirm: true` after the Creative Host explicitly approves.

Read-only search tools return compact structured candidates. State-changing tools return the updated structured plan, storage metadata, and the URL for opening that plan in the full website workspace. The tools reference `ui://supper-club/planner-v1.html`, a self-contained MCP Apps resource with bundled React, CSS, and JavaScript.

The widget keeps up to eight recently opened plan IDs in client-side MCP view storage and labels the list **Plans on this device · 24 hours**. It never exposes a global anonymous plan directory. Hosts that restrict iframe storage still support the current plan, but cannot restore device history after the view closes.

## Local development

With the main website running on port 3000:

```bash
npm install
npm run build
npm start
```

Environment variables:

```env
PORT=8787
HOST=0.0.0.0
SUPPER_CLUB_API_BASE_URL=http://127.0.0.1:3000
SUPPER_CLUB_WEBSITE_URL=http://127.0.0.1:3000
SUPPER_CLUB_SERVICE_TOKEN=
```

For deployment, set `SUPPER_CLUB_API_BASE_URL` and `SUPPER_CLUB_WEBSITE_URL` to the public Supper Club AI origin. Set the same high-entropy `SUPPER_CLUB_SERVICE_TOKEN` on this service and the website. Configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` on the website deployment so its PlanStore is shared across instances. Do not expose any of these values to the widget or prefix them with `NEXT_PUBLIC_`.

Connect a compatible host to `http://localhost:8787/mcp`. For a hosted ChatGPT connection, deploy this package to an HTTPS endpoint and provide its `/mcp` URL when creating the connector.

## Cloudflare Worker deployment

The production MCP endpoint is packaged as a Cloudflare Worker while the main Next.js workspace remains on Vercel. The Worker uses the web-standard MCP transport and calls the public PlanStore API on the website.

Build the exact Worker bundle without publishing it:

```bash
npm run build:cloudflare
```

Set the private server-to-server token once, using the same value configured on the Vercel project:

```bash
npx wrangler secret put SUPPER_CLUB_SERVICE_TOKEN
```

Publish the Worker:

```bash
npm run deploy:cloudflare
```

Wrangler reads the non-secret website URLs from `wrangler.jsonc`. After deployment, use the reported `https://<worker>.workers.dev/mcp` URL in ChatGPT Developer mode and in the MCP Inspector. Never put the Upstash credentials on the Worker: they belong on the Vercel website, which owns the PlanStore API.

## Verification

```bash
npm run typecheck
npm run build
npm run build:cloudflare
```

Plans use a 24-hour TTL. Production uses the durable Redis adapter whenever both Upstash credentials are present; local development falls back to the process-local memory adapter. Redis replacements use an atomic version check so concurrent saves cannot silently overwrite one another.
