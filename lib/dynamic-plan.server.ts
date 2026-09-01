import "server-only";

import { curate } from "@/lib/curation.server";
import type {
  MenuCurationData,
  PairingCurationData,
  SoundtrackCurationData,
  ThemeCurationData,
} from "@/lib/curation-contracts";
import { buildPrepTasks, buildShoppingList, makeSeedPlan } from "@/lib/seed-plan";
import type { Movement, PartyPlan, Receipt, ToolWarning } from "@/lib/types";

export type DynamicPlanConfiguration = {
  title?: string;
  inspirationTitle: string;
  inspirationAuthor: string;
  guestCount?: number;
  budgetAmount?: number;
  dietaryRequirements?: string[];
  tone?: PartyPlan["tone"];
  eventDate?: string;
  requestedThemes?: string[];
  includeWine?: boolean;
  includeZeroProof?: boolean;
  musicStorefront?: string;
};

const labelNow = () =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date());

const receipt = (
  tool: string,
  title: string,
  detail: string,
  kind: Receipt["kind"],
): Receipt => ({
  receiptId: `receipt-${tool}-${crypto.randomUUID()}`,
  tool,
  title,
  detail,
  timestamp: labelNow(),
  kind,
  status: "APPLIED",
});

const uniqueWarnings = (warnings: ToolWarning[]) => [
  ...new Map(warnings.map((warning) => [`${warning.code}:${warning.message}`, warning])).values(),
];

const defaultEventDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().slice(0, 10);
};

const pairingLabel = (courseId: string, pairings: PairingCurationData["pairings"]) =>
  pairings
    .filter((pairing) => pairing.courseId === courseId)
    .map((pairing) => pairing.name)
    .join(" / ") || "Pairing review";

const dynamicMovements = (
  skeleton: Movement[],
  menu: MenuCurationData,
  pairings: PairingCurationData,
  soundtrack: SoundtrackCurationData,
): Movement[] => {
  const courses = new Map(menu.courses.map((course) => [course.courseId, course]));
  return skeleton.map((movement, index) => {
    const course = movement.courseId ? courses.get(movement.courseId) : undefined;
    const track = soundtrack.soundtrack[index % Math.max(soundtrack.soundtrack.length, 1)];
    if (!course) {
      return {
        ...movement,
        musicLabel: track?.artist ?? movement.musicLabel,
        status: "DRAFT",
      };
    }
    return {
      ...movement,
      recipeLabel: course.title,
      pairingLabel: pairingLabel(course.courseId, pairings.pairings),
      musicLabel: track?.artist ?? "Soundtrack cue",
      status: "DRAFT",
    };
  });
};

export async function buildDynamicPartyPlan(
  configuration: DynamicPlanConfiguration,
  signal: AbortSignal,
): Promise<PartyPlan> {
  const skeleton = makeSeedPlan();
  const guestCount = configuration.guestCount ?? 8;
  const budgetAmount = configuration.budgetAmount ?? 280;
  const dietaryRequirements = configuration.dietaryRequirements ?? [];
  const tone = configuration.tone ?? "BALANCED";
  const includeZeroProof = configuration.includeZeroProof ?? true;
  const includeWine = configuration.includeWine ?? !dietaryRequirements.some((requirement) =>
    /no alcohol|non[- ]alcoholic|zero[- ]proof/i.test(requirement));

  const themeResult = await curate({
    action: "RESEARCH_THEME",
    inspiration: {
      title: configuration.inspirationTitle,
      author: configuration.inspirationAuthor,
    },
    requestedThemes: configuration.requestedThemes ?? [],
    tone,
  }, signal) as Awaited<ReturnType<typeof curate>> & { data: ThemeCurationData };

  const menuResult = await curate({
    action: "CURATE_MENU",
    servings: guestCount,
    dietaryRequirements,
    menuBudgetCap: { amount: budgetAmount, currency: "USD" },
    creativeBrief: themeResult.data.creativeBrief,
  }, signal) as Awaited<ReturnType<typeof curate>> & { data: MenuCurationData };

  const [pairingResult, soundtrackResult] = await Promise.all([
    curate({
      action: "CURATE_PAIRINGS",
      courses: menuResult.data.courses.map((course) => ({
        courseId: course.courseId,
        role: course.role,
        title: course.title,
        ingredients: course.ingredients.map((ingredient) => ingredient.name),
        dietaryTags: course.dietaryTags,
      })),
      includeWine,
      includeZeroProof,
      creativeBrief: themeResult.data.creativeBrief,
    }, signal) as Promise<Awaited<ReturnType<typeof curate>> & { data: PairingCurationData }>,
    curate({
      action: "CURATE_SOUNDTRACK",
      storefront: configuration.musicStorefront ?? "us",
      durationMinutes: 150,
      energyArc: "ARRIVAL_TO_ASCENT",
      creativeBrief: themeResult.data.creativeBrief,
    }, signal) as Promise<Awaited<ReturnType<typeof curate>> & { data: SoundtrackCurationData }>,
  ]);

  const courses = menuResult.data.courses.map((course) => ({ ...course, confirmed: false }));
  const shopping = buildShoppingList(courses);
  const prep = buildPrepTasks(courses);
  const title = configuration.title?.trim() || `${configuration.inspirationTitle} Supper Club`;
  const warnings = uniqueWarnings([
    ...themeResult.warnings,
    ...menuResult.warnings,
    ...pairingResult.warnings,
    ...soundtrackResult.warnings,
  ]);

  return {
    ...skeleton,
    title,
    inspiration: {
      type: "BOOK",
      title: configuration.inspirationTitle,
      author: configuration.inspirationAuthor,
      cover: themeResult.data.bookCover,
    },
    eventDate: configuration.eventDate ?? defaultEventDate(),
    guestCount,
    budget: { amount: budgetAmount, currency: "USD" },
    dietaryRequirements,
    tone,
    status: "BUILDING",
    completion: 82,
    theme: {
      headline: themeResult.data.headline,
      framing: themeResult.data.framing,
      ideas: themeResult.data.ideas,
      source: themeResult.data.source,
      creativeBrief: themeResult.data.creativeBrief,
      copyrightNotice:
        "This plan uses original thematic interpretation and bibliographic metadata. It does not reproduce the source work or imply endorsement by its creator or estate.",
    },
    movements: dynamicMovements(skeleton.movements, menuResult.data, pairingResult.data, soundtrackResult.data),
    courses,
    pairings: pairingResult.data.pairings,
    soundtrack: soundtrackResult.data.soundtrack,
    shopping,
    prep,
    receipts: [
      receipt("create_shopping_list", "Shopping list reconciled", `${shopping.length} ingredients grouped by aisle.`, "SHOPPING"),
      receipt("curate_soundtrack", "Soundtrack sequenced", `${soundtrackResult.data.soundtrack.length} live or reviewed listening anchors selected.`, "MUSIC"),
      receipt("curate_pairings", "Pairings curated", `${pairingResult.data.pairings.length} wine or zero-proof choices matched to the menu.`, "PAIRING"),
      receipt("curate_menu", "Menu curated", `${courses.length} courses selected for ${guestCount} guests.`, "RECIPE"),
      receipt("research_theme", "Theme researched", `A fresh cultural brief was created for ${configuration.inspirationTitle}.`, "THEME"),
    ],
    warnings,
    exports: [],
    updatedAt: new Date().toISOString(),
  };
}
