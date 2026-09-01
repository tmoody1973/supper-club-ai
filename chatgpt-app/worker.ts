import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { buildWidgetHtml, createSupperClubMcpServer } from "./mcp.js";
import widgetStyle from "./web/dist/widget.css";
import widgetScript from "./web/dist/widget.txt";
import widgetTemplate from "./web/widget.html";

type Env = {
  SUPPER_CLUB_API_BASE_URL: string;
  SUPPER_CLUB_WEBSITE_URL?: string;
  SUPPER_CLUB_SERVICE_TOKEN?: string;
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
  "access-control-allow-headers":
    "content-type, last-event-id, mcp-session-id, mcp-protocol-version",
  "access-control-expose-headers": "mcp-session-id, mcp-protocol-version",
};

const withCors = (response: Response) => {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(corsHeaders)) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") {
      return json({ ok: true, name: "supper-club-ai", mcp: "/mcp", runtime: "cloudflare" });
    }
    if (url.pathname !== "/mcp") {
      return json({ error: "Not found" }, 404);
    }
    if (!env.SUPPER_CLUB_API_BASE_URL) {
      return json({ error: "SUPPER_CLUB_API_BASE_URL is not configured." }, 503);
    }

    const mcp = await createSupperClubMcpServer({
      apiBaseUrl: env.SUPPER_CLUB_API_BASE_URL,
      websiteBaseUrl: env.SUPPER_CLUB_WEBSITE_URL ?? env.SUPPER_CLUB_API_BASE_URL,
      serviceToken: env.SUPPER_CLUB_SERVICE_TOKEN,
      widgetHtml: buildWidgetHtml(widgetTemplate, widgetScript, widgetStyle),
    });
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    try {
      await mcp.connect(transport);
      return withCors(await transport.handleRequest(request));
    } catch (error) {
      console.error("[Supper Club AI MCP Worker]", error);
      return json(
        {
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        },
        500,
      );
    }
  },
};
