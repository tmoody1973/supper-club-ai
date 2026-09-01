# Supper Club AI — Shape Brief

Date: 2026-08-31  
Phase: Shape only; awaiting explicit brief confirmation before composition work  
Selected visual world: **The Speculative Salon Ledger**  
Selected direction comp: `.impeccable/mocks/decision/speculative-salon.png`  
Approved build comp: `.impeccable/mocks/supper-club-ai-comp-02-run-of-show.png`

## 1. Job and audience

The primary user is a **Creative Host** planning a culturally coherent dinner at a laptop, with ChatGPT open beside the Supper Club AI website. They arrive with a theme, source work, guest count, date, dietary needs, budget, and desired emotional arc. Their mode is active authorship: they are curating an evening, not browsing recommendations or chatting inside a second assistant.

## 2. Outcome and proof

The primary task is to turn a cultural premise into one editable, internally consistent evening plan and then approve a **host packet**. Success means the host can see and revise the relationship among the menu, wine and zero-proof pairings, music, reading, guests, shopping, prep, timing, and cultural rationale. The product proves its work with visible source/provenance labels, dietary and availability checks, conflict warnings, WebMCP tool receipts, and undoable plan changes grounded in the local catalog and connected providers.

## 3. Selected direction

The visual authority is the approved **Speculative Salon Ledger** direction comp. The app behaves like a living issue of a Black literary-arts journal crossed with an event producer’s annotated run-of-show: the dinner thesis and six-movement sequence are the dominant editorial spread; recipes, bottles, tracks, readings, and host decisions sit in structured columns; ChatGPT’s tool actions arrive as timestamped marginalia rather than chat bubbles. The focal moment is an expanded evening movement where cultural intent, food, pairing, music, sourcing, and state can be read and edited together. Implementation must preserve the asymmetric folio topology, visible editorial hierarchy, tactile paper-and-ink material, and compact operational density; translating it into a conventional card dashboard would change the direction.

## 4. Scope and boundaries

The designed product includes four connected operating surfaces: an empty/new dinner planner, the populated live dinner board, shopping and prep, and final review/export. The first high-fidelity target is the populated desktop **Seed & Stars** board, with a mobile adaptation and a state map. Existing catalog JSON, schemas, validator, provider decisions, and architecture documentation remain source material rather than being redesigned in this phase. Explicit anti-goals are a marketing landing page, a duplicate in-app chatbot, generic AI gradients, a galaxy-themed Afrofuturist skin, an image-first restaurant site, copyrighted book-cover reproduction, and a collection of interchangeable rounded cards.

## 5. States and ranges

The design must carry realistic quiet and dense plans: 2–16 guests; 3–8 evening movements; 3–12 menu items; wine and nonalcoholic pairings; 10–80 shopping lines; 5–30 prep tasks; and enough music for a 2–5 hour event. Material states include empty, researching, draft, changed by agent, awaiting confirmation, confirmed, unavailable, dietary conflict, schedule conflict, deferred, ready for review, exporting, and export failed. Every agent mutation has a receipt, visible before/after meaning, and a recoverable undo path.

## 6. Interaction and layout

Desktop uses a compact utility header, folio index at left, asymmetric living spread in the center, and agent marginalia rail at right. Selecting an evening movement changes the central working plate without losing the sequence; inline controls edit or replace linked cultural objects; confirmations stamp the plan and update dependent shopping/prep totals; conflicts stay attached to the affected choice. The site gives immediate visual feedback for tool activity and then resolves it into a durable receipt. On tablet, the folio index compresses and marginalia becomes a drawer. On mobile, the issue becomes a serial stack led by the evening sequence, with a sticky current movement and explicit access to agent receipts; no information is discarded simply to preserve the desktop composition. Motion is restrained to page/plate transitions, annotation arrival, status stamping, and timeline changes, with reduced-motion equivalents.

## 7. Constraints and open decisions

The implementation platform is Next.js, TypeScript, and Vercel. WebMCP tools are the primary interaction contract; every tool both updates page state and returns a structured result to ChatGPT. The minimum build must expose the locked nine-tool set, work with the validated local catalogs, remain usable when live providers fail, and keep API credentials server-side. Accessibility target is WCAG 2.2 AA: semantic landmarks, full keyboard operation, visible focus, text alternatives, redundant non-color state cues, readable minimum type, and no rasterized core text or controls. The builder must not invent a different visual world, an additional chat surface, unsupported provider claims, or irreversible agent actions. Exact production typefaces, responsive breakpoints, data caching, PDF rendering library, and the two remaining composition variants are implementation-phase decisions that require the next Impeccable approval point.

## Shape decision receipt

- Direction chosen by the user: **The Speculative Salon Ledger**
- Build path: **Comp-first**
- Composition approved by the user: **Run-of-Show Spine**
- Composition consequence: the chronological evening spine is dominant, one movement expands into the working plate, agent marginalia remains separate but linked, and shopping/prep/completeness/export remain persistent below.
- Do not literalize: the comp’s tiny print is a density guide rather than an excuse for inaccessible type; handwritten marginalia remains selectable semantic text; the print grain is atmosphere rather than a rasterized interface; and the fixed desktop columns must adapt rather than merely shrink on mobile.
