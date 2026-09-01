/*
THESIS: Supper Club AI is a living literary-salon ledger where a Creative Host authors one coherent evening; it refuses the generic rounded-card AI dashboard.
OWN-WORLD: Near-black folio chrome, warm uncoated paper, brick-red signals, seed-chartreuse status, archival-blue marginalia, literary serif titles, compact grotesk labels, mono metadata, ruled plates, registration marks, and stamped states.
STORY: The host sees the whole evening, expands one movement, edits its food and cultural links, verifies agent changes, and approves a useful host packet.
FIRST VIEWPORT: Slim folio index left, chronological spine center, selected movement unfolded across the working plate, agent marginalia right, persistent shopping/prep/completion/export strip below.
FORM: Speculative Salon Ledger, grounded direction 1 of 7; seed a4bcb667; approved Run-of-Show Spine comp.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
*/
import type { Metadata } from "next";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/600.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import { DirectionContractMarker } from "@/components/direction-contract";
import "./globals.css";

const themeInitializationScript = `
  (() => {
    try {
      const saved = window.localStorage.getItem("supper-club-theme");
      const theme = saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (_) {
      document.documentElement.dataset.theme = "light";
    }
  })();
`;

export const metadata: Metadata = {
  title: "Supper Club AI · Creative Host Workspace",
  description: "Turn a cultural idea into one editable dinner-party plan with WebMCP.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body>
        <DirectionContractMarker />
        {children}
      </body>
    </html>
  );
}
