import type { PartyPlan, SourceRef, ToolWarning } from "@/lib/types";
import type { TrackProviderReceipt } from "@/lib/curation-contracts";

export type PlanCreationConfiguration = {
  title?: string;
  inspirationTitle: string;
  inspirationAuthor: string;
  guestCount?: number;
  budgetAmount?: number;
  dietaryRequirements?: string[];
  tone?: PartyPlan["tone"];
  eventDate?: string;
  requestedThemes?: string[];
  includeWine?: boolean;
  includeZeroProof?: boolean;
  musicStorefront?: string;
};

export type PlanCreationProviderReceipt = {
  stage: "THEME" | "MENU" | "PAIRINGS" | "SOUNDTRACK";
  provider: string;
  mode: "LIVE" | "HYBRID" | "LOCAL_FALLBACK";
  sources: SourceRef[];
  warnings: ToolWarning[];
  trackReceipts?: TrackProviderReceipt[];
};

export type PlanStoreErrorCode =
  | "PLAN_NOT_FOUND"
  | "PLAN_ALREADY_EXISTS"
  | "VERSION_CONFLICT"
  | "VALIDATION_ERROR";

export class PlanStoreError extends Error {
  readonly code: PlanStoreErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: PlanStoreErrorCode,
    message: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PlanStoreError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type PlanStoreMetadata = {
  storage: "MEMORY" | "REDIS";
  durable: boolean;
  expiresAt: string;
};

export type StoredPartyPlan = {
  plan: PartyPlan;
  metadata: PlanStoreMetadata;
};

export interface PlanStore {
  create(initialPlan?: PartyPlan): Promise<StoredPartyPlan>;
  get(planId: string): Promise<StoredPartyPlan>;
  replace(
    planId: string,
    expectedPlanVersion: number,
    nextPlan: PartyPlan,
  ): Promise<StoredPartyPlan>;
}

export type PlanApiError = {
  ok: false;
  error: {
    code: PlanStoreErrorCode | "BAD_REQUEST" | "FORBIDDEN" | "STORE_UNAVAILABLE" | "SOURCE_UNAVAILABLE";
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
  };
};

export type PlanApiSuccess = {
  ok: true;
  plan: PartyPlan;
  storage: PlanStoreMetadata;
  creation?: {
    providerReceipts: PlanCreationProviderReceipt[];
  };
};

export type PlanApiResponse = PlanApiSuccess | PlanApiError;
