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

## Provider configuration

```env
SPOONACULAR_API_KEY=
APPLE_MUSIC_DEVELOPER_TOKEN=
DISCOGS_TOKEN=
DISCOGS_USER_AGENT=SupperClubAI/0.1
```

Keep credentials in `.env.local` or encrypted deployment settings. Never prefix them with `NEXT_PUBLIC_`.

## Verify

```bash
npm run typecheck
npm run build
```

See [PRODUCT.md](./PRODUCT.md), [DESIGN.md](./DESIGN.md), and [the provider gateway guide](./docs/integrations/provider-gateway.md) for the product, visual system, and integration architecture.
