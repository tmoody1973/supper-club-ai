# Supper Club AI

Supper Club AI is an **agent-readable cultural hosting workspace** for Creative Hosts—not an AI dinner planner. It turns one cultural inspiration into a shared, sourced run of show spanning the theme, menu, pairings, soundtrack, shopping list, prep timeline, private host packet, and guest-facing share kit. Its featured demo, **Seed & Stars**, composes an Afrofuturist gathering inspired by Octavia E. Butler's *Parable of the Sower*.

> Supper Club AI turns cultural inspiration into a coordinated, hostable experience by giving people and agents one shared, agent-readable workspace—reducing the fragmented research and manual reconciliation that make ambitious gatherings difficult to produce.

The website exposes twenty-five typed WebMCP tools so an agent can create, read, and update the same structured plan the host sees in the browser. Unlike a chat that leaves the host reconciling disconnected suggestions, Supper Club AI makes each change part of a durable, versioned plan with visible sources, warnings, and tool receipts. The repository also includes a separate MCP App for ChatGPT with sixteen focused tools and an interactive host-brief form.

- **Live application:** [thesupperclub.app](https://www.thesupperclub.app/)
- **License:** [MIT](./LICENSE)

## Why this matters

Ambitious cultural gatherings are coordination projects disguised as dinner parties. A Creative Host may research a book or artist, account for allergies, choose recipes and bottles, sequence music, reconcile ingredients, estimate costs, and build a cooking schedule across separate tabs, chats, and lists. One late change—such as replacing a course—can quietly make the pairing, shopping list, and prep timeline wrong.

Supper Club AI gives the host and agent one shared planning surface. The agent can make a precise, typed change through WebMCP; the workspace can preserve the rest of the evening, update linked decisions, and show what changed. That creates practical value for three audiences:

- **Creative Hosts** move from inspiration to a hostable evening without manually reconciling every menu, music, shopping, and timing decision.
- **Guests** benefit when dietary needs, substantial zero-proof choices, provenance, and uncertainty stay visible for host review.
- **Local retailers** gain a structured bridge from cultural inspiration to relevant products. Live Kroger location and pricing tools already demonstrate store-aware basket estimates; wine-shop inventory, reviewable offers, discounts, and coupons are credible next steps rather than hidden purchase actions.

## Why “agent-readable” is the innovation

The product is not a chatbot wrapped around a list of recommendations. The webpage itself exposes typed capabilities and a versioned party plan that both the person and the agent can read. An agent can search for alternatives, change one selected course, rebuild its dependent shopping or prep work, and leave a receipt on the same surface the host is reviewing. Consequential actions still wait for explicit approval.

This turns the browser from a page the agent merely looks at into a collaborative workspace it can safely operate with the host. The result is a reusable product model for other high-consideration experiences—bookstores, wine shops, independent grocers, cultural venues, and hospitality businesses—where discovery, judgment, provenance, and action need to remain connected.

## WebMCP implementation

The twenty-five website tool definitions live in [`lib/webmcp-tools.ts`](./lib/webmcp-tools.ts). Each tool declares a name, description, JSON input schema, annotations, and an `execute` function. The application registers every definition with the browser's model context:

```ts
const tools: WebMCPTool[] = [
  {
    name: "get_party_plan",
    description: "Read the current Supper Club AI party plan without changing it.",
    inputSchema: {
      type: "object",
      properties: { planId: { type: "string" } },
      required: ["planId"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, idempotentHint: true },
    execute: async (input) => {
      // Validate the plan and return the same structured state shown in the UI.
    },
  },
  // configure_party, research_theme, curate_menu, curate_pairings,
  // curate_soundtrack, enrich_soundtrack_context, create_shopping_list,
  // search_recipes, set_menu_course, replace_menu_course,
  // suggest_ingredient_substitutions, create_prep_timeline,
  // search_wines, set_wine_pairing, create_zero_proof_pairings,
  // search_music, refresh_music_metadata, find_grocery_stores, price_shopping_list,
  // finalize_party_plan, preview_guest_share_kit, export_guest_share_kit,
  // export_host_packet, and create_party_plan
];

for (const definition of tools) {
  await document.modelContext.registerTool(definition, {
    signal: controller.signal,
  });
}
```

The twenty-fifth website tool, `create_party_plan`, accepts an inspiration, guest count, budget, dietary requirements, and wine and zero-proof preferences. It sends that brief to the dynamic-plan endpoint, activates the returned plan ID in the website, and reports the provider and mode used for each curation stage. A new plan can use Spoonacular with Perplexity Agent and the reviewed recipe catalog as fallbacks, GrapeMinds with X-Wines fallback, Perplexity-backed zero-proof discovery with a reviewed catalog fallback, and Apple Music with reviewed soundtrack anchors. The executable implementation also includes version-conflict protection, structured success and error responses, visible change receipts, source attribution, and explicit confirmation for finalization and PDF download.

## Project structure

- `app/` — Next.js application and server-side curation route.
- `app/api/plans/` — anonymous, versioned PlanStore HTTP boundary shared by the website and MCP app.
- `chatgpt-app/` — MCP server and self-contained interactive ChatGPT App.
- `components/` — the Creative Host workspace and shared WebMCP-driven interface.
- `lib/webmcp-tools.ts` — all twenty-five website WebMCP tool definitions and registration.
- `lib/guest-share-kit.ts` — redacted guest-program PDF, social cards, captions, alt text, and ZIP export.
- `lib/apple-music.server.ts` — validated Apple Music search, per-track matching, artwork, previews, and source metadata.
- `lib/plan-tools.server.ts` — shared recipe, substitution, prep, wine, zero-proof, and music tool logic.
- `lib/kroger.server.ts` — server-only Kroger OAuth, store lookup, product matching, package estimates, and basket totals.
- `lib/curation.server.ts` — normalized book, recipe, and music provider gateway.
- `lib/pairing-engine.server.ts` — GrapeMinds, X-Wines, and local pairing logic.
- `data/` — reviewed fallback catalogs, schemas, and permitted vendor data.
- `public/` — visual assets used by the application.
- `scripts/` — catalog validation/import and secure Apple Music token generation.
- `docs/` — product, architecture, data, and provider documentation.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

For a production-style local run:

```bash
npm run build
npm run start
```

Provider credentials are optional during development. Open Library and the reviewed local catalogs work without keys; missing recipe or music credentials produce explicit local-fallback receipts.

Wine pairing uses live GrapeMinds metadata when `GRAPEMINDS_API_KEY` is configured and the CC0 X-Wines subset as an automatic fallback. Zero-proof pairings use source-backed Perplexity recipe discovery when configured and the reviewed local catalog as a safe fallback. GrapeMinds records are used for live discovery and are not copied into a persistent local dataset.

When `PERPLEXITY_API_KEY` is configured, the recipe gateway uses Perplexity Agent after Spoonacular cannot supply a complete menu, zero-proof curation discovers source-backed drink recipes, and `enrich_soundtrack_context` attaches concise artist, album, cultural, and hosting notes to soundtrack entries. Live food and drink candidates are screened but remain unconfirmed. The normalized plan stores selected original source links, not Perplexity credentials or raw provider payloads.

## Shared PlanStore

Every plan receives an unguessable `plan-<uuid>` identifier. The website adds that identifier to its URL, while both the website and the MCP app read and replace the plan through `app/api/plans`. Writes use optimistic concurrency: a replacement must include the current `expectedPlanVersion`, preserve the plan ID, and advance exactly one version. Stale writes return a structured `VERSION_CONFLICT` instead of silently overwriting another change.

Production stores anonymous plans in Redis for up to 24 hours so the website and Cloudflare-hosted MCP app share durable, versioned state across instances. Local development falls back to an in-process memory adapter when Redis is not configured. The `PlanStore` interface keeps those storage choices out of the website, WebMCP tools, and ChatGPT App contracts.

If the MCP server and website run as separate deployed services, set the same high-entropy `SUPPER_CLUB_SERVICE_TOKEN` in both environments. The website uses same-origin browser access; the MCP server uses that bearer token for server-to-server plan calls. This is service authentication, not a user account system. Anonymous plan IDs currently act as bearer-style access links, so they should not contain private information.

## Run the ChatGPT App locally

Start the website first, then run the MCP package in a second terminal:

```bash
cd chatgpt-app
npm install
cp .env.example .env.local
npm run build
npm start
```

The MCP endpoint is `http://localhost:8787/mcp`. Configure `SUPPER_CLUB_API_BASE_URL` and `SUPPER_CLUB_WEBSITE_URL` if the website is not running at `http://localhost:3000`. See [`chatgpt-app/README.md`](./chatgpt-app/README.md) for the tool contract and connection details.

## Provider configuration

```env
SPOONACULAR_API_KEY=
GRAPEMINDS_API_KEY=
APPLE_MUSIC_DEVELOPER_TOKEN=
DISCOGS_TOKEN=
DISCOGS_USER_AGENT=SupperClubAI/0.1
PERPLEXITY_API_KEY=
KROGER_CLIENT_ID=
KROGER_CLIENT_SECRET=
SUPPER_CLUB_SERVICE_TOKEN=
```

Keep credentials in `.env.local` or encrypted deployment settings. Never prefix them with `NEXT_PUBLIC_`.

Generate the Apple Music developer token locally from a downloaded Media Services `.p8` key:

```bash
npm run apple-music:token -- \
  --team-id YOUR_TEAM_ID \
  --key-id YOUR_KEY_ID \
  --private-key /absolute/path/to/AuthKey_KEY_ID.p8 \
  --write-env .env.local
```

The generator signs an ES256 JWT, verifies its signature locally, writes the token directly to the ignored `.env.local`, and never prints the token. Keep the `.p8` file outside this repository.

## Verify

```bash
npm run typecheck
npm run build

cd chatgpt-app
npm run typecheck
npm run build
```

See [PRODUCT.md](./PRODUCT.md), [DESIGN.md](./DESIGN.md), [the WebMCP use-case statement](./webmcp-use-case.md), and [the provider gateway guide](./docs/integrations/provider-gateway.md) for the product, visual system, implementation rationale, and integration architecture.
