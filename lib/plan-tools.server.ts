import "server-only";

import { findAppleMusicMatch, searchAppleMusicCatalog } from "@/lib/apple-music.server";
import { briefFromPlanTheme } from "@/lib/creative-brief";
import { curatePairingsWithFallback, searchWinePairingCandidates } from "@/lib/pairing-engine.server";
import { buildPrepTasks, buildShoppingList, courseFromRecipe, RECIPE_CATALOG } from "@/lib/seed-plan";
import type { MenuCourse, Pairing, PartyPlan, Receipt, ToolWarning, Track, TrackProvenance } from "@/lib/types";

type RecipeRecord = (typeof RECIPE_CATALOG)[number];

export type RecipeSearchInput = {
  role: MenuCourse["role"];
  query?: string;
  dietaryRequirements?: string[];
  preparationMinutesMax?: number;
  courseBudgetCap?: number;
  limit?: number;
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const words = (value: string) => new Set(normalize(value).split(/\s+/).filter(Boolean));
const requiredDietaryTags = (requirements: string[]) => {
  const value = requirements.join(" ").toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return ["VEGAN", "VEGETARIAN", "GLUTEN_FREE", "DAIRY_FREE", "NUT_FREE"].filter((tag) => value.includes(tag));
};

const recipeScore = (recipe: RecipeRecord, input: RecipeSearchInput, plan: PartyPlan) => {
  if (!recipe.courseRoles.includes(input.role)) return Number.NEGATIVE_INFINITY;
  const required = requiredDietaryTags(input.dietaryRequirements ?? plan.dietaryRequirements);
  if (required.some((tag) => !recipe.dietaryTags.includes(tag))) return Number.NEGATIVE_INFINITY;
  if (input.preparationMinutesMax && recipe.times.totalMinutes > input.preparationMinutesMax) return Number.NEGATIVE_INFINITY;
  const queryWords = words([input.query ?? "", plan.inspiration.title, ...plan.theme.ideas.map((idea) => idea.name)].join(" "));
  const candidateWords = words([
    recipe.title,
    recipe.summary,
    ...(recipe.culturalTraditions ?? []),
    ...recipe.ingredients.flatMap((ingredient) => [ingredient.name, ingredient.canonicalName ?? ""]),
    ...recipe.themeConnections.map((connection) => connection.theme),
  ].join(" "));
  let score = 10;
  queryWords.forEach((word) => { if (candidateWords.has(word)) score += 2; });
  return score;
};

export function searchRecipeCandidates(plan: PartyPlan, input: RecipeSearchInput) {
  const limit = Math.min(8, Math.max(1, input.limit ?? 5));
  const courseId = input.role === "STARTER" ? "course-first" : input.role === "MAIN" ? "course-main" : "course-dessert";
  const candidates = RECIPE_CATALOG
    .map((recipe) => ({ recipe, score: recipeScore(recipe, input, plan) }))
    .filter((candidate) => Number.isFinite(candidate.score))
    .sort((left, right) => right.score - left.score || left.recipe.title.localeCompare(right.recipe.title))
    .slice(0, limit)
    .map(({ recipe }) => {
      const course = courseFromRecipe(recipe.id, courseId, input.role, "Reviewed alternative for host selection");
      course.servings = plan.guestCount;
      course.confirmed = false;
      return course;
    });
  return {
    candidates,
    budget: input.courseBudgetCap === undefined
      ? { requestedCap: null, verification: "NOT_REQUESTED" as const }
      : {
          requestedCap: { amount: input.courseBudgetCap, currency: "USD" as const },
          verification: "UNAVAILABLE" as const,
          note: "The recipe catalogs do not contain current local ingredient prices. The cap is a preference, not a verified claim.",
        },
  };
}

export function recipeCandidatesByIds(
  plan: PartyPlan,
  role: MenuCourse["role"],
  recipeIds: string[],
) {
  const courseId = role === "STARTER" ? "course-first" : role === "MAIN" ? "course-main" : "course-dessert";
  const required = requiredDietaryTags(plan.dietaryRequirements);
  return [...new Set(recipeIds)].map((recipeId) => {
    const recipe = RECIPE_CATALOG.find((item) => item.id === recipeId);
    if (!recipe) throw new Error("RECIPE_NOT_FOUND");
    if (!recipe.courseRoles.includes(role)) throw new Error("INVALID_RECIPE_ROLE");
    if (required.some((tag) => !recipe.dietaryTags.includes(tag))) throw new Error("DIETARY_MISMATCH");
    const course = courseFromRecipe(recipe.id, courseId, role, "Reviewed alternative for host selection");
    course.servings = plan.guestCount;
    course.confirmed = false;
    return course;
  });
}

const nowLabel = () => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date());
const receipt = (tool: string, title: string, detail: string, kind: Receipt["kind"]): Receipt => ({
  receiptId: `receipt-${tool}-${crypto.randomUUID()}`,
  tool,
  title,
  detail,
  timestamp: nowLabel(),
  kind,
  status: "APPLIED",
});

const warning = (code: string, message: string, affectedIds?: string[]): ToolWarning => ({ code, message, affectedIds });
const mergeWarnings = (items: ToolWarning[]) => [...new Map(items.map((item) => [`${item.code}:${item.message}`, item])).values()];

export function replaceCourseWithRecipe(plan: PartyPlan, expectedPlanVersion: number, courseId: string, recipeId: string) {
  if (plan.planVersion !== expectedPlanVersion) throw new Error(`VERSION_CONFLICT:${plan.planVersion}`);
  const current = plan.courses.find((course) => course.courseId === courseId);
  if (!current) throw new Error("COURSE_NOT_FOUND");
  const recipe = RECIPE_CATALOG.find((item) => item.id === recipeId);
  if (!recipe) throw new Error("RECIPE_NOT_FOUND");
  if (!recipe.courseRoles.includes(current.role)) throw new Error("INVALID_RECIPE_ROLE");
  const required = requiredDietaryTags(plan.dietaryRequirements);
  if (required.some((tag) => !recipe.dietaryTags.includes(tag))) throw new Error("DIETARY_MISMATCH");
  const replacement = courseFromRecipe(recipeId, current.courseId, current.role, current.subtitle);
  replacement.servings = plan.guestCount;
  replacement.confirmed = false;
  const replacedPairingKinds = new Set(
    plan.pairings
      .filter((pairing) => pairing.courseId === courseId)
      .map((pairing) => pairing.kind),
  );
  const pairingReviewLabel = replacedPairingKinds.has("WINE") && replacedPairingKinds.has("ZERO_PROOF")
    ? "fresh wine and zero-proof pairings"
    : replacedPairingKinds.has("WINE")
      ? "a new wine pairing"
      : replacedPairingKinds.has("ZERO_PROOF")
        ? "a new zero-proof pairing"
        : "a new pairing";
  const courses = plan.courses.map((course) => course.courseId === courseId ? replacement : course);
  const next: PartyPlan = {
    ...structuredClone(plan),
    planVersion: plan.planVersion + 1,
    status: "BUILDING",
    completion: Math.max(60, plan.completion - 3),
    courses,
    pairings: plan.pairings.filter((pairing) => pairing.courseId !== courseId),
    shopping: buildShoppingList(courses),
    prep: buildPrepTasks(courses),
    movements: plan.movements.map((movement) => movement.courseId === courseId
      ? { ...movement, recipeLabel: replacement.title, pairingLabel: "Pairing review", status: "EDITING" }
      : movement),
    warnings: mergeWarnings([
      ...plan.warnings,
      warning("PAIRING_REVIEW_REQUIRED", `${replacement.title} needs ${pairingReviewLabel} before finalization.`, [courseId]),
    ]),
    receipts: [
      receipt("replace_menu_course", "Course replaced", `${current.title} was replaced with ${replacement.title}; other courses were preserved and shopping/prep were rebuilt.`, "RECIPE"),
      ...plan.receipts,
    ].slice(0, 12),
    updatedAt: new Date().toISOString(),
  };
  return next;
}

export function createPrepTimeline(plan: PartyPlan, expectedPlanVersion: number) {
  if (plan.planVersion !== expectedPlanVersion) throw new Error(`VERSION_CONFLICT:${plan.planVersion}`);
  const prep = buildPrepTasks(plan.courses);
  return {
    ...structuredClone(plan),
    planVersion: plan.planVersion + 1,
    prep,
    receipts: [receipt("create_prep_timeline", "Prep timeline rebuilt", `${prep.length} practical cooking tasks sequenced from the current menu.`, "SHOPPING"), ...plan.receipts].slice(0, 12),
    updatedAt: new Date().toISOString(),
  } satisfies PartyPlan;
}

export async function searchWineCandidates(plan: PartyPlan, courseId: string, limit: number, signal: AbortSignal) {
  const course = plan.courses.find((item) => item.courseId === courseId);
  if (!course) throw new Error("COURSE_NOT_FOUND");
  return searchWinePairingCandidates({
    course: {
      courseId: course.courseId,
      role: course.role,
      title: course.title,
      ingredients: course.ingredients.map((ingredient) => ingredient.name),
      dietaryTags: course.dietaryTags,
    },
    creativeBrief: briefFromPlanTheme({
      title: plan.inspiration.title,
      author: plan.inspiration.author,
      tone: plan.tone,
      ideas: plan.theme.ideas,
      existing: plan.theme.creativeBrief,
    }),
    limit,
    signal,
  });
}

export function setWinePairing(plan: PartyPlan, expectedPlanVersion: number, courseId: string, pairing: Pairing) {
  if (plan.planVersion !== expectedPlanVersion) throw new Error(`VERSION_CONFLICT:${plan.planVersion}`);
  if (pairing.courseId !== courseId || pairing.kind !== "WINE") throw new Error("INVALID_PAIRING");
  const next = structuredClone(plan);
  next.planVersion += 1;
  next.pairings = [...next.pairings.filter((item) => !(item.courseId === courseId && item.kind === "WINE")), pairing];
  next.movements = next.movements.map((movement) => movement.courseId === courseId ? { ...movement, pairingLabel: pairing.name, status: "EDITING" } : movement);
  next.warnings = next.warnings.filter((item) => item.code !== "PAIRING_REVIEW_REQUIRED");
  next.receipts = [receipt("set_wine_pairing", "Wine pairing selected", `${pairing.name} was selected for ${plan.courses.find((course) => course.courseId === courseId)?.title ?? courseId}.`, "PAIRING"), ...next.receipts].slice(0, 12);
  next.updatedAt = new Date().toISOString();
  return next;
}

export async function createZeroProofPairings(plan: PartyPlan, expectedPlanVersion: number, signal: AbortSignal) {
  if (plan.planVersion !== expectedPlanVersion) throw new Error(`VERSION_CONFLICT:${plan.planVersion}`);
  const curation = await curatePairingsWithFallback({
    action: "CURATE_PAIRINGS",
    courses: plan.courses.map((course) => ({
      courseId: course.courseId,
      role: course.role,
      title: course.title,
      ingredients: course.ingredients.map((ingredient) => ingredient.name),
      dietaryTags: course.dietaryTags,
    })),
    includeWine: false,
    includeZeroProof: true,
    servings: plan.guestCount,
    dietaryRequirements: plan.dietaryRequirements,
    creativeBrief: plan.theme.creativeBrief,
  }, signal);
  const zeroProof = curation.data.pairings.filter((pairing) => pairing.kind === "ZERO_PROOF");
  const next = structuredClone(plan);
  next.planVersion += 1;
  next.pairings = [...next.pairings.filter((pairing) => pairing.kind !== "ZERO_PROOF"), ...zeroProof];
  next.movements = next.movements.map((movement) => {
    if (!movement.courseId) return movement;
    const labels = next.pairings.filter((pairing) => pairing.courseId === movement.courseId).map((pairing) => pairing.name);
    return labels.length ? { ...movement, pairingLabel: labels.join(" / "), status: "EDITING" } : movement;
  });
  next.receipts = [receipt("create_zero_proof_pairings", "Zero-proof pairings created", `${zeroProof.length} substantial non-alcoholic pairings attached across the menu.`, "PAIRING"), ...next.receipts].slice(0, 12);
  next.warnings = [...new Map([...next.warnings, ...curation.warnings].map((warning) => [`${warning.code}:${warning.message}`, warning])).values()];
  next.updatedAt = new Date().toISOString();
  return { plan: next, curation };
}

const substitutionRules: Array<{ pattern: RegExp; alternatives: string[]; supports: string[] }> = [
  { pattern: /wheat|flour|bread|pasta|couscous/i, alternatives: ["certified gluten-free flour blend", "rice", "cornmeal"], supports: ["GLUTEN_FREE", "ALLERGY"] },
  { pattern: /milk|cream|yogurt/i, alternatives: ["unsweetened oat milk", "coconut milk", "cashew cream if nut-safe"], supports: ["DAIRY_FREE", "VEGAN"] },
  { pattern: /butter/i, alternatives: ["olive oil", "plant-based butter with verified labels"], supports: ["DAIRY_FREE", "VEGAN"] },
  { pattern: /egg/i, alternatives: ["aquafaba", "flax egg", "commercial egg replacer"], supports: ["VEGAN", "ALLERGY"] },
  { pattern: /peanut|almond|cashew|walnut|pecan/i, alternatives: ["toasted seeds", "sunflower-seed butter", "omit and add crisp chickpeas"], supports: ["NUT_FREE", "ALLERGY"] },
  { pattern: /meat|beef|pork|chicken|bacon/i, alternatives: ["mushrooms", "smoked beans", "tempeh"], supports: ["VEGAN", "VEGETARIAN", "COST"] },
];

export function suggestIngredientSubstitutions(plan: PartyPlan, courseId?: string, ingredientName?: string, reason?: string) {
  const courses = courseId ? plan.courses.filter((course) => course.courseId === courseId) : plan.courses;
  return courses.flatMap((course) => course.ingredients.flatMap((ingredient) => {
    if (ingredientName && !normalize(ingredient.name).includes(normalize(ingredientName))) return [];
    const rule = substitutionRules.find((item) => item.pattern.test(ingredient.name));
    if (!rule) return [];
    if (reason && !rule.supports.includes(reason)) return [];
    return [{
      courseId: course.courseId,
      courseTitle: course.title,
      ingredientId: ingredient.ingredientId,
      ingredient: ingredient.name,
      alternatives: rule.alternatives,
      supports: rule.supports,
      verification: "HOST_REVIEW_REQUIRED" as const,
      note: "Recheck flavor, texture, packaged labels, allergens, and cross-contact before applying a substitution.",
    }];
  }));
}

export async function searchMusic(query: string, storefront: string, limit: number, signal: AbortSignal): Promise<Track[]> {
  const matches = await searchAppleMusicCatalog(query, storefront, limit, signal);
  return matches.map((match, index) => ({
      trackId: `apple-${match.providerId}`,
      providerId: match.providerId,
      title: match.title,
      artist: match.artist,
      albumName: match.albumName,
      moment: "Host selection",
      provider: "Apple Music",
      status: "DRAFT",
      source: match.source,
      sourceUrl: match.sourceUrl,
      previewUrl: match.previewUrl,
      artwork: match.artwork,
      metadataStatus: "LIVE_APPLE_MUSIC_MATCH",
      sequence: index + 1,
    }));
}

export async function refreshSoundtrackMetadata(
  plan: PartyPlan,
  expectedPlanVersion: number,
  storefront: string,
  signal: AbortSignal,
) {
  if (plan.planVersion !== expectedPlanVersion) throw new Error(`VERSION_CONFLICT:${plan.planVersion}`);
  if (!process.env.APPLE_MUSIC_DEVELOPER_TOKEN) throw new Error("APPLE_MUSIC_NOT_CONFIGURED");
  if (!plan.soundtrack.length) throw new Error("SOUNDTRACK_EMPTY");

  let matchedCount = 0;
  let preservedCount = 0;
  let reviewedSeedCount = 0;
  let providerFailureCount = 0;
  const provenanceFor = (track: Track, verification: TrackProvenance["verification"]): TrackProvenance => ({
    discovery: track.provenance?.discovery ?? {
      origin: "REVIEWED_SEED",
      provider: "Reviewed soundtrack anchors",
      sources: track.source && track.source.provider !== "Apple Music" ? [track.source] : [],
      rationale: "Legacy soundtrack entry retained from the reviewed selection catalog.",
    },
    verification,
  });
  const soundtrack = await Promise.all(plan.soundtrack.map(async (track) => {
    try {
      const match = await findAppleMusicMatch(track, storefront, signal);
      if (!match) {
        if (track.providerId) preservedCount += 1;
        else reviewedSeedCount += 1;
        return {
          ...track,
          metadataStatus: track.providerId ? "LIVE_APPLE_MUSIC_MATCH" as const : "REVIEWED_SEED" as const,
          provenance: track.providerId
            ? track.provenance
            : provenanceFor(track, {
                provider: "Apple Music",
                status: "NO_MATCH",
                reason: "Apple Music returned no confident artist/title match.",
              }),
        };
      }
      matchedCount += 1;
      return {
        ...track,
        providerId: match.providerId,
        albumName: match.albumName,
        artwork: match.artwork,
        previewUrl: match.previewUrl,
        sourceUrl: match.sourceUrl,
        source: match.source,
        metadataStatus: "LIVE_APPLE_MUSIC_MATCH" as const,
        provenance: provenanceFor(track, {
          provider: "Apple Music",
          status: "MATCHED",
          providerId: match.providerId,
          source: match.source,
        }),
      };
    } catch (error) {
      if (signal.aborted) throw error;
      providerFailureCount += 1;
      if (track.providerId) preservedCount += 1;
      else reviewedSeedCount += 1;
      return {
        ...track,
        metadataStatus: track.providerId ? "LIVE_APPLE_MUSIC_MATCH" as const : "REVIEWED_SEED" as const,
        provenance: track.providerId
          ? track.provenance
          : provenanceFor(track, {
              provider: "Apple Music",
              status: "FAILED",
              reason: error instanceof Error ? error.message : "Apple Music verification failed.",
            }),
      };
    }
  }));

  if (providerFailureCount === plan.soundtrack.length && !soundtrack.some((track) => track.providerId)) {
    throw new Error("APPLE_MUSIC_REFRESH_FAILED");
  }

  const next: PartyPlan = {
    ...structuredClone(plan),
    planVersion: plan.planVersion + 1,
    soundtrack,
    receipts: [
      receipt(
        "refresh_music_metadata",
        "Music metadata refreshed",
        `${matchedCount} live Apple Music ${matchedCount === 1 ? "match" : "matches"}; ${preservedCount} existing ${preservedCount === 1 ? "match" : "matches"} preserved; ${reviewedSeedCount} reviewed ${reviewedSeedCount === 1 ? "seed" : "seeds"}.`,
        "MUSIC",
      ),
      ...plan.receipts,
    ].slice(0, 12),
    updatedAt: new Date().toISOString(),
  };

  return { plan: next, matchedCount, preservedCount, reviewedSeedCount };
}
