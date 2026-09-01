# Supper Club AI — Run-of-Show Implementation Brief

Approved comp: `.impeccable/mocks/supper-club-ai-comp-02-run-of-show.png`  
Direction: **Speculative Salon Ledger**  
Surface mode: **Operate**

## Sampled visual record

Values below were sampled from interior pixels or averaged flat patches in the approved 1586 × 992 comp, rather than estimated from palette names.

| Role | Sample | Implementation |
| --- | --- | --- |
| Folio chrome | `#0f0f0e` | `--ink`; header, index, marginalia, action dock |
| Uncoated paper | `#eee6dd` | `--paper`; central working surface |
| Brick signal | `#983423` | `--signal`; action, editing, and conflict states |
| Seed chartreuse | `#bac467` | `--seed`; selected, ready, and live states |
| Selected wash | `#d5d295` | transparent seed wash over paper |
| Archival blue | `#6b6f97` | `--marginalia`; handwritten/source annotations |

## Design-system reading

- **Component grammar:** ruled editorial rows, ledger columns, stamped states, folio index entries, receipt slips, and a persistent production dock. No rounded-card dashboard containers.
- **Corner language:** square sheets and controls; circles reserved for time nodes, status dots, seal marks, and completion.
- **Lines:** mostly 1px hairlines in ink at 14–48% opacity; 1.5–2px only for seals and selected nodes.
- **Elevation:** flat paper and ink fields. Overlays use one warm, directional shadow with blur; ordinary content does not float.
- **Type ramp:** literary serif for event names and course titles; condensed sans for operational copy; mono for time, source, state, and measurement. Display 26–38px, title 16–24px, body 10–14px, metadata 7–10px.
- **Density:** the whole six-movement sequence remains visible at the approved desktop viewport while one movement unfolds into a detailed working plate.

## Fidelity and asset inventory

| Visible ingredient or commitment | Required treatment | Shipping medium | Status |
| --- | --- | --- | --- |
| Black utility header and nine-item folio index | Compact, square, ruled, numbered navigation | Semantic HTML + CSS + Lucide icons | Implemented |
| Six-movement chronological spine | Time nodes, linked fields, selected chartreuse wash, expanded movement | Semantic HTML + CSS grid | Implemented |
| Expanded main-table plate | Three editorial columns for dish, pairings/cultural links, sourcing/provenance | Semantic HTML + CSS | Implemented |
| Agent marginalia rail | Timestamped WebMCP receipts and attached warning | Semantic HTML + CSS + Lucide icons | Implemented |
| Primary action | Brick-red review/export control, repeated in top bar and persistent dock | Semantic button + CSS | Implemented |
| Registration marks, rules, stamps, nodes, seal | Precise scalable geometry; no rasterized UI | CSS + icon-library SVG | Implemented |
| Paper material | Warm uncoated stock with quiet organic fiber/grain, never grid/noise chrome | Generated seamless raster behind semantic UI | Produce |
| Typography and all operational copy | Selectable, accessible, responsive | Semantic text + CSS font stacks | Implemented |
| People, food, bottles, book cover | Not present in the approved operating surface | Accepted omission | Locked |

The paper texture is the only image-native shipping ingredient. All interface text, controls, geometry, state, and data remain responsive semantic code.
