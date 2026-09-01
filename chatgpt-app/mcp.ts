import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import type { PartyConfiguration, PartyPlan, PlanEnvelope, StorageMetadata } from "./shared.js";

const APP_URI = "ui://supper-club/planner-v1.html";

export type SupperClubMcpConfig = {
  apiBaseUrl: string;
  websiteBaseUrl: string;
  serviceToken?: string;
  widgetHtml: string;
};

export const buildWidgetHtml = (template: string, script: string, style: string) =>
  template
    .replace("/*__WIDGET_STYLE__*/", () => style)
    .replace("/*__WIDGET_SCRIPT__*/", () => script);

class PlanApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "PlanApiError";
  }
}

const apiHeaders = (serviceToken?: string) => ({
  "content-type": "application/json",
  ...(serviceToken ? { authorization: `Bearer ${serviceToken}` } : {}),
});

const planRequest = async (
  config: SupperClubMcpConfig,
  path: string,
  options: { method?: "GET" | "POST" | "PUT"; body?: unknown } = {},
): Promise<{ plan: PartyPlan; storage: StorageMetadata }> => {
  const response = await fetch(`${config.apiBaseUrl.replace(/\/$/, "")}${path}`, {
    method: options.method ?? "GET",
    headers: apiHeaders(config.serviceToken?.trim()),
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = (await response.json()) as {
    ok?: boolean;
    plan?: PartyPlan;
    storage?: StorageMetadata;
    error?: { code?: string; message?: string; details?: Record<string, unknown> };
  };
  if (!response.ok || !payload.ok || !payload.plan || !payload.storage) {
    throw new PlanApiError(
      payload.error?.code ?? "STORE_UNAVAILABLE",
      payload.error?.message ?? `Plan service returned ${response.status}.`,
      response.status,
      payload.error?.details,
    );
  }
  return { plan: payload.plan, storage: payload.storage };
};

type PlanToolPayload = {
  ok?: boolean;
  plan?: PartyPlan;
  storage?: StorageMetadata;
  planId?: string;
  planVersion?: number;
  data?: unknown;
  error?: { code?: string; message?: string; details?: Record<string, unknown> };
};

const planToolRequest = async (
  config: SupperClubMcpConfig,
  planId: string,
  body: Record<string, unknown>,
): Promise<PlanToolPayload> => {
  const response = await fetch(
    `${config.apiBaseUrl.replace(/\/$/, "")}/api/plans/${encodeURIComponent(planId)}/tools`,
    {
      method: "POST",
      headers: apiHeaders(config.serviceToken?.trim()),
      body: JSON.stringify(body),
    },
  );
  const payload = (await response.json()) as PlanToolPayload;
  if (!response.ok || !payload.ok) {
    throw new PlanApiError(
      payload.error?.code ?? "TOOL_REQUEST_FAILED",
      payload.error?.message ?? `Plan tool service returned ${response.status}.`,
      response.status,
      payload.error?.details,
    );
  }
  return payload;
};

const withWebsiteUrl = (
  config: SupperClubMcpConfig,
  value: { plan: PartyPlan; storage: StorageMetadata },
): PlanEnvelope => ({
  ...value,
  websiteUrl: `${config.websiteBaseUrl.replace(/\/$/, "")}/?plan=${encodeURIComponent(value.plan.planId)}`,
});

const applyConfiguration = (plan: PartyPlan, configuration: PartyConfiguration): PartyPlan => ({
  ...plan,
  title: configuration.title?.trim() || plan.title,
  inspiration: {
    ...plan.inspiration,
    title: configuration.inspirationTitle?.trim() || plan.inspiration.title,
    author: configuration.inspirationAuthor?.trim() || plan.inspiration.author,
  },
  guestCount: configuration.guestCount ?? plan.guestCount,
  budget: { ...plan.budget, amount: configuration.budgetAmount ?? plan.budget.amount },
  dietaryRequirements: configuration.dietaryRequirements ?? plan.dietaryRequirements,
  tone: configuration.tone ?? plan.tone,
  eventDate: configuration.eventDate ?? plan.eventDate,
  status: "BUILDING",
  planVersion: plan.planVersion + 1,
  updatedAt: new Date().toISOString(),
  receipts: [
    {
      receiptId: `receipt-chatgpt-${Date.now()}`,
      tool: "configure_party",
      title: "Host brief updated",
      detail: "Guest, budget, dietary, tone, and inspiration choices were saved to the shared plan.",
      timestamp: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()),
      kind: "SYSTEM" as const,
      status: "APPLIED" as const,
    },
    ...plan.receipts,
  ].slice(0, 12),
});

const toolSuccess = (message: string, envelope: PlanEnvelope) => ({
  content: [{ type: "text" as const, text: message }],
  structuredContent: envelope,
});

const toolDataSuccess = (message: string, payload: PlanToolPayload) => ({
  content: [{ type: "text" as const, text: message }],
  structuredContent: {
    ok: true,
    planId: payload.planId,
    planVersion: payload.planVersion,
    data: payload.data,
    storage: payload.storage,
  },
});

const savedToolSuccess = (config: SupperClubMcpConfig, message: string, payload: PlanToolPayload) => {
  if (!payload.plan || !payload.storage) {
    throw new PlanApiError("INVALID_TOOL_RESPONSE", "The plan tool did not return an updated plan.", 502);
  }
  return toolSuccess(message, withWebsiteUrl(config, { plan: payload.plan, storage: payload.storage }));
};

const toolFailure = (error: unknown) => {
  const known = error instanceof PlanApiError;
  return {
    isError: true,
    content: [
      {
        type: "text" as const,
        text: known ? `${error.code}: ${error.message}` : "Supper Club AI could not complete that request.",
      },
    ],
    structuredContent: {
      ok: false,
      error: {
        code: known ? error.code : "INTERNAL_ERROR",
        message: error instanceof Error ? error.message : "Unknown error",
        ...(known && error.details ? { details: error.details } : {}),
      },
    },
  };
};

const uiMeta = {
  ui: { resourceUri: APP_URI },
  "openai/outputTemplate": APP_URI,
};

const configurationShape = {
  title: z.string().trim().min(1).max(100).optional().describe("A name for the dinner party."),
  inspirationTitle: z.string().trim().min(1).max(120).optional().describe("The book or cultural work inspiring the party."),
  inspirationAuthor: z.string().trim().min(1).max(100).optional().describe("Author or creator of the inspiration."),
  guestCount: z.number().int().min(1).max(30).optional(),
  budgetAmount: z.number().min(0).max(10000).optional().describe("Total budget in USD."),
  dietaryRequirements: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  tone: z.enum(["HOPEFUL", "BALANCED", "SURVIVALIST"]).optional(),
  eventDate: z.string().date().optional(),
};

const createConfigurationShape = {
  ...configurationShape,
  inspirationTitle: z.string().trim().min(1).max(120).describe("The book or cultural work inspiring this new party."),
  inspirationAuthor: z.string().trim().min(1).max(100).describe("Author or creator of the inspiration."),
  requestedThemes: z.array(z.string().trim().min(1).max(40)).max(8).optional(),
  includeWine: z.boolean().optional().describe("Whether to include wine pairings."),
  includeZeroProof: z.boolean().optional().describe("Whether to include substantial non-alcoholic pairings."),
  musicStorefront: z.string().regex(/^[a-z]{2}$/i).optional().describe("Two-letter Apple Music storefront, such as us."),
};

const planIdSchema = z.string().regex(/^plan-[0-9a-f-]{36}$/i);
const expectedVersionSchema = z.number().int().positive();
const courseIdSchema = z.string().trim().min(1).max(120);
const dietarySchema = z.array(z.string().trim().min(1).max(60)).max(20).optional();

export const createSupperClubMcpServer = async (config: SupperClubMcpConfig) => {
  const mcp = new McpServer({ name: "supper-club-ai", version: "0.1.0" });

  registerAppResource(
    mcp,
    "Supper Club AI Planner",
    APP_URI,
    { description: "Interactive dinner-party planning workspace." },
    async () => {
      return {
        contents: [
          {
            uri: APP_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: config.widgetHtml,
            _meta: { ui: { prefersBorder: false } },
          },
        ],
      };
    },
  );

  registerAppTool(
    mcp,
    "create_party_plan",
    {
      title: "Create a Supper Club plan",
      description: "Create a fresh anonymous dinner-party plan with a newly researched theme, menu, pairings, soundtrack, prep tasks, and shopping list, then open the interactive planner.",
      inputSchema: createConfigurationShape,
      _meta: uiMeta,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async (configuration) => {
      try {
        const value = await planRequest(config, "/api/plans", {
          method: "POST",
          body: { configuration },
        });
        const envelope = withWebsiteUrl(config, value);
        return toolSuccess(`Created a fresh “${envelope.plan.title}” experience as shared plan ${envelope.plan.planId}. Its theme, menu, pairings, soundtrack, prep, and shopping list were curated for this brief.`, envelope);
      } catch (error) {
        return toolFailure(error);
      }
    },
  );

  registerAppTool(
    mcp,
    "get_party_plan",
    {
      title: "Open a Supper Club plan",
      description: "Open the latest version of an existing shared dinner-party plan.",
      inputSchema: { planId: z.string().regex(/^plan-[0-9a-f-]{36}$/i) },
      _meta: uiMeta,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async ({ planId }) => {
      try {
        const envelope = withWebsiteUrl(
          config,
          await planRequest(config, `/api/plans/${encodeURIComponent(planId)}`),
        );
        return toolSuccess(`Opened “${envelope.plan.title}” at version ${envelope.plan.planVersion}.`, envelope);
      } catch (error) {
        return toolFailure(error);
      }
    },
  );

  registerAppTool(
    mcp,
    "configure_party",
    {
      title: "Update the host brief",
      description: "Update guest, budget, dietary, tone, date, or inspiration choices on a shared plan.",
      inputSchema: {
        planId: z.string().regex(/^plan-[0-9a-f-]{36}$/i),
        expectedPlanVersion: z.number().int().positive(),
        ...configurationShape,
      },
      _meta: uiMeta,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ planId, expectedPlanVersion, ...configuration }) => {
      try {
        const current = await planRequest(config, `/api/plans/${encodeURIComponent(planId)}`);
        if (current.plan.planVersion !== expectedPlanVersion) {
          throw new PlanApiError(
            "VERSION_CONFLICT",
            `The plan is now version ${current.plan.planVersion}; refresh before updating.`,
            409,
            { expectedPlanVersion, actualPlanVersion: current.plan.planVersion },
          );
        }
        const next = applyConfiguration(current.plan, configuration);
        const saved = await planRequest(config, `/api/plans/${encodeURIComponent(planId)}`, {
          method: "PUT",
          body: { expectedPlanVersion, plan: next },
        });
        const envelope = withWebsiteUrl(config, saved);
        return toolSuccess(`Saved the host brief as version ${envelope.plan.planVersion}.`, envelope);
      } catch (error) {
        return toolFailure(error);
      }
    },
  );

  registerAppTool(
    mcp,
    "find_grocery_stores",
    {
      title: "Find grocery stores",
      description: "Find nearby Kroger-family stores by ZIP code so the Creative Host can choose the location whose prices should be used.",
      inputSchema: {
        planId: planIdSchema,
        zipCode: z.string().regex(/^\d{5}$/),
        radiusInMiles: z.number().int().min(1).max(25).optional(),
        limit: z.number().int().min(1).max(5).optional(),
      },
      _meta: uiMeta,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ planId, ...input }) => {
      try {
        const payload = await planToolRequest(config, planId, { operation: "FIND_GROCERY_STORES", ...input });
        return toolDataSuccess("Returned nearby Kroger-family stores. Ask the host to choose a location before pricing the shopping list.", payload);
      } catch (error) { return toolFailure(error); }
    },
  );

  registerAppTool(
    mcp,
    "price_shopping_list",
    {
      title: "Price the shopping list",
      description: "Estimate the current plan's grocery subtotal from location-specific Kroger package prices, with match coverage, stock, confidence, and unpriced items. Read-only; does not add anything to a cart.",
      inputSchema: {
        planId: planIdSchema,
        locationId: z.string().regex(/^\d{5,12}$/),
        page: z.number().int().min(1).max(20).optional(),
        pageSize: z.number().int().min(1).max(5).optional(),
      },
      _meta: uiMeta,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ planId, ...input }) => {
      try {
        const payload = await planToolRequest(config, planId, { operation: "PRICE_SHOPPING_LIST", ...input });
        return toolDataSuccess("Returned a location-specific basket estimate with match coverage and paginated ingredient lines. It excludes tax, delivery, fees, loyalty-only pricing, and unresolved substitutions.", payload);
      } catch (error) { return toolFailure(error); }
    },
  );

  registerAppTool(
    mcp,
    "search_recipes",
    {
      title: "Search reviewed recipes",
      description: "Find reviewed recipe alternatives for one course using theme, dietary, time, and budget preferences. Price caps are reported as unverified when current ingredient pricing is unavailable.",
      inputSchema: {
        planId: planIdSchema,
        role: z.enum(["STARTER", "MAIN", "DESSERT"]),
        query: z.string().trim().min(1).max(160).optional(),
        dietaryRequirements: dietarySchema,
        preparationMinutesMax: z.number().int().min(5).max(720).optional(),
        courseBudgetCap: z.number().min(0).max(10000).optional(),
        limit: z.number().int().min(1).max(3).optional(),
      },
      _meta: uiMeta,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ planId, ...input }) => {
      try {
        const payload = await planToolRequest(config, planId, { operation: "SEARCH_RECIPES", ...input });
        return toolDataSuccess("Returned reviewed recipe choices. Use set_menu_course to select one, or replace_menu_course to choose a qualifying alternative automatically.", payload);
      } catch (error) { return toolFailure(error); }
    },
  );

  registerAppTool(
    mcp,
    "set_menu_course",
    {
      title: "Select a menu course",
      description: "Choose a specific reviewed recipe for one existing course while preserving the rest of the evening. Rebuilds shopping and prep, and marks that course's pairings for review.",
      inputSchema: {
        planId: planIdSchema,
        expectedPlanVersion: expectedVersionSchema,
        courseId: courseIdSchema,
        recipeId: z.string().trim().min(1).max(160),
      },
      _meta: uiMeta,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ planId, ...input }) => {
      try {
        const payload = await planToolRequest(config, planId, { operation: "SET_MENU_COURSE", ...input });
        return savedToolSuccess(config, `Selected the requested recipe and saved plan version ${payload.plan?.planVersion}. Shopping and prep now match the menu; the changed course needs fresh pairings.`, payload);
      } catch (error) { return toolFailure(error); }
    },
  );

  registerAppTool(
    mcp,
    "replace_menu_course",
    {
      title: "Replace one menu course",
      description: "Replace one course with a different reviewed recipe that fits theme, diet, time, and budget preferences without rebuilding the other courses.",
      inputSchema: {
        planId: planIdSchema,
        expectedPlanVersion: expectedVersionSchema,
        courseId: courseIdSchema,
        query: z.string().trim().min(1).max(160).optional(),
        dietaryRequirements: dietarySchema,
        preparationMinutesMax: z.number().int().min(5).max(720).optional(),
        courseBudgetCap: z.number().min(0).max(10000).optional(),
      },
      _meta: uiMeta,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async ({ planId, ...input }) => {
      try {
        const payload = await planToolRequest(config, planId, { operation: "REPLACE_MENU_COURSE", ...input });
        return savedToolSuccess(config, `Replaced only the requested course and saved plan version ${payload.plan?.planVersion}. Other courses were preserved; shopping and prep were reconciled. Any dollar cap remains unverified until live ingredient pricing is available.`, payload);
      } catch (error) { return toolFailure(error); }
    },
  );

  registerAppTool(
    mcp,
    "suggest_ingredient_substitutions",
    {
      title: "Suggest ingredient substitutions",
      description: "Suggest host-reviewed ingredient swaps for allergies, dietary needs, availability, or cost without changing the plan.",
      inputSchema: {
        planId: planIdSchema,
        courseId: courseIdSchema.optional(),
        ingredientName: z.string().trim().min(1).max(120).optional(),
        reason: z.enum(["ALLERGY", "GLUTEN_FREE", "DAIRY_FREE", "VEGAN", "VEGETARIAN", "NUT_FREE", "AVAILABILITY", "COST"]).optional(),
      },
      _meta: uiMeta,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ planId, ...input }) => {
      try {
        const payload = await planToolRequest(config, planId, { operation: "SUGGEST_INGREDIENT_SUBSTITUTIONS", ...input });
        return toolDataSuccess("Returned substitution ideas for host review. No ingredient was changed automatically; verify labels, allergens, cross-contact, flavor, and texture before applying one.", payload);
      } catch (error) { return toolFailure(error); }
    },
  );

  registerAppTool(
    mcp,
    "create_prep_timeline",
    {
      title: "Create a prep timeline",
      description: "Rebuild a practical cooking schedule from the plan's current recipes and save it to the shared plan.",
      inputSchema: { planId: planIdSchema, expectedPlanVersion: expectedVersionSchema },
      _meta: uiMeta,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ planId, expectedPlanVersion }) => {
      try {
        const payload = await planToolRequest(config, planId, { operation: "CREATE_PREP_TIMELINE", expectedPlanVersion });
        return savedToolSuccess(config, `Rebuilt and saved the prep timeline as plan version ${payload.plan?.planVersion}.`, payload);
      } catch (error) { return toolFailure(error); }
    },
  );

  registerAppTool(
    mcp,
    "search_wines",
    {
      title: "Search wine pairings",
      description: "Find wine candidates for one course from reviewed catalogs and GrapeMinds when configured. Bottle details, vintage, price, and inventory require verification.",
      inputSchema: { planId: planIdSchema, courseId: courseIdSchema, limit: z.number().int().min(1).max(3).optional() },
      _meta: uiMeta,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ planId, ...input }) => {
      try {
        const payload = await planToolRequest(config, planId, { operation: "SEARCH_WINES", ...input });
        return toolDataSuccess("Returned wine candidates for host review. Verify the exact bottle, vintage, price, availability, and legal eligibility before purchase or service.", payload);
      } catch (error) { return toolFailure(error); }
    },
  );

  registerAppTool(
    mcp,
    "set_wine_pairing",
    {
      title: "Select a wine pairing",
      description: "Select a specific wine candidate for one course and save it to the shared plan.",
      inputSchema: {
        planId: planIdSchema,
        expectedPlanVersion: expectedVersionSchema,
        courseId: courseIdSchema,
        pairingId: z.string().trim().min(1).max(220),
      },
      _meta: uiMeta,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ planId, ...input }) => {
      try {
        const payload = await planToolRequest(config, planId, { operation: "SET_WINE_PAIRING", ...input });
        return savedToolSuccess(config, `Saved the selected wine pairing as plan version ${payload.plan?.planVersion}. Verify the exact bottle, vintage, price, and availability before serving.`, payload);
      } catch (error) { return toolFailure(error); }
    },
  );

  registerAppTool(
    mcp,
    "create_zero_proof_pairings",
    {
      title: "Create zero-proof pairings",
      description: "Create and save a substantial zero-proof choice for every current course, including sourced recipes when Perplexity Agent discovery succeeds and reviewed local pairings as fallback.",
      inputSchema: { planId: planIdSchema, expectedPlanVersion: expectedVersionSchema },
      _meta: uiMeta,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ planId, expectedPlanVersion }) => {
      try {
        const payload = await planToolRequest(config, planId, { operation: "CREATE_ZERO_PROOF_PAIRINGS", expectedPlanVersion });
        return savedToolSuccess(config, `Created zero-proof choices for the current menu and saved plan version ${payload.plan?.planVersion}.`, payload);
      } catch (error) { return toolFailure(error); }
    },
  );

  registerAppTool(
    mcp,
    "search_music",
    {
      title: "Search Apple Music",
      description: "Find live Apple Music track candidates, including available artwork and audio previews, without changing the plan.",
      inputSchema: {
        planId: planIdSchema,
        query: z.string().trim().min(1).max(180),
        storefront: z.string().regex(/^[a-z]{2}$/i).default("us"),
        limit: z.number().int().min(1).max(3).optional(),
      },
      _meta: uiMeta,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ planId, ...input }) => {
      try {
        const payload = await planToolRequest(config, planId, { operation: "SEARCH_MUSIC", ...input });
        return toolDataSuccess("Returned live Apple Music track candidates. Preview availability varies by storefront and catalog rights; no track was added automatically.", payload);
      } catch (error) { return toolFailure(error); }
    },
  );

  registerAppTool(
    mcp,
    "refresh_music_metadata",
    {
      title: "Refresh music metadata",
      description: "Refresh each selected soundtrack track with Apple Music album, artwork, preview, and source metadata while preserving successful matches and reviewed seeds.",
      inputSchema: {
        planId: planIdSchema,
        expectedPlanVersion: expectedVersionSchema,
        storefront: z.string().regex(/^[a-z]{2}$/i).default("us"),
      },
      _meta: uiMeta,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ planId, ...input }) => {
      try {
        const payload = await planToolRequest(config, planId, { operation: "REFRESH_MUSIC_METADATA", ...input });
        const counts = payload.data as { matchedCount?: number; preservedCount?: number; reviewedSeedCount?: number } | undefined;
        return savedToolSuccess(
          config,
          `Refreshed music metadata and saved plan version ${payload.plan?.planVersion}: ${counts?.matchedCount ?? 0} live matches, ${counts?.preservedCount ?? 0} preserved matches, and ${counts?.reviewedSeedCount ?? 0} reviewed seeds.`,
          payload,
        );
      } catch (error) { return toolFailure(error); }
    },
  );

  registerAppTool(
    mcp,
    "finalize_party_plan",
    {
      title: "Finalize the dinner-party plan",
      description: "Finalize a complete shared plan. This consequential action requires explicit confirmation.",
      inputSchema: {
        planId: z.string().regex(/^plan-[0-9a-f-]{36}$/i),
        expectedPlanVersion: z.number().int().positive(),
        confirm: z.literal(true).describe("Must be true only after the host explicitly confirms finalization."),
      },
      _meta: uiMeta,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async ({ planId, expectedPlanVersion, confirm }) => {
      try {
        if (confirm !== true) {
          throw new PlanApiError("CONFIRMATION_REQUIRED", "The Creative Host must confirm finalization.", 409);
        }
        const current = await planRequest(config, `/api/plans/${encodeURIComponent(planId)}`);
        if (current.plan.planVersion !== expectedPlanVersion) {
          throw new PlanApiError(
            "VERSION_CONFLICT",
            `The plan is now version ${current.plan.planVersion}; review the latest version before finalizing.`,
            409,
          );
        }
        const ready =
          current.plan.courses.length >= 3 &&
          current.plan.courses.every((course) =>
            current.plan.pairings.some((pairing) => pairing.courseId === course.courseId),
          ) &&
          current.plan.soundtrack.length >= 3 &&
          current.plan.shopping.length > 0;
        if (!ready) {
          throw new PlanApiError(
            "PLAN_NOT_READY",
            "Finalize needs three courses, a pairing for each course, at least three tracks, and a shopping list.",
            422,
          );
        }
        const next: PartyPlan = {
          ...current.plan,
          status: "FINALIZED",
          completion: 100,
          planVersion: current.plan.planVersion + 1,
          updatedAt: new Date().toISOString(),
          movements: current.plan.movements.map((movement) => ({ ...movement, status: "SET" })),
          receipts: [
            {
              receiptId: `receipt-chatgpt-final-${Date.now()}`,
              tool: "finalize_party_plan",
              title: "Plan finalized",
              detail: "The Creative Host explicitly approved the complete plan. Dietary and cross-contact checks remain the host’s responsibility.",
              timestamp: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date()),
              kind: "SYSTEM" as const,
              status: "APPLIED" as const,
            },
            ...current.plan.receipts,
          ].slice(0, 12),
        };
        const saved = await planRequest(config, `/api/plans/${encodeURIComponent(planId)}`, {
          method: "PUT",
          body: { expectedPlanVersion, plan: next },
        });
        const envelope = withWebsiteUrl(config, saved);
        return toolSuccess(`Finalized “${envelope.plan.title}” at version ${envelope.plan.planVersion}.`, envelope);
      } catch (error) {
        return toolFailure(error);
      }
    },
  );

  return mcp;
};
