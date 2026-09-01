# Supper Club AI Provider Gateway

The four provider-facing WebMCP tools call one same-origin server route:

```text
WebMCP tool → POST /api/curation → normalized provider adapter → PartyPlan
```

Private credentials remain on the server. Provider-specific response shapes never enter the shared WebMCP contracts. Every provider response is normalized, attributed, bounded by an eight-second timeout, and followed by a second plan-version check before it can update the interface.

## Providers

| Capability | Primary provider | Fallback | Environment variable |
| --- | --- | --- | --- |
| Book metadata | Open Library | Reviewed book catalog | None |
| Recipes | Spoonacular | Reviewed recipe catalog | `SPOONACULAR_API_KEY` |
| Wine and zero-proof | Reviewed local catalog | Same catalog | None |
| Music catalog | Apple Music | Reviewed soundtrack anchors | `APPLE_MUSIC_DEVELOPER_TOKEN` |
| Release context | Discogs | Omitted | `DISCOGS_TOKEN` |

Copy `.env.example` to `.env.local` and add credentials there. Never prefix provider credentials with `NEXT_PUBLIC_`; doing so would bundle them into browser JavaScript.

`GET /api/curation` reports whether each provider is configured without returning any credential value. `POST /api/curation` accepts only the four locked curation actions, rejects cross-origin browser requests, caps request bodies at 32 KB, disables response caching, and returns explicit provider-mode and fallback warnings.

## Trust rules

- Open Library contributes bibliographic metadata; thematic interpretation remains original reviewed catalog writing.
- Spoonacular results remain unconfirmed until the host reviews the source, ingredients, allergen labels, and cultural framing.
- Recipe instructions and images remain at their original source unless separate storage rights are confirmed.
- The local wine catalog makes no current bottle, vintage, price, or availability claim.
- Apple Music search creates draft selections only. Saving a playlist remains a future confirmation-required action.
- Discogs supplies optional release metadata and does not replace Apple Music catalog identity.
