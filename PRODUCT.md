# Supper Club AI

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- Next.js
- TypeScript
- Vercel
- Server-side routes for protected API credentials, provider normalization, and PDF generation

## Users

The primary user is the **Creative Host**: someone planning a thoughtful dinner gathering who wants food, drinks, books, music, cultural context, and hosting logistics to feel like one coherent experience rather than separate searches and documents.

The Creative Host begins with intent and constraints—occasion, inspiration, guests, budget, dietary needs, tone, and timing—then reviews and edits the generated plan before approving consequential actions.

## Product Purpose

Supper Club AI turns a conversational idea for a gathering into a shared, editable dinner-party plan. An agent can use WebMCP tools exposed by the open website to research a theme, curate a menu, pair drinks, build a soundtrack, create a shopping checklist, validate the plan, generate a private host packet, and prepare a guest-safe visual share kit.

Success means the host can move from one prompt to a coherent, reviewable plan without manually reconciling multiple recipe, book, wine, music, and planning services.

## Positioning

Supper Club AI is not a chat response wrapped in a webpage. Its distinguishing mechanism is a shared live planning surface: the host sees and edits the same structured party plan that ChatGPT reads and updates through typed WebMCP tools. Each tool call produces both a visible interface update and concise structured output that lets ChatGPT explain the result and choose the next action.

## Operating Context

- The host opens Supper Club AI in the built-in browser where WebMCP tools are available.
- The host describes the gathering in conversation with ChatGPT.
- ChatGPT discovers and invokes tools from the current page.
- The website displays the evolving plan as editable sections rather than a long transcript.
- The host may preserve, replace, or revise individual choices.
- The host explicitly approves finalization and side effects such as saving an Apple Music playlist.
- The final deliverables include an editable shopping checklist, a downloadable PDF host packet,
  and a guest-safe share kit with a visual program, social cards, captions, and alt text.

The featured hackathon demo is **Seed & Stars**, a hopeful Afrofuturist supper inspired by Octavia E. Butler's *Parable of the Sower*. It uses themes of change, adaptation, community, resilience, climate, and imagined futures without implying endorsement by Butler's estate or reproducing copyrighted book text.

## Capabilities and Constraints

### Locked MVP tools

1. `get_party_plan`
2. `configure_party`
3. `research_theme`
4. `curate_menu`
5. `curate_pairings`
6. `curate_soundtrack`
7. `create_shopping_list`
8. `finalize_party_plan`
9. `export_host_packet`

The implemented website inventory contains twenty-four tools: the original twenty-two plus
`preview_guest_share_kit` and `export_guest_share_kit`. The earlier twenty-two-tool scope is
documented in `docs/plans/2026-08-31-supper-club-ai-webmcp-design.md`.

### Data and integrations

- The implemented provider gateway is documented in `docs/integrations/provider-gateway.md`.
- Spoonacular is the primary structured recipe API for the hackathon.
- TinyFish Search and Fetch is the fallback for live recipe discovery.
- Open Library is the first prototype book source, with Google Books as a metadata or preview-link fallback.
- Apple MusicKit supplies catalog search, previews, and approved playlist creation.
- Discogs enriches music with release, genre, style, and historical context.
- The hackathon wine experience begins with a reviewed local catalog behind a provider-neutral adapter.
- All third-party payloads are untrusted and must be validated and normalized on the server.
- Provider-specific response shapes must not leak into WebMCP contracts or the shared plan model.

### Safety, rights, and trust

- API credentials remain in server-side routes.
- Book metadata does not grant rights to reproduce full text, covers, or previews.
- Third-party recipe instructions remain at their source unless storage rights are explicit.
- The product does not sell or fulfill alcohol in the hackathon scope.
- Current price and availability are omitted when a dated source is unavailable.
- Finalization, playlist saving, sharing, purchasing, and future calendar writes require explicit host confirmation.
- State-changing tools use plan-version checks; artifact and external side-effect tools use idempotency protection.
- Dietary and allergen information is informational and requires the host to verify ingredients, product labels, and cross-contact for guests.

## Brand Commitments

- Product name: **Supper Club AI**
- Primary user term: **Creative Host**
- Featured demo name: **Seed & Stars**
- Voice: thoughtful, culturally respectful, imaginative, clear, and practical
- The product should make ambitious cultural storytelling feel hospitable rather than academic or gimmicky.

No logo, trademark treatment, palette, typography, or visual system has been approved yet.

## Evidence on Hand

- Validated architecture artifact: `cultural-host-architecture.html`
- Product and tool design: `docs/plans/2026-08-31-supper-club-ai-webmcp-design.md`
- Manus content brief: `docs/data/manus-content-catalog-brief.md`
- Catalog validation review: `docs/data/2026-08-31-catalog-validation-review.md`
- JSON Schemas: `data/schemas/`
- Prototype catalogs: `data/catalogs/books.json`, `data/catalogs/recipes.json`, and `data/catalogs/wines.json`
- Reusable catalog validator: `scripts/validate_catalogs.py`

The catalogs contain 10 books, 24 recipes, and 30 pairing records. They pass schema and structural integrity checks but remain `DRAFT` pending human cultural, dietary, and editorial review. No testimonials, customers, usage metrics, awards, or production claims exist and must not be invented.

## Product Principles

1. **One living plan, not scattered recommendations.** Every choice belongs to the same editable party state.
2. **Show the work.** Sources, warnings, constraints, and thematic reasoning remain visible when they help the host decide.
3. **Human taste stays in charge.** The agent proposes and coordinates; the host reviews, preserves, replaces, and approves.
4. **Culture is context, not decoration.** The product distinguishes sourced interpretation from creative invention and avoids flattening traditions.
5. **Artifacts should be useful after the conversation.** The shopping checklist, playlist, schedule, and PDF must work in the kitchen and at the table.

## Accessibility & Inclusion

- Support dietary constraints and substantial zero-proof drink alternatives.
- Always expose ingredient and major-allergen information alongside dietary labels.
- Never present generated dietary information as a medical or cross-contact guarantee.
- General accessibility conformance level remains an open implementation decision.
