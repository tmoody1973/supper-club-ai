# Judge Testing Instructions

Supper Club AI is public at [thesupperclub.app](https://www.thesupperclub.app/). No login, test account, or API credentials are required. All provider credentials are configured server-side and are never exposed to the browser.

## Recommended WebMCP test

1. Start a fresh ChatGPT conversation with the in-app browser available.
2. Ask ChatGPT:

   > Open https://www.thesupperclub.app/

3. Wait for the Supper Club AI workspace to load. The webpage registers its twenty-eight page-native WebMCP tools after it opens.
4. Ask ChatGPT:

   > Use the WebMCP tools registered by the open Supper Club AI website—not the Supper Club MCP plugin—to create a dinner inspired by Toni Morrison's *Jazz* for 8 guests with a $250 budget. Include wine pairings and do not include zero-proof pairings. Show the provider receipts.

## Expected result

- ChatGPT calls `create_party_plan` rather than editing the page through generic browser controls.
- The website switches to a unique `?plan=plan-...` URL.
- The shared workspace displays a new menu, wine pairings, soundtrack, shopping list, prep timeline, cultural context, and Agent Marginalia.
- Provider receipts distinguish live results, verified matches, and reviewed fallbacks. Depending on provider availability, they may reference Spoonacular, Perplexity Agent API, GrapeMinds, Apple Music, Discogs, Kroger, or a reviewed local catalog.
- The plan remains editable and unfinalized until the host explicitly approves it.

## Test one targeted change

Ask ChatGPT:

> Use `search_recipes` to find gluten-free main-course alternatives under a $60 course cap. Preserve every other course and show me the candidates before saving anything.

After the candidates appear, choose one and ask ChatGPT to replace only that course. Then ask it to rebuild the shopping list, prep timeline, and recipe cards.

Expected behavior:

- Discovery is separated from selection: searching does not silently change the plan.
- The selected course changes while the other courses remain intact.
- Shopping and prep outputs rebuild from the updated menu.
- A course cap is not represented as verified unless location-specific grocery matches support it.

## Test grocery pricing

Ask ChatGPT to find Kroger-family stores near a US ZIP code, choose one returned location, and price the current shopping list there.

The result should show the selected store, estimated basket total, matched-item coverage, promotions when available, and confidence. Partial coverage should remain visible instead of being presented as a complete quote.

## Test approval boundaries and downloads

Ask ChatGPT to prepare recipe cards and preview the final host packet. The tools may prepare previews, but finalization and downloads require an explicit confirmation from the host.

After approving, the recipe-packet export should provide a combined PDF, individual dish cards, and a provenance manifest. The host-packet export should provide the finalized planning document.

## If WebMCP tools are not recognized

1. Keep `thesupperclub.app` open in ChatGPT's in-app browser.
2. Reload the page once and wait for the workspace to finish loading.
3. Repeat the request and explicitly say to use the tools registered by the open webpage.
4. Google Chrome with WebMCP enabled may also be used.

## Privacy and persistence notes

- Do not enter private or sensitive information into a demo plan.
- Anonymous production plans use unguessable plan IDs and expire from Redis after approximately 24 hours.
- Plan URLs act as access links during this no-account prototype.
