# Supper Club AI

Supper Club AI is a culturally literate planning workspace for Creative Hosts. Its featured demo, **Seed & Stars**, turns an Afrofuturist dinner inspired by Octavia E. Butler's *Parable of the Sower* into a sourced run of show: theme, menu, pairings, soundtrack, shopping list, prep timeline, and downloadable host packet.

The website exposes nine typed WebMCP tools so ChatGPT can read and update the same structured plan the host sees in the browser.

- **Live application:** [supper-club-ai.vercel.app](https://supper-club-ai.vercel.app/)
- **License:** [MIT](./LICENSE)

## WebMCP implementation

The nine tool definitions live in [`lib/webmcp-tools.ts`](./lib/webmcp-tools.ts). Each tool declares a name, description, JSON input schema, annotations, and an `execute` function. The application registers every definition with the browser's model context:

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
  // curate_soundtrack, create_shopping_list, finalize_party_plan,
  // and export_host_packet
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
- `components/` — the Creative Host workspace and shared WebMCP-driven interface.
- `lib/webmcp-tools.ts` — all nine WebMCP tool definitions and registration.
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

## Provider configuration

```env
SPOONACULAR_API_KEY=
GRAPEMINDS_API_KEY=
APPLE_MUSIC_DEVELOPER_TOKEN=
DISCOGS_TOKEN=
DISCOGS_USER_AGENT=SupperClubAI/0.1
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
```

See [PRODUCT.md](./PRODUCT.md), [DESIGN.md](./DESIGN.md), [the WebMCP use-case statement](./webmcp-use-case.md), and [the provider gateway guide](./docs/integrations/provider-gateway.md) for the product, visual system, implementation rationale, and integration architecture.
