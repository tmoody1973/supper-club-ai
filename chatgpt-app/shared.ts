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
  theme: { headline: string; framing: string };
  movements: Array<{ movementId: string; status: "SET" | "EDITING" | "DRAFT" }>;
  courses: Array<{ courseId: string; title: string; confirmed: boolean }>;
  pairings: Array<{ pairingId: string; courseId: string; kind: "WINE" | "ZERO_PROOF"; name: string }>;
  soundtrack: Array<{ trackId: string; title: string; artist: string }>;
  shopping: Array<{ itemId: string; label: string; checked: boolean }>;
  prep: Array<{ taskId: string; title: string; done: boolean }>;
  receipts: Array<{
    receiptId: string;
    tool: string;
    title: string;
    detail: string;
    timestamp: string;
    kind: "RECIPE" | "PAIRING" | "MUSIC" | "SHOPPING" | "THEME" | "SYSTEM";
    status: "APPLIED" | "WARNING";
  }>;
  warnings: Array<{ code: string; message: string }>;
  exports: Array<{ exportId: string; filename: string; createdAt: string }>;
  updatedAt: string;
  [key: string]: unknown;
};

export type StorageMetadata = {
  storage: "MEMORY";
  durable: boolean;
  expiresAt: string;
};

export type PlanEnvelope = {
  plan: PartyPlan;
  storage: StorageMetadata;
  websiteUrl: string;
};

export type PartyConfiguration = {
  title?: string;
  inspirationTitle?: string;
  inspirationAuthor?: string;
  guestCount?: number;
  budgetAmount?: number;
  dietaryRequirements?: string[];
  tone?: "HOPEFUL" | "BALANCED" | "SURVIVALIST";
  eventDate?: string;
};
