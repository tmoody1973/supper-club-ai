import "server-only";

import { curate } from "@/lib/curation.server";
import type {
  MenuCurationData,
  PairingCurationData,
  SoundtrackCurationData,
  ThemeCurationData,
} from "@/lib/curation-contracts";
import { buildPrepTasks, buildShoppingList, makeSeedPlan } from "@/lib/seed-plan";
import type {
  PlanCreationConfiguration,
  PlanCreationProviderReceipt,
} from "@/lib/plan-store-contracts";
import type { Movement, PartyPlan, Receipt, ToolWarning } from "@/lib/types";

export type DynamicPlanConfiguration = PlanCreationConfiguration;

export type DynamicPlanBuild = {
  plan: PartyPlan;
  providerReceipts: PlanCreationProviderReceipt[];
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
  theme: ThemeCurationData,
  menu: MenuCurationData,
  pairings: PairingCurationData,
  soundtrack: SoundtrackCurationData,
  includeZeroProof: boolean,
): Movement[] => {
  const courses = new Map(menu.courses.map((course) => [course.courseId, course]));
  const themeLabels = theme.ideas.map((idea) => idea.name).filter(Boolean);
  return skeleton.map((movement, index) => {
    const course = movement.courseId ? courses.get(movement.courseId) : undefined;
    const track = soundtrack.soundtrack[index % Math.max(soundtrack.soundtrack.length, 1)];
    if (!course) {
      const neutralCopy = movement.movementId === "movement-arrival"
        ? {
            title: "Arrival / welcome ritual",
            subtitle: "Gather + ground",
            recipeLabel: "Opening bite",
            pairingLabel: includeZeroProof ? "Opening zero-proof sip" : "Wine service",
            hostCue: "Welcome circle",
          }
        : movement.movementId === "movement-reading"
          ? {
              title: "Reading / reflection",
              subtitle: themeLabels[0] ?? "Theme + conversation",
              recipeLabel: "Original theme note",
              pairingLabel: includeZeroProof ? "Herbal infusion" : "Wine pause",
              hostCue: "Read + reflect",
            }
          : {
              title: "Listening interval",
              subtitle: "Music + reflection",
              recipeLabel: "Table reset",
              pairingLabel: includeZeroProof ? "Sparkling water" : "Table wine",
              hostCue: "Sit with it",
            };
      return {
        ...movement,
        ...neutralCopy,
        musicLabel: track?.artist ?? movement.musicLabel,
        status: "DRAFT",
      };
    }
    const subtitle = course.role === "STARTER"
      ? (themeLabels[0] ?? "First offering")
      : course.role === "MAIN"
        ? (themeLabels[1] ?? "Shared table")
        : (themeLabels[2] ?? "Sweet close");
    return {
      ...movement,
      subtitle,
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
): Promise<DynamicPlanBuild> {
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
      servings: guestCount,
      dietaryRequirements,
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

  const providerReceipts: PlanCreationProviderReceipt[] = [
    {
      stage: "THEME",
      provider: themeResult.provider,
      mode: themeResult.mode,
      sources: themeResult.sources,
      warnings: themeResult.warnings,
    },
    {
      stage: "MENU",
      provider: menuResult.provider,
      mode: menuResult.mode,
      sources: menuResult.sources,
      warnings: menuResult.warnings,
    },
    {
      stage: "PAIRINGS",
      provider: pairingResult.provider,
      mode: pairingResult.mode,
      sources: pairingResult.sources,
      warnings: pairingResult.warnings,
    },
    {
      stage: "SOUNDTRACK",
      provider: soundtrackResult.provider,
      mode: soundtrackResult.mode,
      sources: soundtrackResult.sources,
      warnings: soundtrackResult.warnings,
      trackReceipts: soundtrackResult.data.trackReceipts,
    },
  ];

  const plan: PartyPlan = {
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
      bookBriefing: themeResult.data.bookBriefing,
      copyrightNotice:
        "This plan uses original thematic interpretation and bibliographic metadata. It does not reproduce the source work or imply endorsement by its creator or estate.",
    },
    movements: dynamicMovements(skeleton.movements, themeResult.data, menuResult.data, pairingResult.data, soundtrackResult.data, includeZeroProof),
    courses,
    pairings: pairingResult.data.pairings,
    soundtrack: soundtrackResult.data.soundtrack,
    shopping,
    prep,
    receipts: [
      receipt("create_shopping_list", "Shopping list reconciled", `${shopping.length} ingredients grouped by aisle.`, "SHOPPING"),
      receipt("curate_soundtrack", "Soundtrack sequenced", `${soundtrackResult.data.trackReceipts.filter((item) => item.provenance.discovery.origin === "PERPLEXITY").length} Perplexity discoveries verified by Apple Music; ${soundtrackResult.data.trackReceipts.filter((item) => item.provenance.discovery.origin === "REVIEWED_SEED").length} reviewed fallbacks. ${soundtrackResult.sources.length} source${soundtrackResult.sources.length === 1 ? "" : "s"} retained.`, "MUSIC"),
      receipt(
        "curate_pairings",
        "Pairings curated",
        `${pairingResult.provider} (${pairingResult.mode.toLowerCase()}): ${pairingResult.data.pairings.length} ${includeWine && includeZeroProof ? "wine and zero-proof" : includeWine ? "wine" : "zero-proof"} choices matched from ${pairingResult.sources.length} source${pairingResult.sources.length === 1 ? "" : "s"}.`,
        "PAIRING",
      ),
      receipt("curate_menu", "Menu curated", `${menuResult.provider} (${menuResult.mode.toLowerCase()}): ${courses.length} courses selected from ${menuResult.sources.length} source${menuResult.sources.length === 1 ? "" : "s"} for ${guestCount} guests.`, "RECIPE"),
      receipt("research_theme", "Theme researched", `${themeResult.provider} (${themeResult.mode.toLowerCase()}): a fresh cultural brief for ${configuration.inspirationTitle} used ${themeResult.sources.length} source${themeResult.sources.length === 1 ? "" : "s"}.`, "THEME"),
    ],
    warnings,
    exports: [],
    updatedAt: new Date().toISOString(),
  };

  return { plan, providerReceipts };
}
