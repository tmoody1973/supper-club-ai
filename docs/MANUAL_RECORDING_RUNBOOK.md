# Supper Club AI — Manual Demo Recording Runbook

This is the human-operated version of the demo plan. You control ChatGPT,
paste the prompts, and record short source clips. HyperFrames will assemble the
clips, add the visual labels, narration, captions, crops, and transitions.

You do **not** need Codex CLI or `deskagent` for this workflow.

## The finished demo

- Maximum length: `2:55`
- Canvas: `1920 × 1080`, 16:9
- Source: ChatGPT desktop app plus Supper Club AI in its in-app browser
- Main story: create one new cultural dinner with genuine WebMCP tools, revise
  one course, synchronize the practical work, price groceries, inspect sources,
  and show where the product can go next
- Demo dinner: *Kindred* by Octavia E. Butler, eight guests, budget near $220,
  one gluten-free guest, and GrapeMinds-sourced wine pairings for every food
  course
- Hard constraint: this is a wine-only demo. Never request, generate, show, or
  narrate zero-proof or non-alcoholic pairings.

## Before recording

1. Turn on macOS Do Not Disturb.
2. Close or hide unrelated apps and notifications.
3. Open the ChatGPT desktop app.
4. Make the ChatGPT window large and keep it the same size for every clip.
5. Use the browser-capable ChatGPT conversation mode. The current app may label
   it `Work`; it is still the ChatGPT conversation used in the demo.
6. Create a new conversation and choose `Don't work in a project` if an
   unrelated project is attached.
7. Do not show API keys, `.env` files, private conversations, notifications, or
   unrelated browser tabs.
8. Copy each prompt before recording. Paste it during the take; do not type long
   prompts live.

## How to record each clip on macOS

Use `Shift + Command + 5` and choose **Record Selected Portion**.

- Frame the ChatGPT window and its in-app browser.
- Keep the microphone off; narration will be added later.
- Record one source clip at a time.
- Begin with one second of stillness.
- Perform only the action listed for that clip.
- End with two seconds of stillness on the important result.
- Stop the recording from the macOS menu bar.
- Rename the `.mov` immediately using the filename below.
- If a take contains a mistake, notification, loading wait, or private content,
  discard it and record the clip again.

Place accepted clips in:

```text
/Users/tarikmoody/Projects/WebMCP/videos/supper-club-webmcp-demo/recording/raw/
```

## Source-clip checklist

These are source captures, not final edit durations. A few story beats use two
source clips so HyperFrames can remove waits and preserve readable results.

| Capture | Filename | What it proves |
|---|---|---|
| 01 | `01-finished-workspace.mov` | The complete, coherent product experience |
| 02 | `02-new-chat-open-site.mov` | The webpage is opened before its WebMCP tools are used |
| 03 | `03-create-party-plan.mov` | The real `create_party_plan` invocation |
| 04 | `04-provider-results.mov` | A new plan, provider receipts, and transparent fallbacks |
| 05a | `05a-search-recipes.mov` | Search and host review happen before mutation |
| 05b | `05b-replace-main-course.mov` | One selected course changes without rebuilding the evening |
| 06 | `06-shopping-and-prep.mov` | Shopping and prep synchronize with the revised menu |
| 07a | `07a-find-grocery-store.mov` | The host chooses a real store before pricing |
| 07b | `07b-grocery-pricing.mov` | Local estimate, coverage, promotions, confidence, unmatched items |
| 08 | `08-atmosphere-provenance.mov` | GrapeMinds wines, Apple Music, and Agent Marginalia stay inspectable |
| 09 | `09-host-control-close.mov` | Finalization and export still require the host |
| 10 | `10-storefront-future.mov` | Live retailer value today versus roadmap commerce features |

## Clip 01 — Finished workspace hook

**Record:** 8–15 seconds.

1. Open your strongest completed Supper Club plan.
2. Start on a wide view showing the book cover or cultural inspiration, Run of
   Show, menu, pairings, shopping count, prep count, and Agent Marginalia.
3. Slowly scroll or select one movement so the dish, sourcing, pairing, and
   music details are readable.
4. Do not open menus or edit anything.

Save as `01-finished-workspace.mov`.

HyperFrames label: `ONE SHARED, AGENT-READABLE PLAN`

## Clip 02 — New conversation and canonical website

**Record:** 8–15 seconds, excluding the site-loading wait.

1. Create a new ChatGPT conversation.
2. If asked, choose `Don't work in a project`.
3. Start recording on the empty composer.
4. Paste and send:

```text
Open https://www.thesupperclub.app/ in the ChatGPT in-app browser. Wait until
the Supper Club AI workspace is visible. Do not create or change a plan yet.
```

5. Keep the canonical `.app` URL visible briefly.
6. Stop before the long loading wait. Do not record the wait.

Save as `02-new-chat-open-site.mov`.

Wait until the Supper Club workspace is fully loaded before recording Clip 03.

HyperFrames label: `THE PAGE REGISTERS ITS WEBMCP TOOLS`

## Clip 03 — Create a genuinely new plan

**Record:** 10–20 seconds. Capture the real tool invocation, then stop before
the provider wait.

Confirm that `thesupperclub.app` is still open in the in-app browser. Paste and
send:

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

Keep recording until ChatGPT visibly invokes `create_party_plan` or displays
its tool receipt. Stop before the provider work finishes.

Save as `03-create-party-plan.mov`.

HyperFrames label: `WEBMCP TOOL 25 · CREATE_PARTY_PLAN`

## Clip 04 — New plan and provider receipts

Do not record the loading period. Wait until the request from Clip 03 finishes.

**Record:** 15–25 seconds.

Show all of the following if available:

- the new plan title and plan ID or URL;
- *Kindred* cover and short book context;
- recipe provider receipts for each course;
- GrapeMinds wine source status and provider receipts;
- Perplexity discovery status;
- Apple Music verification status;
- any honest reviewed-catalog fallback;
- the new plan active in the website.

Slowly scroll through the completed receipt and the activated plan. Do not hide
fallbacks or warnings.

Save as `04-provider-results.mov`.

Copy the new plan URL into your notes. This is the hero plan used in every
remaining clip.

HyperFrames label: `LIVE PROVIDERS + REVIEWED FALLBACKS`

## Clip 05a — Search for a replacement course

Before recording, use `find_grocery_stores` for ZIP code `53202`, choose one
store, and copy its exact `locationId`. Replace the placeholder below. This
setup is read-only and does not create a cart.

**Record:** 8–15 seconds.

Paste and send:

```text
Use search_recipes to find three gluten-free main-course alternatives. Then use
price_recipe_candidates with Kroger location ID PASTE STORE LOCATION ID HERE to
compare those exact recipe IDs against a $60 course cap. Keep every current
course unchanged. Show the store, estimated subtotal, ingredient coverage,
confidence, unpriced ingredients, and cap status for every candidate before
saving anything.
```

Show the `search_recipes` and `price_recipe_candidates` invocations and the
candidate estimates. Keep the results on screen long enough to read. Choose the
strongest result, but do not apply it yet.

Save as `05a-search-recipes.mov`.

Write down the exact candidate title. You will paste that title into Clip 05b.

## Clip 05b — Replace only the selected course

Replace `PASTE THE EXACT CANDIDATE TITLE HERE` before recording.

**Record:** 8–15 seconds.

```text
Use replace_menu_course to replace only the main course with PASTE THE EXACT
CANDIDATE TITLE HERE. Keep every other course, pairing, and movement intact.
Return the visible change receipt and the updated plan version.
```

Show the `replace_menu_course` receipt, updated plan version, and revised main
course in the website.

Save as `05b-replace-main-course.mov`.

HyperFrames combines 05a and 05b under:
`CHANGE ONE DECISION · KEEP THE EVENING`

## Between Clips 05b and 06 — Restore the revised course's wine

Replacing a dish correctly removes that course's old pairing because it may no
longer fit. Complete this setup before recording Clip 06. You do not need to
record the search wait.

Paste and send:

```text
Use search_wines for the revised main course. Prefer live GrapeMinds results,
show me the candidates, and do not save one until I choose it.
```

Choose one live GrapeMinds candidate and copy its exact name. Then paste and
send, replacing the placeholder:

```text
Use set_wine_pairing to attach PASTE THE EXACT WINE NAME HERE to the revised
main course. Show the GrapeMinds source and the saved plan version. Do not
create a zero-proof or non-alcoholic pairing.
```

Confirm that all three food courses again have wine pairings before continuing.

## Clip 06 — Shopping list and prep timeline

**Record:** 12–20 seconds after both tools finish.

Paste and send:

```text
Use create_shopping_list to rebuild the current plan's ingredients and organize
the result by dish and aisle. Then use create_prep_timeline to create a practical
cooking schedule from the revised menu. Do not finalize the plan.
```

Do not record the wait. Once finished, record the shopping-list total, several
readable dish/aisle groups, and the prep timeline. Scroll slowly. The revised
main course should be reflected in both outputs.

Save as `06-shopping-and-prep.mov`.

HyperFrames label: `THE PLAN BECOMES PRACTICAL WORK`

## Clip 07a — Find a nearby grocery store

**Record:** 8–12 seconds after results appear.

Paste and send:

```text
Use find_grocery_stores to find Kroger-family stores near ZIP code 53202. Show
the choices and do not price the basket until I select a location.
```

Record the store choices. Select one valid store and copy both its displayed
name and exact location identifier into your notes.

Save as `07a-find-grocery-store.mov`.

## Clip 07b — Price the synchronized basket

Replace both placeholders before recording.

```text
Use price_shopping_list for PASTE STORE NAME with location identifier PASTE
STORE IDENTIFIER. Estimate the current plan's grocery total and show the
location, matched coverage, promotional savings when present, confidence, and
which unmatched items still require host review.
```

Do not record the provider wait. Record the completed result with:

- store name and location;
- estimated basket total;
- matched-item coverage;
- promotional savings, if present;
- confidence;
- unmatched items requiring review.

Save as `07b-grocery-pricing.mov`.

HyperFrames combines 07a and 07b under:
`LOCAL ESTIMATE · COVERAGE · CONFIDENCE`

## Clip 08 — Wine, music, and provenance

No new prompt is required if the current plan already contains the enriched
results.

**Record:** 15–25 seconds.

In the website, show:

1. GrapeMinds-sourced wine pairings for every food course;
2. Apple Music album artwork;
3. one working preview, if Apple provides one;
4. `Open in Apple Music` when a preview is unavailable;
5. provider or verification badges;
6. discovery/source links;
7. the scrollable Agent Marginalia receipts and warnings.

Save as `08-atmosphere-provenance.mov`.

HyperFrames label: `SOURCES AND CHANGES STAY VISIBLE`

## Clip 09 — Host control boundary

**Record:** 10–16 seconds after ChatGPT responds.

Paste and send:

```text
Review the current plan's provider receipts, dietary warnings, and Agent
Marginalia. Explain what still requires host review. Do not finalize the plan
and do not export or download a host packet.
```

Show the warnings and the still-unpressed finalization or export control. Do not
click Finalize, Export, Download, or purchase anything.

Save as `09-host-control-close.mov`.

HyperFrames label: `THE AGENT COORDINATES · THE HOST DECIDES`

## Clip 10 — Where this can go

**Record:** 15–25 seconds.

Paste and send:

```text
Open the Supper Club AI About / How to Use page in the in-app browser and
navigate to “10 / WHERE THIS CAN GO.” Do not call a tool, change the plan, or
start a purchase.
```

Record the real About-page section. If it is not available, record a clean
return to the grocery-pricing result instead; HyperFrames will create the final
title card without inventing application UI.

The final edit must clearly distinguish:

- **Live now:** Kroger location search, retailer package matching, stock,
  promotions, confidence, and basket estimates.
- **Roadmap:** store-specific discounts, coupons, bottle inventory, and a
  reviewable cart.
- **Host control:** every purchase would still require explicit confirmation.

Save as `10-storefront-future.mov`.

HyperFrames labels:

- `10 / WHERE THIS CAN GO`
- `A NEW KIND OF STOREFRONT EXPERIENCE`

## Narration for HyperFrames

The exact ten narration passages and final timing are already in
[`CODEX_RECORDING_RUNBOOK.md`](./CODEX_RECORDING_RUNBOOK.md) under
**Clip plan and ElevenLabs narration**. Do not record narration into the screen
captures. HyperFrames will use those passages after measuring the accepted
clips.

## Final review before handoff

For every `.mov`, confirm:

- the correct filename is used;
- no passwords, tokens, notifications, or private chats are visible;
- the relevant tool name or result is readable;
- no long loading wait is included;
- the mouse is not moving randomly;
- the beginning has one clean second;
- the end has two clean seconds;
- the clip opens and plays successfully.

## What to hand to HyperFrames

Provide the entire folder:

```text
/Users/tarikmoody/Projects/WebMCP/videos/supper-club-webmcp-demo/
```

At minimum it must contain:

```text
BRIEF.md
CODEX_RECORDING_RUNBOOK.md
MANUAL_RECORDING_RUNBOOK.md
recording/raw/01-finished-workspace.mov
recording/raw/02-new-chat-open-site.mov
recording/raw/03-create-party-plan.mov
recording/raw/04-provider-results.mov
recording/raw/05a-search-recipes.mov
recording/raw/05b-replace-main-course.mov
recording/raw/06-shopping-and-prep.mov
recording/raw/07a-find-grocery-store.mov
recording/raw/07b-grocery-pricing.mov
recording/raw/08-atmosphere-provenance.mov
recording/raw/09-host-control-close.mov
recording/raw/10-storefront-future.mov
```

HyperFrames should assemble the source clips into the ten-beat, `2:55` edit
defined in `CODEX_RECORDING_RUNBOOK.md`, then add the ElevenLabs narration,
captions, restrained Supper Club labels, and final 1920 × 1080 export.
