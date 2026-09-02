import { checkPlanRequest, noStoreHeaders, planError, planStoreErrorResponse } from "@/lib/plan-api.server";
import { getPlanStore } from "@/lib/plan-store.server";
import { findKrogerStores, pricePlanAtKroger, priceRecipeCandidatesAtKroger } from "@/lib/kroger.server";
import { buildRecipeCardPreview } from "@/lib/recipe-cards";
import {
  createPrepTimeline,
  createZeroProofPairings,
  recipeCandidatesByIds,
  refreshSoundtrackMetadata,
  replaceCourseWithRecipe,
  searchMusic,
  searchRecipeCandidates,
  searchWineCandidates,
  setWinePairing,
  suggestIngredientSubstitutions,
} from "@/lib/plan-tools.server";
import type { MenuCourse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ planId: string }> };
const validPlanId = (value: string) => /^plan-[0-9a-f-]{36}$/i.test(value);
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isRole = (value: unknown): value is MenuCourse["role"] => ["STARTER", "MAIN", "DESSERT"].includes(String(value));
const text = (value: unknown, max = 120) => typeof value === "string" && value.trim() && value.trim().length <= max ? value.trim() : undefined;
const stringArray = (value: unknown, maxItems = 20) => Array.isArray(value) && value.length <= maxItems && value.every((item) => typeof item === "string" && item.trim() && item.trim().length <= 60)
  ? value.map((item) => String(item).trim())
  : undefined;

export async function POST(request: Request, context: Context) {
  const rejected = checkPlanRequest(request);
  if (rejected) return rejected;
  const { planId } = await context.params;
  if (!validPlanId(planId)) return planError("BAD_REQUEST", "Invalid planId.", 400);

  try {
    const body = await request.json().catch(() => null);
    if (!isRecord(body) || typeof body.operation !== "string") {
      return planError("BAD_REQUEST", "A valid tool operation is required.", 422);
    }
    const stored = await getPlanStore().get(planId);
    const plan = stored.plan;
    const operation = body.operation;

    if (operation === "FIND_GROCERY_STORES") {
      const zipCode = text(body.zipCode, 5);
      if (!zipCode || !/^\d{5}$/.test(zipCode)) return planError("BAD_REQUEST", "A five-digit zipCode is required.", 422);
      const data = await findKrogerStores(
        zipCode,
        typeof body.radiusInMiles === "number" ? body.radiusInMiles : 10,
        typeof body.limit === "number" ? body.limit : 3,
        request.signal,
      );
      return Response.json({ ok: true, planId, planVersion: plan.planVersion, data, storage: stored.metadata }, { headers: noStoreHeaders });
    }

    if (operation === "PRICE_SHOPPING_LIST") {
      const locationId = text(body.locationId, 12);
      if (!locationId) return planError("BAD_REQUEST", "locationId is required.", 422);
      const data = await pricePlanAtKroger(
        plan,
        locationId,
        typeof body.page === "number" ? body.page : 1,
        typeof body.pageSize === "number" ? body.pageSize : 5,
        request.signal,
      );
      return Response.json({ ok: true, planId, planVersion: plan.planVersion, data, storage: stored.metadata }, { headers: noStoreHeaders });
    }

    if (operation === "SEARCH_RECIPES") {
      if (!isRole(body.role)) return planError("BAD_REQUEST", "role must be STARTER, MAIN, or DESSERT.", 422);
      const dietaryRequirements = body.dietaryRequirements === undefined ? undefined : stringArray(body.dietaryRequirements);
      if (body.dietaryRequirements !== undefined && !dietaryRequirements) return planError("BAD_REQUEST", "dietaryRequirements is invalid.", 422);
      const data = searchRecipeCandidates(plan, {
        role: body.role,
        query: text(body.query, 160),
        dietaryRequirements,
        preparationMinutesMax: typeof body.preparationMinutesMax === "number" ? body.preparationMinutesMax : undefined,
        courseBudgetCap: typeof body.courseBudgetCap === "number" ? body.courseBudgetCap : undefined,
        limit: typeof body.limit === "number" ? Math.min(3, body.limit) : 3,
      });
      return Response.json({
        ok: true,
        planId,
        planVersion: plan.planVersion,
        data: {
          ...data,
          candidates: data.candidates.map((course) => ({
            recipeId: course.recipeId,
            title: course.title,
            role: course.role,
            dietaryTags: course.dietaryTags,
            allergens: course.allergens,
            prepMinutes: course.prepMinutes,
            cookMinutes: course.cookMinutes,
            provider: course.source.provider,
            sourceUrl: course.source.url,
          })),
        },
        storage: stored.metadata,
      }, { headers: noStoreHeaders });
    }

    if (operation === "PRICE_RECIPE_CANDIDATES") {
      if (!isRole(body.role)) return planError("BAD_REQUEST", "role must be STARTER, MAIN, or DESSERT.", 422);
      const locationId = text(body.locationId, 12);
      const recipeIds = stringArray(body.recipeIds, 3);
      const courseBudgetCap = typeof body.courseBudgetCap === "number" ? body.courseBudgetCap : Number.NaN;
      if (!locationId) return planError("BAD_REQUEST", "locationId is required.", 422);
      if (!recipeIds?.length) return planError("BAD_REQUEST", "One to three recipeIds are required.", 422);
      if (!Number.isFinite(courseBudgetCap) || courseBudgetCap <= 0 || courseBudgetCap > 10_000) {
        return planError("BAD_REQUEST", "courseBudgetCap must be greater than zero and no more than 10000.", 422);
      }
      const candidates = recipeCandidatesByIds(plan, body.role, recipeIds);
      const data = await priceRecipeCandidatesAtKroger(plan, candidates, locationId, courseBudgetCap, request.signal);
      return Response.json({ ok: true, planId, planVersion: plan.planVersion, data, storage: stored.metadata }, { headers: noStoreHeaders });
    }

    if (operation === "PREPARE_RECIPE_CARDS") {
      const preview = buildRecipeCardPreview(plan);
      return Response.json({
        ok: true,
        planId,
        planVersion: plan.planVersion,
        data: {
          title: preview.title,
          cardCount: preview.cards.length,
          cards: preview.cards.map((card) => ({
            courseId: card.courseId,
            role: card.role,
            title: card.title,
            servings: card.servings,
            ingredientCount: card.ingredients.length,
            stepCount: card.steps.length,
            instructionStatus: card.instructionStatus,
            scalingStatus: card.scaling.status,
            sourceProvider: card.source.provider,
            sourceUrl: card.source.url,
          })),
          warnings: [...new Set(preview.cards.flatMap((card) => card.warnings))],
        },
        storage: stored.metadata,
      }, { headers: noStoreHeaders });
    }

    if (operation === "SUGGEST_INGREDIENT_SUBSTITUTIONS") {
      const data = suggestIngredientSubstitutions(plan, text(body.courseId), text(body.ingredientName), text(body.reason, 40));
      return Response.json({ ok: true, planId, planVersion: plan.planVersion, data: { substitutions: data }, storage: stored.metadata }, { headers: noStoreHeaders });
    }

    if (operation === "SEARCH_WINES") {
      const courseId = text(body.courseId);
      if (!courseId) return planError("BAD_REQUEST", "courseId is required.", 422);
      const data = await searchWineCandidates(plan, courseId, typeof body.limit === "number" ? Math.min(3, body.limit) : 3, request.signal);
      return Response.json({
        ok: true,
        planId,
        planVersion: plan.planVersion,
        data: {
          ...data,
          candidates: data.candidates.map((pairing) => ({
            pairingId: pairing.pairingId,
            courseId: pairing.courseId,
            name: pairing.name,
            style: pairing.style,
            tastingNotes: pairing.tastingNotes,
            pairingReason: pairing.pairingReason,
            provider: pairing.source.provider,
            sourceUrl: pairing.source.url,
          })),
        },
        storage: stored.metadata,
      }, { headers: noStoreHeaders });
    }

    if (operation === "SEARCH_MUSIC") {
      const query = text(body.query, 180);
      const storefront = text(body.storefront, 2)?.toLowerCase();
      if (!query || !storefront || !/^[a-z]{2}$/.test(storefront)) return planError("BAD_REQUEST", "query and a two-letter storefront are required.", 422);
      const candidates = await searchMusic(query, storefront, typeof body.limit === "number" ? Math.min(3, body.limit) : 3, request.signal);
      return Response.json({ ok: true, planId, planVersion: plan.planVersion, data: { candidates, provider: "Apple Music" }, storage: stored.metadata }, { headers: noStoreHeaders });
    }

    const expectedPlanVersion = Number(body.expectedPlanVersion);
    if (!Number.isInteger(expectedPlanVersion) || expectedPlanVersion < 1) return planError("BAD_REQUEST", "expectedPlanVersion is required for state-changing tools.", 422);
    if (plan.planVersion !== expectedPlanVersion) return planError("VERSION_CONFLICT", `Plan version ${expectedPlanVersion} is stale; the current version is ${plan.planVersion}.`, 409, { expectedPlanVersion, currentPlanVersion: plan.planVersion });

    let next;
    let data: Record<string, unknown> = {};
    if (operation === "SET_MENU_COURSE") {
      const courseId = text(body.courseId);
      const recipeId = text(body.recipeId);
      if (!courseId || !recipeId) return planError("BAD_REQUEST", "courseId and recipeId are required.", 422);
      next = replaceCourseWithRecipe(plan, expectedPlanVersion, courseId, recipeId);
      data = { selectedCourse: next.courses.find((course) => course.courseId === courseId), pairingsNeedReview: true };
    } else if (operation === "REPLACE_MENU_COURSE") {
      const courseId = text(body.courseId);
      const current = plan.courses.find((course) => course.courseId === courseId);
      if (!courseId || !current) return planError("BAD_REQUEST", "A current courseId is required.", 422);
      const dietaryRequirements = body.dietaryRequirements === undefined ? plan.dietaryRequirements : stringArray(body.dietaryRequirements);
      if (!dietaryRequirements) return planError("BAD_REQUEST", "dietaryRequirements is invalid.", 422);
      const results = searchRecipeCandidates(plan, {
        role: current.role,
        query: text(body.query, 160),
        dietaryRequirements,
        preparationMinutesMax: typeof body.preparationMinutesMax === "number" ? body.preparationMinutesMax : undefined,
        courseBudgetCap: typeof body.courseBudgetCap === "number" ? body.courseBudgetCap : undefined,
        limit: 8,
      });
      const replacement = results.candidates.find((candidate) => candidate.recipeId !== current.recipeId);
      if (!replacement) return planError("VALIDATION_ERROR", "No different reviewed recipe satisfies those constraints.", 422);
      next = replaceCourseWithRecipe(plan, expectedPlanVersion, courseId, replacement.recipeId);
      data = { replacedCourseId: courseId, selectedCourse: replacement, budget: results.budget, pairingsNeedReview: true };
    } else if (operation === "CREATE_PREP_TIMELINE") {
      next = createPrepTimeline(plan, expectedPlanVersion);
      data = { prepTimeline: next.prep };
    } else if (operation === "SET_WINE_PAIRING") {
      const courseId = text(body.courseId);
      const pairingId = text(body.pairingId, 220);
      if (!courseId || !pairingId) return planError("BAD_REQUEST", "courseId and pairingId are required.", 422);
      const results = await searchWineCandidates(plan, courseId, 8, request.signal);
      const pairing = results.candidates.find((candidate) => candidate.pairingId === pairingId);
      if (!pairing) return planError("VALIDATION_ERROR", "The selected wine candidate is no longer available; search again.", 422);
      next = setWinePairing(plan, expectedPlanVersion, courseId, pairing);
      data = { selectedPairing: pairing, warnings: results.warnings };
    } else if (operation === "CREATE_ZERO_PROOF_PAIRINGS") {
      const created = await createZeroProofPairings(plan, expectedPlanVersion, request.signal);
      next = created.plan;
      data = {
        pairings: next.pairings.filter((pairing) => pairing.kind === "ZERO_PROOF"),
        provider: created.curation.provider,
        providerMode: created.curation.mode,
        warnings: created.curation.warnings,
        sources: created.curation.sources,
      };
    } else if (operation === "REFRESH_MUSIC_METADATA") {
      const storefront = (text(body.storefront, 2) ?? "us").toLowerCase();
      if (!/^[a-z]{2}$/.test(storefront)) return planError("BAD_REQUEST", "storefront must be a two-letter country code.", 422);
      const refreshed = await refreshSoundtrackMetadata(plan, expectedPlanVersion, storefront, request.signal);
      next = refreshed.plan;
      data = {
        provider: "Apple Music",
        storefront,
        matchedCount: refreshed.matchedCount,
        preservedCount: refreshed.preservedCount,
        reviewedSeedCount: refreshed.reviewedSeedCount,
        tracks: next.soundtrack.map((track) => ({
          trackId: track.trackId,
          title: track.title,
          artist: track.artist,
          metadataStatus: track.metadataStatus,
          hasArtwork: Boolean(track.artwork),
          hasPreview: Boolean(track.previewUrl),
          sourceUrl: track.sourceUrl,
          discoveryOrigin: track.provenance?.discovery.origin,
          verificationStatus: track.provenance?.verification.status,
          discoverySourceIds: track.provenance?.discovery.sources.map((source) => source.sourceId) ?? [],
        })),
      };
    } else {
      return planError("BAD_REQUEST", "Unknown tool operation.", 422);
    }

    const saved = await getPlanStore().replace(planId, expectedPlanVersion, next);
    return Response.json({ ok: true, plan: saved.plan, storage: saved.metadata, data }, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof Error && ["INVALID_ZIP_CODE", "INVALID_LOCATION_ID", "KROGER_LOCATION_NOT_FOUND", "INVALID_RECIPE_CANDIDATES", "INVALID_COURSE_BUDGET_CAP"].includes(error.message)) {
      return planError("BAD_REQUEST", error.message.replaceAll("_", " ").toLowerCase(), 422);
    }
    if (error instanceof Error && (error.message === "KROGER_NOT_CONFIGURED" || error.message.startsWith("KROGER_"))) {
      return planError("SOURCE_UNAVAILABLE", "Kroger pricing is temporarily unavailable.", 503, { providerCode: error.message.split(":")[0] });
    }
    if (error instanceof Error && (error.message === "APPLE_MUSIC_NOT_CONFIGURED" || error.message.startsWith("APPLE_MUSIC_"))) {
      return planError("SOURCE_UNAVAILABLE", "Apple Music metadata is temporarily unavailable.", 503, { providerCode: error.message.split(":")[0] });
    }
    if (error instanceof Error && error.message === "SOUNDTRACK_EMPTY") {
      return planError("VALIDATION_ERROR", "Add at least one soundtrack track before refreshing music metadata.", 422);
    }
    if (error instanceof Error && ["COURSE_NOT_FOUND", "RECIPE_NOT_FOUND", "INVALID_RECIPE_ROLE", "DIETARY_MISMATCH", "INVALID_PAIRING"].includes(error.message)) {
      return planError("VALIDATION_ERROR", error.message.replaceAll("_", " ").toLowerCase(), 422);
    }
    return planStoreErrorResponse(error);
  }
}
