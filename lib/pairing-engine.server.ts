import "server-only";

import reviewedCatalog from "@/data/catalogs/wines.json";
import xwinesCatalog from "@/data/catalogs/xwines-test.json";
import {
  listGrapeMindsWines,
  type GrapeMindsWine,
  type GrapeMindsWineQuery,
} from "@/lib/grapeminds.server";
import { pairingFromBeverage } from "@/lib/seed-plan";
import type { CurationRequest, CurationResponse, PairingCurationData } from "@/lib/curation-contracts";
import type { CreativeBrief, MenuCourse, Pairing, SourceRef } from "@/lib/types";

type PairingRequest = Extract<CurationRequest, { action: "CURATE_PAIRINGS" }>;

type XWine = {
  id: string;
  wineId: number;
  name: string;
  type: string;
  grapes: string[];
  harmonize: string[];
  alcoholByVolume: number;
  body: string;
  acidity: string;
  country: string;
  regionName: string;
  wineryName: string;
  website?: string;
};

type ReviewedBeverage = {
  id: string;
  kind: "WINE" | "ZERO_PROOF";
  courseRoles: string[];
  pairingTags: string[];
  themeConnections: Array<{ theme: string }>;
};

const xwines = xwinesCatalog.items as XWine[];
const reviewed = reviewedCatalog.items as ReviewedBeverage[];
const datasetUrl = xwinesCatalog.source.datasetUrl;

const words = (values: string[]) =>
  new Set(values.join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(Boolean));

const courseSignals = (course: PairingRequest["courses"][number], brief?: CreativeBrief) => {
  const text = `${course.title} ${(course.ingredients ?? []).join(" ")}`.toLowerCase();
  const signals = new Set<string>();
  if (course.role === "STARTER") ["appetizer", "vegetarian"].forEach((item) => signals.add(item));
  if (course.role === "MAIN") ["vegetarian", "grilled"].forEach((item) => signals.add(item));
  if (course.role === "DESSERT") ["sweet", "dessert", "fruit", "cake"].forEach((item) => signals.add(item));
  const patterns: Array<[RegExp, string[]]> = [
    [/mushroom|truffle/, ["mushroom", "earthy"]],
    [/tomato|pepper/, ["pizza", "pasta", "vegetarian"]],
    [/bean|lentil|chickpea/, ["vegetarian", "stew"]],
    [/rice/, ["risotto", "vegetarian"]],
    [/citrus|lemon|lime|orange/, ["seafood", "salad"]],
    [/pear|apple|berry|fruit|hibiscus/, ["fruit", "sweet dessert"]],
    [/chocolate|cocoa/, ["chocolate", "cake"]],
    [/spice|ginger|curry|chili/, ["spicy", "grilled"]],
  ];
  patterns.forEach(([pattern, values]) => {
    if (pattern.test(text)) values.forEach((item) => signals.add(item));
  });
  for (const flavor of brief?.flavorDirections ?? []) {
    if (/smok|char/.test(flavor)) signals.add("grilled");
    if (/earth/.test(flavor)) signals.add("mushroom");
    if (/fresh|seasonal|bright/.test(flavor)) signals.add("salad");
  }
  return signals;
};

const typeScore = (wine: XWine, role: MenuCourse["role"]) => {
  const type = wine.type.toLowerCase();
  if (role === "DESSERT") return /dessert|port|sparkling/.test(type) ? 10 : -8;
  if (role === "STARTER") return /white|sparkling|ros/.test(type) ? 7 : 0;
  return /red|white/.test(type) ? 5 : 0;
};

const scoreWine = (
  wine: XWine,
  course: PairingRequest["courses"][number],
  brief?: CreativeBrief,
) => {
  const signals = courseSignals(course, brief);
  const harmonize = words(wine.harmonize);
  let score = typeScore(wine, course.role);
  signals.forEach((signal) => {
    const signalWords = words([signal]);
    signalWords.forEach((word) => { if (harmonize.has(word)) score += 5; });
  });
  if (/spicy|fried/.test([...signals].join(" ")) && wine.acidity.toLowerCase() === "high") score += 3;
  if (course.role === "MAIN" && /full/.test(wine.body.toLowerCase())) score += 2;
  if (course.role === "STARTER" && /light|medium/.test(wine.body.toLowerCase())) score += 2;
  return score;
};

const winePairing = (
  wine: XWine,
  course: PairingRequest["courses"][number],
  brief?: CreativeBrief,
): Pairing => {
  const signals = [...courseSignals(course, brief)].slice(0, 3);
  const source: SourceRef = {
    sourceId: `src-xwines-${wine.wineId}`,
    provider: "X-Wines",
    title: `${wine.wineryName} — ${wine.name}`,
    url: datasetUrl,
    accessedAt: new Date().toISOString(),
    attribution: "Wine metadata from the CC0 X-Wines test dataset; pairing rationale is original Supper Club AI analysis.",
    licenseNote: "No current price, inventory, vintage availability, review text, or producer endorsement is claimed.",
  };
  return {
    pairingId: `pair-${course.courseId}-${wine.id}`,
    courseId: course.courseId,
    kind: "WINE",
    name: wine.name,
    style: `${wine.type} · ${wine.regionName}, ${wine.country}`,
    tastingNotes: [wine.body, `${wine.acidity} acidity`, ...wine.grapes.slice(0, 2)],
    pairingReason: `${wine.body} structure and ${wine.acidity.toLowerCase()} acidity support ${signals.join(", ") || course.title.toLowerCase()}; verify the specific bottle before serving.`,
    sourceId: source.sourceId,
    source,
  };
};

const zeroProofScore = (
  beverage: ReviewedBeverage,
  course: PairingRequest["courses"][number],
  brief?: CreativeBrief,
) => {
  let score = beverage.courseRoles.includes(course.role) ? 8 : 0;
  const courseWords = words([course.title, ...(course.ingredients ?? [])]);
  words(beverage.pairingTags).forEach((word) => { if (courseWords.has(word)) score += 2; });
  const themes = new Set(brief?.themes ?? []);
  beverage.themeConnections.forEach((connection) => {
    if (themes.has(connection.theme)) score += 3;
  });
  return score;
};

const grapeMindsPreference = (
  course: PairingRequest["courses"][number],
  brief?: CreativeBrief,
): GrapeMindsWineQuery => {
  const text = `${course.title} ${(course.ingredients ?? []).join(" ")}`.toLowerCase();
  if (course.role === "DESSERT") return { color: "white", perPage: 30 };
  if (course.role === "STARTER") {
    return {
      color: brief?.themes.includes("IMAGINED_FUTURES") ? "rose" : "white",
      perPage: 30,
    };
  }
  return {
    color: /mushroom|tomato|pepper|smok|char|bean|lentil/.test(text) ? "red" : "white",
    perPage: 30,
  };
};

const grapeMindsScore = (
  wine: GrapeMindsWine,
  course: PairingRequest["courses"][number],
  brief?: CreativeBrief,
) => {
  const sugar = wine.residualSugar?.toLowerCase() ?? "";
  let score = 1;
  if (course.role === "STARTER" && wine.subType === "sparkling") score += 8;
  if (course.role === "MAIN" && wine.subType === "still") score += 4;
  if (course.role === "DESSERT") {
    if (/sweet|dessert|lieblich|sü|doux|dolce|moelleux|medium/.test(sugar)) score += 12;
    if (/dry|trocken|brut|secco/.test(sugar)) score -= 6;
  } else if (/dry|trocken|brut|secco/.test(sugar)) {
    score += 4;
  }
  if (brief?.themes.includes("IMAGINED_FUTURES") && wine.subType === "sparkling") score += 3;
  return score;
};

const grapeMindsPairing = (
  wine: GrapeMindsWine,
  course: PairingRequest["courses"][number],
  brief?: CreativeBrief,
): Pairing => {
  const signals = [...courseSignals(course, brief)].slice(0, 3);
  const place = [wine.regionName, wine.country].filter(Boolean).join(", ");
  const style = [wine.residualSugar, wine.color, wine.subType, place].filter(Boolean).join(" · ");
  const source: SourceRef = {
    sourceId: `src-grapeminds-${wine.id}`,
    provider: "GrapeMinds",
    title: wine.displayName,
    url: "https://grapeminds.eu/wine-api",
    accessedAt: new Date().toISOString(),
    attribution: "Live producer, region, color, style, and sweetness metadata supplied by GrapeMinds; pairing rationale is original Supper Club AI analysis.",
    licenseNote: "Used for live discovery without building a persistent local dataset. No price, inventory, vintage availability, review, or endorsement is claimed.",
  };
  return {
    pairingId: `pair-${course.courseId}-grapeminds-${wine.id}`,
    courseId: course.courseId,
    kind: "WINE",
    name: wine.displayName,
    style: style || `${wine.color} wine`,
    tastingNotes: [
      wine.residualSugar ? `${wine.residualSugar} style` : `${wine.color} wine`,
      wine.subType,
      place ? `from ${place}` : "origin not supplied",
    ],
    pairingReason: `${wine.color} ${wine.subType} structure was selected for ${signals.join(", ") || course.title.toLowerCase()}; confirm the exact bottle and vintage before serving.`,
    sourceId: source.sourceId,
    source,
  };
};

export function curatePairingsFromCatalog(
  request: PairingRequest,
): CurationResponse<PairingCurationData> {
  const pairings: Pairing[] = [];
  const usedWines = new Set<string>();
  const usedZeroProof = new Set<string>();
  for (const course of request.courses) {
    if (request.includeWine) {
      const candidate = [...xwines]
        .filter((wine) => !usedWines.has(wine.id))
        .sort((left, right) =>
          scoreWine(right, course, request.creativeBrief) - scoreWine(left, course, request.creativeBrief))[0];
      if (candidate) {
        usedWines.add(candidate.id);
        pairings.push(winePairing(candidate, course, request.creativeBrief));
      }
    }
    if (request.includeZeroProof) {
      const candidate = reviewed
        .filter((beverage) => beverage.kind === "ZERO_PROOF" && !usedZeroProof.has(beverage.id))
        .sort((left, right) =>
          zeroProofScore(right, course, request.creativeBrief) - zeroProofScore(left, course, request.creativeBrief))[0];
      if (candidate) {
        usedZeroProof.add(candidate.id);
        pairings.push(pairingFromBeverage(
          candidate.id,
          course.courseId,
          `pair-${course.courseId}-${candidate.id}`,
          `Selected for ${course.title} using course role, ingredient signals, and the shared creative brief.`,
        ));
      }
    }
  }
  return {
    ok: true,
    mode: "LOCAL_FALLBACK",
    provider: request.includeWine
      ? request.includeZeroProof ? "X-Wines + reviewed zero-proof catalog" : "X-Wines"
      : "Reviewed zero-proof catalog",
    data: { pairings },
    sources: pairings.map((pairing) => pairing.source),
    warnings: request.includeWine ? [{
      code: "XWINES_TEST_CATALOG",
      message: "Wine candidates come from the 100-record CC0 X-Wines test subset. Confirm the bottle, vintage, price, and availability before serving.",
    }] : [],
  };
}

export function curateZeroProofPairings(courses: MenuCourse[], creativeBrief?: CreativeBrief): Pairing[] {
  return curatePairingsFromCatalog({
    action: "CURATE_PAIRINGS",
    courses: courses.map((course) => ({
      courseId: course.courseId,
      role: course.role,
      title: course.title,
      ingredients: course.ingredients.map((ingredient) => ingredient.name),
      dietaryTags: course.dietaryTags,
    })),
    includeWine: false,
    includeZeroProof: true,
    creativeBrief,
  }).data.pairings;
}

export async function searchWinePairingCandidates(input: {
  course: PairingRequest["courses"][number];
  creativeBrief?: CreativeBrief;
  limit: number;
  signal: AbortSignal;
}) {
  const limit = Math.min(8, Math.max(1, input.limit));
  const local = [...xwines]
    .sort((left, right) =>
      scoreWine(right, input.course, input.creativeBrief) -
      scoreWine(left, input.course, input.creativeBrief))
    .slice(0, limit)
    .map((wine) => winePairing(wine, input.course, input.creativeBrief));
  const warnings: CurationResponse<PairingCurationData>["warnings"] = [{
    code: "PRICE_INVENTORY_UNVERIFIED",
    message: "Wine search results do not claim current price, inventory, or vintage availability. Confirm the exact bottle before purchase.",
    affectedIds: [input.course.courseId],
  }];

  if (!process.env.GRAPEMINDS_API_KEY) {
    return { candidates: local, providers: ["X-Wines"], warnings };
  }
  try {
    const query = grapeMindsPreference(input.course, input.creativeBrief);
    const live = (await listGrapeMindsWines({ ...query, perPage: Math.max(20, limit * 3) }, input.signal))
      .sort((left, right) =>
        grapeMindsScore(right, input.course, input.creativeBrief) -
        grapeMindsScore(left, input.course, input.creativeBrief))
      .slice(0, limit)
      .map((wine) => grapeMindsPairing(wine, input.course, input.creativeBrief));
    const candidates = [...live, ...local]
      .filter((pairing, index, items) => items.findIndex((item) => item.name.toLowerCase() === pairing.name.toLowerCase()) === index)
      .slice(0, limit);
    return { candidates, providers: ["GrapeMinds", "X-Wines"], warnings };
  } catch (error) {
    warnings.unshift({
      code: "PROVIDER_FALLBACK",
      message: `GrapeMinds was not used (${error instanceof Error ? error.message : "provider unavailable"}). Supper Club AI used X-Wines instead.`,
      affectedIds: [input.course.courseId],
    });
    return { candidates: local, providers: ["X-Wines"], warnings };
  }
}

export async function curatePairingsWithFallback(
  request: PairingRequest,
  signal: AbortSignal,
): Promise<CurationResponse<PairingCurationData>> {
  if (!request.includeWine || !process.env.GRAPEMINDS_API_KEY) {
    const fallback = curatePairingsFromCatalog(request);
    if (request.includeWine && !process.env.GRAPEMINDS_API_KEY) {
      fallback.warnings.unshift({
        code: "PROVIDER_FALLBACK",
        message: "GrapeMinds was not used (GRAPEMINDS_API_KEY is not configured). Supper Club AI used X-Wines instead.",
      });
    }
    return fallback;
  }

  try {
    const preferences = request.courses
      .filter((course) => course.role !== "DESSERT")
      .map((course) => ({
        course,
        query: grapeMindsPreference(course, request.creativeBrief),
      }));
    const uniqueQueries = new Map<string, GrapeMindsWineQuery>();
    preferences.forEach(({ query }) => uniqueQueries.set(`${query.color}:${query.subType ?? "any"}`, query));
    const lists = new Map<string, GrapeMindsWine[]>();
    await Promise.all([...uniqueQueries.entries()].map(async ([key, query]) => {
      lists.set(key, await listGrapeMindsWines(query, signal));
    }));

    const used = new Set<number>();
    const liveWines = new Map<string, Pairing>();
    for (const { course, query } of preferences) {
      const key = `${query.color}:${query.subType ?? "any"}`;
      const candidate = [...(lists.get(key) ?? [])]
        .filter((wine) => !used.has(wine.id))
        .sort((left, right) =>
          grapeMindsScore(right, course, request.creativeBrief) -
          grapeMindsScore(left, course, request.creativeBrief))[0];
      if (!candidate) throw new Error(`No usable ${course.role.toLowerCase()} wine was returned.`);
      used.add(candidate.id);
      liveWines.set(course.courseId, grapeMindsPairing(candidate, course, request.creativeBrief));
    }

    const localFallback = curatePairingsFromCatalog(request);
    const pairings = request.courses.flatMap((course) => [
      liveWines.get(course.courseId) ?? localFallback.data.pairings.find((pairing) =>
        pairing.courseId === course.courseId && pairing.kind === "WINE"),
      ...localFallback.data.pairings.filter((pairing) =>
        pairing.courseId === course.courseId && pairing.kind === "ZERO_PROOF"),
    ].filter((pairing): pairing is Pairing => Boolean(pairing)));
    return {
      ok: true,
      mode: "HYBRID",
      provider: request.includeZeroProof
        ? "GrapeMinds + X-Wines + reviewed zero-proof catalog"
        : "GrapeMinds + X-Wines",
      data: { pairings },
      sources: pairings.map((pairing) => pairing.source),
      warnings: [{
        code: "GRAPEMINDS_LIVE_REVIEW",
        message: "Starter and main-course wine metadata was retrieved live from GrapeMinds. Dessert wine uses X-Wines because the live list did not supply verifiable sweetness. Confirm every bottle, vintage, allergen, price, and availability before serving.",
      }],
    };
  } catch (error) {
    const fallback = curatePairingsFromCatalog(request);
    const reason = error instanceof Error ? error.message : "provider unavailable";
    fallback.warnings.unshift({
      code: "PROVIDER_FALLBACK",
      message: `GrapeMinds was not used (${reason}). Supper Club AI used X-Wines instead.`,
    });
    return fallback;
  }
}
