---
workflow: product-launch-video
flow: automation
storyboard: yes
message: "Supper Club AI is an agent-readable cultural hosting workspace where people and agents coordinate one transparent, hostable plan through WebMCP."
destination: youtube
aspect: 1920x1080
language: en
audience: "WebMCP hackathon judges"
length: 2m55s
angle: "Show the real product and one complete WebMCP workflow, with visible provider receipts, host-control boundaries, and a credible retailer expansion path."
narration: yes
vo_mode: restructure
voice_provider: ElevenLabs
voice_model: eleven_v3
voice_id: RILOU7YmBhvwJGDGjNmP
---

## Intent

Create a public, judge-facing demonstration that shows Supper Club AI working in
the first seconds and makes WebMCP the centerpiece. Present the product as an
agent-readable cultural hosting workspace, not a generic AI dinner planner. Use
Toni Morrison's *Jazz* as the cultural dinner example and show how a host and
ChatGPT create, inspect, revise, price, prepare, approve, and export the same
shared plan.

## Assets

- https://www.thesupperclub.app/ — canonical public application and visual source of truth.
- ChatGPT desktop application — records the real agent conversation, in-app browser, and WebMCP tool activity.
- Existing Supper Club AI interface and brand assets — preserve the Night Service and paper-ledger design language.

## Customizations

- Record the ChatGPT interaction and Supper Club workspace as separate, readable clips rather than a tiny full-desktop view.
- Begin in a clean standard ChatGPT conversation, open the base site, allow the page to register its WebMCP tools, and only then request a new plan.
- Show genuine `create_party_plan`, recipe revision, shopping/prep, and grocery-pricing tool activity.
- Make live GrapeMinds wine discovery the pairing centerpiece: request wine
  pairings for every food course and show the GrapeMinds provider receipts.
- Include a nearby grocery estimate with location, coverage, savings when available, and confidence.
- Close with an original HyperFrames motion-graphics sequence for the embedded-storefront opportunity, distinguishing live Kroger capabilities from roadmap commerce tools.
- Use concise on-screen text for lists and status details; narration should carry the human story instead of reading every label aloud.
- Use one ElevenLabs v3 narration file per story beat plus a combined master,
  with voice `RILOU7YmBhvwJGDGjNmP` and restrained expressive audio tags.
- Use captions, restrained brand-aligned transitions, subtle cursor emphasis, and no background-music bed.

## Notes

- The final video must be under three minutes and public on YouTube.
- Put the working product in the first 10–15 seconds.
- Do not record sign-in, setup, loading, typing long prompts, or dead air.
- Do not expose API keys, environment variables, private notifications, or unrelated conversations.
- The demo must use the website's WebMCP tools, not the Supper Club MCP plugin and not browser-only imitation of tool actions.
- This is a wine-only demo. Never request, generate, show, or narrate
  zero-proof or non-alcoholic pairings.
- Consequential actions remain user-confirmed. Show the agent stopping first,
  then show the host explicitly approving finalization and the kitchen recipe
  packet download. Do not export the separate host packet.
- Kroger location search, retailer package matching, stock, promotions, confidence, and basket estimates are live today. Store-specific discounts, coupons, bottle inventory, and a reviewable cart are roadmap tools; any purchase would still require explicit host confirmation.
