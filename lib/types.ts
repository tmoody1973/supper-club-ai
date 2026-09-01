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
    quantityText: string;
    category: string;
    isOptional: boolean;
  }>;
  instructionsUrl: string;
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
};

export type TrackEditorialContext = {
  artistOverview: string;
  albumOverview: string;
  culturalContext: string;
  hostingNote: string;
  researchedAt: string;
  sources: SourceRef[];
};

export type Track = {
  trackId: string;
  providerId?: string;
  title: string;
  artist: string;
  moment: string;
  provider: "Apple Music";
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
  releaseContext?: {
    year?: number;
    genres: string[];
    styles: string[];
    source: SourceRef;
  };
  editorialContext?: TrackEditorialContext;
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
  inspiration: { type: "BOOK"; title: string; author: string };
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
