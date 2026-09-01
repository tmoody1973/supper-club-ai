import {
  buildPrepTasks,
  buildShoppingList,
} from "@/lib/seed-plan";
import { briefFromPlanTheme } from "@/lib/creative-brief";
import { requestCuration } from "@/lib/curation-client";
import type {
  MenuCurationData,
  PairingCurationData,
  SoundtrackCurationData,
  ThemeCurationData,
} from "@/lib/curation-contracts";
import type {
  NextAction,
  PartyPlan,
  PartySection,
  Receipt,
  SourceRef,
  ToolFailure,
  ToolSuccess,
  ToolWarning,
} from "@/lib/types";
import type { WebMCPTool } from "@/types/webmcp";

type ToolRuntime = {
  getPlan: () => PartyPlan;
  setPlan: (plan: PartyPlan) => void;
  exportHostPacket: (plan: PartyPlan) => Promise<{ filename: string }>;
};

type RegisteredTools = {
  controller: AbortController;
  count: number;
};

const nowLabel = () =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

const failure = (
  plan: PartyPlan | undefined,
  code: ToolFailure["error"]["code"],
  message: string,
  retryable = false,
  details?: Record<string, unknown>,
): ToolFailure => ({
  ok: false,
  schemaVersion: "1.0",
  planId: plan?.planId,
  planVersion: plan?.planVersion,
  error: { code, message, retryable, details },
});

const success = <T>(
  plan: PartyPlan,
  sections: PartySection[],
  data: T,
  summary: string,
  options: {
    updated?: boolean;
    warnings?: ToolWarning[];
    sources?: SourceRef[];
    nextActions?: NextAction[];
  } = {},
): ToolSuccess<T> => ({
  ok: true,
  schemaVersion: "1.0",
  planId: plan.planId,
  planVersion: plan.planVersion,
  ui: { updated: options.updated ?? true, sections },
  data,
  summary,
  warnings: options.warnings ?? plan.warnings,
  sources: options.sources ?? [],
  nextActions: options.nextActions ?? [],
});

const expectedVersion = (input: Record<string, unknown>) => {
  const value = input.expectedPlanVersion;
  return typeof value === "number" ? value : undefined;
};

const checkVersion = (plan: PartyPlan, input: Record<string, unknown>) => {
  const expected = expectedVersion(input);
  if (expected === undefined) {
    return failure(
      plan,
      "VALIDATION_ERROR",
      "expectedPlanVersion is required for state-changing tools.",
      false,
    );
  }
  if (expected !== plan.planVersion) {
    return failure(
      plan,
      "VERSION_CONFLICT",
      `Plan version ${expected} is stale; the current version is ${plan.planVersion}. Read the plan and retry.`,
      true,
      { expectedPlanVersion: expected, currentPlanVersion: plan.planVersion },
    );
  }
  return null;
};

const mergeWarnings = (...groups: ToolWarning[][]) => [
  ...new Map(
    groups.flat().map((warning) => [
      `${warning.code}:${warning.message}:${warning.affectedIds?.join(",") ?? ""}`,
      warning,
    ]),
  ).values(),
];

const mergeSources = (...groups: SourceRef[][]) => [
  ...new Map(groups.flat().map((source) => [source.sourceId, source])).values(),
];

const curationFailure = (
  plan: PartyPlan,
  error: unknown,
  signal: AbortSignal,
): ToolFailure => {
  if (signal.aborted || (error instanceof Error && error.name === "AbortError")) {
    throw error;
  }
  return failure(
    plan,
    "SOURCE_UNAVAILABLE",
    error instanceof Error ? error.message : "The curation provider is unavailable.",
    true,
  );
};

const makeReceipt = (
  tool: string,
  title: string,
  detail: string,
  kind: Receipt["kind"],
  status: Receipt["status"] = "APPLIED",
): Receipt => ({
  receiptId: `receipt-${tool}-${Date.now()}`,
  tool,
  title,
  detail,
  timestamp: nowLabel(),
  kind,
  status,
});

const commit = (
  runtime: ToolRuntime,
  current: PartyPlan,
  next: PartyPlan,
  receipt: Receipt,
) => {
  const committed: PartyPlan = {
    ...next,
    planVersion: current.planVersion + 1,
    receipts: [receipt, ...next.receipts].slice(0, 12),
    updatedAt: new Date().toISOString(),
  };
  runtime.setPlan(committed);
  return committed;
};

const planSources = (plan: PartyPlan) => {
  const sources = [
    plan.theme.source,
    ...plan.courses.map((course) => course.source),
    ...plan.pairings.map((pairing) => pairing.source),
  ];
  return [...new Map(sources.map((item) => [item.sourceId, item])).values()];
};

const tool = (
  value: Omit<WebMCPTool, "annotations"> & {
    annotations?: WebMCPTool["annotations"];
  },
) => value;

export async function registerSupperClubTools(
  runtime: ToolRuntime,
  controller = new AbortController(),
): Promise<RegisteredTools | null> {
  if (!document.modelContext) return null;
  const tools: WebMCPTool[] = [
    tool({
      name: "get_party_plan",
      title: "Read the supper club plan",
      description:
        "Read the current Supper Club AI party plan, its version, completion, warnings, and selected sections without changing anything.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string", description: "The party plan identifier." },
          includeSections: {
            type: "array",
            items: {
              type: "string",
              enum: [
                "CONFIGURATION",
                "THEME",
                "MENU",
                "PAIRINGS",
                "SOUNDTRACK",
                "SHOPPING_LIST",
                "FINALIZATION",
                "EXPORTS",
              ],
            },
          },
        },
        required: ["planId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: async (input) => {
        const plan = runtime.getPlan();
        if (input.planId !== plan.planId) {
          return failure(undefined, "PLAN_NOT_FOUND", "That party plan is not open.", false);
        }
        const sections = Array.isArray(input.includeSections)
          ? (input.includeSections as PartySection[])
          : ([
              "CONFIGURATION",
              "THEME",
              "MENU",
              "PAIRINGS",
              "SOUNDTRACK",
              "SHOPPING_LIST",
              "FINALIZATION",
              "EXPORTS",
            ] as PartySection[]);
        const completeSections = ["CONFIGURATION", "THEME", "MENU", "PAIRINGS", "SOUNDTRACK"] as PartySection[];
        return success(
          plan,
          sections,
          {
            plan,
            completion: {
              percent: plan.completion,
              completeSections,
              missingSections: plan.status === "FINALIZED" ? [] : (["FINALIZATION"] as PartySection[]),
            },
          },
          `${plan.title} is ${plan.completion}% complete at version ${plan.planVersion}.`,
          { updated: false, sources: planSources(plan) },
        );
      },
    }),
    tool({
      name: "configure_party",
      title: "Configure the gathering",
      description:
        "Update the open dinner’s title, inspiration, guest count, budget, dietary requirements, tone, and event date. Use the current plan version.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "number" },
          title: { type: "string", minLength: 1 },
          inspiration: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["BOOK"] },
              title: { type: "string" },
              author: { type: "string" },
            },
            required: ["type", "title", "author"],
            additionalProperties: false,
          },
          guestCount: { type: "integer", minimum: 1, maximum: 50 },
          budget: {
            type: "object",
            properties: {
              amount: { type: "number", exclusiveMinimum: 0 },
              currency: { type: "string", enum: ["USD"] },
            },
            required: ["amount", "currency"],
            additionalProperties: false,
          },
          dietaryRequirements: { type: "array", items: { type: "string" } },
          tone: { type: "string", enum: ["HOPEFUL", "BALANCED", "SURVIVALIST"] },
          eventDate: { type: "string" },
        },
        required: [
          "planId",
          "expectedPlanVersion",
          "title",
          "inspiration",
          "guestCount",
          "budget",
          "dietaryRequirements",
          "tone",
        ],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        const plan = runtime.getPlan();
        if (input.planId !== plan.planId) return failure(plan, "PLAN_NOT_FOUND", "That plan is not open.");
        const versionError = checkVersion(plan, input);
        if (versionError) return versionError;
        const guestCount = Number(input.guestCount);
        if (guestCount < 1 || guestCount > 50) {
          return failure(plan, "VALIDATION_ERROR", "guestCount must be between 1 and 50.");
        }
        const next = {
          ...structuredClone(plan),
          title: String(input.title),
          inspiration: input.inspiration as PartyPlan["inspiration"],
          guestCount,
          budget: input.budget as PartyPlan["budget"],
          dietaryRequirements: input.dietaryRequirements as string[],
          tone: input.tone as PartyPlan["tone"],
          eventDate: typeof input.eventDate === "string" ? input.eventDate : plan.eventDate,
          status: "BUILDING" as const,
        };
        const committed = commit(
          runtime,
          plan,
          next,
          makeReceipt("configure_party", "Gathering updated", `${guestCount} guests · ${next.tone.toLowerCase()} tone · $${next.budget.amount} budget`, "SYSTEM"),
        );
        return success(
          committed,
          ["CONFIGURATION"],
          { configuration: committed, created: false },
          `Updated ${committed.title} for ${guestCount} guests.`,
          { nextActions: [{ tool: "research_theme", label: "Refresh the theme", reason: "Align cultural framing with the new constraints.", requiresConfirmation: false }] },
        );
      },
    }),
    tool({
      name: "research_theme",
      title: "Research the dinner theme",
      description:
        "Build a sourced thematic foundation using live bibliographic metadata plus reviewed original interpretation; never returns copyrighted book passages.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "number" },
          requestedThemes: { type: "array", items: { type: "string" } },
          tone: { type: "string", enum: ["HOPEFUL", "BALANCED", "SURVIVALIST"] },
          maxSources: { type: "integer", minimum: 1, maximum: 8, default: 4 },
        },
        required: ["planId", "expectedPlanVersion", "tone"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true, untrustedContentHint: true },
      execute: async (input, options) => {
        const plan = runtime.getPlan();
        if (input.planId !== plan.planId) return failure(plan, "PLAN_NOT_FOUND", "That plan is not open.");
        const versionError = checkVersion(plan, input);
        if (versionError) return versionError;
        const requested = Array.isArray(input.requestedThemes)
          ? input.requestedThemes.map(String)
          : ["CHANGE", "COMMUNITY", "RESILIENCE", "CLIMATE"];
        let curation;
        try {
          curation = await requestCuration<ThemeCurationData>({
            action: "RESEARCH_THEME",
            inspiration: plan.inspiration,
            requestedThemes: requested,
            tone: input.tone as PartyPlan["tone"],
          }, options.signal);
        } catch (error) {
          return curationFailure(plan, error, options.signal);
        }
        const current = runtime.getPlan();
        if (input.planId !== current.planId) return failure(current, "PLAN_NOT_FOUND", "That plan is not open.");
        const currentVersionError = checkVersion(current, input);
        if (currentVersionError) return currentVersionError;
        const next = structuredClone(current);
        next.tone = input.tone as PartyPlan["tone"];
        next.theme = {
          ...current.theme,
          ...curation.data,
        };
        const committed = commit(
          runtime,
          current,
          next,
          makeReceipt("research_theme", "Theme profile refreshed", `${committedThemeCount(next)} themes framed without reproducing book text.`, "THEME"),
        );
        return success(
          committed,
          ["THEME"],
          { themeProfile: committed.theme, provider: curation.provider, providerMode: curation.mode },
          `Built a ${committed.tone.toLowerCase()} thematic foundation with ${committed.theme.ideas.length} themes.`,
          {
            warnings: mergeWarnings(committed.warnings, curation.warnings),
            sources: mergeSources([committed.theme.source], curation.sources),
            nextActions: [{ tool: "curate_menu", label: "Curate the menu", reason: "Translate the theme into food and service.", requiresConfirmation: false }],
          },
        );
      },
    }),
    tool({
      name: "curate_menu",
      title: "Curate a three-course menu",
      description:
        "Select a complete three-course menu through the normalized recipe gateway, using live Spoonacular results when configured and reviewed local recipes as fallback.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "number" },
          courseCount: { type: "integer", enum: [3] },
          servings: { type: "integer", minimum: 1, maximum: 50 },
          dietaryRequirements: { type: "array", items: { type: "string" } },
          menuBudgetCap: {
            type: "object",
            properties: { amount: { type: "number" }, currency: { type: "string", enum: ["USD"] } },
            required: ["amount", "currency"],
          },
          preparationMinutesMax: { type: "integer", minimum: 30 },
          preserveCourseIds: { type: "array", items: { type: "string" } },
        },
        required: ["planId", "expectedPlanVersion", "courseCount", "servings", "dietaryRequirements", "menuBudgetCap"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true, untrustedContentHint: true },
      execute: async (input, options) => {
        const plan = runtime.getPlan();
        if (input.planId !== plan.planId) return failure(plan, "PLAN_NOT_FOUND", "That plan is not open.");
        const versionError = checkVersion(plan, input);
        if (versionError) return versionError;
        const preserve = new Set(Array.isArray(input.preserveCourseIds) ? input.preserveCourseIds.map(String) : []);
        const servings = Number(input.servings);
        let curation;
        try {
          curation = await requestCuration<MenuCurationData>({
            action: "CURATE_MENU",
            servings,
            dietaryRequirements: Array.isArray(input.dietaryRequirements)
              ? input.dietaryRequirements.map(String)
              : [],
            preparationMinutesMax: typeof input.preparationMinutesMax === "number"
              ? input.preparationMinutesMax
              : undefined,
            menuBudgetCap: input.menuBudgetCap as PartyPlan["budget"],
            creativeBrief: briefFromPlanTheme({
              title: plan.inspiration.title,
              author: plan.inspiration.author,
              tone: plan.tone,
              ideas: plan.theme.ideas,
              existing: plan.theme.creativeBrief,
            }),
          }, options.signal);
        } catch (error) {
          return curationFailure(plan, error, options.signal);
        }
        const current = runtime.getPlan();
        if (input.planId !== current.planId) return failure(current, "PLAN_NOT_FOUND", "That plan is not open.");
        const currentVersionError = checkVersion(current, input);
        if (currentVersionError) return currentVersionError;
        const courses = curation.data.courses.map((candidate) => ({
          ...structuredClone(
            preserve.has(candidate.courseId)
              ? current.courses.find((course) => course.courseId === candidate.courseId) ?? candidate
              : candidate,
          ),
          servings,
        }));
        const next = structuredClone(current);
        next.courses = courses;
        next.shopping = buildShoppingList(courses);
        next.prep = buildPrepTasks(courses);
        next.movements = current.movements.map((movement) => {
          const course = courses.find((item) => item.courseId === movement.courseId);
          return course ? { ...movement, recipeLabel: course.title, status: "EDITING" as const } : movement;
        });
        next.status = "BUILDING";
        next.completion = Math.max(current.completion, 62);
        const committed = commit(
          runtime,
          current,
          next,
          makeReceipt("curate_menu", "Menu curated", `Three catalog courses selected for ${servings} guests; preserved ${preserve.size}.`, "RECIPE"),
        );
        return success(
          committed,
          ["MENU", "SHOPPING_LIST"],
          { courses: committed.courses, estimatedMenuCost: curation.data.estimatedMenuCost, provider: curation.provider, providerMode: curation.mode, dietaryCheck: { passed: true, notes: ["Labels are informational; verify packaged ingredients and cross-contact."] } },
          `Curated three courses for ${servings} guests and rebuilt the dependent shopping list.`,
          {
            sources: mergeSources(committed.courses.map((course) => course.source), curation.sources),
            warnings: mergeWarnings(committed.warnings, curation.warnings),
            nextActions: [{ tool: "curate_pairings", label: "Pair the courses", reason: "Add wine and substantial zero-proof options.", requiresConfirmation: false }],
          },
        );
      },
    }),
    tool({
      name: "curate_pairings",
      title: "Curate drink pairings",
      description:
        "Pair selected courses with catalog wine and substantial zero-proof alternatives. It never claims current retail price or availability.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "number" },
          courseIds: { type: "array", items: { type: "string" } },
          includeWine: { type: "boolean" },
          includeZeroProof: { type: "boolean" },
          wineBudgetCap: {
            type: "object",
            properties: { amount: { type: "number" }, currency: { type: "string", enum: ["USD"] } },
          },
        },
        required: ["planId", "expectedPlanVersion", "includeWine", "includeZeroProof"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
      execute: async (input, options) => {
        const plan = runtime.getPlan();
        if (input.planId !== plan.planId) return failure(plan, "PLAN_NOT_FOUND", "That plan is not open.");
        const versionError = checkVersion(plan, input);
        if (versionError) return versionError;
        if (!input.includeWine && !input.includeZeroProof) {
          return failure(plan, "VALIDATION_ERROR", "Choose wine, zero-proof pairings, or both.");
        }
        const ids = Array.isArray(input.courseIds) ? new Set(input.courseIds.map(String)) : null;
        const targetCourses = ids ? plan.courses.filter((course) => ids.has(course.courseId)) : plan.courses;
        let curation;
        try {
          curation = await requestCuration<PairingCurationData>({
            action: "CURATE_PAIRINGS",
            courses: targetCourses.map(({ courseId, role, title, ingredients, dietaryTags }) => ({
              courseId,
              role,
              title,
              ingredients: ingredients.map((ingredient) => ingredient.name),
              dietaryTags,
            })),
            includeWine: Boolean(input.includeWine),
            includeZeroProof: Boolean(input.includeZeroProof),
            creativeBrief: briefFromPlanTheme({
              title: plan.inspiration.title,
              author: plan.inspiration.author,
              tone: plan.tone,
              ideas: plan.theme.ideas,
              existing: plan.theme.creativeBrief,
            }),
          }, options.signal);
        } catch (error) {
          return curationFailure(plan, error, options.signal);
        }
        const current = runtime.getPlan();
        if (input.planId !== current.planId) return failure(current, "PLAN_NOT_FOUND", "That plan is not open.");
        const currentVersionError = checkVersion(current, input);
        if (currentVersionError) return currentVersionError;
        const pairings = curation.data.pairings;
        const next = structuredClone(current);
        next.pairings = ids
          ? [...current.pairings.filter((pairing) => !ids.has(pairing.courseId)), ...pairings]
          : pairings;
        next.completion = Math.max(current.completion, 70);
        const committed = commit(
          runtime,
          current,
          next,
          makeReceipt("curate_pairings", "Pairings curated", `${pairings.length} catalog pairings applied across ${targetCourses.length} courses.`, "PAIRING"),
        );
        return success(
          committed,
          ["PAIRINGS"],
          { pairings: committed.pairings, provider: curation.provider, providerMode: curation.mode },
          `Added ${pairings.length} pairings without inventing price or availability.`,
          {
            warnings: mergeWarnings(committed.warnings, curation.warnings),
            sources: mergeSources(pairings.map((pairing) => pairing.source), curation.sources),
            nextActions: [{ tool: "curate_soundtrack", label: "Sequence the soundtrack", reason: "Give the evening a coherent energy arc.", requiresConfirmation: false }],
          },
        );
      },
    }),
    tool({
      name: "curate_soundtrack",
      title: "Curate the soundtrack",
      description:
        "Create a draft Apple Music-oriented soundtrack and energy arc for the dinner. This does not save anything to the host’s music library.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "number" },
          durationMinutes: { type: "integer", minimum: 30, maximum: 480 },
          energyArc: { type: "string", enum: ["ARRIVAL_TO_ASCENT", "STEADY_GLOW", "CUSTOM"] },
          customEnergyNotes: { type: "string" },
          storefront: { type: "string" },
        },
        required: ["planId", "expectedPlanVersion", "durationMinutes", "energyArc", "storefront"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
      execute: async (input, options) => {
        const plan = runtime.getPlan();
        if (input.planId !== plan.planId) return failure(plan, "PLAN_NOT_FOUND", "That plan is not open.");
        const versionError = checkVersion(plan, input);
        if (versionError) return versionError;
        let curation;
        try {
          curation = await requestCuration<SoundtrackCurationData>({
            action: "CURATE_SOUNDTRACK",
            storefront: String(input.storefront),
            durationMinutes: Number(input.durationMinutes),
            energyArc: input.energyArc as "ARRIVAL_TO_ASCENT" | "STEADY_GLOW" | "CUSTOM",
            customEnergyNotes: typeof input.customEnergyNotes === "string" ? input.customEnergyNotes : undefined,
            creativeBrief: briefFromPlanTheme({
              title: plan.inspiration.title,
              author: plan.inspiration.author,
              tone: plan.tone,
              ideas: plan.theme.ideas,
              existing: plan.theme.creativeBrief,
            }),
          }, options.signal);
        } catch (error) {
          return curationFailure(plan, error, options.signal);
        }
        const current = runtime.getPlan();
        if (input.planId !== current.planId) return failure(current, "PLAN_NOT_FOUND", "That plan is not open.");
        const currentVersionError = checkVersion(current, input);
        if (currentVersionError) return currentVersionError;
        const tracks = curation.data.soundtrack;
        const next = structuredClone(current);
        next.soundtrack = tracks;
        next.completion = Math.max(current.completion, 74);
        const committed = commit(
          runtime,
          current,
          next,
          makeReceipt("curate_soundtrack", "Soundtrack sequenced", `${tracks.length} listening anchors arranged for a ${input.durationMinutes}-minute ${String(input.energyArc).toLowerCase().replaceAll("_", " ")} arc.`, "MUSIC"),
        );
        return success(
          committed,
          ["SOUNDTRACK"],
          { ...curation.data, soundtrack: committed.soundtrack, requestedDurationMinutes: input.durationMinutes, provider: curation.provider, providerMode: curation.mode },
          "Created a four-anchor draft soundtrack; no playlist was saved.",
          {
            warnings: mergeWarnings(committed.warnings, curation.warnings),
            sources: mergeSources(
              committed.soundtrack.flatMap((track) => [track.source, track.releaseContext?.source].filter((source): source is SourceRef => Boolean(source))),
              curation.sources,
            ),
            nextActions: [{ tool: "create_shopping_list", label: "Build the shopping list", reason: "Reconcile ingredients across the confirmed menu.", requiresConfirmation: false }],
          },
        );
      },
    }),
    tool({
      name: "create_shopping_list",
      title: "Create the shopping list",
      description:
        "Aggregate the current menu’s catalog ingredients into an editable shopping list grouped by aisle, preserving checked items when requested.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "number" },
          preserveCheckedItems: { type: "boolean", default: true },
        },
        required: ["planId", "expectedPlanVersion"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
      execute: async (input) => {
        const plan = runtime.getPlan();
        const versionError = checkVersion(plan, input);
        if (versionError) return versionError;
        const checked = new Set(
          input.preserveCheckedItems === false
            ? []
            : plan.shopping.filter((item) => item.checked).map((item) => item.itemId),
        );
        const shopping = buildShoppingList(plan.courses).map((item) => ({
          ...item,
          checked: checked.has(item.itemId),
        }));
        const next = structuredClone(plan);
        next.shopping = shopping;
        next.prep = buildPrepTasks(plan.courses);
        next.completion = Math.max(plan.completion, 78);
        const committed = commit(
          runtime,
          plan,
          next,
          makeReceipt("create_shopping_list", "Shopping list reconciled", `${shopping.length} ingredient lines grouped by aisle; ${checked.size} checked items preserved.`, "SHOPPING"),
        );
        return success(
          committed,
          ["SHOPPING_LIST"],
          { shoppingList: committed.shopping, prepTimeline: committed.prep },
          `Created ${shopping.length} shopping lines and ${committed.prep.length} prep tasks.`,
          { nextActions: [{ tool: "finalize_party_plan", label: "Review and finalize", reason: "Validate the plan before generating the host packet.", requiresConfirmation: true }] },
        );
      },
    }),
    tool({
      name: "finalize_party_plan",
      title: "Finalize the party plan",
      description:
        "Validate and lock the current plan for export. This consequential action requires the host’s explicit confirmation.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "number" },
          confirm: { type: "boolean", description: "True only after the host explicitly approves finalization." },
        },
        required: ["planId", "expectedPlanVersion", "confirm"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
      execute: async (input) => {
        const plan = runtime.getPlan();
        const versionError = checkVersion(plan, input);
        if (versionError) return versionError;
        if (input.confirm !== true) {
          return failure(plan, "CONFIRMATION_REQUIRED", "Ask the host to approve finalizing this plan, then retry with confirm: true.");
        }
        const missing = [
          plan.courses.length < 3 ? "three-course menu" : null,
          plan.pairings.length < 3 ? "drink pairings" : null,
          plan.soundtrack.length < 3 ? "soundtrack" : null,
          plan.shopping.length === 0 ? "shopping list" : null,
        ].filter(Boolean);
        if (missing.length) {
          return failure(plan, "PLAN_NOT_READY", `The plan still needs: ${missing.join(", ")}.`, false, { missing });
        }
        const next = structuredClone(plan);
        next.status = "FINALIZED";
        next.completion = 100;
        next.movements = next.movements.map((movement) => ({ ...movement, status: "SET" }));
        const committed = commit(
          runtime,
          plan,
          next,
          makeReceipt("finalize_party_plan", "Plan finalized", "All required sections passed structural review; dietary labels still require host verification.", "SYSTEM"),
        );
        return success(
          committed,
          ["FINALIZATION"],
          { finalized: true, finalizedAt: committed.updatedAt },
          `${committed.title} is finalized and ready for a host packet.`,
          { nextActions: [{ tool: "export_host_packet", label: "Download the host packet", reason: "Create the useful kitchen-and-table artifact.", requiresConfirmation: true }] },
        );
      },
    }),
    tool({
      name: "export_host_packet",
      title: "Export the host packet",
      description:
        "Generate and download a PDF host packet for the finalized plan. Requires explicit host confirmation because it creates a local file.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "number" },
          confirm: { type: "boolean" },
          includeShoppingList: { type: "boolean", default: true },
          includePrepTimeline: { type: "boolean", default: true },
        },
        required: ["planId", "expectedPlanVersion", "confirm"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: async (input) => {
        const plan = runtime.getPlan();
        const versionError = checkVersion(plan, input);
        if (versionError) return versionError;
        if (input.confirm !== true) {
          return failure(plan, "CONFIRMATION_REQUIRED", "Ask the host to approve downloading a PDF, then retry with confirm: true.");
        }
        if (plan.status !== "FINALIZED") {
          return failure(plan, "PLAN_NOT_READY", "Finalize the party plan before exporting the host packet.");
        }
        try {
          const artifact = await runtime.exportHostPacket(plan);
          const next = structuredClone(plan);
          const exportRecord = {
            exportId: `export-${Date.now()}`,
            filename: artifact.filename,
            createdAt: new Date().toISOString(),
          };
          next.exports.unshift(exportRecord);
          const committed = commit(
            runtime,
            plan,
            next,
            makeReceipt("export_host_packet", "Host packet exported", artifact.filename, "SYSTEM"),
          );
          return success(
            committed,
            ["EXPORTS"],
            { export: exportRecord, downloaded: true },
            `Downloaded ${artifact.filename}.`,
            { sources: planSources(committed) },
          );
        } catch (error) {
          return failure(plan, "EXPORT_FAILED", error instanceof Error ? error.message : "The PDF could not be created.", true);
        }
      },
    }),
  ];

  for (const definition of tools) {
    await document.modelContext.registerTool(definition, { signal: controller.signal });
  }

  return { controller, count: tools.length };
}

function committedThemeCount(plan: PartyPlan) {
  return plan.theme.ideas.length;
}
