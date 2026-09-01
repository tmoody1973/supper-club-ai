# Supper Club AI Provider Gateway

The five provider-facing WebMCP tools call one same-origin server route:

```text
WebMCP tool → POST /api/curation → normalized provider adapter → PartyPlan
```

Private credentials remain on the server. Provider-specific response shapes never enter the shared WebMCP contracts. Every provider response is normalized, attributed, bounded by a provider-appropriate timeout, and followed by a second plan-version check before it can update the interface.

## Providers

| Capability | Primary provider | Fallback | Environment variable |
| --- | --- | --- | --- |
| Book metadata | Open Library | Reviewed book catalog | None |
| Recipes | Spoonacular | Perplexity Agent API, then reviewed recipe catalog | `SPOONACULAR_API_KEY`, `PERPLEXITY_API_KEY` |
| Wine pairing | GrapeMinds | CC0 X-Wines subset, then reviewed local catalog | `GRAPEMINDS_API_KEY` |
| Zero-proof pairing | Perplexity Agent API | Reviewed local catalog | `PERPLEXITY_API_KEY` |
| Music catalog | Apple Music | Reviewed soundtrack anchors | `APPLE_MUSIC_DEVELOPER_TOKEN` |
| Release context | Discogs | Omitted | `DISCOGS_TOKEN` |
| Recipe, zero-proof, artist, and album research | Perplexity Agent API | Reviewed food and drink catalogs, or an explicit unavailable response for music enrichment | `PERPLEXITY_API_KEY` |

Copy `.env.example` to `.env.local` and add credentials there. Never prefix provider credentials with `NEXT_PUBLIC_`; doing so would bundle them into browser JavaScript.

`GET /api/curation` reports whether each provider is configured without returning any credential value. `POST /api/curation` accepts only the five locked curation actions, rejects cross-origin browser requests, caps request bodies at 32 KB, disables response caching, and returns explicit provider-mode and fallback warnings.

## Trust rules

- Open Library contributes bibliographic metadata; thematic interpretation remains original reviewed catalog writing.
- Spoonacular results remain unconfirmed until the host reviews the source, ingredients, allergen labels, and cultural framing.
- Recipe instructions and images remain at their original source unless separate storage rights are confirmed.
- GrapeMinds records support live wine discovery and are not copied into a persistent local dataset.
- X-Wines and reviewed local wine records provide fallbacks; no provider result is presented as a current retail price or availability claim.
- Apple Music search creates draft selections only. Saving a playlist remains a future confirmation-required action.
- Discogs supplies optional release metadata and does not replace Apple Music catalog identity.
- Perplexity research uses structured output and preserves original source URLs. Recipe and zero-proof candidates are rejected when they conflict with requested dietary tags, contain explicit alcohol, or lack a valid source; accepted candidates remain unconfirmed and require label, allergen, cross-contact, and instruction review. Music research excludes lyrics and remains concise editorial context rather than authoritative biography.
