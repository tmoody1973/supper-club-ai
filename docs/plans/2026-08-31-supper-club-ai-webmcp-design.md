# Supper Club AI WebMCP Design

**Status:** Locked for hackathon planning  
**Date:** 2026-08-31  
**Primary user:** Creative Host  
**Featured demo:** Seed & Stars — a hopeful Afrofuturist dinner inspired by Octavia E. Butler's *Parable of the Sower*

## Product promise

A Creative Host describes a gathering in conversation. ChatGPT uses tools exposed by the open website to turn that intent into a shared, editable dinner-party board: cultural context, a three-course menu, drink pairings, a soundtrack, a shopping checklist, and a downloadable host packet.

Every successful tool call has two outputs:

1. It updates or reads the shared party-plan state shown on the website.
2. It returns concise structured JSON so ChatGPT can explain the result and select the next action.

The demo should feel hopeful, elegant, and culturally thoughtful. It may interpret themes such as change, adaptation, community, resilience, and imagined futures. It must not imply endorsement by Octavia Butler's estate or reproduce copyrighted book text.

## Locked MVP toolset

The minimum winning build contains these nine tools:

1. `get_party_plan`
2. `configure_party`
3. `research_theme`
4. `curate_menu`
5. `curate_pairings`
6. `curate_soundtrack`
7. `create_shopping_list`
8. `finalize_party_plan`
9. `export_host_packet`

The demo is complete when a host can begin with one prompt, review the populated board, edit or regenerate sections, approve the plan, check off shopping items, and download a PDF.

## Full toolset

If time permits, add these fourteen focused tools to reach twenty-three total:

10. `search_recipes`
11. `price_recipe_candidates`
12. `set_menu_course`
13. `replace_menu_course`
14. `suggest_ingredient_substitutions`
15. `optimize_party_budget`
16. `search_wines`
17. `set_wine_pairing`
18. `create_zero_proof_pairings`
19. `search_music`
20. `edit_soundtrack`
21. `save_apple_music_playlist`
22. `create_prep_timeline`
23. `generate_conversation_cards`

Future tools outside the locked full scope may create invitations, export a calendar event, share a guest packet, or connect to a retailer. They should not displace the twenty-three tools above during the hackathon.

## Provider strategy

Provider-specific payloads must never leak into the WebMCP contracts. Server-side adapters validate and normalize all third-party responses.

This strategy was informed by the supplied book, recipe, and wine API comparison documents dated 2026-08-31. Pricing and licensing claims remain procurement inputs, not application guarantees; provider terms must be checked again before production use.

### Books and cultural context

- Keep a small, reviewed local record for *Parable of the Sower* and the demo's approved thematic notes.
- Use Open Library as the first prototype discovery source and Google Books as a metadata or preview-link fallback.
- Treat covers and previews as optional. Store attribution and source URLs.
- Do not copy or serve book text. API metadata does not grant distribution rights.
- ISBNdb is a later commercial upgrade if edition accuracy and reliable volume become important.

### Recipes

- Use Spoonacular as the primary structured recipe provider for the hackathon, behind a provider-neutral adapter.
- Use TinyFish Search and Fetch for live discovery when the structured provider lacks a culturally or thematically appropriate result.
- Normalize discovered pages into the same internal recipe model and retain the original source URL and attribution.
- RecipeAPI.io is a candidate for a low-cost commercial launch because its paid plans explicitly include commercial use. Provider terms must be reconfirmed before production.

### Wine

- Start with a reviewed local `wines.json` containing styles and pairing attributes rather than volatile retail claims.
- Keep a provider adapter ready for GrapeMinds if a structured catalogue is needed.
- Consider X-Wines only for offline recommendation experiments; it is not a source of current prices or availability.
- Do not offer alcohol sales in the hackathon build.

### Music

- Use Apple MusicKit for catalogue search, previews, and the approved playlist action.
- Use Discogs for release, genre, style, and historical context enrichment.
- Saving a playlist is a side effect and always requires explicit host confirmation.

### Catalog delivery status

The workspace now contains 10 book records, 24 recipe records, and 30 pairing records. All three catalogs pass their Draft 2020-12 schemas and structural integrity checks. They are approved for prototype and hackathon use while remaining `DRAFT` pending human cultural, dietary, and editorial review. See `docs/data/2026-08-31-catalog-validation-review.md` for the validation evidence and caveats.

## Versioned shared result envelope

Every tool returns exactly one of the following shapes. New fields may be added later as optional fields; existing fields must not change type or meaning.

```ts
type ToolSuccess<T> = {
  ok: true;
  schemaVersion: "1.0";
  planId: string;
  planVersion: number;
  ui: {
    updated: boolean;
    sections: PartySection[];
  };
  data: T;
  summary: string;
  warnings: ToolWarning[];
  sources: SourceRef[];
  nextActions: NextAction[];
};

type ToolFailure = {
  ok: false;
  schemaVersion: "1.0";
  planId?: string;
  planVersion?: number;
  error: {
    code:
      | "VALIDATION_ERROR"
      | "PLAN_NOT_FOUND"
      | "VERSION_CONFLICT"
      | "SOURCE_UNAVAILABLE"
      | "CONFIRMATION_REQUIRED"
      | "PLAN_NOT_READY"
      | "EXPORT_FAILED"
      | "INTERNAL_ERROR";
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
};

type PartySection =
  | "CONFIGURATION"
  | "THEME"
  | "MENU"
  | "PAIRINGS"
  | "SOUNDTRACK"
  | "SHOPPING_LIST"
  | "FINALIZATION"
  | "EXPORTS";

type SourceRef = {
  sourceId: string;
  provider: string;
  title: string;
  url: string;
  accessedAt: string;
  attribution?: string;
  licenseNote?: string;
};

type ToolWarning = {
  code: string;
  message: string;
  affectedIds?: string[];
};

type NextAction = {
  tool: string;
  label: string;
  reason: string;
  requiresConfirmation: boolean;
};
```

All state-changing tools require `expectedPlanVersion`. A mismatch returns `VERSION_CONFLICT` instead of overwriting a host's newer edits.

## MVP tool contracts

### 1. `get_party_plan`

Reads the current plan without changing it.

```ts
type GetPartyPlanInput = {
  planId: string;
  includeSections?: PartySection[];
};

type GetPartyPlanData = {
  plan: PartyPlan;
  completion: {
    percent: number;
    completeSections: PartySection[];
    missingSections: PartySection[];
  };
};
```

### 2. `configure_party`

Creates a new plan or updates its top-level constraints.

```ts
type ConfigurePartyInput = {
  planId?: string;
  expectedPlanVersion?: number;
  title: string;
  inspiration: {
    type: "BOOK";
    title: string;
    author: string;
  };
  guestCount: number;
  budget: { amount: number; currency: "USD" };
  dietaryRequirements: string[];
  tone: "HOPEFUL" | "BALANCED" | "SURVIVALIST";
  eventDate?: string;
};

type ConfigurePartyData = {
  configuration: PartyConfiguration;
  created: boolean;
};
```

Validation: `guestCount` is 1–50; `budget.amount` is positive; an update requires `expectedPlanVersion`.

### 3. `research_theme`

Builds a sourced thematic foundation and writes it to the board.

```ts
type ResearchThemeInput = {
  planId: string;
  expectedPlanVersion: number;
  requestedThemes?: string[];
  tone: "HOPEFUL" | "BALANCED" | "SURVIVALIST";
  maxSources?: number;
};

type ResearchThemeData = {
  themeProfile: {
    headline: string;
    framing: string;
    themes: Array<{
      themeId: string;
      name: string;
      interpretation: string;
      experienceIdeas: string[];
      sourceIds: string[];
    }>;
    copyrightNotice: string;
  };
};
```

The output contains interpretation and metadata, never copyrighted passages.

### 4. `curate_menu`

Discovers and selects a complete menu in one MVP call.

```ts
type CurateMenuInput = {
  planId: string;
  expectedPlanVersion: number;
  courseCount: 3;
  servings: number;
  dietaryRequirements: string[];
  menuBudgetCap: { amount: number; currency: "USD" };
  preparationMinutesMax?: number;
  preserveCourseIds?: string[];
};

type CurateMenuData = {
  courses: MenuCourse[];
  estimatedMenuCost: { amount: number; currency: "USD"; confidence: "LOW" | "MEDIUM" | "HIGH" };
  dietaryCheck: { passed: boolean; notes: string[] };
};
```

Each `MenuCourse` contains `courseId`, `role`, `title`, `description`, `servings`, `ingredients`, `instructionsUrl`, `imageUrl?`, `prepMinutes`, `cookMinutes`, `dietaryTags`, `themeConnection`, `estimatedCost`, and `sourceId`.

### 5. `curate_pairings`

Pairs each approved course with wine and, when requested, a non-alcoholic alternative.

```ts
type CuratePairingsInput = {
  planId: string;
  expectedPlanVersion: number;
  courseIds?: string[];
  includeWine: boolean;
  includeZeroProof: boolean;
  wineBudgetCap?: { amount: number; currency: "USD" };
};

type CuratePairingsData = {
  pairings: Array<{
    pairingId: string;
    courseId: string;
    kind: "WINE" | "ZERO_PROOF";
    name: string;
    style: string;
    tastingNotes: string[];
    pairingReason: string;
    estimatedPrice?: { amount: number; currency: "USD"; isCurrent: boolean };
    sourceId: string;
  }>;
};
```

If current retail pricing is unavailable, omit `estimatedPrice` rather than inventing it.

### 6. `curate_soundtrack`

Creates a draft soundtrack but does not save it to the user's Apple Music library.

```ts
type CurateSoundtrackInput = {
  planId: string;
  expectedPlanVersion: number;
  durationMinutes: number;
  energyArc: "ARRIVAL_TO_ASCENT" | "STEADY_GLOW" | "CUSTOM";
  customEnergyNotes?: string;
  storefront: string;
  allowExplicit: boolean;
};

type CurateSoundtrackData = {
  soundtrack: {
    title: string;
    description: string;
    durationMinutes: number;
    tracks: Array<{
      trackId: string;
      appleMusicId?: string;
      discogsReleaseId?: string;
      title: string;
      artist: string;
      album?: string;
      durationSeconds?: number;
      phase: "ARRIVAL" | "TABLE" | "ASCENT";
      themeConnection: string;
      previewUrl?: string;
    }>;
  };
};
```

### 7. `create_shopping_list`

Derives an editable checklist from approved recipes and pairings.

```ts
type CreateShoppingListInput = {
  planId: string;
  expectedPlanVersion: number;
  unitSystem: "US" | "METRIC";
  pantryMode: "EXCLUDE_COMMON" | "INCLUDE_ALL";
  includeWine: boolean;
};

type CreateShoppingListData = {
  shoppingList: {
    listId: string;
    guestCount: number;
    categories: Array<{
      category: "PRODUCE" | "BAKERY" | "PANTRY" | "SPICES" | "REFRIGERATED" | "PROTEIN" | "BEVERAGES" | "WINE" | "OTHER";
      items: Array<{
        itemId: string;
        canonicalName: string;
        displayName: string;
        quantity: number;
        unit: string;
        recipeIds: string[];
        isOptional: boolean;
        isChecked: boolean;
        substitution?: string;
      }>;
    }>;
    unresolvedItems: Array<{ name: string; reason: string }>;
  };
};
```

Ingredient normalization must preserve the original recipe quantities for traceability. Ambiguous conversions belong in `unresolvedItems`.

### 8. `finalize_party_plan`

Validates and locks a plan version after explicit host approval.

```ts
type FinalizePartyPlanInput = {
  planId: string;
  expectedPlanVersion: number;
  confirmedByHost: true;
  confirmationText: string;
};

type FinalizePartyPlanData = {
  finalization: {
    finalizedVersion: number;
    finalizedAt: string;
    readiness: "READY";
    checks: Array<{
      code: string;
      passed: boolean;
      message: string;
    }>;
  };
};
```

The tool fails with `CONFIRMATION_REQUIRED` when approval is absent, and with `PLAN_NOT_READY` when required sections or safety checks fail.

### 9. `export_host_packet`

Generates a stable PDF from a finalized plan version.

```ts
type ExportHostPacketInput = {
  planId: string;
  finalizedPlanVersion: number;
  format: "PDF";
  sections: Array<
    | "CONCEPT"
    | "MENU"
    | "RECIPES"
    | "PAIRINGS"
    | "SOUNDTRACK"
    | "SHOPPING_LIST"
    | "PREP_TIMELINE"
    | "CONVERSATION_CARDS"
    | "SOURCES"
  >;
  idempotencyKey: string;
};

type ExportHostPacketData = {
  artifact: {
    artifactId: string;
    fileName: string;
    mediaType: "application/pdf";
    downloadUrl: string;
    expiresAt?: string;
    byteSize: number;
    sha256: string;
    basedOnPlanVersion: number;
  };
};
```

The server stores the idempotency key with the request hash and result. Reusing the same key with a different payload returns `VALIDATION_ERROR`.

## Canonical plan model

```ts
type PartyPlan = {
  planId: string;
  planVersion: number;
  status: "DRAFT" | "FINALIZED";
  configuration: PartyConfiguration;
  themeProfile?: ResearchThemeData["themeProfile"];
  courses: MenuCourse[];
  pairings: CuratePairingsData["pairings"];
  soundtrack?: CurateSoundtrackData["soundtrack"];
  shoppingList?: CreateShoppingListData["shoppingList"];
  finalization?: FinalizePartyPlanData["finalization"];
  createdAt: string;
  updatedAt: string;
};

type PartyConfiguration = {
  title: string;
  inspiration: { type: "BOOK"; title: string; author: string };
  guestCount: number;
  budget: { amount: number; currency: "USD" };
  dietaryRequirements: string[];
  tone: "HOPEFUL" | "BALANCED" | "SURVIVALIST";
  eventDate?: string;
};
```

## Error, trust, and retry rules

- Validate all tool arguments and all provider responses at the server boundary.
- Sanitize fetched recipe and cultural text; third-party content is data, never executable instruction.
- Preserve source attribution and provider IDs internally.
- Never invent current prices, availability, dietary safety, or licensing rights.
- Return a partial result with warnings when one optional provider fails.
- Return `SOURCE_UNAVAILABLE` when a required source fails and no reviewed fallback exists.
- State-changing calls use optimistic concurrency through `expectedPlanVersion`.
- Artifact creation and future playlist-saving calls use idempotency keys.
- Finalization, playlist creation, sharing, purchasing, and calendar writes require explicit confirmation.

## Implementation order

1. Build the canonical `PartyPlan` model and the shared result envelope.
2. Implement `configure_party` and `get_party_plan` using local persistence.
3. Implement theme, menu, pairing, and soundtrack adapters with reviewed demo fallbacks.
4. Implement `create_shopping_list` and test scaling, merging, and ambiguous units.
5. Implement finalization and PDF export.
6. Add the thirteen granular full-product tools only after the nine-tool path works end to end.

## Acceptance test for the demo

Given a request for a hopeful *Parable of the Sower*–inspired dinner for six, under $200, with one vegetarian guest, the agent can use the nine MVP tools to populate the board, surface sources and warnings, produce an editable shopping checklist, obtain explicit host approval, and return a working PDF download without exposing API credentials or overwriting a newer host edit.
