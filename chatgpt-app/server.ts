import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { basename, dirname, resolve } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import type { PartyConfiguration, PartyPlan, PlanEnvelope, StorageMetadata } from "./shared.js";

const APP_URI = "ui://supper-club/planner-v1.html";
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = basename(currentDirectory) === "dist" ? dirname(currentDirectory) : currentDirectory;
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";
const apiBaseUrl = (process.env.SUPPER_CLUB_API_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const websiteBaseUrl = (process.env.SUPPER_CLUB_WEBSITE_URL ?? apiBaseUrl).replace(/\/$/, "");
const serviceToken = process.env.SUPPER_CLUB_SERVICE_TOKEN?.trim();

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

const apiHeaders = () => ({
  "content-type": "application/json",
  ...(serviceToken ? { authorization: `Bearer ${serviceToken}` } : {}),
});

const planRequest = async (
  path: string,
  options: { method?: "GET" | "POST" | "PUT"; body?: unknown } = {},
): Promise<{ plan: PartyPlan; storage: StorageMetadata }> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: apiHeaders(),
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

const withWebsiteUrl = (value: { plan: PartyPlan; storage: StorageMetadata }): PlanEnvelope => ({
  ...value,
  websiteUrl: `${websiteBaseUrl}/?plan=${encodeURIComponent(value.plan.planId)}`,
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

const createMcpServer = async () => {
  const mcp = new McpServer({ name: "supper-club-ai", version: "0.1.0" });
  const templatePath = resolve(projectDirectory, "web/widget.html");
  const scriptPath = resolve(projectDirectory, "web/dist/widget.js");
  const stylePath = resolve(projectDirectory, "web/dist/widget.css");

  registerAppResource(
    mcp,
    "Supper Club AI Planner",
    APP_URI,
    { description: "Interactive dinner-party planning workspace." },
    async () => {
      const [template, script, style] = await Promise.all([
        readFile(templatePath, "utf8"),
        readFile(scriptPath, "utf8"),
        readFile(stylePath, "utf8"),
      ]);
      return {
        contents: [
          {
            uri: APP_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: template
              .replace("/*__WIDGET_STYLE__*/", style)
              .replace("/*__WIDGET_SCRIPT__*/", script),
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
      description: "Create an anonymous shared dinner-party plan and open the interactive planner.",
      inputSchema: configurationShape,
      _meta: uiMeta,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (configuration) => {
      try {
        let value = await planRequest("/api/plans", { method: "POST", body: {} });
        if (Object.values(configuration).some((item) => item !== undefined)) {
          const next = applyConfiguration(value.plan, configuration);
          value = await planRequest(`/api/plans/${encodeURIComponent(next.planId)}`, {
            method: "PUT",
            body: { expectedPlanVersion: value.plan.planVersion, plan: next },
          });
        }
        const envelope = withWebsiteUrl(value);
        return toolSuccess(`Created “${envelope.plan.title}” as shared plan ${envelope.plan.planId}.`, envelope);
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
        const envelope = withWebsiteUrl(await planRequest(`/api/plans/${encodeURIComponent(planId)}`));
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
        const current = await planRequest(`/api/plans/${encodeURIComponent(planId)}`);
        if (current.plan.planVersion !== expectedPlanVersion) {
          throw new PlanApiError(
            "VERSION_CONFLICT",
            `The plan is now version ${current.plan.planVersion}; refresh before updating.`,
            409,
            { expectedPlanVersion, actualPlanVersion: current.plan.planVersion },
          );
        }
        const next = applyConfiguration(current.plan, configuration);
        const saved = await planRequest(`/api/plans/${encodeURIComponent(planId)}`, {
          method: "PUT",
          body: { expectedPlanVersion, plan: next },
        });
        const envelope = withWebsiteUrl(saved);
        return toolSuccess(`Saved the host brief as version ${envelope.plan.planVersion}.`, envelope);
      } catch (error) {
        return toolFailure(error);
      }
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
        const current = await planRequest(`/api/plans/${encodeURIComponent(planId)}`);
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
        const saved = await planRequest(`/api/plans/${encodeURIComponent(planId)}`, {
          method: "PUT",
          body: { expectedPlanVersion, plan: next },
        });
        const envelope = withWebsiteUrl(saved);
        return toolSuccess(`Finalized “${envelope.plan.title}” at version ${envelope.plan.planVersion}.`, envelope);
      } catch (error) {
        return toolFailure(error);
      }
    },
  );

  return mcp;
};

const readJsonBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : undefined;
};

const setCors = (response: ServerResponse) => {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type, mcp-session-id, mcp-protocol-version");
  response.setHeader("access-control-expose-headers", "mcp-session-id");
};

const httpServer = createServer(async (request, response) => {
  setCors(response);
  if (request.method === "OPTIONS") {
    response.writeHead(204).end();
    return;
  }
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
  if (url.pathname === "/" && request.method === "GET") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, name: "supper-club-ai", mcp: "/mcp" }));
    return;
  }
  if (url.pathname !== "/mcp" || request.method !== "POST") {
    response.writeHead(405, { "content-type": "application/json" });
    response.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }));
    return;
  }

  const mcp = await createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  response.on("close", () => {
    void transport.close();
    void mcp.close();
  });
  try {
    const body = await readJsonBody(request);
    await mcp.connect(transport);
    await transport.handleRequest(request, response, body);
  } catch (error) {
    console.error("[Supper Club AI MCP]", error);
    if (!response.headersSent) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null }));
    }
  }
});

httpServer.listen(port, host, () => {
  console.log(`Supper Club AI MCP app listening at http://${host}:${port}/mcp`);
});
