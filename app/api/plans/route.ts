import { checkPlanRequest, noStoreHeaders, planError, planStoreErrorResponse } from "@/lib/plan-api.server";
import { getPlanStore, isPartyPlan } from "@/lib/plan-store.server";
import type { PlanApiSuccess } from "@/lib/plan-store-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      ok: true,
      service: "Supper Club anonymous PlanStore",
      storage: "MEMORY",
      durable: false,
      authentication: "PLAN_ID",
    },
    { headers: noStoreHeaders },
  );
}

export async function POST(request: Request) {
  const rejected = checkPlanRequest(request);
  if (rejected) return rejected;

  try {
    const body = (await request.json().catch(() => ({}))) as { initialPlan?: unknown };
    if (body.initialPlan !== undefined && !isPartyPlan(body.initialPlan)) {
      return planError("BAD_REQUEST", "initialPlan is not a valid PartyPlan.", 422);
    }
    const stored = await getPlanStore().create(body.initialPlan);
    return Response.json(
      { ok: true, plan: stored.plan, storage: stored.metadata } satisfies PlanApiSuccess,
      { status: 201, headers: noStoreHeaders },
    );
  } catch (error) {
    return planStoreErrorResponse(error);
  }
}
