import { checkPlanRequest, noStoreHeaders, planError, planStoreErrorResponse } from "@/lib/plan-api.server";
import { getPlanStore, isPartyPlan } from "@/lib/plan-store.server";
import type { PlanApiSuccess } from "@/lib/plan-store-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validPlanId = (value: string) => /^plan-[0-9a-f-]{36}$/i.test(value);

type PlanRouteContext = {
  params: Promise<{ planId: string }>;
};

export async function GET(request: Request, context: PlanRouteContext) {
  const rejected = checkPlanRequest(request);
  if (rejected) return rejected;
  const { planId } = await context.params;
  if (!validPlanId(planId)) return planError("BAD_REQUEST", "Invalid planId.", 400);

  try {
    const stored = await getPlanStore().get(planId);
    return Response.json(
      { ok: true, plan: stored.plan, storage: stored.metadata } satisfies PlanApiSuccess,
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return planStoreErrorResponse(error);
  }
}

export async function PUT(request: Request, context: PlanRouteContext) {
  const rejected = checkPlanRequest(request);
  if (rejected) return rejected;
  const { planId } = await context.params;
  if (!validPlanId(planId)) return planError("BAD_REQUEST", "Invalid planId.", 400);

  try {
    const body = (await request.json()) as {
      expectedPlanVersion?: unknown;
      plan?: unknown;
    };
    if (!Number.isInteger(body.expectedPlanVersion) || !isPartyPlan(body.plan)) {
      return planError(
        "BAD_REQUEST",
        "expectedPlanVersion and a valid replacement plan are required.",
        422,
      );
    }
    const stored = await getPlanStore().replace(
      planId,
      Number(body.expectedPlanVersion),
      body.plan,
    );
    return Response.json(
      { ok: true, plan: stored.plan, storage: stored.metadata } satisfies PlanApiSuccess,
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return planStoreErrorResponse(error);
  }
}
