import type {
  CreativeBrief,
  BookCover,
  BookBriefing,
  MenuCourse,
  Pairing,
  SourceRef,
  ThemeIdea,
  ToolWarning,
  Track,
  TrackEditorialContext,
  TrackProvenance,
} from "@/lib/types";

export type CurationMode = "LIVE" | "HYBRID" | "LOCAL_FALLBACK";

export type ThemeCurationData = {
  headline: string;
  framing: string;
  ideas: ThemeIdea[];
  source: SourceRef;
  creativeBrief: CreativeBrief;
  bookCover?: BookCover;
  bookBriefing?: BookBriefing;
};

export type MenuCurationData = {
  courses: MenuCourse[];
  estimatedMenuCost: {
    amount: number;
    currency: "USD";
    confidence: "LOW";
  };
};

export type PairingCurationData = { pairings: Pairing[] };

export type TrackProviderReceipt = {
  trackId: string;
  title: string;
  artist: string;
  moment: string;
  detail: string;
  sources: SourceRef[];
  provenance: TrackProvenance;
};

export type SoundtrackCurationData = {
  soundtrack: Track[];
  trackReceipts: TrackProviderReceipt[];
  savedToLibrary: false;
};

export type SoundtrackEnrichmentData = {
  enrichments: Array<{
    trackId: string;
    context: TrackEditorialContext;
  }>;
};

export type CurationRequest =
  | {
      action: "RESEARCH_THEME";
      inspiration: { title: string; author: string };
      requestedThemes: string[];
      tone: "HOPEFUL" | "BALANCED" | "SURVIVALIST";
    }
  | {
      action: "CURATE_MENU";
      servings: number;
      dietaryRequirements: string[];
      preparationMinutesMax?: number;
      menuBudgetCap: { amount: number; currency: "USD" };
      creativeBrief?: CreativeBrief;
    }
  | {
      action: "CURATE_PAIRINGS";
      courses: Array<{
        courseId: string;
        role: MenuCourse["role"];
        title: string;
        ingredients?: string[];
        dietaryTags?: string[];
      }>;
      includeWine: boolean;
      includeZeroProof: boolean;
      servings?: number;
      dietaryRequirements?: string[];
      creativeBrief?: CreativeBrief;
    }
  | {
      action: "CURATE_SOUNDTRACK";
      storefront: string;
      durationMinutes: number;
      energyArc: "ARRIVAL_TO_ASCENT" | "STEADY_GLOW" | "CUSTOM";
      customEnergyNotes?: string;
      creativeBrief?: CreativeBrief;
    }
  | {
      action: "ENRICH_SOUNDTRACK";
      tracks: Array<{
        trackId: string;
        title: string;
        artist: string;
        albumName?: string;
        sourceUrl?: string;
      }>;
      theme: {
        title: string;
        framing: string;
      };
    };

export type CurationResponse<T> = {
  ok: true;
  mode: CurationMode;
  provider: string;
  data: T;
  sources: SourceRef[];
  warnings: ToolWarning[];
};

export type CurationErrorResponse = {
  ok: false;
  error: {
    code: "BAD_REQUEST" | "CURATION_UNAVAILABLE";
    message: string;
  };
};

export type ProviderStatus = {
  provider: "Open Library" | "Spoonacular" | "GrapeMinds" | "X-Wines" | "Reviewed zero-proof catalog" | "Apple Music" | "Discogs" | "Perplexity";
  configured: boolean;
  mode: "LIVE" | "LOCAL" | "OPTIONAL_ENRICHMENT";
};
