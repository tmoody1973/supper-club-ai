import type {
  CreativeBrief,
  MenuCourse,
  Pairing,
  SourceRef,
  ThemeIdea,
  ToolWarning,
  Track,
} from "@/lib/types";

export type CurationMode = "LIVE" | "HYBRID" | "LOCAL_FALLBACK";

export type ThemeCurationData = {
  headline: string;
  framing: string;
  ideas: ThemeIdea[];
  source: SourceRef;
  creativeBrief: CreativeBrief;
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

export type SoundtrackCurationData = {
  soundtrack: Track[];
  savedToLibrary: false;
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
      creativeBrief?: CreativeBrief;
    }
  | {
      action: "CURATE_SOUNDTRACK";
      storefront: string;
      durationMinutes: number;
      energyArc: "ARRIVAL_TO_ASCENT" | "STEADY_GLOW" | "CUSTOM";
      customEnergyNotes?: string;
      creativeBrief?: CreativeBrief;
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
  provider: "Open Library" | "Spoonacular" | "GrapeMinds" | "X-Wines" | "Reviewed zero-proof catalog" | "Apple Music" | "Discogs";
  configured: boolean;
  mode: "LIVE" | "LOCAL" | "OPTIONAL_ENRICHMENT";
};
