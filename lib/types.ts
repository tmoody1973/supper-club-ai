export type PartySection =
  | "CONFIGURATION"
  | "THEME"
  | "MENU"
  | "PAIRINGS"
  | "SOUNDTRACK"
  | "SHOPPING_LIST"
  | "FINALIZATION"
  | "EXPORTS";

export type SourceRef = {
  sourceId: string;
  provider: string;
  title: string;
  url: string;
  accessedAt: string;
  attribution?: string;
  licenseNote?: string;
};

export type BookCover = {
  imageUrl: string;
  sourceUrl: string;
  alt: string;
  attribution: string;
};

export type ToolWarning = {
  code: string;
  message: string;
  affectedIds?: string[];
};

export type NextAction = {
  tool: string;
  label: string;
  reason: string;
  requiresConfirmation: boolean;
};

export type ToolSuccess<T> = {
  ok: true;
  schemaVersion: "1.0";
  planId: string;
  planVersion: number;
  ui: { updated: boolean; sections: PartySection[] };
  data: T;
  summary: string;
  warnings: ToolWarning[];
  sources: SourceRef[];
  nextActions: NextAction[];
};

export type ToolFailure = {
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

export type ThemeIdea = {
  themeId: string;
  name: string;
  interpretation: string;
  experienceIdeas: string[];
  sourceIds: string[];
};

export type CreativeBrief = {
  schemaVersion: "1.0";
  inspirationLabel: string;
  themes: string[];
  emotionalArc: string[];
  visualLanguage: string[];
  hospitalityPrinciples: string[];
  flavorDirections: string[];
  ingredientMotifs: string[];
  serviceStyle: "SHARED_TABLE" | "PLATED" | "FLEXIBLE";
  musicDirections: {
    arrival: string[];
    table: string[];
    reflection: string[];
    closing: string[];
  };
  avoid: string[];
  provenance: "REVIEWED_CATALOG" | "BIBLIOGRAPHIC_METADATA";
};

export type MenuCourse = {
  courseId: string;
  recipeId: string;
  role: "STARTER" | "MAIN" | "DESSERT";
  title: string;
  subtitle: string;
  description: string;
  servings: number;
  ingredients: Array<{
    ingredientId: string;
    name: string;
    canonicalName?: string;
    quantityText: string;
    normalizedQuantity?: {
      value: number;
      unit: string;
    };
    scalingStatus?: "EXACT_NORMALIZED" | "PROVIDER_SCALED" | "UNSCALED_UNNORMALIZED";
    category: string;
    isOptional: boolean;
  }>;
  instructionsUrl: string;
  instructions?: {
    mode: "SOURCE_LINK" | "EMBEDDED";
    status:
      | "LICENSED_PROVIDER_INSTRUCTIONS"
      | "REVIEWED_CATALOG_INSTRUCTIONS"
      | "SOURCE_LINK_REQUIRED";
    rightsNote: string;
    steps?: string[];
    license?: string;
    attribution?: string;
  };
  quantityScaling?: {
    status:
      | "EXACT_NORMALIZED"
      | "PROVIDER_SCALED"
      | "UNSCALED_UNNORMALIZED"
      | "NOT_SCALED";
    sourceServings: number;
    targetServings: number;
    factor?: number;
    note: string;
  };
  prepMinutes: number;
  cookMinutes: number;
  dietaryTags: string[];
  allergens: string[];
  themeConnection: string;
  sourceId: string;
  source: SourceRef;
  confirmed: boolean;
};

export type Pairing = {
  pairingId: string;
  courseId: string;
  kind: "WINE" | "ZERO_PROOF";
  name: string;
  style: string;
  tastingNotes: string[];
  pairingReason: string;
  sourceId: string;
  source: SourceRef;
  recipeDetails?: {
    servings: number;
    prepMinutes: number;
    ingredients: Array<{
      name: string;
      quantityText: string;
    }>;
    dietaryTags: string[];
    allergens: string[];
    instructionsUrl: string;
    confirmed: false;
  };
};

export type TrackEditorialContext = {
  artistOverview: string;
  albumOverview: string;
  culturalContext: string;
  hostingNote: string;
  researchedAt: string;
  sources: SourceRef[];
};

export type TrackDiscoveryProvenance =
  | {
      origin: "PERPLEXITY";
      provider: "Perplexity Agent API";
      responseId?: string;
      searchResultIds: number[];
      sources: SourceRef[];
      rationale: string;
    }
  | {
      origin: "REVIEWED_SEED";
      provider: "Reviewed soundtrack anchors";
      sources: SourceRef[];
      rationale: string;
      attemptedCandidate?: {
        title: string;
        artist: string;
        responseId?: string;
        searchResultIds?: number[];
        sources?: SourceRef[];
      };
    };

export type TrackVerificationProvenance = {
  provider: "Apple Music";
  status: "MATCHED" | "NO_MATCH" | "FAILED" | "NOT_CONFIGURED";
  providerId?: string;
  source?: SourceRef;
  reason?: string;
};

export type TrackProvenance = {
  discovery: TrackDiscoveryProvenance;
  verification: TrackVerificationProvenance;
};

export type Track = {
  trackId: string;
  providerId?: string;
  title: string;
  artist: string;
  moment: string;
  provider: "Apple Music" | "Reviewed soundtrack anchors";
  status: "DRAFT" | "CONFIRMED";
  sequence?: number;
  source?: SourceRef;
  sourceUrl?: string;
  previewUrl?: string;
  artwork?: {
    url: string;
    width: number;
    height: number;
    backgroundColor?: string;
  };
  albumName?: string;
  metadataStatus?: "LIVE_APPLE_MUSIC_MATCH" | "REVIEWED_SEED";
  releaseContext?: {
    year?: number;
    genres: string[];
    styles: string[];
    source: SourceRef;
  };
  editorialContext?: TrackEditorialContext;
  provenance?: TrackProvenance;
};

export type Movement = {
  movementId: string;
  number: string;
  time: string;
  title: string;
  subtitle: string;
  courseId?: string;
  recipeLabel: string;
  pairingLabel: string;
  musicLabel: string;
  hostCue: string;
  status: "SET" | "EDITING" | "DRAFT";
};

export type BookBriefing = {
  spoilerLevel: "LIGHT";
  summary: string;
  authorNote: string;
  publicationDetails: string;
  setting: string;
  themes: string[];
  hostingConnection: string;
  contentNotes: string[];
  conversationPrompts: string[];
  sources: SourceRef[];
  provider: "Perplexity Agent API" | "Reviewed book catalog";
};

export type ShoppingItem = {
  itemId: string;
  label: string;
  quantity: string;
  category: string;
  checked: boolean;
  sourceCourseIds: string[];
};

export type PrepTask = {
  taskId: string;
  title: string;
  when: string;
  minutes: number;
  done: boolean;
  courseId?: string;
};

export type Receipt = {
  receiptId: string;
  tool: string;
  title: string;
  detail: string;
  timestamp: string;
  kind: "RECIPE" | "PAIRING" | "MUSIC" | "SHOPPING" | "THEME" | "SYSTEM";
  status: "APPLIED" | "WARNING";
};

export type PartyPlan = {
  planId: string;
  planVersion: number;
  title: string;
  inspiration: { type: "BOOK"; title: string; author: string; cover?: BookCover };
  hostName: string;
  location: string;
  eventDate: string;
  eventTime: string;
  guestCount: number;
  budget: { amount: number; currency: "USD" };
  dietaryRequirements: string[];
  tone: "HOPEFUL" | "BALANCED" | "SURVIVALIST";
  status: "BUILDING" | "READY" | "FINALIZED";
  completion: number;
  theme: {
    headline: string;
    framing: string;
    ideas: ThemeIdea[];
    source: SourceRef;
    copyrightNotice: string;
    creativeBrief?: CreativeBrief;
    bookBriefing?: BookBriefing;
  };
  movements: Movement[];
  courses: MenuCourse[];
  pairings: Pairing[];
  soundtrack: Track[];
  shopping: ShoppingItem[];
  prep: PrepTask[];
  receipts: Receipt[];
  warnings: ToolWarning[];
  exports: Array<{ exportId: string; filename: string; createdAt: string }>;
  updatedAt: string;
};
