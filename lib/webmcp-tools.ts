import {
  buildPrepTasks,
  buildShoppingList,
} from "@/lib/seed-plan";
import { briefFromPlanTheme } from "@/lib/creative-brief";
import { requestCuration } from "@/lib/curation-client";
import {
  buildGuestShareKitPreview,
  type GuestShareKitOptions,
} from "@/lib/guest-share-kit";
import type {
  MenuCurationData,
  PairingCurationData,
  SoundtrackCurationData,
  SoundtrackEnrichmentData,
  ThemeCurationData,
} from "@/lib/curation-contracts";
import type {
  PlanApiSuccess,
  PlanCreationConfiguration,
  PlanCreationProviderReceipt,
} from "@/lib/plan-store-contracts";
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
  createPartyPlan: (
    configuration: PlanCreationConfiguration,
    signal: AbortSignal,
  ) => Promise<PlanApiSuccess>;
  setPlan: (plan: PartyPlan) => Promise<void> | void;
  syncPlan: (plan: PartyPlan) => void;
  exportHostPacket: (plan: PartyPlan) => Promise<{ filename: string }>;
  exportGuestShareKit: (
    plan: PartyPlan,
    options: GuestShareKitOptions,
  ) => Promise<{ filename: string; files: string[] }>;
  showToolData?: (operation: string, data: unknown) => void;
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

type PlanToolResponse = {
  ok?: boolean;
  plan?: PartyPlan;
  planId?: string;
  planVersion?: number;
  data?: unknown;
  error?: { code?: ToolFailure["error"]["code"]; message?: string; details?: Record<string, unknown> };
};

const requestPlanTool = async (
  plan: PartyPlan,
  operation: string,
  input: Record<string, unknown>,
  signal: AbortSignal,
) => {
  const response = await fetch(`/api/plans/${encodeURIComponent(plan.planId)}/tools`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ operation, ...input }),
    signal,
  });
  const payload = await response.json() as PlanToolResponse;
  if (!response.ok || !payload.ok) {
    return {
      result: failure(
        plan,
        payload.error?.code ?? "SOURCE_UNAVAILABLE",
        payload.error?.message ?? `The plan tool returned ${response.status}.`,
        response.status >= 500,
        payload.error?.details,
      ),
    };
  }
  return { payload };
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

const toolSignal = (options?: { signal?: AbortSignal }) =>
  options?.signal ?? new AbortController().signal;

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

const commit = async (
  runtime: ToolRuntime,
  current: PartyPlan,
  next: PartyPlan,
  receipt: Receipt,
): Promise<PartyPlan> => {
  const committed: PartyPlan = {
    ...next,
    planVersion: current.planVersion + 1,
    receipts: [receipt, ...next.receipts].slice(0, 12),
    updatedAt: new Date().toISOString(),
  };
  await runtime.setPlan(committed);
  return committed;
};

const planSources = (plan: PartyPlan) => {
  const sources = [
    plan.theme.source,
    ...plan.courses.map((course) => course.source),
    ...plan.pairings.map((pairing) => pairing.source),
    ...plan.soundtrack.flatMap((track) => [
      track.source,
      track.releaseContext?.source,
      ...(track.provenance?.discovery.sources ?? []),
      ...(track.provenance?.discovery.origin === "REVIEWED_SEED"
        ? track.provenance.discovery.attemptedCandidate?.sources ?? []
        : []),
      track.provenance?.verification.source,
      ...(track.editorialContext?.sources ?? []),
    ].filter((source): source is SourceRef => Boolean(source))),
  ];
  return [...new Map(sources.map((item) => [item.sourceId, item])).values()];
};

const creationSources = (receipts: PlanCreationProviderReceipt[]) =>
  mergeSources(...receipts.map((receipt) => receipt.sources));

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
  const runReadOperation = async (
    operation: string,
    input: Record<string, unknown>,
    signal: AbortSignal,
    sections: PartySection[],
    summary: string,
  ) => {
    const plan = runtime.getPlan();
    if (input.planId !== plan.planId) return failure(plan, "PLAN_NOT_FOUND", "That plan is not open.");
    const response = await requestPlanTool(plan, operation, input, signal);
    if (response.result) return response.result;
    runtime.showToolData?.(operation, response.payload?.data);
    return success(plan, sections, response.payload?.data, summary, { updated: false });
  };
  const runMutationOperation = async (
    operation: string,
    input: Record<string, unknown>,
    signal: AbortSignal,
    sections: PartySection[],
    summary: string,
  ) => {
    const plan = runtime.getPlan();
    if (input.planId !== plan.planId) return failure(plan, "PLAN_NOT_FOUND", "That plan is not open.");
    const versionError = checkVersion(plan, input);
    if (versionError) return versionError;
    const response = await requestPlanTool(plan, operation, input, signal);
    if (response.result) return response.result;
    if (!response.payload?.plan) return failure(plan, "SOURCE_UNAVAILABLE", "The plan tool did not return the updated plan.", true);
    const activePlan = runtime.getPlan();
    if (activePlan.planId !== plan.planId) {
      return failure(
        activePlan,
        "VERSION_CONFLICT",
        "The active workspace changed while that tool was running. The older response was not applied.",
        true,
        { requestedPlanId: plan.planId, activePlanId: activePlan.planId },
      );
    }
    runtime.syncPlan(response.payload.plan);
    return success(response.payload.plan, sections, response.payload.data, summary);
  };
  const tools: WebMCPTool[] = [
    tool({
      name: "create_party_plan",
      title: "Create a new supper club plan",
      description:
        "Create and open a fresh anonymous plan using live theme, recipe, wine, zero-proof, and music providers with reviewed fallbacks and explicit provider receipts.",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string", minLength: 1, maxLength: 100 },
          inspiration: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["BOOK"] },
              title: { type: "string", minLength: 1, maxLength: 120 },
              author: { type: "string", minLength: 1, maxLength: 100 },
            },
            required: ["type", "title", "author"],
            additionalProperties: false,
          },
          guestCount: { type: "integer", minimum: 1, maximum: 30 },
          budget: {
            type: "object",
            properties: {
              amount: { type: "number", minimum: 1, maximum: 10000 },
              currency: { type: "string", enum: ["USD"] },
            },
            required: ["amount", "currency"],
            additionalProperties: false,
          },
          dietaryRequirements: {
            type: "array",
            items: { type: "string", minLength: 1, maxLength: 60 },
            maxItems: 20,
          },
          tone: { type: "string", enum: ["HOPEFUL", "BALANCED", "SURVIVALIST"] },
          eventDate: { type: "string", description: "Optional ISO date in YYYY-MM-DD format." },
          requestedThemes: {
            type: "array",
            items: { type: "string", minLength: 1, maxLength: 40 },
            maxItems: 8,
          },
          includeWine: { type: "boolean" },
          includeZeroProof: { type: "boolean" },
          musicStorefront: {
            type: "string",
            pattern: "^[A-Za-z]{2}$",
            default: "us",
          },
        },
        required: [
          "inspiration",
          "guestCount",
          "budget",
          "dietaryRequirements",
          "tone",
          "includeWine",
          "includeZeroProof",
        ],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
        untrustedContentHint: true,
      },
      execute: async (input, options) => {
        const current = runtime.getPlan();
        const signal = toolSignal(options);
        const inspiration = input.inspiration as Record<string, unknown>;
        const budget = input.budget as Record<string, unknown>;
        const configuration: PlanCreationConfiguration = {
          ...(typeof input.title === "string" ? { title: input.title } : {}),
          inspirationTitle: String(inspiration.title),
          inspirationAuthor: String(inspiration.author),
          guestCount: Number(input.guestCount),
          budgetAmount: Number(budget.amount),
          dietaryRequirements: Array.isArray(input.dietaryRequirements)
            ? input.dietaryRequirements.map(String)
            : [],
          tone: input.tone as PartyPlan["tone"],
          ...(typeof input.eventDate === "string" ? { eventDate: input.eventDate } : {}),
          ...(Array.isArray(input.requestedThemes)
            ? { requestedThemes: input.requestedThemes.map(String) }
            : {}),
          includeWine: input.includeWine === true,
          includeZeroProof: input.includeZeroProof === true,
          musicStorefront: typeof input.musicStorefront === "string"
            ? input.musicStorefront.toLowerCase()
            : "us",
        };
        try {
          const created = await runtime.createPartyPlan(configuration, signal);
          const providerReceipts = created.creation?.providerReceipts ?? [];
          const sources = providerReceipts.length
            ? creationSources(providerReceipts)
            : planSources(created.plan);
          return success(
            created.plan,
            ["CONFIGURATION", "THEME", "MENU", "PAIRINGS", "SOUNDTRACK", "SHOPPING_LIST"],
            {
              created: true,
              previousPlanId: current.planId,
              plan: {
                planId: created.plan.planId,
                planVersion: created.plan.planVersion,
                title: created.plan.title,
                status: created.plan.status,
                guestCount: created.plan.guestCount,
                budget: created.plan.budget,
                courseCount: created.plan.courses.length,
                pairingCount: created.plan.pairings.length,
                trackCount: created.plan.soundtrack.length,
                shoppingItemCount: created.plan.shopping.length,
              },
              providerReceipts,
              workspaceUrl: `${window.location.origin}/?plan=${encodeURIComponent(created.plan.planId)}`,
            },
            `Created and opened ${created.plan.title} as a fresh plan using ${providerReceipts.length} provider-stage receipts.`,
            {
              warnings: mergeWarnings(
                created.plan.warnings,
                ...providerReceipts.map((receipt) => receipt.warnings),
              ),
              sources,
              nextActions: [
                {
                  tool: "get_party_plan",
                  label: "Review the new plan",
                  reason: "Confirm the newly selected theme, menu, pairings, soundtrack, and warnings.",
                  requiresConfirmation: false,
                },
                {
                  tool: "enrich_soundtrack_context",
                  label: "Research the soundtrack",
                  reason: "Add source-backed artist, album, and hosting context through Perplexity.",
                  requiresConfirmation: false,
                },
              ],
            },
          );
        } catch (error) {
          if (signal.aborted || (error instanceof Error && error.name === "AbortError")) throw error;
          if (error && typeof error === "object" && "code" in error) {
            const apiError = error as {
              code?: string;
              message?: string;
              status?: number;
              details?: Record<string, unknown>;
            };
            return failure(
              current,
              apiError.code === "BAD_REQUEST" || apiError.code === "VALIDATION_ERROR"
                ? "VALIDATION_ERROR"
                : "SOURCE_UNAVAILABLE",
              apiError.message ?? "The new plan could not be created.",
              Number(apiError.status ?? 500) >= 500,
              apiError.details,
            );
          }
          return curationFailure(current, error, signal);
        }
      },
    }),
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
        const committed = await commit(
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
          }, toolSignal(options));
        } catch (error) {
          return curationFailure(plan, error, toolSignal(options));
        }
        const current = runtime.getPlan();
        if (input.planId !== current.planId) return failure(current, "PLAN_NOT_FOUND", "That plan is not open.");
        const currentVersionError = checkVersion(current, input);
        if (currentVersionError) return currentVersionError;
        const next = structuredClone(current);
        next.tone = input.tone as PartyPlan["tone"];
        const { bookCover, ...themeData } = curation.data;
        next.theme = {
          ...current.theme,
          ...themeData,
        };
        if (bookCover) next.inspiration.cover = bookCover;
        const committed = await commit(
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
        "Select a complete three-course menu through the normalized recipe gateway, using Spoonacular first, Perplexity Agent web discovery as the live fallback, and reviewed local recipes as the final fallback.",
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
          }, toolSignal(options));
        } catch (error) {
          return curationFailure(plan, error, toolSignal(options));
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
        next.warnings = mergeWarnings(current.warnings, curation.warnings);
        const committed = await commit(
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
        "Pair selected courses with live or catalog wine and sourced zero-proof recipes. It never claims current retail price or availability.",
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
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true, untrustedContentHint: true },
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
            servings: plan.guestCount,
            dietaryRequirements: plan.dietaryRequirements,
            creativeBrief: briefFromPlanTheme({
              title: plan.inspiration.title,
              author: plan.inspiration.author,
              tone: plan.tone,
              ideas: plan.theme.ideas,
              existing: plan.theme.creativeBrief,
            }),
          }, toolSignal(options));
        } catch (error) {
          return curationFailure(plan, error, toolSignal(options));
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
        next.warnings = mergeWarnings(current.warnings, curation.warnings);
        const committed = await commit(
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
          }, toolSignal(options));
        } catch (error) {
          return curationFailure(plan, error, toolSignal(options));
        }
        const current = runtime.getPlan();
        if (input.planId !== current.planId) return failure(current, "PLAN_NOT_FOUND", "That plan is not open.");
        const currentVersionError = checkVersion(current, input);
        if (currentVersionError) return currentVersionError;
        const tracks = curation.data.soundtrack;
        const next = structuredClone(current);
        next.soundtrack = tracks;
        next.completion = Math.max(current.completion, 74);
        const committed = await commit(
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
      name: "enrich_soundtrack_context",
      title: "Research artists and albums",
      description:
        "Use Perplexity Agent API web research to attach concise, source-backed artist, album, cultural, and hosting context to selected tracks in the current soundtrack. This does not save or publish a playlist.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "number" },
          trackIds: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 6,
            description: "Optional soundtrack track IDs to research. Omit to enrich the full soundtrack.",
          },
        },
        required: ["planId", "expectedPlanVersion"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: true },
      execute: async (input, options) => {
        const plan = runtime.getPlan();
        if (input.planId !== plan.planId) return failure(plan, "PLAN_NOT_FOUND", "That plan is not open.");
        const versionError = checkVersion(plan, input);
        if (versionError) return versionError;
        const requestedIds = Array.isArray(input.trackIds)
          ? new Set(input.trackIds.map(String))
          : null;
        const targetTracks = requestedIds
          ? plan.soundtrack.filter((track) => requestedIds.has(track.trackId))
          : plan.soundtrack;
        if (!targetTracks.length) {
          return failure(plan, "VALIDATION_ERROR", "Choose at least one track from the current soundtrack.");
        }

        let curation;
        try {
          curation = await requestCuration<SoundtrackEnrichmentData>({
            action: "ENRICH_SOUNDTRACK",
            tracks: targetTracks.map(({ trackId, title, artist, albumName, sourceUrl }) => ({
              trackId,
              title,
              artist,
              albumName,
              sourceUrl,
            })),
            theme: {
              title: `${plan.inspiration.title} by ${plan.inspiration.author}`,
              framing: plan.theme.framing,
            },
          }, toolSignal(options));
        } catch (error) {
          return curationFailure(plan, error, toolSignal(options));
        }

        const current = runtime.getPlan();
        if (input.planId !== current.planId) return failure(current, "PLAN_NOT_FOUND", "That plan is not open.");
        const currentVersionError = checkVersion(current, input);
        if (currentVersionError) return currentVersionError;
        const enrichmentByTrack = new Map(
          curation.data.enrichments.map((item) => [item.trackId, item.context]),
        );
        const next = structuredClone(current);
        next.soundtrack = current.soundtrack.map((track) => {
          const editorialContext = enrichmentByTrack.get(track.trackId);
          return editorialContext ? { ...track, editorialContext } : track;
        });
        const committed = await commit(
          runtime,
          current,
          next,
          makeReceipt(
            "enrich_soundtrack_context",
            "Music context researched",
            `${enrichmentByTrack.size} soundtrack ${enrichmentByTrack.size === 1 ? "entry" : "entries"} enriched with source-backed artist and album notes.`,
            "MUSIC",
          ),
        );
        return success(
          committed,
          ["SOUNDTRACK"],
          {
            enrichments: curation.data.enrichments,
            enrichedTrackIds: [...enrichmentByTrack.keys()],
            provider: curation.provider,
            providerMode: curation.mode,
          },
          `Added researched context to ${enrichmentByTrack.size} soundtrack ${enrichmentByTrack.size === 1 ? "entry" : "entries"}.`,
          {
            warnings: mergeWarnings(committed.warnings, curation.warnings),
            sources: curation.sources,
            nextActions: [{
              tool: "create_shopping_list",
              label: "Build the shopping list",
              reason: "Continue coordinating the practical dinner plan.",
              requiresConfirmation: false,
            }],
          },
        );
      },
    }),
    tool({
      name: "find_grocery_stores",
      title: "Find grocery stores",
      description: "Find nearby Kroger-family stores by ZIP code so the host can choose which location's prices to use.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          zipCode: { type: "string", pattern: "^\\d{5}$" },
          radiusInMiles: { type: "integer", minimum: 1, maximum: 25 },
          limit: { type: "integer", minimum: 1, maximum: 5 },
        },
        required: ["planId", "zipCode"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true, untrustedContentHint: true },
      execute: (input, options) => runReadOperation("FIND_GROCERY_STORES", input, toolSignal(options), ["SHOPPING_LIST"], "Returned nearby Kroger-family stores for host selection."),
    }),
    tool({
      name: "price_shopping_list",
      title: "Price the shopping list",
      description: "Estimate the current plan's grocery subtotal from location-specific Kroger package prices, with coverage, stock, confidence, and unpriced lines. Does not add items to a cart.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          locationId: { type: "string", pattern: "^\\d{5,12}$" },
          page: { type: "integer", minimum: 1, maximum: 20 },
          pageSize: { type: "integer", minimum: 1, maximum: 5 },
        },
        required: ["planId", "locationId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true, untrustedContentHint: true },
      execute: (input, options) => runReadOperation("PRICE_SHOPPING_LIST", input, toolSignal(options), ["SHOPPING_LIST"], "Returned a location-specific Kroger basket estimate with explicit coverage and confidence."),
    }),
    tool({
      name: "search_recipes",
      title: "Search reviewed recipes",
      description: "Find reviewed recipe alternatives for one course by theme, diet, preparation time, and budget preference without changing the plan.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          role: { type: "string", enum: ["STARTER", "MAIN", "DESSERT"] },
          query: { type: "string", maxLength: 160 },
          dietaryRequirements: { type: "array", items: { type: "string" }, maxItems: 20 },
          preparationMinutesMax: { type: "integer", minimum: 5, maximum: 720 },
          courseBudgetCap: { type: "number", minimum: 0 },
          limit: { type: "integer", minimum: 1, maximum: 3 },
        },
        required: ["planId", "role"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: (input, options) => runReadOperation("SEARCH_RECIPES", input, toolSignal(options), ["MENU"], "Returned reviewed recipe choices; current local prices remain unverified."),
    }),
    tool({
      name: "set_menu_course",
      title: "Select a menu course",
      description: "Choose a specific reviewed recipe for one existing course; preserve all other courses and rebuild shopping and prep.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "integer", minimum: 1 },
          courseId: { type: "string" },
          recipeId: { type: "string" },
        },
        required: ["planId", "expectedPlanVersion", "courseId", "recipeId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: (input, options) => runMutationOperation("SET_MENU_COURSE", input, toolSignal(options), ["MENU", "PAIRINGS", "SHOPPING_LIST"], "Selected the requested course, reconciled shopping and prep, and marked its pairings for review."),
    }),
    tool({
      name: "replace_menu_course",
      title: "Replace one menu course",
      description: "Replace only one course with a different reviewed recipe matching diet, theme, time, and budget preferences.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "integer", minimum: 1 },
          courseId: { type: "string" },
          query: { type: "string", maxLength: 160 },
          dietaryRequirements: { type: "array", items: { type: "string" }, maxItems: 20 },
          preparationMinutesMax: { type: "integer", minimum: 5, maximum: 720 },
          courseBudgetCap: { type: "number", minimum: 0 },
        },
        required: ["planId", "expectedPlanVersion", "courseId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
      execute: (input, options) => runMutationOperation("REPLACE_MENU_COURSE", input, toolSignal(options), ["MENU", "PAIRINGS", "SHOPPING_LIST"], "Replaced only the requested course; other courses were preserved and dependent shopping and prep data were rebuilt."),
    }),
    tool({
      name: "suggest_ingredient_substitutions",
      title: "Suggest ingredient substitutions",
      description: "Suggest host-reviewed ingredient swaps for allergies, diets, availability, or cost without changing the plan.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          courseId: { type: "string" },
          ingredientName: { type: "string" },
          reason: { type: "string", enum: ["ALLERGY", "GLUTEN_FREE", "DAIRY_FREE", "VEGAN", "VEGETARIAN", "NUT_FREE", "AVAILABILITY", "COST"] },
        },
        required: ["planId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
      execute: (input, options) => runReadOperation("SUGGEST_INGREDIENT_SUBSTITUTIONS", input, toolSignal(options), ["MENU", "SHOPPING_LIST"], "Returned substitution ideas for host review; no ingredient was changed automatically."),
    }),
    tool({
      name: "create_prep_timeline",
      title: "Create a prep timeline",
      description: "Turn the current recipes into a practical cooking schedule and save it to the shared plan.",
      inputSchema: {
        type: "object",
        properties: { planId: { type: "string" }, expectedPlanVersion: { type: "integer", minimum: 1 } },
        required: ["planId", "expectedPlanVersion"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
      execute: (input, options) => runMutationOperation("CREATE_PREP_TIMELINE", input, toolSignal(options), ["SHOPPING_LIST"], "Rebuilt the practical prep timeline from the current menu."),
    }),
    tool({
      name: "search_wines",
      title: "Search wine pairings",
      description: "Find wine candidates for one course from reviewed catalogs and GrapeMinds when configured; exact bottles, prices, and stock require verification.",
      inputSchema: {
        type: "object",
        properties: { planId: { type: "string" }, courseId: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 3 } },
        required: ["planId", "courseId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true, untrustedContentHint: true },
      execute: (input, options) => runReadOperation("SEARCH_WINES", input, toolSignal(options), ["PAIRINGS"], "Returned wine candidates for host review; verify bottle, vintage, price, stock, and legal eligibility."),
    }),
    tool({
      name: "set_wine_pairing",
      title: "Select a wine pairing",
      description: "Choose one searched wine candidate for a course and save it to the shared plan.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "integer", minimum: 1 },
          courseId: { type: "string" },
          pairingId: { type: "string" },
        },
        required: ["planId", "expectedPlanVersion", "courseId", "pairingId"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true, untrustedContentHint: true },
      execute: (input, options) => runMutationOperation("SET_WINE_PAIRING", input, toolSignal(options), ["PAIRINGS"], "Saved the selected wine pairing; verify bottle, vintage, price, and stock before serving."),
    }),
    tool({
      name: "create_zero_proof_pairings",
      title: "Create zero-proof pairings",
      description: "Create and save a substantial zero-proof choice for every current course, including sourced recipes when Perplexity Agent discovery succeeds and reviewed local pairings as fallback.",
      inputSchema: {
        type: "object",
        properties: { planId: { type: "string" }, expectedPlanVersion: { type: "integer", minimum: 1 } },
        required: ["planId", "expectedPlanVersion"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true, untrustedContentHint: true },
      execute: (input, options) => runMutationOperation("CREATE_ZERO_PROOF_PAIRINGS", input, toolSignal(options), ["PAIRINGS"], "Created a substantial zero-proof choice for each current course."),
    }),
    tool({
      name: "search_music",
      title: "Search Apple Music",
      description: "Find live Apple Music track candidates with available artwork and audio previews without changing the plan.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          query: { type: "string", minLength: 1, maxLength: 180 },
          storefront: { type: "string", pattern: "^[A-Za-z]{2}$", default: "us" },
          limit: { type: "integer", minimum: 1, maximum: 3 },
        },
        required: ["planId", "query", "storefront"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true, untrustedContentHint: true },
      execute: (input, options) => runReadOperation("SEARCH_MUSIC", input, toolSignal(options), ["SOUNDTRACK"], "Returned live Apple Music candidates; previews vary by storefront and rights, and nothing was added automatically."),
    }),
    tool({
      name: "refresh_music_metadata",
      title: "Refresh music metadata",
      description: "Refresh the current soundtrack track by track with Apple Music album, artwork, preview, and source metadata while preserving the host's selected tracks and successful matches.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "integer", minimum: 1 },
          storefront: { type: "string", pattern: "^[A-Za-z]{2}$", default: "us" },
        },
        required: ["planId", "expectedPlanVersion"],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true, untrustedContentHint: true },
      execute: (input, options) => runMutationOperation(
        "REFRESH_MUSIC_METADATA",
        { storefront: "us", ...input },
        toolSignal(options),
        ["SOUNDTRACK"],
        "Refreshed each soundtrack track independently; live Apple Music matches were saved and unmatched selections remain reviewed seeds.",
      ),
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
        const committed = await commit(
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
        const committed = await commit(
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
          {
            nextActions: [
              { tool: "preview_guest_share_kit", label: "Preview the guest share kit", reason: "Review the redacted program, social cards, captions, and alt text before download.", requiresConfirmation: false },
              { tool: "export_host_packet", label: "Download the host packet", reason: "Create the useful kitchen-and-table artifact.", requiresConfirmation: true },
            ],
          },
        );
      },
    }),
    tool({
      name: "preview_guest_share_kit",
      title: "Preview the guest share kit",
      description:
        "Preview a guest-safe program and social package without downloading files. Omits host-only operations and location by default.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          includeLocation: {
            type: "boolean",
            default: false,
            description: "Include the event location only when the host explicitly requests it.",
          },
          tone: {
            type: "string",
            enum: ["EDITORIAL", "CELEBRATORY"],
            default: "EDITORIAL",
          },
        },
        required: ["planId"],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: false,
        untrustedContentHint: true,
      },
      execute: async (input) => {
        const plan = runtime.getPlan();
        if (input.planId !== plan.planId) {
          return failure(undefined, "PLAN_NOT_FOUND", "That party plan is not open.", false);
        }
        const options: GuestShareKitOptions = {
          includeLocation: input.includeLocation === true,
          tone: input.tone === "CELEBRATORY" ? "CELEBRATORY" : "EDITORIAL",
        };
        const preview = buildGuestShareKitPreview(plan, options);
        runtime.showToolData?.("PREVIEW_GUEST_SHARE_KIT", preview);
        return success(
          plan,
          ["EXPORTS"],
          {
            title: preview.title,
            schedule: `${preview.date} · ${preview.time}`,
            guestCount: preview.guestCount,
            includesLocation: Boolean(preview.location),
            files: preview.manifest.files.map((file) => file.path),
            announcementCaption: preview.announcementCaption,
            privacy: "Budget, shopping, prep, receipts, plan IDs, and source internals are omitted.",
          },
          `Previewed a seven-file guest share kit for ${preview.title}; nothing was downloaded.`,
          {
            updated: false,
            warnings: [],
            sources: [],
            nextActions: [{
              tool: "export_guest_share_kit",
              label: "Download the guest share kit",
              reason: "Create the reviewed PDF, social cards, captions, and alt text as one ZIP.",
              requiresConfirmation: true,
            }],
          },
        );
      },
    }),
    tool({
      name: "export_guest_share_kit",
      title: "Export the guest share kit",
      description:
        "Download the reviewed guest program, three social cards, captions, alt text, and manifest as one ZIP. Requires explicit confirmation.",
      inputSchema: {
        type: "object",
        properties: {
          planId: { type: "string" },
          expectedPlanVersion: { type: "number" },
          confirm: {
            type: "boolean",
            description: "True only after the host explicitly approves creating the local download.",
          },
          includeLocation: {
            type: "boolean",
            default: false,
            description: "Include the event location only when the host explicitly requests it.",
          },
          tone: {
            type: "string",
            enum: ["EDITORIAL", "CELEBRATORY"],
            default: "EDITORIAL",
          },
        },
        required: ["planId", "expectedPlanVersion", "confirm"],
        additionalProperties: false,
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
        untrustedContentHint: true,
      },
      execute: async (input) => {
        const plan = runtime.getPlan();
        const versionError = checkVersion(plan, input);
        if (versionError) return versionError;
        if (input.confirm !== true) {
          return failure(plan, "CONFIRMATION_REQUIRED", "Ask the host to approve downloading the guest share kit, then retry with confirm: true.");
        }
        if (plan.status !== "FINALIZED") {
          return failure(plan, "PLAN_NOT_READY", "Finalize the party plan before exporting guest-facing materials.");
        }
        const options: GuestShareKitOptions = {
          includeLocation: input.includeLocation === true,
          tone: input.tone === "CELEBRATORY" ? "CELEBRATORY" : "EDITORIAL",
        };
        try {
          const artifact = await runtime.exportGuestShareKit(plan, options);
          const next = structuredClone(plan);
          const exportRecord = {
            exportId: `export-${Date.now()}`,
            filename: artifact.filename,
            createdAt: new Date().toISOString(),
          };
          next.exports.unshift(exportRecord);
          const committed = await commit(
            runtime,
            plan,
            next,
            makeReceipt("export_guest_share_kit", "Guest share kit exported", `${artifact.filename} · ${artifact.files.length} guest-safe files`, "SYSTEM"),
          );
          return success(
            committed,
            ["EXPORTS"],
            { export: exportRecord, downloaded: true, files: artifact.files },
            `Downloaded ${artifact.filename} with ${artifact.files.length} guest-safe files.`,
            { warnings: [], sources: [] },
          );
        } catch (error) {
          return failure(plan, "EXPORT_FAILED", error instanceof Error ? error.message : "The guest share kit could not be created.", true);
        }
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
          const committed = await commit(
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
