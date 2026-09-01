import type { PlanApiResponse, PlanApiSuccess } from "@/lib/plan-store-contracts";
import type { PartyPlan } from "@/lib/types";

export class PlanClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.name = "PlanClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const parse = async (response: Response): Promise<PlanApiSuccess> => {
  const body = (await response.json()) as PlanApiResponse;
  if (!response.ok || !body.ok) {
    const error = body.ok
      ? { code: "STORE_UNAVAILABLE", message: "The plan store returned an unexpected response." }
      : body.error;
    const details = "details" in error ? error.details : undefined;
    throw new PlanClientError(error.message, error.code, response.status, details);
  }
  return body;
};

export const createSharedPlan = async (initialPlan: PartyPlan) =>
  parse(
    await fetch("/api/plans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ initialPlan }),
      cache: "no-store",
    }),
  );

export const readSharedPlan = async (planId: string) =>
  parse(await fetch(`/api/plans/${encodeURIComponent(planId)}`, { cache: "no-store" }));

export const replaceSharedPlan = async (
  nextPlan: PartyPlan,
  expectedPlanVersion: number,
) =>
  parse(
    await fetch(`/api/plans/${encodeURIComponent(nextPlan.planId)}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ expectedPlanVersion, plan: nextPlan }),
      cache: "no-store",
    }),
  );
