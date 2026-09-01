# Supper Club AI

Supper Club AI is a culturally literate planning workspace for Creative Hosts. Its featured demo, **Seed & Stars**, turns an Afrofuturist dinner inspired by Octavia E. Butler's *Parable of the Sower* into a sourced run of show: theme, menu, pairings, soundtrack, shopping list, prep timeline, and downloadable host packet.

The website exposes nine typed WebMCP tools so ChatGPT can read and update the same structured plan the host sees in the browser.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

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

See [PRODUCT.md](./PRODUCT.md), [DESIGN.md](./DESIGN.md), and [the provider gateway guide](./docs/integrations/provider-gateway.md) for the product, visual system, and integration architecture.
