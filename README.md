# Supper Club AI

Supper Club AI is a culturally literate planning workspace for Creative Hosts. Its featured demo, **Seed & Stars**, turns an Afrofuturist dinner inspired by Octavia E. Butler's *Parable of the Sower* into a sourced run of show: theme, menu, pairings, soundtrack, shopping list, prep timeline, and downloadable host packet.

The website exposes ten typed WebMCP tools so an agent can read and update the same structured plan the host sees in the browser. The repository also includes an MCP App for ChatGPT with an interactive host-brief form.

- **Live application:** [supper-club-ai.vercel.app](https://supper-club-ai.vercel.app/)
- **License:** [MIT](./LICENSE)

## WebMCP implementation

The ten tool definitions live in [`lib/webmcp-tools.ts`](./lib/webmcp-tools.ts). Each tool declares a name, description, JSON input schema, annotations, and an `execute` function. The application registers every definition with the browser's model context:

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
  // finalize_party_plan, and export_host_packet
];

for (const definition of tools) {
  await document.modelContext.registerTool(definition, {
    signal: controller.signal,
  });
}
```

The executable implementation includes version-conflict protection, structured success and error responses, visible change receipts, source attribution, and explicit confirmation for finalization and PDF download.

## Project structure

- `app/` — Next.js application and server-side curation route.
- `app/api/plans/` — anonymous, versioned PlanStore HTTP boundary shared by the website and MCP app.
- `chatgpt-app/` — MCP server and self-contained interactive ChatGPT App.
- `components/` — the Creative Host workspace and shared WebMCP-driven interface.
- `lib/webmcp-tools.ts` — all ten WebMCP tool definitions and registration.
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

Wine pairing uses live GrapeMinds metadata when `GRAPEMINDS_API_KEY` is configured, the CC0 X-Wines subset as an automatic fallback, and a reviewed local catalog for zero-proof drinks. GrapeMinds records are used for live discovery and are not copied into a persistent local dataset.

When `PERPLEXITY_API_KEY` is configured, `enrich_soundtrack_context` uses the Perplexity Agent API with web search and structured output to attach concise artist, album, cultural, and hosting notes to soundtrack entries. The normalized plan stores the selected original source links, not Perplexity credentials or raw provider payloads.

## Shared PlanStore

Every plan receives an unguessable `plan-<uuid>` identifier. The website adds that identifier to its URL, while both the website and the MCP app read and replace the plan through `app/api/plans`. Writes use optimistic concurrency: a replacement must include the current `expectedPlanVersion`, preserve the plan ID, and advance exactly one version. Stale writes return a structured `VERSION_CONFLICT` instead of silently overwriting another change.

This first adapter is intentionally zero-credential and stores anonymous plans in server memory for up to 24 hours. It is suitable for local development and a single-process prototype, but is not durable across deploys, cold starts, or multiple server instances. The `PlanStore` interface isolates that limitation so a Redis or Postgres adapter can replace it without changing the website, WebMCP tools, or ChatGPT App contracts.

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
