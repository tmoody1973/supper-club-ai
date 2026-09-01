import "server-only";

import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

import { makeSeedPlan } from "@/lib/seed-plan";
import {
  PlanStoreError,
  type PlanStore,
  type StoredPartyPlan,
} from "@/lib/plan-store-contracts";
import type { PartyPlan } from "@/lib/types";

const PLAN_TTL_MS = 24 * 60 * 60 * 1_000;
const PLAN_TTL_SECONDS = PLAN_TTL_MS / 1_000;
const MAX_PLANS = 500;
const REDIS_KEY_PREFIX = "supper-club:plan:";
const MAX_CREATE_ATTEMPTS = 3;

type PlanRecord = {
  plan: PartyPlan;
  expiresAt: number;
};

const clone = <T>(value: T): T => structuredClone(value);

const planNotFound = () =>
  new PlanStoreError(
    "PLAN_NOT_FOUND",
    "That anonymous supper club plan was not found or has expired.",
    404,
  );

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
    if (!record) throw planNotFound();
    return this.response(record);
  }

  async replace(
    planId: string,
    expectedPlanVersion: number,
    nextPlan: PartyPlan,
  ): Promise<StoredPartyPlan> {
    this.cleanup();
    const current = this.records.get(planId);
    if (!current) throw planNotFound();
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

const REPLACE_PLAN_SCRIPT = `
local current = redis.call("GET", KEYS[1])
if not current then
  return {-1, 0}
end

local decoded = cjson.decode(current)
local current_version = tonumber(decoded.plan.planVersion)
local expected_version = tonumber(ARGV[1])
if current_version ~= expected_version then
  return {0, current_version}
end

redis.call("SET", KEYS[1], ARGV[3], "EX", ARGV[2])
return {1, expected_version + 1}
`;

class RedisPlanStore implements PlanStore {
  constructor(private readonly redis: Redis) {}

  private key(planId: string) {
    return `${REDIS_KEY_PREFIX}${planId}`;
  }

  private response(record: PlanRecord): StoredPartyPlan {
    return {
      plan: clone(record.plan),
      metadata: {
        storage: "REDIS",
        durable: true,
        expiresAt: new Date(record.expiresAt).toISOString(),
      },
    };
  }

  private validatedRecord(value: unknown): PlanRecord {
    if (!value || typeof value !== "object") {
      throw new PlanStoreError("VALIDATION_ERROR", "The stored plan record is invalid.", 500);
    }
    const record = value as Partial<PlanRecord>;
    if (!validatePlan(record.plan) || typeof record.expiresAt !== "number") {
      throw new PlanStoreError("VALIDATION_ERROR", "The stored plan record is invalid.", 500);
    }
    return { plan: clone(record.plan), expiresAt: record.expiresAt };
  }

  async create(initialPlan?: PartyPlan): Promise<StoredPartyPlan> {
    for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
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
      const record: PlanRecord = { plan, expiresAt: now + PLAN_TTL_MS };
      const created = await this.redis.set(this.key(planId), record, {
        ex: PLAN_TTL_SECONDS,
        nx: true,
      });
      if (created === "OK") return this.response(record);
    }

    throw new PlanStoreError(
      "PLAN_ALREADY_EXISTS",
      "Could not allocate a unique anonymous plan ID.",
      409,
    );
  }

  async get(planId: string): Promise<StoredPartyPlan> {
    const record = await this.redis.get<PlanRecord>(this.key(planId));
    if (!record) throw planNotFound();
    return this.response(this.validatedRecord(record));
  }

  async replace(
    planId: string,
    expectedPlanVersion: number,
    nextPlan: PartyPlan,
  ): Promise<StoredPartyPlan> {
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
    const result = await this.redis.eval<[string, string, string], [number, number]>(
      REPLACE_PLAN_SCRIPT,
      [this.key(planId)],
      [String(expectedPlanVersion), String(PLAN_TTL_SECONDS), JSON.stringify(record)],
    );
    const [status, currentPlanVersion] = result.map(Number);

    if (status === -1) throw planNotFound();
    if (status === 0) {
      throw new PlanStoreError(
        "VERSION_CONFLICT",
        `Plan version ${expectedPlanVersion} is stale; the current version is ${currentPlanVersion}.`,
        409,
        { expectedPlanVersion, currentPlanVersion },
      );
    }
    if (status !== 1) {
      throw new PlanStoreError("VALIDATION_ERROR", "Redis returned an invalid plan update result.", 500);
    }
    return this.response(record);
  }
}

declare global {
  var __supperClubPlanStore: PlanStore | undefined;
}

const redisConfiguration = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if ((url && !token) || (!url && token)) {
    throw new Error(
      "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be configured together.",
    );
  }
  return url && token ? { url, token } : null;
};

export const getPlanStoreStatus = () => {
  const redis = redisConfiguration();
  return redis
    ? { storage: "REDIS" as const, durable: true }
    : { storage: "MEMORY" as const, durable: false };
};

export const getPlanStore = (): PlanStore => {
  if (!globalThis.__supperClubPlanStore) {
    const configuration = redisConfiguration();
    globalThis.__supperClubPlanStore = configuration
      ? new RedisPlanStore(new Redis(configuration))
      : new MemoryPlanStore();
  }
  return globalThis.__supperClubPlanStore;
};

export const isPartyPlan = validatePlan;
