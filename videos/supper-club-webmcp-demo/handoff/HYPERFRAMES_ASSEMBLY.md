# HyperFrames Assembly Handoff

## Final shape

- Canvas: 1920 × 1080, 30 fps
- Planned duration: 163.9 seconds (2:43.9)
- Hard maximum: 175 seconds; never cross the three-minute judging limit
- Demo story: Toni Morrison's *Jazz* becomes *Jazz: A Harlem Supper*
- Source of truth for trims: `handoff/clip-manifest.json`
- Narration master: `narration/supper-club-demo-master.wav`
- Captions: `narration/supper-club-demo-captions.srt`
- Music: none; preserve the clarity of the product proof and narration

## Editorial rules

1. Open on the completed Jazz plan in the first second.
2. Never use `01-finished-workspace.mp4`; it contains the older Seed & Stars plan.
3. Remove provider waits and loading holds using the exact manifest ranges.
4. Crop toward one proof point at a time. Avoid shrinking the full interface until its text becomes unreadable.
5. Use the short uppercase caption assigned to each frame. The narration carries the story; captions carry tool names, counts, and status facts.
6. Preserve the real ChatGPT and Supper Club UI. Do not fabricate a tool result.
7. Build Frame 10 as clearly editorial motion graphics, not simulated product UI.

## Frame 2 tool constellation — 3.5 seconds

Overlay a quick proof-of-breadth graphic near the end of Frame 2 without adding
runtime. Begin with `28 PAGE-NATIVE WEBMCP TOOLS`, reveal six connected clusters,
then collapse the network into a single plan card. Use the exact names from
`handoff/tool-constellation.json`. The six cluster labels should be readable;
individual tool names may cascade quickly and resolve into a final freeze. This
is a breadth beat, not a feature tutorial, so the existing narration stays unchanged.

## Frame 10 motion-graphics direction — 20 seconds

Match Supper Club AI's Night Service and paper-ledger visual language: warm black,
bone paper, tomato red, acid green, thin rules, monospaced labels, editorial serif
headlines, restrained grain, and decisive rather than playful motion.

### 0.0–2.5s — Chapter card

- `10 / WHERE THIS CAN GO`
- `A NEW KIND OF STOREFRONT EXPERIENCE`
- Animate the chapter number, rule, then headline in that order.

### 2.5–6.0s — Transformation

- A compact shopping-list card moves into the center.
- A store pin, wine bottle, and basket assemble around it.
- Connecting rules make the relationship explicit: plan → local inventory → guided basket.

### 6.0–12.5s — Live today

- Header: `LIVE TODAY · KROGER`
- Reveal two rows of compact evidence chips:
  - `LOCATION SEARCH`
  - `PACKAGE MATCHING`
  - `STOCK`
  - `PROMOTIONS`
  - `CONFIDENCE`
  - `BASKET ESTIMATES`
- Use filled acid-green chips and a small `LIVE` indicator. Let these labels do the explaining; do not add them to the voiceover.

### 12.5–16.5s — Roadmap, clearly separated

- Header: `ROADMAP`
- Reveal outlined, non-filled chips:
  - `STORE DISCOUNTS`
  - `COUPONS`
  - `BOTTLE INVENTORY`
  - `REVIEWABLE CART`
- Keep the roadmap visually secondary so it cannot be mistaken for a shipped feature.

### 16.5–20.0s — Host control and close

- Bring the basket to a confirmation boundary.
- End card: `HOST CONFIRMATION BEFORE PURCHASE`
- Resolve on `thesupperclub.app`
- Hold the final URL for at least 1.5 seconds.

## Audio behavior

- Align each narration clip to its frame start; the master already contains those offsets.
- Do not time-stretch the generated speech. Every line fits its assigned window.
- Use the intentional slack after each line for interface proof and visual comprehension.
- Keep captions readable but subordinate to the product UI; two lines maximum.
