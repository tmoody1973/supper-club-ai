import { checkPlanRequest, noStoreHeaders, planError, planStoreErrorResponse } from "@/lib/plan-api.server";
import { buildDynamicPartyPlan } from "@/lib/dynamic-plan.server";
import { getPlanStore, getPlanStoreStatus, isPartyPlan } from "@/lib/plan-store.server";
import type { PlanApiSuccess, PlanCreationConfiguration } from "@/lib/plan-store-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const parseConfiguration = (value: unknown): PlanCreationConfiguration | null => {
  if (!isRecord(value)) return null;
  const inspirationTitle = typeof value.inspirationTitle === "string" ? value.inspirationTitle.trim() : "";
  const inspirationAuthor = typeof value.inspirationAuthor === "string" ? value.inspirationAuthor.trim() : "";
  if (!inspirationTitle || inspirationTitle.length > 120 || !inspirationAuthor || inspirationAuthor.length > 100) return null;
  if (value.title !== undefined && (typeof value.title !== "string" || !value.title.trim() || value.title.trim().length > 100)) return null;
  if (value.guestCount !== undefined && (!Number.isInteger(value.guestCount) || Number(value.guestCount) < 1 || Number(value.guestCount) > 30)) return null;
  if (value.budgetAmount !== undefined && (typeof value.budgetAmount !== "number" || value.budgetAmount < 0 || value.budgetAmount > 10_000)) return null;
  if (value.tone !== undefined && !["HOPEFUL", "BALANCED", "SURVIVALIST"].includes(String(value.tone))) return null;
  if (value.eventDate !== undefined && (typeof value.eventDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.eventDate))) return null;
  if (value.dietaryRequirements !== undefined && (!Array.isArray(value.dietaryRequirements) || value.dietaryRequirements.length > 20 || value.dietaryRequirements.some((item) => typeof item !== "string" || !item.trim() || item.trim().length > 60))) return null;
  if (value.requestedThemes !== undefined && (!Array.isArray(value.requestedThemes) || value.requestedThemes.length > 8 || value.requestedThemes.some((item) => typeof item !== "string" || !item.trim() || item.trim().length > 40))) return null;
  if (value.includeWine !== undefined && typeof value.includeWine !== "boolean") return null;
  if (value.includeZeroProof !== undefined && typeof value.includeZeroProof !== "boolean") return null;
  if (value.musicStorefront !== undefined && (typeof value.musicStorefront !== "string" || !/^[a-z]{2}$/i.test(value.musicStorefront))) return null;

  return {
    inspirationTitle,
    inspirationAuthor,
    ...(typeof value.title === "string" ? { title: value.title.trim() } : {}),
    ...(typeof value.guestCount === "number" ? { guestCount: value.guestCount } : {}),
    ...(typeof value.budgetAmount === "number" ? { budgetAmount: value.budgetAmount } : {}),
    ...(Array.isArray(value.dietaryRequirements) ? { dietaryRequirements: value.dietaryRequirements.map((item) => String(item).trim()) } : {}),
    ...(typeof value.tone === "string" ? { tone: value.tone as PlanCreationConfiguration["tone"] } : {}),
    ...(typeof value.eventDate === "string" ? { eventDate: value.eventDate } : {}),
    ...(Array.isArray(value.requestedThemes) ? { requestedThemes: value.requestedThemes.map((item) => String(item).trim()) } : {}),
    ...(typeof value.includeWine === "boolean" ? { includeWine: value.includeWine } : {}),
    ...(typeof value.includeZeroProof === "boolean" ? { includeZeroProof: value.includeZeroProof } : {}),
    ...(typeof value.musicStorefront === "string" ? { musicStorefront: value.musicStorefront.toLowerCase() } : {}),
  };
};

export async function GET() {
  try {
    return Response.json(
      {
        ok: true,
        service: "Supper Club anonymous PlanStore",
        ...getPlanStoreStatus(),
        authentication: "PLAN_ID",
      },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    return planStoreErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const rejected = checkPlanRequest(request);
  if (rejected) return rejected;

  try {
    const body = (await request.json().catch(() => ({}))) as { initialPlan?: unknown; configuration?: unknown };
    if (body.initialPlan !== undefined && body.configuration !== undefined) {
      return planError("BAD_REQUEST", "Provide initialPlan or configuration, not both.", 422);
    }
    if (body.initialPlan !== undefined && !isPartyPlan(body.initialPlan)) {
      return planError("BAD_REQUEST", "initialPlan is not a valid PartyPlan.", 422);
    }
    const configuration = body.configuration === undefined ? undefined : parseConfiguration(body.configuration);
    if (body.configuration !== undefined && !configuration) {
      return planError("BAD_REQUEST", "The new-plan configuration contains an invalid or missing field.", 422);
    }
    const build = configuration
      ? await buildDynamicPartyPlan(configuration, request.signal)
      : undefined;
    const initialPlan = build?.plan ?? body.initialPlan;
    const stored = await getPlanStore().create(initialPlan);
    return Response.json(
      {
        ok: true,
        plan: stored.plan,
        storage: stored.metadata,
        ...(build ? { creation: { providerReceipts: build.providerReceipts } } : {}),
      } satisfies PlanApiSuccess,
      { status: 201, headers: noStoreHeaders },
    );
  } catch (error) {
    return planStoreErrorResponse(error);
  }
}
