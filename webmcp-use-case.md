# Supper Club AI

- **Live application:** [thesupperclub.app](https://www.thesupperclub.app/)
- **Public code:** [github.com/tmoody1973/supper-club-ai](https://github.com/tmoody1973/supper-club-ai)

## Inspiration

Ambitious dinner parties are coordination projects disguised as a creative evening. A host may begin with a book, a feeling, or an artist, then need to reconcile recipes, dietary needs, drink pairings, music, a grocery budget, and a kitchen timeline across many tabs and notes. If one course changes, the shopping list and prep schedule can quietly become wrong.

We wanted the agent and the host to work on the same plan instead of passing disconnected suggestions back and forth in chat. Supper Club AI is built around that shared surface: the person supplies taste, cultural intention, guest context, and approval; the agent handles research and structured coordination.

## What it does

Supper Club AI turns a cultural inspiration into a sourced, host-ready dinner plan. A Creative Host can ask for a hopeful *Parable of the Sower* dinner for eight people, including a gluten-free guest, within a $250 budget, with both wine and zero-proof pairings. The agent can create a fresh plan and populate its theme, three-course menu, pairings, soundtrack, shopping list, and prep work in the same browser workspace the host is viewing.

This is a strong fit for WebMCP because those are connected decisions, not independent recommendations. The page exposes 28 typed tools, so the agent can read and update the plan's real data model instead of guessing from the UI or describing six separate next steps. For example, a host can reject only the main course; the agent can replace that course, retain the rest of the evening, refresh the affected pairing, and rebuild the shopping and prep work. Every change appears in the Run of Show and in visible **Agent Marginalia** receipts with sources, provider mode, warnings, and the new plan version.

The result is a better experience than a chatbot plus a planning site: the host makes one natural-language request and reviews a coherent, editable plan immediately. The agent can coordinate work across food, music, drinks, cost, and timing, while the host can inspect provenance, dietary warnings, and alternatives before deciding what to keep. Finalization and exports still require explicit host approval.

## How we built it

The Supper Club AI website registers 28 WebMCP tools with `document.modelContext.registerTool`. Each tool has a focused description, JSON input schema, behavioral annotations, and structured success/error response. The tool set covers creating and reading plans; research and curation; recipe, wine, music, grocery, and timeline changes; pricing; and approved exports.

`create_party_plan` accepts a book, author, guest count, budget, dietary requirements, tone, and wine/zero-proof preferences. It creates a new anonymous plan, activates the returned plan URL, and returns provider receipts for the theme, menu, pairings, and soundtrack. Read and edit tools operate on the same React plan state that renders the workspace. State-changing calls require `expectedPlanVersion`, so a stale agent response returns a structured version conflict rather than overwriting a newer host edit.

Research stays behind a same-origin server gateway; credentials and raw provider payloads never enter browser code or tool responses. Menu courses resolve independently through Spoonacular, then Perplexity Agent API discovery, then a reviewed local catalog. Pairings use GrapeMinds with an X-Wines fallback; soundtrack candidates are discovered through Perplexity, verified against Apple Music, and optionally enriched with Discogs context. The tool response reports the sources, provider mode, and warnings that the UI turns into an auditable receipt.

## Challenges we ran into

The hard part was not producing suggestions; it was making research results safe and useful inside a real plan. Live providers can be incomplete, ambiguous, or unavailable. We designed per-course fallbacks so a failed dessert lookup does not discard a successful starter or main, and we keep successful live results rather than replacing the entire menu with a fallback.

We also had to keep agent speed from erasing host control. We added optimistic concurrency with plan versions, source and dietary warnings, and explicit confirmation before finalizing a plan or downloading host, guest-share, and recipe packets. Recipe exports use original functional preparation outlines and retain the authoritative source link rather than copying protected recipe prose or media.

## Accomplishments that we're proud of

- A genuine WebMCP workflow: the website itself registers typed capabilities, and the agent updates the exact workspace the host is reading.
- One shared, versioned plan rather than a chat transcript plus manually reconciled lists.
- A practical compound action: an agent can create a complete cultural dinner plan from one brief, including menu, drinks, music, shopping, and prep—not merely recommend a few dishes.
- Visible receipts that make live discovery, verification, reviewed fallback, warnings, and affected sections understandable to the host.
- Human control at the meaningful boundaries: the agent can research and coordinate, but the host reviews changes and explicitly approves finalization and file exports.

## What we learned

WebMCP is most valuable when a site has meaningful state and meaningful consequences. A typed tool such as `replace_menu_course` gives an agent more reliable leverage than browser clicking because it carries the actual plan ID, selected course, validation rules, and version expectation. It also lets the product return structured next actions and evidence instead of burying important caveats in prose.

We also learned that trust is a product feature. Sources, fallback modes, dietary flags, and version conflicts are not implementation noise; they are the information a host needs to judge an agent's work. Making that evidence visible lets people and agents collaborate on a creative, high-consideration task without asking the person to surrender authorship.

## What's next for SupperClub AI

Next, we want to carry the shared-plan model from planning into purchase and hosting. The existing grocery-location and recipe-pricing tools demonstrate store-aware package estimates; we plan to add reviewable retailer inventory, wine-shop offers, and coupon-aware baskets while keeping purchase decisions explicitly human-approved. We also want richer collaborative review for co-hosts and an embeddable version for bookstores, independent grocers, wine shops, and cultural venues that want to turn inspiration into a hosted experience.
