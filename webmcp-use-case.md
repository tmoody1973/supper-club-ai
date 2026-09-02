# Why Supper Club AI Is a Strong Fit for WebMCP

- **Public code repository:** [github.com/tmoody1973/supper-club-ai](https://github.com/tmoody1973/supper-club-ai)
- **Live application:** [thesupperclub.app](https://www.thesupperclub.app/)

Supper Club AI turns a creative idea—such as an Afrofuturist dinner inspired by Octavia E. Butler's *Parable of the Sower*—into a complete, practical plan. The Creative Host can work with an AI agent to shape the theme, curate a menu, select wine and zero-proof pairings, sequence music, prepare a shopping list, export a private host packet, and create a guest-safe visual program and social package.

This is a strong fit for WebMCP because the work crosses several domains and changes one connected plan. A new guest count affects recipe quantities and the shopping list. A dietary requirement can change the menu and pairings. A different book or tone should influence the food, music, and cultural framing. WebMCP gives the agent structured tools for making those connected changes inside the website, instead of merely describing what the host should do next in a separate chat.

Most importantly, the website remains the shared source of truth. The agent can read and update the same Supper Club AI plan the host sees, while the host stays in control of taste, cultural judgment, safety review, and final approval.

## How It Creates a Better User Experience

Without WebMCP, planning a thoughtful dinner can mean opening many tabs, searching several services, copying results into notes, recalculating quantities, and manually keeping the menu, drinks, music, and shopping list in sync. A conventional chatbot may provide useful suggestions, but its answer is usually disconnected from the actual planning interface.

With WebMCP, the host can make a plain-language request such as:

> Plan a hopeful *Parable of the Sower* dinner for eight guests, including one gluten-free guest, with a $250 budget, wine and zero-proof pairings, and music that moves from reflective arrival to joyful release.

The agent can translate that request into structured actions and update the visible plan in place. The host immediately sees the revised Run of Show, recipes, dietary labels, pairing notes, album artwork, audio previews, sources, warnings, shopping list, and preparation timeline. Supper Club AI also records visible receipts in “Agent Marginalia,” so the host can understand what changed and why.

This creates a faster and more trustworthy experience:

- The host describes the desired experience instead of completing a long series of forms.
- Related parts of the plan stay synchronized when requirements change.
- Sources, provider fallbacks, dietary warnings, and cultural notes remain visible for review.
- The agent returns structured results and next actions instead of an untracked wall of text.
- Consequential actions, including finalizing the plan and downloading the PDF, require explicit host confirmation.

## What People and Agents Can Do Together

The Creative Host contributes the parts that require human taste and responsibility: the occasion, guests, budget, emotional tone, cultural intention, personal preferences, and final decisions. The agent contributes speed and coordination: it can research the inspiration, search normalized catalogs, compare options against the brief, update dependent sections, surface warnings, and keep the plan internally consistent.

Together, they can move from an abstract cultural idea to a usable evening without losing the host's authorship. For example, the host can reject one course but preserve the other two; the agent can replace that course, rebuild the shopping list and prep timeline, and revise only the affected drink pairing. The host can then listen to soundtrack previews, review provenance, make adjustments, approve the final plan, and receive a practical PDF packet for the kitchen and table.

Before WebMCP, this collaboration was difficult because websites and agents had no reliable shared language. The agent could suggest ideas in prose, but it could not safely operate the planning interface. Automation often depended on brittle page scraping or simulated clicks, with little understanding of the site's actual data model. WebMCP gives the site a declared set of meaningful, typed capabilities, so the agent can act precisely while the human watches, reviews, and decides.

## How We Implemented WebMCP

Supper Club AI registers twenty-eight typed website tools with `document.modelContext.registerTool`:

1. `get_party_plan`
2. `configure_party`
3. `research_theme`
4. `curate_menu`
5. `curate_pairings`
6. `curate_soundtrack`
7. `enrich_soundtrack_context`
8. `find_grocery_stores`
9. `price_shopping_list`
10. `search_recipes`
11. `set_menu_course`
12. `replace_menu_course`
13. `suggest_ingredient_substitutions`
14. `create_prep_timeline`
15. `search_wines`
16. `set_wine_pairing`
17. `create_zero_proof_pairings`
18. `search_music`
19. `refresh_music_metadata`
20. `create_shopping_list`
21. `finalize_party_plan`
22. `preview_guest_share_kit`
23. `export_guest_share_kit`
24. `export_host_packet`
25. `create_party_plan`
26. `price_recipe_candidates`
27. `prepare_recipe_cards`
28. `export_recipe_packet`

`create_party_plan` starts from the host's inspiration, guest count, budget, dietary requirements, and wine and zero-proof preferences. It creates a fresh plan through the dynamic-plan endpoint, changes the website to the returned plan ID, and leaves the previous plan untouched. Its structured result includes provider receipts for the theme, menu, pairings, and soundtrack so the host can see which provider and operating mode produced each section.

`price_recipe_candidates` accepts up to three recipe IDs returned by `search_recipes`, one host-selected Kroger location, and a course cap. It returns store-specific package estimates, ingredient coverage, confidence, unpriced ingredients, and a cap status without changing the menu. Partial coverage cannot be labeled within cap; a partial subtotal already over cap can still be labeled over cap.

`prepare_recipe_cards` returns a compact preview of each dish card, including scaled quantities, dietary warnings, instruction status, and the authoritative source. After the plan is finalized and the Creative Host explicitly confirms, `export_recipe_packet` downloads a ZIP with a combined kitchen PDF, one PDF per dish, and a provenance manifest. Source-linked dishes receive an original functional preparation outline and a clear source-required warning instead of copied headnotes, photographs, or expressive recipe prose.

The website's twenty-eight WebMCP tools are separate from the ChatGPT MCP App's eighteen focused tools. Both operate on the same versioned plan model, but the website exposes the broader composition and artifact toolkit. Every tool has a focused description, a JSON input schema, behavioral annotations, and a structured success or error response. A response can include the updated plan version, affected interface sections, source references, provider receipts, warnings, a human-readable summary, and suggested next actions.

The WebMCP tools operate on the same React plan state that renders the Supper Club AI workspace. When a tool succeeds, it commits a new version of the plan, updates the relevant interface sections, and adds a visible receipt. State-changing tools require `expectedPlanVersion`, which prevents an agent from overwriting newer host changes with stale information. Provider requests also perform a second version check before their results are applied.

Research and curation run through a same-origin server gateway so private credentials never enter browser code or WebMCP responses. Starter, main, and dessert each independently follow Spoonacular → Perplexity Agent API → reviewed recipe fallback, preserving successful live courses when another role fails. Perplexity recipe candidates must point to actual Agent API search-result IDs before they can pass screening.

For music, Perplexity proposes 6–8 sourced candidates across arrival, first course, main table, reflection, and closing. The gateway requires actual result IDs from the same Agent API response, rejects generic background and wellness audio, and uses Apple Music as the authoritative exact artist/title verifier. It then ranks verified candidates against the theme, energy arc, and strength of editorial or institutional sourcing before selecting four. Reviewed anchors fill only unverified or missing slots, and Discogs adds release context when available. Per-track receipts distinguish Perplexity discovery, Apple Music verification, and reviewed fallback provenance. Other normalized sources include Open Library, GrapeMinds with X-Wines fallback, and Perplexity-backed zero-proof discovery with a reviewed catalog fallback. Provider receipts expose selected providers, modes, sources, and warnings without exposing credentials or raw payloads.

Finally, tool permissions match the consequence of each action. Reading the plan and previewing the redacted guest kit or recipe cards are read-only. Curation tools can revise specified sections. Finalization, host-packet export, guest-share export, and recipe-packet export require explicit approval because they lock state or create downloaded files. This gives the agent useful agency without removing the Creative Host from the decisions that matter.

## Short Summary

Supper Club AI uses WebMCP to turn a website and an AI agent into one shared creative workspace. The host supplies intention, taste, and approval; the agent coordinates research and structured updates across food, wine, music, shopping, and preparation. The result is not just a recommendation in chat—it is a sourced, visible, editable, and exportable dinner plan.
