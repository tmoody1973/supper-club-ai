import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

import { buildWidgetHtml, createSupperClubMcpServer } from "./mcp.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = basename(currentDirectory) === "dist" ? dirname(currentDirectory) : currentDirectory;
const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";

const readWidgetHtml = async () => {
  const [template, script, style] = await Promise.all([
    readFile(resolve(projectDirectory, "web/widget.html"), "utf8"),
    readFile(resolve(projectDirectory, "web/dist/widget.txt"), "utf8"),
    readFile(resolve(projectDirectory, "web/dist/widget.css"), "utf8"),
  ]);
  return buildWidgetHtml(template, script, style);
};

const widgetHtml = await readWidgetHtml();

const readJsonBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks).toString("utf8");
  return body ? JSON.parse(body) : undefined;
};

const setCors = (response: ServerResponse) => {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
  response.setHeader(
    "access-control-allow-headers",
    "content-type, last-event-id, mcp-session-id, mcp-protocol-version",
  );
  response.setHeader("access-control-expose-headers", "mcp-session-id, mcp-protocol-version");
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
    response.end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      }),
    );
    return;
  }

  const mcp = await createSupperClubMcpServer({
    apiBaseUrl: process.env.SUPPER_CLUB_API_BASE_URL ?? "http://127.0.0.1:3000",
    websiteBaseUrl:
      process.env.SUPPER_CLUB_WEBSITE_URL ??
      process.env.SUPPER_CLUB_API_BASE_URL ??
      "http://127.0.0.1:3000",
    serviceToken: process.env.SUPPER_CLUB_SERVICE_TOKEN,
    widgetHtml,
  });
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
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        }),
      );
    }
  }
});

httpServer.listen(port, host, () => {
  console.log(`Supper Club AI MCP app listening at http://${host}:${port}/mcp`);
});
