# Supper Club AI — Codex Desktop Recording Runbook

Use this file from Codex CLI to explore, rehearse, and record the source clips
for the Supper Club AI WebMCP hackathon demo.

For a human-operated workflow using macOS screen recording, use
[`MANUAL_RECORDING_RUNBOOK.md`](./MANUAL_RECORDING_RUNBOOK.md) instead.

## Start the Codex CLI run

```text
cd /Users/tarikmoody/Projects/WebMCP/videos/supper-club-webmcp-demo
codex
```

Then send:

```text
$desktop-recorder Follow CODEX_RECORDING_RUNBOOK.md exactly. Explore first,
prepare one deterministic screenplay per clip, dry-run every screenplay, and
show me the screenplay plan before recording final takes. You may inspect,
control, and record only the ChatGPT desktop application and the Supper Club AI
experience inside its in-app browser. Do not interact with any other app.
```

Run this from the standalone Codex CLI in Terminal, not from a Codex desktop
task inside the same ChatGPT window being recorded. A desktop task can reclaim
focus whenever it emits progress or tool output, causing control events to land
in the build thread instead of the demo conversation.

## Authorization and scope

The host approved this run on 2026-09-02.

- Allowed: ChatGPT desktop application.
- Allowed: Supper Club AI inside ChatGPT's in-app browser.
- Not allowed: any unrelated application, browser window, conversation, file,
  notification, or system setting.
- `deskagent control` may click and type only inside the two allowed experiences.
- Use foreground `deskagent control` for ChatGPT. Do not use `--background`:
  Electron/WebKit can keep hidden text fields active beneath the visible new-chat
  screen.
- Never expose credentials, environment variables, private chats, or unrelated
  browser tabs.
- The operator should enable Do Not Disturb manually before the final takes.

## Canonical URL and clean-chat requirement

Use this exact public URL:

```text
https://www.thesupperclub.app/
```

Do not use `thesupperclub.ai`, the Vercel URL, or a URL containing an old
`?plan=` value. The base `.app` URL is the canonical public application and
prevents an existing plan from contaminating the new-plan demonstration.

Before invoking any Supper Club tool:

1. Activate the ChatGPT desktop application.
2. Create a **new ChatGPT conversation**. The current app may label its
   browser-capable conversation mode as Work; this is still the ChatGPT
   conversation shown in the demo. Do not continue an old Supper Club
   conversation and do not expose the Codex build thread.
3. Confirm the composer is empty and no old plan/browser panel is attached.
4. Paste the site-opening prompt below.
5. If this app version displays a ChatGPT browser/Work handoff, accept it. This
   is part of opening the in-app browser, not a switch to the Supper Club MCP
   plugin.
6. Wait off-camera for the in-app browser to finish loading.
7. Confirm the Supper Club workspace is visible.
8. Only then paste the WebMCP planning request.

The site must be open first because the page registers its WebMCP tools after
loading. Opening the site and requesting a plan are intentionally separate
steps.

## Prepared ChatGPT prompts

### Prompt A — open the site and register its page tools

```text
Open https://www.thesupperclub.app/ in the ChatGPT in-app browser. Wait until
the Supper Club AI workspace is visible. Do not create or change a plan yet.
```

### Prompt B — create a genuinely new plan through WebMCP

```text
Use the WebMCP tools registered by the open Supper Club AI website—not the
Supper Club MCP plugin and not ordinary browser clicks—to create a new cultural
dinner inspired by Kindred by Octavia E. Butler for eight guests with a total
budget near $220. Include one gluten-free guest and wine pairings for every
food course. Do not create or include zero-proof or non-alcoholic pairings. Use
create_party_plan, leave any previous plan untouched, open the returned plan in
the website, use GrapeMinds for live wine discovery, and show the provider
receipts for the theme, recipes, GrapeMinds wines, and soundtrack.
```

### Prompt C — search before changing one course

```text
Use search_recipes to find three gluten-free main-course alternatives. Then use
price_recipe_candidates with Kroger location ID {{SELECTED_STORE_LOCATION_ID}}
to compare those exact recipe IDs against a $60 course cap. Keep every current
course unchanged. Show the store, estimated subtotal, ingredient coverage,
confidence, unpriced ingredients, and cap status for every candidate before
saving anything.
```

During exploration, record the strongest valid candidate as
`{{SELECTED_MAIN_COURSE}}`. Also record a valid Kroger location identifier as
`{{SELECTED_STORE_LOCATION_ID}}`. Replace both placeholders before the dry run.

### Prompt D — apply only the reviewed replacement

```text
Use replace_menu_course to replace only the main course with
{{SELECTED_MAIN_COURSE}}. Keep every other course, pairing, and movement intact.
Return the visible change receipt and the updated plan version.
```

### Prompt E — synchronize shopping and preparation

Before Prompt E, restore the revised course's pairing. Replacing a dish
intentionally removes that course's old pairing because it may no longer fit.

```text
Use search_wines for the revised main course. Prefer live GrapeMinds results,
show me the candidates, and do not save one until I choose it.
```

After choosing a candidate, run:

```text
Use set_wine_pairing to attach {{SELECTED_MAIN_WINE}} to the revised main
course. Show the GrapeMinds source and the saved plan version. Do not create a
zero-proof or non-alcoholic pairing.
```

```text
Use create_shopping_list to rebuild the current plan's ingredients and organize
the result by dish and aisle. Then use create_prep_timeline to create a practical
cooking schedule from the revised menu. Finally, use prepare_recipe_cards to
preview one kitchen card per dish with scaled ingredients, functional steps,
dietary warnings, wine pairings, and authoritative source links. Do not finalize
the plan and do not download a file yet.
```

### Prompt F — choose a grocery location before pricing

```text
Use find_grocery_stores to find Kroger-family stores near ZIP code 53202. Show
the choices and do not price the basket until I select a location.
```

During exploration, record a valid store as `{{SELECTED_STORE}}` and its tool
identifier as `{{SELECTED_STORE_ID}}`. Replace both placeholders before the dry
run.

### Prompt G — price the synchronized basket

```text
Use price_shopping_list for {{SELECTED_STORE}} with location identifier
{{SELECTED_STORE_ID}}. Estimate the current plan's grocery total and show the
location, matched coverage, promotional savings when present, confidence, and
which unmatched items still require host review.
```

### Prompt H1 — stop at the host-control boundary

```text
Review the current plan's provider receipts, dietary warnings, and Agent
Marginalia. Include the recipe-card source and quantity-scaling warnings, and
explain what still requires host review. I have not approved finalization or a
download. Stop and ask for my explicit confirmation before calling
finalize_party_plan or export_recipe_packet.
```

### Prompt H2 — explicitly approve finalization and recipe export

```text
I have reviewed the current plan and explicitly approve finalizing it and
downloading its kitchen recipe packet. Use finalize_party_plan with confirm
true for the current plan ID and version. After finalization succeeds, use
export_recipe_packet with confirm true and the newly returned plan version.
Show the finalization receipt, export receipt, downloaded filename, number of
dish cards, and included files. Do not export the host packet and do not start
any purchase.
```

### Prompt I — open the retailer opportunity section

```text
Open the Supper Club AI About / How to Use page in the in-app browser and
navigate to “10 / WHERE THIS CAN GO.” Do not call a tool, change the plan, or
start a purchase.
```

This is an explanatory navigation beat, not a WebMCP tool call. During
exploration, verify that the section is present and readable. If it is not,
build the closing title in HyperFrames over the accepted grocery-results clip;
do not invent application UI.

## Recording format

- Final canvas: 1920 × 1080, 16:9.
- Source capture: supersample 2 where supported.
- Final quality: high.
- Handoff source: preserve the highest-quality `.mov` capture available.
- Composition background: `#11110F`.
- Layout: one readable application region at a time; no tiny whole-desktop view.
- Padding: 60 pixels when a clip is placed inside a HyperFrames treatment.
- Cursor: native macOS arrow and pointing hand.
- Click emphasis: restrained coral ripple matching Supper Club accents.
- Camera: subtle follow-cursor zoom; no large novelty zooms.
- State verification: screenshot plus at least two state-specific assertions per
  final take.
- Recovery: discard and re-record failed takes. Never repair a live take.

## Clip plan and ElevenLabs narration

The target cut is 2 minutes 55 seconds. Record each clip separately. Do not
record provider waits; stop after the real invocation is visible and resume with
a separate completed-state clip.

The narration below is the spoken master. Generate one ElevenLabs file per clip
after the final picture duration is known. Leave roughly one second of clean
tail after each line. Do not add a background-music bed.

### Clip 01 — Finished workspace hook

- Target picture: `00:00–00:12` (12 seconds)
- Source file: `recording/raw/01-finished-workspace.mov`
- Show: the strongest completed plan, Run of Show, menu, pairings, music, and
  visible source/agent context. Determine `{{HERO_PLAN_URL}}` during exploration.
- On-screen label: `ONE SHARED, AGENT-READABLE PLAN`
- ElevenLabs file: `narration/clips/01-finished-workspace.wav`
- Narration:

> This is Supper Club AI: an agent-readable cultural hosting workspace. One
> evening brings the menu, wine, music, shopping, preparation, and sources into
> a shared plan.

### Clip 02 — Clean ChatGPT conversation and canonical URL

- Target picture: `00:12–00:24` (12 seconds)
- Source file: `recording/raw/02-new-chat-open-site.mov`
- Show: create a new ChatGPT conversation, paste Prompt A, and show the
  canonical `.app` URL opening. If the app presents a browser handoff, accept
  it, then cut before loading and resume on the ready state.
- On-screen label: `THE PAGE REGISTERS ITS WEBMCP TOOLS`
- ElevenLabs file: `narration/clips/02-new-chat-open-site.wav`
- Narration:

> We begin in a clean ChatGPT conversation and open thesupperclub dot app. Once
> the page loads, its twenty-eight Web M-C-P tools become available to the agent.

### Clip 03 — `create_party_plan` invocation

- Target picture: `00:24–00:42` (18 seconds)
- Source file: `recording/raw/03-create-party-plan.mov`
- Show: paste Prompt B and capture the real `create_party_plan` invocation/tool
  receipt. Stop before the long provider wait.
- On-screen label: `WEBMCP TOOL 25 · CREATE_PARTY_PLAN`
- ElevenLabs file: `narration/clips/03-create-party-plan.wav`
- Narration:

> A single cultural brief now invokes create party plan. This starts a genuinely
> new evening for eight guests, carries the budget and dietary needs forward,
> and leaves the seeded demonstration untouched.

### Clip 04 — Dynamic result and provider receipts

- Target picture: `00:42–01:02` (20 seconds)
- Source file: `recording/raw/04-provider-results.mov`
- Show: the completed tool result, new plan identifier, provider receipts, and
  the newly activated workspace. Feature live and reviewed statuses honestly.
- On-screen label: `LIVE PROVIDERS + REVIEWED FALLBACKS`
- ElevenLabs file: `narration/clips/04-provider-results.wav`
- Narration:

> Every course is resolved independently. Spoonacular and Perplexity can supply
> sourced recipes; GrapeMinds supplies live wine candidates and pairing
> metadata; and Apple Music verifies the soundtrack. Receipts show what
> succeeded and where reviewed fallbacks were used.

### Clip 05 — Search, review, and replace one course

- Target picture: `01:02–01:24` (22 seconds)
- Source files:
  - `recording/raw/05a-search-recipes.mov`
  - `recording/raw/05b-replace-main-course.mov`
- Show: Prompt C, reviewed candidates, then Prompt D with the selected result.
  Capture the tool receipt and updated plan version.
- On-screen label: `CHANGE ONE DECISION · KEEP THE EVENING`
- ElevenLabs file: `narration/clips/05-replace-course.wav`
- Narration:

> The host can change one decision without rebuilding the whole evening.
> ChatGPT searches for gluten-free mains, keeps the budget preference visibly
> unverified, and replaces only the option the host selects.

### Clip 06 — Shopping, preparation, and recipe cards

- Target picture: `01:24–01:42` (18 seconds)
- Source file: `recording/raw/06-shopping-and-prep.mov`
- Show: Prompt E, shopping list by dish and aisle, the synchronized prep
  timeline, then the `prepare_recipe_cards` receipt and one readable card with
  scaling status and source link. Feature readable totals rather than every line item.
- On-screen label: `THE PLAN BECOMES PRACTICAL WORK`
- Secondary label: `WEBMCP TOOL 27 · PREPARE_RECIPE_CARDS`
- ElevenLabs file: `narration/clips/06-shopping-and-prep.wav`
- Narration:

> That revision flows downstream. Ingredients are reconciled by dish, translated
> into a practical preparation timeline, and assembled into source-aware kitchen
> cards with visible scaling and safety review.

### Clip 07 — Nearby grocery pricing

- Target picture: `01:42–01:56` (14 seconds)
- Source file: `recording/raw/07-grocery-pricing.mov`
- Show: the selected store and Prompt G result. Feature location, estimated
  total, coverage, savings when available, confidence, and unmatched count.
- On-screen label: `LOCAL ESTIMATE · COVERAGE · CONFIDENCE`
- ElevenLabs file: `narration/clips/07-grocery-pricing.wav`
- Narration:

> With an explicit store choice, grocery tools estimate the local basket. The
> result reports coverage, promotions, and confidence instead of pretending
> every ingredient matched perfectly.

### Clip 08 — Wine, music, and visible provenance

- Target picture: `01:56–02:16` (20 seconds)
- Source file: `recording/raw/08-atmosphere-provenance.mov`
- Show: GrapeMinds-sourced wine pairings, GrapeMinds provider receipts, Apple
  Music artwork or previews, provider badges, discovery links, and scrollable
  Agent Marginalia.
- On-screen label: `SOURCES AND CHANGES STAY VISIBLE`
- ElevenLabs file: `narration/clips/08-atmosphere-provenance.wav`
- Narration:

> Wine and music stay inspectable, too. GrapeMinds receipts show the live wine
> source, while Apple Music matches provide artwork, previews, and source links.
> Agent Marginalia records provider decisions and warnings beside the plan.

### Clip 09 — Host-control boundary

- Target picture: `02:16–02:30` (14 seconds)
- Source files: `recording/raw/09a-host-control-boundary.mov` and
  `recording/raw/09b-approved-recipe-export.mov`
- Show: Prompt H1 and ChatGPT stopping for explicit confirmation, then Prompt
  H2, genuine `finalize_party_plan` and `export_recipe_packet` calls, and the
  successful kitchen-packet download receipt. Cut all waiting.
- On-screen label: `THE AGENT COORDINATES · THE HOST DECIDES`
- Secondary label: `WEBMCP TOOL 28 · EXPORT_RECIPE_PACKET`
- ElevenLabs file: `narration/clips/09-host-control-close.wav`
- Narration:

> The agent can research and coordinate, but the host stays in control.
> Finalization and downloads wait for explicit confirmation. Once the host
> approves, WebMCP finalizes the plan and downloads a kitchen packet with a
> combined PDF, one card per dish, and a provenance manifest.

### Clip 10 — Where this can go

- Target picture: `02:30–02:55` (25 seconds)
- Source file: `recording/raw/10-storefront-future.mov`
- Show: Prompt I and the real About-page “Where this can go” section, with a
  brief callback to the accepted grocery-location and basket-estimate result.
  Make the live-versus-roadmap distinction unmistakable. Do not imply that a
  purchase, coupon redemption, or cart creation is currently demonstrated.
- On-screen labels:
  - `10 / WHERE THIS CAN GO`
  - `A NEW KIND OF STOREFRONT EXPERIENCE`
- ElevenLabs file: `narration/clips/10-storefront-future.wav`
- Narration:

> A new kind of storefront experience: wine shops and independent grocers
> could embed Supper Club AI so a shopping list becomes a guided store
> experience. Kroger already powers location search, package matching, stock,
> promotions, confidence, and basket estimates. Store-specific discounts,
> coupons, bottle inventory, and a reviewable cart are next—and every purchase
> still requires the host’s explicit confirmation.

## Narration production rules

1. Do not synthesize narration until all accepted source clips have measured
   durations.
2. Use ElevenLabs with a warm, grounded, confident voice—never a high-energy
   advertisement read.
3. Generate one file per clip using the exact narration above.
4. Preserve the text as written unless picture timing requires a shorter line.
   Any rewrite must keep the same factual claim.
5. Generate or transcribe word timings for captions after synthesis.
6. Keep narration centered and clear; there is no background-music bed.
7. UI audio and click sounds may sit quietly below narration.
8. Also produce `narration/supper-club-demo-master.wav` from the approved clip
   narration with the storyboard's inter-clip pauses.

## Exploration deliverables

Before final recording, create:

- `recording/window-manifest.json` — ChatGPT window ID, PID, frame, scale, and
  observed title.
- `recording/exploration-notes.md` — reliable labels, coordinates, waits, plan
  URL, selected main course, selected grocery store, and known popups.
- `recording/screenplays/01-*.json` through `10-*.json` — deterministic scene
  actions with window-relative coordinates.
- `recording/timelines/dry-*.json` — evidence from every rehearsal.
- A starting-state screenshot and two state-specific assertion results for each
  final take.

Do not write the final screenplays until exploration has established real
coordinates and stable result values.

## HyperFrames handoff manifest

After the accepted takes exist, create `handoff/clip-manifest.json` with one
entry per source clip:

```json
{
  "id": "03-create-party-plan",
  "path": "recording/raw/03-create-party-plan.mov",
  "durationSeconds": 18,
  "inSeconds": 0,
  "outSeconds": 18,
  "narrationPath": "narration/clips/03-create-party-plan.wav",
  "caption": "WEBMCP TOOL 25 · CREATE_PARTY_PLAN",
  "visibleTools": ["create_party_plan"],
  "dataMode": "live-with-reviewed-fallbacks",
  "crop": "chat-tool-receipt",
  "notes": "Keep the real invocation visible; cut the provider wait."
}
```

Include the real measured duration and paths for every accepted take. The
manifest is the contract HyperFrames uses to assemble the final composition.

## Completion gate

The recording phase is complete only when:

- Every final take exists and opens successfully.
- Each clip matches its planned UI state and contains no private material.
- Every WebMCP action shown is genuine.
- Every narration line has a corresponding intended picture clip.
- The clip manifest contains real durations and paths.
- The combined visual plan remains at or below 2 minutes 55 seconds before
  narration timing adjustments.
