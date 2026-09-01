import "server-only";

import { randomUUID } from "node:crypto";

import { makeSeedPlan } from "@/lib/seed-plan";
import {
  PlanStoreError,
  type PlanStore,
  type StoredPartyPlan,
} from "@/lib/plan-store-contracts";
import type { PartyPlan } from "@/lib/types";

const PLAN_TTL_MS = 24 * 60 * 60 * 1_000;
const MAX_PLANS = 500;

type PlanRecord = {
  plan: PartyPlan;
  expiresAt: number;
};

const clone = <T>(value: T): T => structuredClone(value);

const validatePlan = (value: unknown): value is PartyPlan => {
  if (!value || typeof value !== "object") return false;
  const plan = value as Partial<PartyPlan>;
  return (
    typeof plan.planId === "string" &&
    plan.planId.length >= 8 &&
    Number.isInteger(plan.planVersion) &&
    Number(plan.planVersion) >= 1 &&
    typeof plan.title === "string" &&
    typeof plan.guestCount === "number" &&
    Array.isArray(plan.courses) &&
    Array.isArray(plan.pairings) &&
    Array.isArray(plan.soundtrack) &&
    Array.isArray(plan.shopping) &&
    Array.isArray(plan.prep) &&
    Array.isArray(plan.receipts) &&
    Array.isArray(plan.warnings) &&
    Array.isArray(plan.exports)
  );
};

class MemoryPlanStore implements PlanStore {
  private readonly records = new Map<string, PlanRecord>();

  private cleanup(now = Date.now()) {
    for (const [planId, record] of this.records) {
      if (record.expiresAt <= now) this.records.delete(planId);
    }

    while (this.records.size >= MAX_PLANS) {
      const oldest = this.records.keys().next().value as string | undefined;
      if (!oldest) break;
      this.records.delete(oldest);
    }
  }

  private response(record: PlanRecord): StoredPartyPlan {
    return {
      plan: clone(record.plan),
      metadata: {
        storage: "MEMORY",
        durable: false,
        expiresAt: new Date(record.expiresAt).toISOString(),
      },
    };
  }

  async create(initialPlan?: PartyPlan): Promise<StoredPartyPlan> {
    this.cleanup();
    const now = Date.now();
    const planId = `plan-${randomUUID()}`;
    const source = initialPlan && validatePlan(initialPlan) ? clone(initialPlan) : makeSeedPlan();
    const plan: PartyPlan = {
      ...source,
      planId,
      planVersion: 1,
      status: source.status === "FINALIZED" ? "BUILDING" : source.status,
      updatedAt: new Date(now).toISOString(),
      exports: [],
    };
    const record = { plan, expiresAt: now + PLAN_TTL_MS };
    this.records.set(planId, record);
    return this.response(record);
  }

  async get(planId: string): Promise<StoredPartyPlan> {
    this.cleanup();
    const record = this.records.get(planId);
    if (!record) {
      throw new PlanStoreError(
        "PLAN_NOT_FOUND",
        "That anonymous supper club plan was not found or has expired.",
        404,
      );
    }
    return this.response(record);
  }

  async replace(
    planId: string,
    expectedPlanVersion: number,
    nextPlan: PartyPlan,
  ): Promise<StoredPartyPlan> {
    this.cleanup();
    const current = this.records.get(planId);
    if (!current) {
      throw new PlanStoreError(
        "PLAN_NOT_FOUND",
        "That anonymous supper club plan was not found or has expired.",
        404,
      );
    }
    if (current.plan.planVersion !== expectedPlanVersion) {
      throw new PlanStoreError(
        "VERSION_CONFLICT",
        `Plan version ${expectedPlanVersion} is stale; the current version is ${current.plan.planVersion}.`,
        409,
        {
          expectedPlanVersion,
          currentPlanVersion: current.plan.planVersion,
        },
      );
    }
    if (
      !validatePlan(nextPlan) ||
      nextPlan.planId !== planId ||
      nextPlan.planVersion !== expectedPlanVersion + 1
    ) {
      throw new PlanStoreError(
        "VALIDATION_ERROR",
        "The replacement plan must preserve its planId and advance exactly one version.",
        422,
      );
    }

    const record: PlanRecord = {
      plan: clone(nextPlan),
      expiresAt: Date.now() + PLAN_TTL_MS,
    };
    this.records.delete(planId);
    this.records.set(planId, record);
    return this.response(record);
  }
}

declare global {
  var __supperClubPlanStore: PlanStore | undefined;
}

export const getPlanStore = (): PlanStore => {
  if (!globalThis.__supperClubPlanStore) {
    globalThis.__supperClubPlanStore = new MemoryPlanStore();
  }
  return globalThis.__supperClubPlanStore;
};

export const isPartyPlan = validatePlan;
