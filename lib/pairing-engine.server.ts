import "server-only";

import reviewedCatalog from "@/data/catalogs/wines.json";
import xwinesCatalog from "@/data/catalogs/xwines-test.json";
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
    provider: "X-Wines + reviewed zero-proof catalog",
    data: { pairings },
    sources: pairings.map((pairing) => pairing.source),
    warnings: [{
      code: "XWINES_TEST_CATALOG",
      message: "Wine candidates come from the 100-record CC0 X-Wines test subset. Confirm the bottle, vintage, price, and availability before serving.",
    }],
  };
}
