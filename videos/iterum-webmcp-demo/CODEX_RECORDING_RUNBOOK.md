# Iterum — Complete WebMCP Demo Recording Runbook

Use this document from a standalone Codex CLI session to explore, rehearse,
record, narrate, assemble, and verify the Iterum WebMCP demo.

The finished deliverable is a public YouTube video under three minutes with
ElevenLabs narration. The video must prove that ChatGPT used tools registered
by the live Iterum page. It must not imitate WebMCP by manually completing app
forms or silently mutating campaign state.

## Start here: the exact Codex CLI prompt

Open Terminal and run:

```bash
cd /Users/tarikmoody/Projects/WebMCP/videos/iterum-webmcp-demo
codex
```

Then paste this entire prompt into Codex CLI:

```text
$desktop-recorder $hyperframes Create and record the complete Iterum WebMCP
demo by following CODEX_RECORDING_RUNBOOK.md exactly.

This is a process-proof recording, not merely a finished-board tour. Use the
Codex CLI only to inspect, rehearse, record, and assemble. Perform the visible
campaign workflow inside a clean ChatGPT/Codex desktop conversation with the
production Iterum site open in its in-app browser.

Use only WebMCP tools registered by the live Iterum page for campaign actions.
Do not simulate WebMCP by completing Iterum forms, injecting state, calling a
private test harness, or manually dragging the board. Show genuine tool calls,
structured results, review proposals, designer decisions, versions, and the
finished board. If the page tools are unavailable, stop and report the exact
problem instead of recording a substitute.

Explore first. Verify the production site, tool availability, window identity,
recording permissions, every prompt, every approval location, and the expected
start and end state. Prepare short deterministic capture segments and show me
the segment plan before final recording. Record only the ChatGPT desktop
application and Iterum inside its in-app browser. Do not interact with or
record unrelated apps, conversations, browser tabs, credentials, environment
variables, or notifications.

Run the campaign as an explicit maker/checker workflow with two independent
agent sessions. The Creative Agent may propose work but may never call a review
tool for its own proposal. The Reviewer Agent may inspect and approve or reject
work through dedicated WebMCP review tools but may never originate creative
work. The user has delegated review authority for this exact scripted demo, so
the recording must not pause for live user clicks. Every receipt must record
`proposedBy`, `reviewedBy`, the review rationale, and the two distinct session
IDs. If Iterum cannot enforce that separation, stop before recording.

Record the five source segments defined in this runbook. Preserve the raw MOV
files and evidence timelines. Do not include long provider waits in the final
cut. After the picture edit is approved, generate the final narration with
ElevenLabs. Assemble the selected footage, callouts, captions, zooms, and
narration in HyperFrames using the product-launch-video workflow. Target a
1920x1080 H.264 MP4 between 2:35 and 2:55. Never fabricate a tool call, result,
approval, asset, cost disclosure, or saved state.
```

Do not run the recording agent as a Codex desktop task inside the same window
being recorded. Run it from the standalone CLI so progress messages do not
steal focus or appear in the demo conversation.

## Non-negotiable proof standard

The viewer must be able to understand this chain:

```text
Designer mandate
    -> Iterum WebMCP tool call
    -> structured result or review proposal
    -> independent Reviewer Agent WebMCP decision
    -> versioned board change
    -> saved, presentable campaign direction
```

The recording is invalid if it:

- Uses the Projects form instead of `create_campaign_project`.
- Reuses the fragrance campaign, seeded demo, or an earlier Signal Relay board.
- Uses browser automation to impersonate a WebMCP call.
- Lets the Creative Agent approve its own work or hides the reviewer identity.
- Hides the cost disclosure before image generation.
- Treats generated raster words as canonical typography.
- Shows only the finished board without the creation trail.
- Claims export, sharing, persistence, or generation behavior that did not run.

## Product, story, and output

- Product: Iterum, a graphic-design direction workspace operated through WebMCP.
- Campaign created on camera: **Signal Relay — Recorded Demo**.
- Subject: a cobalt modular task lamp.
- Creative context: contemporary West African modernist architecture and
  material craft.
- Lead direction: **Cobalt Courtyard**.
- Destination: public YouTube.
- Aspect ratio: 16:9.
- Final resolution: 1920x1080.
- Final duration: 2:35–2:55; never exceed 3:00.
- Narration: ElevenLabs, recorded after picture lock.
- Assembly: HyperFrames `product-launch-video` workflow.
- Approval model: independent WebMCP maker/checker agents; no live user clicks.
- Music: none unless the designer explicitly adds it later.

## Hard prerequisite — WebMCP maker/checker review tools

Do not begin final recording until the production page registers and passes an
end-to-end test for all of these tools:

| Review boundary | Required Reviewer Agent tool |
| --- | --- |
| Brief | `review_campaign_brief` |
| Captured or generated reference | `review_reference_proposal` |
| Creative route | `review_creative_route` |
| Type pairing | `review_type_direction` |
| Role-based palette | `review_color_palette` |
| Board organization | `review_board_organization` |
| Generation quote | `authorize_image_generation_quote` |
| Generated candidate/application | `review_generated_asset` |
| Final territory | `review_creative_territory` |

Each review tool must require:

- `campaignId` and `boardId`.
- The exact pending proposal, route, quote, or territory ID.
- `expectedBoardVersion`.
- A stable idempotency key.
- `proposerSessionId`; the reviewer session ID comes from the validated
  reviewer pass and must be distinct.
- `decision: "approve" | "reject"`.
- A nonempty review rationale.
- For cost approval, the exact quote fingerprint and a configured cost ceiling.

The runtime must reject:

- A reviewer session matching the proposer session.
- A Creative Agent calling a review tool.
- A Reviewer Agent originating a proposal.
- A stale version or non-pending proposal.
- A quote fingerprint mismatch or cost above the delegated ceiling.
- Reuse of an idempotency key with different inputs.

The UI and run ledger must say **Reviewer Agent approved** rather than
**Designer approved**. This is transparent delegated review, not simulated
human interaction.

## Approved fictional source assets

These are original Iterum demonstration assets:

1. Product identity:
   `https://iterum-topaz.vercel.app/assets/signal-relay-cobalt-lamp-v1.png`
2. Light and material:
   `https://iterum-topaz.vercel.app/assets/signal-relay-shadow-study-v1.png`
3. Composition and atmosphere:
   `https://iterum-topaz.vercel.app/assets/signal-relay-architectural-still-life-v1.png`

Use the attribution `Original Iterum demo asset`. Preserve every origin URL.
The cobalt lamp is mandatory. Do not pull assets from a previous campaign.

## Allowed applications and authorization

The host authorized this workflow and delegated the scripted review mandate on
September 3, 2026.

- Allowed: ChatGPT/Codex desktop application.
- Allowed: Iterum production inside its in-app browser.
- Allowed URL: `https://iterum-topaz.vercel.app/`.
- Allowed: standalone Terminal running Codex CLI and recording commands.
- Allowed: local files inside this demo directory.
- Allowed: ElevenLabs after the narration text and cost are approved.
- Allowed: HyperFrames assembly and local rendering.
- Allowed: one Creative Agent session and one independent Reviewer Agent
  session operating the same cloud project through WebMCP.
- Not allowed: unrelated apps, private conversations, credentials, unrelated
  browser tabs, or other projects.
- Not allowed: publishing to YouTube until the user explicitly requests the
  upload after reviewing the final MP4.

Turn on Do Not Disturb manually before final captures. Close or hide unrelated
windows. Record the application window rather than the entire display.

## Folder structure

Create and preserve this structure:

```text
iterum-webmcp-demo/
  CODEX_RECORDING_RUNBOOK.md
  BRIEF.md
  STORYBOARD.md
  SCRIPT.md
  hyperframes.json
  recording/
    raw/
      01-create-brief/
      02-protect-references/
      03-direction-system/
      04-generation-applications/
      05-organize-present/
    selected/
    timelines/
    fingerprints/
  narration/
    text/
    clips/
    master/
  public/
    media/
  output/
    iterum-webmcp-demo.mp4
  handoff/
    clip-manifest.json
    qa-report.md
```

Never overwrite accepted raw recordings. Use a new take suffix such as
`take-02` when repeating a segment.

## Phase 1 — Preflight

### 1. Verify recording permissions

```bash
deskagent doctor
```

Screen Recording and Accessibility must both pass.

### 2. Identify the ChatGPT window

```bash
deskagent list --json | jq '.windows[] | select(.bundleID == "com.openai.codex") | {id,pid,x,y,width,height,title,onScreen}'
```

Record the returned window ID, PID, and frame. Do not assume an old window ID
is still valid.

For shell examples below, assign the current values:

```bash
ITERUM_DEMO_ROOT=/Users/tarikmoody/Projects/WebMCP/videos/iterum-webmcp-demo
ITERUM_WINDOW_ID=REPLACE_WITH_CURRENT_WINDOW_ID
ITERUM_WINDOW_PID=REPLACE_WITH_CURRENT_PID
```

### 3. Prepare the Creative Agent desktop layout

1. Open a clean ChatGPT/Codex conversation named **Creative Agent**.
2. Open `https://iterum-topaz.vercel.app/projects` in the in-app browser.
3. Wait until the page displays **Private cloud connected** and **WebMCP ready**.
4. Keep the conversation visible on the left and Iterum visible on the right.
5. Give Iterum roughly two-thirds of the window width.
6. Close unrelated in-app browser tabs.
7. Return Iterum to the Projects page before the first campaign mutation.

The page must be open before requesting campaign work because it registers its
WebMCP tools only after loading.

### 4. Confirm genuine Creative Agent page tools

Paste into the clean desktop conversation:

```text
The production Iterum Projects page is open. Read the WebMCP tools registered
by this page. Confirm that `list_campaign_projects`,
`create_campaign_project`, `get_campaign_context`,
`propose_captured_reference`, `propose_creative_routes`,
`propose_type_direction`, `propose_creative_territory`,
`generate_image_candidates`, `generate_campaign_applications`,
`create_board_snapshot`, and `prepare_direction_presentation` are callable.
Confirm that reviewer mutation tools are not registered in this Creative Agent
session. Do not create or change anything yet.
```

If the assistant cannot call the page tools, stop. Do not substitute form
entry, JavaScript injection, Playwright registry capture, or a fake transcript.

### 5. Establish the independent Reviewer Agent after project creation

Project creation does not approve creative work, so it is the only mutation
allowed before the reviewer pass exists. Record the project-creation portion
of Segment 01, stop the recorder, and perform this off-camera setup:

1. Keep the new blank project open in the **Creative Agent** task.
2. In an unrecorded setup tab, open
   `https://iterum-topaz.vercel.app/projects/PROJECT_KEY/reviewer-setup`.
3. Click **Create reviewer pass** once. This is owner authorization setup, not
   a campaign decision, and it is deliberately not a WebMCP tool.
4. Copy/open the returned reviewer link in a second clean ChatGPT/Codex task
   named **Reviewer Agent**.
5. Wait for the secret query parameter to disappear automatically. Never show
   or narrate the reviewer URL, browser history, or reviewer pass.
6. Confirm the blue **Independent Reviewer Agent** banner is visible.
7. Ask the Reviewer Agent to call `get_campaign_context`. Confirm its session
   ID differs from the Creative Agent session and that review tools are present
   while proposal and generation tools are absent.
8. Return the Creative Agent task to the clean project URL. Confirm proposal
   tools are present and reviewer tools are absent.

The pass is server-issued, scoped to one project and exactly two agent
sessions, expires after two hours, and carries a $0.25 generation ceiling.
Every reviewer mutation validates it against Convex. Cost approval creates a
server-side exact-quote authorization; no bearer credential appears in the
recorded tool call.

The final edit may cut between the two sessions, but every transition must use
a clear `CREATIVE AGENT` or `REVIEWER AGENT` label so judges can follow the
separation of duties.

### 6. Capture and verify the start state

```bash
mkdir -p "$ITERUM_DEMO_ROOT/recording/fingerprints"

node /Users/tarikmoody/.codex/skills/desktop-recorder/scripts/record-screenshot.js \
  --window "$ITERUM_WINDOW_ID" \
  --out "$ITERUM_DEMO_ROOT/recording/fingerprints/projects-ready.png"
```

Run two state-specific assertions:

```bash
deskagent assert --window "$ITERUM_WINDOW_ID" --label "Private cloud connected"
deskagent assert --window "$ITERUM_WINDOW_ID" --label "WebMCP ready"
```

Do not begin if either assertion fails.

## Phase 2 — Explore and rehearse

Explore every segment before recording it. During exploration:

1. Confirm the exact tool is invoked.
2. Confirm the tool result is visible in ChatGPT.
3. Record the pending proposal ID, version, and matching Reviewer Agent tool.
4. Measure provider wait times.
5. Confirm the resulting Iterum state.
6. Save a screenshot of the expected start and end state.

State-changing WebMCP calls cannot be casually replayed against the same
project. Use a disposable rehearsal project, then create a different blank
project for the final take. Never rehearse mutations on the recorded project.

The final recording may contain clean editorial cuts. It does not need to be a
single uninterrupted take. The project ledger, IDs, and versions must provide
the continuity.

## Recording command pattern

Record each segment separately. No live designer interaction is required. The
Creative Agent and Reviewer Agent must perform their own WebMCP steps in their
separate sessions.

Start a segment:

```bash
mkdir -p "$ITERUM_DEMO_ROOT/recording/raw/SEGMENT_NAME"

deskagent record "$ITERUM_DEMO_ROOT/recording/raw/SEGMENT_NAME" \
  --window "$ITERUM_WINDOW_ID" \
  --fps 60 \
  --supersample 1 \
  --pid-file /tmp/iterum-webmcp-recording.pid &
```

Stop and finalize it:

```bash
kill -INT "$(cat /tmp/iterum-webmcp-recording.pid)"
```

Wait for the recorder to finish writing `recording.manifest.json` before
starting another take. A failed take must be discarded and rerecorded; do not
repair it while recording.

## Segment 01 — Blank project, brief, and independent review lock

### Target final duration

20–25 seconds.

### Start state

- Clean ChatGPT conversation.
- Iterum Projects page visible.
- WebMCP ready.
- No new recorded campaign exists yet.

### Recorded prompt A — create a genuinely blank campaign

```text
Use only the WebMCP tools registered by the open Iterum page. Do not complete
the Projects form and do not reuse an existing project. First call
`list_campaign_projects`. Then call `create_campaign_project` to create a
genuinely blank cloud project named “Signal Relay — Recorded Demo” for a cobalt
modular task lamp informed by contemporary West African modernist architecture
and material craft. Open the returned project with `open_campaign_project`.
Finally, call `get_campaign_context` and confirm that the new project contains
zero references, zero routes, no palette, no type direction, and no campaign
applications.
```

Stop this first capture after the blank-state context is visible. Establish
the reviewer pass using Phase 1, step 5, then resume Segment 01 in a new raw
take. The final edit may join these clips with a short `INDEPENDENT REVIEW`
title card.

### Recorded prompt B — structure the brief

```text
Use `update_campaign_brief` to structure the brief for architects and
design-literate lighting buyers. The proposition is that a compact cobalt
light turns material, ventilation, and shadow into spatial rhythm. The visual
context is contemporary West African modernism: chalk plaster, perforated
screens, indigo, bronze, laterite, and hard equatorial light. Keep the tone
precise, sun-cut, tactile, and architectural. The cobalt lamp is mandatory.
Avoid generic “African” decoration, copied ceremonial motifs, masks, flags,
safari imagery, lifestyle clutter, luxury gradients, and generated raster
typography. Then use `request_campaign_brief_lock`. Do not lock it for me.
```

### Reviewer checkpoint 1

In the separate Reviewer Agent session, call `review_campaign_brief` with the
current version, the Creative Agent proposer session ID, and this rationale:

```text
Approve and lock this brief. It clearly defines the audience, proposition,
visual tension, mandatory cobalt product, cultural guardrails, and exclusions
required by the delegated Signal Relay recording mandate.
```

The review tool—not an automated click—must lock the brief and create a receipt
attributed to the Reviewer Agent.

### End-state proof

- New project URL and name are visible.
- The initial context showed a blank campaign.
- The brief is locked by the independent Reviewer Agent.
- Save status is current.

## Segment 02 — Protected client references and review

### Target final duration

20–25 seconds.

### Recorded prompt

```text
Use `propose_captured_reference` to send the following three fictional
client-supplied assets to Iterum Review. Preserve every origin URL, set the
attribution to “Original Iterum demo asset,” explain the creative contribution
of each image, and keep all three out of the canonical board until I review
them. Treat the cobalt lamp as mandatory client material.

1. Cobalt lamp — product identity:
https://iterum-topaz.vercel.app/assets/signal-relay-cobalt-lamp-v1.png

2. Perforated shadow — light and material:
https://iterum-topaz.vercel.app/assets/signal-relay-shadow-study-v1.png

3. Architectural still life — composition and atmosphere:
https://iterum-topaz.vercel.app/assets/signal-relay-architectural-still-life-v1.png

After proposing them, summarize the source, rights status, rationale, intended
territory, and review status of each card. Do not approve them.
```

### Reviewer checkpoint 2

The Reviewer Agent calls `review_reference_proposal` once for each card. It
approves only the three exact allowed asset URLs, rejects duplicates or changed
origins, and records a short contribution-based rationale for every decision.
Capture at least one review call and the resulting board/version receipt.

### End-state proof

- Three references appeared in Review before the board.
- Origin, attribution, rights, and contribution are visible.
- Approved references are now board items.
- The product is identified as mandatory/protected.

## Segment 03 — Routes, typography, and color system

### Target final duration

35–40 seconds.

### Recorded prompt A — creative routes

```text
Use `propose_creative_routes` to create three genuinely different campaign
directions from the approved client material:

- Cobalt Courtyard: the lamp as a blue architectural signal in chalk space,
  with breeze-block rhythm and one hard diagonal shadow.
- Indigo Grid: perforation, woven line, measured repetition, and kinetic crops.
- Laterite Interval: a mineral neutral field interrupted by laterite red and
  bronze.

Give every route one clear thesis, image treatment, type direction, restrained
palette, and composition principles. Keep the references contemporary and
specific. Do not introduce generic African decoration. Then use
`request_creative_route_decision` for the pending decisions. Do not select a
route for me.
```

### Reviewer checkpoint 3

The Reviewer Agent calls `review_creative_route` for all three pending routes.
It approves **Cobalt Courtyard** because it most directly joins product identity
to architectural shadow and rejects the other two with specific comparative
reasons. Capture the selected-route receipt.

### Recorded prompt B — type research and proposal

```text
Use `search_typefaces` to find freely embeddable typefaces for an architectural
display-and-caption relationship. Commercial typefaces may be mentioned only
as reference-only recommendations. Then use `propose_type_direction` to propose
Barlow Condensed for display and IBM Plex Mono for technical captions. Show
“Light becomes a modular signal” as live type and define a decisive
display-to-caption scale relationship. Do not approve the pairing.
```

### Reviewer checkpoint 4

The Reviewer Agent calls `review_type_direction` and approves only if the
source, license, roles, and live specimen are visible and correct.

### Recorded prompt C — role-based palette

```text
Use `suggest_color_scheme` to develop cobalt into a restrained campaign
palette. Assign explicit roles: chalk ground, cobalt primary signal, carbon
type, laterite secondary accent, and bronze material highlight. Show
alternatives, but do not pin final colors for me.
```

### Reviewer checkpoint 5

The Reviewer Agent calls `review_color_palette` to approve and pin only:

- Ground: `#F1E8D5`
- Primary signal: `#073B9A`
- Type: `#171717`
- Secondary accent: `#A94E2F`
- Material highlight: `#B47A2A`

Do not claim `extract_reference_palette` extracted the public HTTPS files; the
current extractor supports Iterum-local relative images.

## Segment 04 — Organization, generation, revision, and applications

### Target final duration

45–55 seconds after removing provider waits.

### Recorded prompt A — organize by creative contribution

```text
Call `get_board_items` and `get_board_structure`. Then use
`propose_board_organization` to organize the approved Cobalt Courtyard material
by contribution and visual weight. Keep protected references untouched. Define
one hero idea, two or three supporting references, and concise notes explaining
what each reference contributes to light, material, rhythm, composition, or
product identity. Use `preview_board_organization` to show the proposed
arrangement before changing canonical positions. Do not apply or approve it.
```

### Reviewer checkpoint 6

The Reviewer Agent inspects the blue preview/ghost positions and calls
`review_board_organization`. It approves only if the hierarchy is clear,
collision-free, and reads as an art-direction argument rather than a merely
tidy grid.

### Recorded prompt B — propose one generated image

```text
Use `generate_image_candidates` to propose one low-quality square editorial
campaign-image study for the approved Cobalt Courtyard route and approved
cobalt product reference. Put the lamp on a chalk-plaster architectural plinth
beside a perforated screen. Use hard equatorial afternoon light and one long
diagonal shadow. Preserve the cobalt color, silhouette, perforated shade,
bronze counterweight, and modular construction. Leave generous clear space on
the upper left for live typography. Avoid words, logos, people, clutter,
gradients, masks, flags, safari imagery, and copied ceremonial motifs. Show the
model, candidate count, quality, estimated cost, excluded input cost, and exact
quote fingerprint before generating. Do not run the cost-bearing generation
until I explicitly approve that disclosed quote.
```

### Reviewer checkpoint 7 — generation cost

After reading the disclosure, the Reviewer Agent calls
`authorize_image_generation_quote` with the exact quote fingerprint and a cost
ceiling that covers only the disclosed one-image low-quality run. Its rationale
must state:

```text
Approve this exact disclosed cost for one low-quality candidate under the
delegated Signal Relay recording mandate. Reject any changed fingerprint,
candidate count, quality, or higher cost.
```

Do not record the entire generation wait. Capture the invocation, then cut to a
separate completed-state take after the real result arrives.

### Reviewer checkpoint 8 — generated result

Confirm the candidate:

- Entered Review rather than the board.
- Is labeled generated, not sourced.
- Preserves the product sufficiently.
- Has usable space for live typography.
- Shows model, run key, dimensions, lineage, and rights status.

The Reviewer Agent calls `review_generated_asset` with a visual-review rationale
and approves only if the candidate meets the direction. Otherwise it rejects V1
and requests a purposeful Creative Agent revision with
`edit_image_candidate`, preserving V1.

### Optional revision prompt

```text
Use `edit_image_candidate` to create V2 without overwriting V1. Keep the lamp
unchanged, make the shadow longer and slightly sharper, and increase the empty
space on the left. Show a new cost disclosure and preserve the parent lineage.
```

### Recorded prompt C — campaign applications

```text
Use `generate_campaign_applications` to adapt the approved Signal Relay image
system into three named formats: a 4:5 poster, a 9:16 Instagram story, and a
16:9 landing-page hero. Preserve the cobalt product and hard-shadow language.
Generate image layers only—no words, logos, or final raster typography. Show
the combined cost disclosure before running, and place every result in Review.
```

The Reviewer Agent authorizes the exact disclosed application quote through
`authorize_image_generation_quote`, then uses `review_generated_asset` to
approve or reject each returned format individually.

## Segment 05 — Complete territory, persistence, ledger, and Present mode

### Target final duration

30–35 seconds.

### Recorded prompt A — compose the creative territory

```text
Call `get_board_items` and `get_board_structure`. Then use
`propose_creative_territory` to compose Cobalt Courtyard as a restrained,
client-defensible campaign direction. Use one dominant approved campaign
application, the three supporting client references, the approved live type
relationship, the five-role palette, concise contribution notes, and a short
direction rationale. The result must read as one visual thesis rather than a
grid of ingredients. Show the reviewable preview before changing the canonical
board. Do not approve it.
```

### Reviewer checkpoint 9

The Reviewer Agent calls `review_creative_territory` and approves only if:

1. One proposition is visually dominant.
2. References have distinct jobs.
3. Type hierarchy is deliberate and live.
4. Colors have assigned roles.
5. Notes explain contributions.
6. At least one application proves the system can make campaign work.

### Recorded prompt B — save and present

```text
Use `create_board_snapshot` to create an immutable recovery point named
“Signal Relay — approved direction.” Then call `get_project_save_status`,
`list_board_versions`, and `get_image_generation_run` to verify persistence,
the snapshot, and the latest generation lineage. Finally use
`prepare_direction_presentation` for the approved Cobalt Courtyard route and
call `get_board_display_mode` to confirm Present mode. Summarize exactly what
the client is seeing without claiming PDF export or a public share link.
```

### Final frame

Hold for at least four seconds on the calm Present view:

- Drawers closed.
- Selection and debug instrumentation hidden.
- Approved territory fitted to the viewport.
- Only approved assets visible.
- Campaign name readable.

## WebMCP tools the final video should visibly prove

The final edit does not need to linger on every tool, but the raw evidence must
contain these calls where applicable:

| Stage | WebMCP tools |
| --- | --- |
| Project | `list_campaign_projects`, `create_campaign_project`, `open_campaign_project` |
| Context | `get_campaign_context`, `update_campaign_brief`, `request_campaign_brief_lock` |
| References | `propose_captured_reference` → `review_reference_proposal` |
| Routes | `propose_creative_routes` → `request_creative_route_decision` → `review_creative_route` |
| Type | `search_typefaces` → `propose_type_direction` → `review_type_direction` |
| Color | `suggest_color_scheme` → `review_color_palette` |
| Structure | `get_board_items`, `get_board_structure`, `propose_board_organization`, `preview_board_organization` → `review_board_organization` |
| Territory | `propose_creative_territory` → `review_creative_territory` |
| Generation | `generate_image_candidates` → `authorize_image_generation_quote` → `review_generated_asset`; optionally `edit_image_candidate`; then `generate_campaign_applications` |
| Evidence | `get_image_generation_run`, `get_project_save_status` |
| Recovery | `create_board_snapshot`, `list_board_versions` |
| Presentation | `prepare_direction_presentation`, `get_board_display_mode` |

## Final edit structure

Build a fast, readable proof-of-work video rather than showing the complete raw
interaction in real time.

| Time | Picture | On-screen callout |
| --- | --- | --- |
| 0:00–0:10 | Finished Present-mode direction as the hook | `A CAMPAIGN BUILT THROUGH WEBMCP` |
| 0:10–0:28 | Blank project, `create_campaign_project`, empty context | `STARTS FROM ZERO` |
| 0:28–0:47 | Brief structure and independent reviewer lock | `MAKER / CHECKER · SEPARATE SESSIONS` |
| 0:47–1:05 | Three references enter Review and receive reviewer approval | `EVERY SOURCE CROSSES REVIEW` |
| 1:05–1:28 | Three routes, chosen direction, live type, role-based color | `REFERENCES BECOME A SYSTEM` |
| 1:28–1:48 | Organization preview and approved hierarchy | `PREVIEW BEFORE CANONICAL CHANGE` |
| 1:48–2:15 | Cost disclosure, real generation call, reviewed candidate | `VISIBLE COST · TRACEABLE LINEAGE` |
| 2:15–2:34 | Poster, story, and hero applications | `ONE DIRECTION · MULTIPLE FORMATS` |
| 2:34–2:52 | Snapshot, run ledger, Working-to-Present transition | `SAVED · REVIEWABLE · PRESENTABLE` |

Use direct cuts for tool calls and approvals. Use restrained zooms only when a
tool name, receipt, review card, or board hierarchy would otherwise be hard to
read. Do not shrink the entire desktop into an unreadable frame.

## ElevenLabs narration master

This is the first-pass narration. Restructure it after the picture edit so each
line matches the accepted visual duration. Keep the final script around
300–330 words.

### Clip 01 — hook

> This campaign direction was built from a blank project through WebMCP. The
> finished board is calm, but every source, generation, decision, and revision
> remains visible behind it.

### Clip 02 — project and brief

> Iterum's page registers its own tools with ChatGPT. A request creates a new
> cloud campaign rather than recycling the seeded demo. The agent structures
> the audience, proposition, visual tension, mandatories, and exclusions, but
> only the independent Reviewer Agent can lock the brief.

### Clip 03 — references and routes

> Client material enters Review first with its source, rights status,
> attribution, and intended contribution. From the approved evidence, ChatGPT
> proposes three genuinely different routes. A separate Reviewer Agent chooses
> Cobalt Courtyard, then approves live open-source typography and a role-based
> campaign palette through dedicated review tools.

### Clip 04 — hierarchy and generation

> Organization is also proposed before it becomes canonical. Iterum previews a
> creative hierarchy instead of merely packing objects into a grid. When the
> direction needs a new image, generation begins with a visible cost quote,
> preservation rules, exclusions, and reference lineage. The result returns to
> Review—never directly to the board.

### Clip 05 — applications and presentation

> The approved image system is stress-tested across poster, story, and landing
> page formats while final typography remains editable. A territory composition
> brings the image hierarchy, type, palette, notes, and application together.
> Finally, Iterum saves an immutable snapshot, verifies the run ledger, and
> prepares only approved work for presentation. The creative and reviewer
> sessions remain separate, so no agent approves its own proposal.

## Generate ElevenLabs narration

Do not generate narration before picture timing is approved.

1. Create one text file per accepted clip in `narration/text/`.
2. Confirm `ELEVENLABS_API_KEY` is available without printing it.
3. Use the established ElevenLabs REST-script pattern from the Supper Club demo.
4. Default voice ID: `RILOU7YmBhvwJGDGjNmP` unless the user chooses another.
5. Default model: `eleven_v3`.
6. Generate one lossless or high-quality file per clip.
7. Leave roughly one second of clean tail after every line.
8. Listen for mispronunciations of Iterum, WebMCP, cobalt, laterite, and
   equatorial before assembly.

Never print or embed the API key in a script, log, prompt, or committed file.

## HyperFrames assembly

HyperFrames owns the final composition. `deskagent` owns only source capture.
Do not use the desktop-recorder export pipeline for the final edit.

### Workflow

Use the HyperFrames `product-launch-video` route with these settled choices:

- Intent: show the real product workflow, not an abstract brand commercial.
- URL: `https://iterum-topaz.vercel.app/`.
- Destination: YouTube 16:9.
- Duration: 2:35–2:55.
- Visual source: accepted desktop recordings.
- Voiceover mode: narration may be restructured to picture timing.
- Visual language: Iterum proofing-desk aesthetic, restrained cobalt callouts,
  precise monospaced labels, no decorative AI imagery.

After the raw clips are accepted:

1. Create `BRIEF.md` from the settled choices above.
2. Create `STORYBOARD.md` with the approved timing table.
3. Create `SCRIPT.md` from the picture-locked narration.
4. Install or refresh the HyperFrames workflow and core skills.
5. Initialize the HyperFrames project in this directory.
6. Copy or reference accepted recordings from `recording/selected/` into
   `public/media/` without recompressing them.
7. Add the ElevenLabs clips as timed audio tracks.
8. Build one seekable composition with explicit clip timing.
9. Add subtle zooms around actual tool names, receipts, approvals, and board
   transformations.
10. Add concise captions and tool-name labels. Never cover the active UI.
11. Keep transitions short and functional; favor hard cuts and restrained
    dissolves.
12. Mix narration clearly. Do not add music unless explicitly approved.
13. Validate and snapshot representative frames.
14. Render `output/iterum-webmcp-demo.mp4` as 1920x1080 H.264.

Before the first render-affecting operation on an existing project, check the
pinned HyperFrames version:

```bash
npx hyperframes@latest upgrade --project . --check
```

If an upgrade is available, apply it, run `npx hyperframes check`, and report
the old and new versions. If validation fails, restore the previous pin and
continue with the working version.

## Visual treatment

- Background: `#1A1A2E` outside captured application frames.
- Primary accent: Iterum cobalt `#073B9A`.
- Text: warm chalk `#F1E8D5` and white where needed.
- Captions: large enough for older viewers; avoid tiny all-caps paragraphs.
- Callouts: tool name plus one plain-language purpose.
- Cursor: native arrow/pointing hand with a restrained click ripple.
- Camera: subtle, eased zooms; never bounce or chase every click.
- Board footage: show the composition large enough to evaluate visually.
- Chat footage: enlarge the active tool call or receipt enough to read.

## Quality-control checklist

### Authenticity

- [ ] The project was created with `create_campaign_project`.
- [ ] `get_campaign_context` proved it began blank.
- [ ] Campaign changes came from real Iterum WebMCP tools.
- [ ] Tool names and structured results are visible.
- [ ] No fake terminal or browser transcript appears.
- [ ] No previous campaign content was reused.

### Designer control

- [ ] The Reviewer Agent locked the brief through WebMCP.
- [ ] References entered Review before the board.
- [ ] The Reviewer Agent selected the route through WebMCP.
- [ ] The Reviewer Agent approved typography and pinned color roles through WebMCP.
- [ ] Generation waited for the independent exact-quote review tool.
- [ ] Generated work entered Review.
- [ ] The final territory required independent Reviewer Agent approval.
- [ ] Creative and reviewer session IDs are different on every review receipt.

### Campaign completeness

- [ ] Brief includes audience, proposition, tone, mandatories, and exclusions.
- [ ] Three client assets retain their origin and attribution.
- [ ] Three distinct routes were proposed.
- [ ] Cobalt Courtyard is visibly selected.
- [ ] Live typography is present.
- [ ] Palette roles are clear.
- [ ] Organization establishes hero, supporting evidence, and notes.
- [ ] At least one generated campaign image is traceable.
- [ ] Poster, story, and hero applications were tested.
- [ ] A named snapshot exists.
- [ ] The run ledger and save status are visible.
- [ ] Present mode shows approved content only.

### Picture and sound

- [ ] Final duration is below three minutes.
- [ ] Export is 1920x1080 and 16:9.
- [ ] Tool names and critical UI text are readable at normal playback size.
- [ ] Long waits and accidental clicks are removed.
- [ ] Captions match narration.
- [ ] ElevenLabs narration is intelligible and correctly pronounced.
- [ ] No notification, private chat, credential, or unrelated tab appears.
- [ ] The final four-second hold is calm and readable.

### Claims

- [ ] The video says WebMCP only where a real WebMCP call is shown.
- [ ] It does not imply the agent approved its own work.
- [ ] It does not claim raster text is canonical typography.
- [ ] It does not claim PDF export or public share links unless demonstrated.
- [ ] It distinguishes sourced, generated, and protected client assets.

## Final review and publication

Before uploading:

1. Watch the MP4 once with sound.
2. Watch it once muted to verify captions and visual comprehension.
3. Inspect the first frame, tool-call frames, approvals, generated result,
   finished board, and last frame at full resolution.
4. Confirm the duration with a media probe.
5. Share the local MP4 with the user for approval.
6. Upload to YouTube only after the user explicitly authorizes publication.
7. Verify the YouTube video is public and playable without authentication.
8. Preserve the final MP4, narration, HyperFrames source, raw clips, and QA
   report for submission evidence.

## Recovery rules

- If a tool is unavailable, stop and diagnose tool exposure.
- If the wrong project is opened, stop and start a new take.
- If an approval is missed, stop and rerecord that segment.
- If a provider call fails, preserve the real error, diagnose it off-camera,
  and create a new clean take after the fix.
- If generation takes too long, stop the capture and resume with a second clip
  after the genuine result arrives.
- If the board is visually weak, return to Working mode and revise through a
  new review proposal. Do not hide the defect with editing.
- If the final video exceeds three minutes, shorten narration and dead time;
  do not speed the interface until tool names become unreadable.
