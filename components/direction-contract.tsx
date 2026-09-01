"use client";

import { useEffect } from "react";

export const DIRECTION_CONTRACT = `
THESIS: Supper Club AI is a living literary-salon ledger where a Creative Host authors one coherent evening; it refuses the generic rounded-card AI dashboard.
OWN-WORLD: Near-black folio chrome, warm uncoated paper, brick-red signals, seed-chartreuse status, archival-blue marginalia, literary serif titles, compact grotesk labels, mono metadata, ruled plates, registration marks, and stamped states.
STORY: The host sees the whole evening, expands one movement, edits its food and cultural links, verifies agent changes, and approves a useful host packet.
FIRST VIEWPORT: Slim folio index left, chronological spine center, selected movement unfolded across the working plate, agent marginalia right, persistent shopping/prep/completion/export strip below.
FORM: Speculative Salon Ledger, grounded direction 1 of 7; seed a4bcb667; approved Run-of-Show Spine comp.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
`.trim();

export function DirectionContractMarker() {
  useEffect(() => {
    const marker = "impeccable-direction-contract";
    const existing = [...document.body.childNodes].find(
      (node) => node.nodeType === Node.COMMENT_NODE && node.nodeValue?.includes(marker),
    );
    if (existing) return;
    document.body.insertBefore(
      document.createComment(`${marker}\n${DIRECTION_CONTRACT}`),
      document.body.firstChild,
    );
  }, []);

  return null;
}
