---
name: "Supper Club AI"
description: "A culturally literate Creative Host workspace shaped as a speculative salon ledger."
colors:
  ledger-ink: "#0f0f0e"
  ink-soft: "#2d2b25"
  archival-paper: "#eee6dd"
  paper-deep: "#e1d8cf"
  oxblood-signal: "#983423"
  oxblood-deep: "#75271a"
  seed-chartreuse: "#bac467"
  seed-deep: "#6d752c"
  archival-cobalt: "#6b6f97"
  receipt-cobalt: "#7f9bbf"
  folio-muted: "#6e695f"
  warm-white: "#fff8ed"
  hairline-rule: "rgba(38, 36, 31, 0.24)"
  strong-rule: "rgba(38, 36, 31, 0.48)"
typography:
  display:
    fontFamily: "Cormorant Garamond, Baskerville, serif"
    fontSize: "clamp(2.5rem, 5vw, 4.25rem)"
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: "normal"
  headline:
    fontFamily: "Cormorant Garamond, Baskerville, serif"
    fontSize: "clamp(1.375rem, 2.1vw, 2.125rem)"
    fontWeight: 500
    lineHeight: 0.98
    letterSpacing: "normal"
  title:
    fontFamily: "Cormorant Garamond, Baskerville, serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "normal"
  body:
    fontFamily: "Cormorant Garamond, Baskerville, serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  operational:
    fontFamily: "Barlow Condensed, Arial Narrow, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "normal"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.5625rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "0.06em"
rounded:
  square: "0px"
  circular: "50%"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "28px"
  3xl: "38px"
components:
  button-primary:
    backgroundColor: "{colors.oxblood-signal}"
    textColor: "{colors.warm-white}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 14px"
    height: "38px"
  button-primary-hover:
    backgroundColor: "{colors.oxblood-deep}"
    textColor: "{colors.warm-white}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 14px"
    height: "38px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ledger-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 14px"
    height: "38px"
  button-confirm:
    backgroundColor: "{colors.seed-chartreuse}"
    textColor: "{colors.ledger-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 14px"
    height: "38px"
  chip-dietary:
    backgroundColor: "{colors.seed-chartreuse}"
    textColor: "{colors.ledger-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "4px 6px"
  movement-selected:
    textColor: "{colors.ledger-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.square}"
    padding: "10px"
    height: "58px"
  folio-navigation-active:
    backgroundColor: "#11110f"
    textColor: "{colors.archival-paper}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "12px 14px 11px 18px"
    height: "66px"
    width: "154px"
  course-plate:
    backgroundColor: "rgba(255, 253, 247, 0.28)"
    textColor: "{colors.ledger-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "18px"
  agent-receipt:
    backgroundColor: "#11110f"
    textColor: "{colors.archival-paper}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "14px 16px"
---

# Design System: Supper Club AI

## Overview

**Creative North Star: "Speculative Salon Ledger"**

Supper Club AI feels like a living literary-salon ledger prepared for a culturally fluent host: archival, deliberate, warm, and operational without becoming institutional. Near-black folio chrome contains a warm, uncoated paper working surface; editorial serif language carries the evening's cultural arc while compressed operational type and mono metadata keep timing, provenance, state, and agent activity unmistakably practical.

The defining expression is the **Run-of-Show Spine**. The evening reads chronologically, one movement unfolds into a ruled working plate, and agent actions appear as marginalia and receipts instead of a second conversation. The system rejects the generic rounded-card AI dashboard: density comes from editorial hierarchy, hairline rules, stamps, registration marks, and disciplined color signals—not decorative containers.

**Key Characteristics:**

- Warm, paper-textured working plates framed by near-black folio chrome.
- A chronological spine that keeps one coherent evening visible and editable.
- Literary serif storytelling paired with condensed operational sans and mono evidence.
- Oxblood action, seed-chartreuse state, and archival-cobalt marginalia with tightly rationed roles.
- Square ruled surfaces, stamped states, circular nodes, seals, and completion signals.
- Visible provenance, warnings, versioning, and agent receipts beside the affected work.

## Colors

The palette behaves like ink, uncoated stock, proofing marks, and archival annotation: warm and materially grounded, with accents used as a compact operational language.

### Primary

- **Oxblood Signal:** Consequential actions, editing states, active navigation rules, times, warnings, and links that require the host's attention.
- **Oxblood Deep:** Hover and emphasis state for oxblood actions; it should not become a second independent accent.

### Secondary

- **Seed Chartreuse:** Selected movements, confirmation, readiness, progress, successful status, dietary tags, and accessible focus outlines.
- **Seed Deep:** Text and borders when chartreuse needs sufficient definition against archival paper.

### Tertiary

- **Archival Cobalt:** Sourced marginalia, annotations, and the visual voice of evidence rather than action.
- **Receipt Cobalt:** A lighter operational blue reserved for receipt categories such as music; use it as a subordinate member of the cobalt family.

### Neutral

- **Ledger Ink:** Primary text and the foundational chrome color.
- **Soft Ink:** Secondary dark text when full ledger ink is too severe.
- **Archival Paper:** The principal planning surface and the source of the system's warmth.
- **Paper Deep:** Tonal separation within paper surfaces.
- **Folio Muted:** Secondary copy, metadata, and de-emphasized labels on paper.
- **Warm White:** High-contrast action text on oxblood.
- **Hairline Rule:** Internal dividers, ledger cells, and low-emphasis structure.
- **Strong Rule:** Major boundaries, selected plates, and section edges.

### Named Rules

**The Signal Rationing Rule.** Oxblood directs consequential action and editing; seed chartreuse marks selection, readiness, and confirmation; archival cobalt belongs to sourced marginalia. Never interchange these roles.

## Typography

**Display Font:** Cormorant Garamond (with Baskerville and serif fallbacks)  
**Body Font:** Cormorant Garamond (with Baskerville and serif fallbacks)  
**Operational Font:** Barlow Condensed (with Arial Narrow and sans-serif fallbacks)  
**Label/Mono Font:** IBM Plex Mono (with ui-monospace and monospace fallbacks)

**Character:** Cormorant gives the plan literary warmth and enough historical texture to carry cultural interpretation without feeling academic. Barlow Condensed compresses operational density, while IBM Plex Mono makes time, system state, provenance, and WebMCP activity read as auditable evidence.

### Hierarchy

- **Display:** Large folio and host-packet titles; use sparingly for the current surface's name.
- **Headline:** Course titles and expanded cultural moments within a selected movement.
- **Title:** Movement names and compact section titles that must remain legible inside dense rows.
- **Body:** Interpretive prose, descriptions, warnings, and receipt explanations; keep paragraphs short and materially tied to a decision.
- **Operational:** The unadorned interface voice for general controls and fallback text.
- **Label:** Uppercase times, state, provenance, field labels, counts, tool status, and compact actions.

### Named Rules

**The Three-Voice Rule.** Serif tells the evening's story, condensed sans handles operations, and mono records state, time, provenance, and tool activity.

## Layout

Desktop is a fixed production frame: a 64px top folio bar, a fluid workspace, and a 92px action dock. The workspace uses a 154px folio index, a flexible paper plate with a 680px minimum working width, and a 310px marginalia rail. Inside the paper plate, the Run-of-Show Spine begins with a 224px plan introduction and gives the remaining width to the chronological ledger.

Spacing is compact and evidence-dense. Hairline rules and repeated 8–16px internal intervals create rhythm; 24–38px intervals separate true sections and views. The primary reading plane remains paper, while navigation, receipts, progress, and production actions live in near-black chrome.

At 1220px, the chrome contracts to 136px and 270px rails and the plan introduction narrows to 190px. At 980px, the workspace becomes one column, the folio index becomes an off-canvas drawer, receipts follow the paper as a full-width region, and the production dock becomes a sticky two-column grid. At 680px, the run of show becomes a sequence stack: the introduction leads, each movement is a compact row, the selected plate unfolds in one column, agent receipts move into an explicit right-hand drawer, and the primary production action spans the sticky dock.

**The Spine Before Cards Rule.** A plan is read chronologically along a ruled axis; supporting content unfolds from the selected movement rather than fragmenting into a dashboard tile grid.

## Elevation & Depth

The system is flat by default. Paper texture, tonal washes, borders, ruled cells, and chrome/paper contrast establish depth in the working state; structural cards do not float. Shadows appear only when an element genuinely leaves the plane: utility menus, mobile navigation and receipt drawers, approval dialogs, and transient toasts. Status halos may use a single ring to communicate live state.

### Shadow Vocabulary

- **Status Halo** (`0 0 0 4px rgba(199, 211, 111, 0.12)`): A quiet live/ready ring around a tiny status dot.
- **Utility Overlay** (`8px 12px 30px rgba(0, 0, 0, 0.36)`): Compact menus above folio chrome.
- **Drawer** (`-14px 0 36px rgba(0, 0, 0, 0.38)`): The mobile receipts drawer; reverse the horizontal direction for a left-side navigation drawer.
- **Approval Dialog** (`12px 16px 34px rgba(10, 10, 8, 0.42)`): Consequential host approval above a dark scrim.
- **Transient Toast** (`8px 12px 28px rgba(10, 10, 8, 0.36)`): Brief versioned feedback above the production dock.

**The Flat Ledger Rule.** Paper surfaces stay flat at rest; shadows are reserved for overlays, drawers, dialogs, and transient feedback.

## Shapes

Structural surfaces and controls are square, with one-pixel ruled edges and no decorative rounding. Circles carry functional meaning: movement nodes, live status, receipt category icons, the completion meter, and the salon seal. Pills are exceptional and belong only to compact filter controls. Small rotations make editing stamps, seals, and pencil notes feel handled and registered without turning the interface into scrapbook decoration.

**The Square Plate Rule.** Structural surfaces and actions use square corners; circles are reserved for nodes, completion, status, and seals, while pills are limited to filters.

## Components

### Buttons

Actions feel like proofing controls: square, compact, uppercase, and decisive.

- **Shape:** Square corners with a 38px minimum control height; the persistent dock action grows to 48px.
- **Primary:** Oxblood field, warm-white mono label, 14px horizontal padding. Hover deepens to oxblood; active presses down by 1px.
- **Focus:** A 3px seed-chartreuse outline with a 3px offset, preserved across links and buttons.
- **Secondary:** Transparent paper field with a strong-rule border and ledger-ink label; hover adds only a faint ink wash.
- **Confirm:** Seed-chartreuse field with ledger-ink label. Confirmation is semantically distinct from the oxblood primary action.
- **Motion:** Background and 1px press feedback run for 160ms with standard easing; reduced-motion preferences collapse transitions and animation.

### Chips

- **Style:** Dietary and success tags use a square seed-chartreuse field, ledger-ink mono text, and 4px by 6px padding.
- **State:** Selection is a full-width tonal band or a square tag. Pill geometry is reserved for rail filters, not general statuses.

### Cards / Containers

- **Corner Style:** Square plates and ledgers.
- **Background:** Archival paper, subtle translucent warm-paper washes, or near-black chrome according to plane.
- **Shadow Strategy:** Flat at rest; use rules and tonal changes instead of card shadows.
- **Border:** Hairline rules divide internal cells; strong rules frame expanded plates and major sheets.
- **Internal Padding:** Usually 12–24px, tightening to 8–16px inside ledger rows.

### Navigation

The desktop folio index is a narrow near-black ledger with numbered sections, mono uppercase labels, serif detail, horizontal rules, and a 3px oxblood active rule. Hover adds a restrained warm-white wash. Below 980px it becomes a left off-canvas drawer; below 680px the menu trigger is always visible in the top bar.

### Run-of-Show Spine

Each movement is a ruled row with an oxblood time, serif number and title, mono recipe/pairing/music/host-cue cells, a stamped state, and a circular node on the chronological axis. The selected row receives a seed-chartreuse gradient and a larger seed-ringed node, then unfolds an attached working plate. On mobile, the axis and secondary cells disappear, but chronological order, time, title, expansion, and host actions remain intact.

### Agent Receipts

Receipts live on near-black chrome and combine a circular category icon, mono time/source/title, serif explanation, and applied check. Conflicts use an oxblood ruled note, never a toast alone. On phones, a visible paper-surface control opens receipts in a dedicated right-side drawer and exposes the current receipt count.

### Production Dock

The dock is persistent production chrome, not a generic footer. It keeps shopping, prep, completion, the host-packet action, and estimates in one operational strip. On small screens, supporting stats compress to two columns and the primary host-packet action spans the width; completion detail may hide, but the action remains sticky and reachable.

**The Visible Receipt Rule.** Agent activity must resolve into a human-readable receipt, warning, or versioned state beside the work it changed.

## Do's and Don'ts

### Do:

- **Do** keep the chronological evening legible before revealing supporting detail.
- **Do** use serif type for cultural narrative and mono type for evidence, state, time, provenance, and action labels.
- **Do** preserve square ruled surfaces and use circular geometry only when it carries node, seal, progress, or status meaning.
- **Do** keep warnings, sources, rights notes, dietary context, and agent receipts visible where they help the Creative Host decide.
- **Do** turn the desktop three-rail workspace into a sequence stack, explicit receipts drawer, and sticky production dock on mobile.

### Don't:

- **Don't** turn the plan into a grid of rounded, floating AI-dashboard cards.
- **Don't** use oxblood, seed chartreuse, and archival cobalt as interchangeable decoration.
- **Don't** let an agent update disappear into a chat transcript or ephemeral toast without a durable receipt or versioned state.
- **Don't** add shadows to resting paper sheets, rows, or plates.
- **Don't** hide the primary host-packet action, dietary verification, or provenance when space gets tight.
