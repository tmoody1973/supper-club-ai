import { curate, providerStatus } from "@/lib/curation.server";
import type { CurationRequest } from "@/lib/curation-contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actions = new Set([
  "RESEARCH_THEME",
  "CURATE_MENU",
  "CURATE_PAIRINGS",
  "CURATE_SOUNDTRACK",
]);

export async function GET() {
  return Response.json({
    ok: true,
    providers: providerStatus(),
    secretsExposed: false,
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json(
      { ok: false, error: { code: "BAD_REQUEST", message: "Cross-origin curation requests are not allowed." } },
      { status: 403 },
    );
  }
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 32_000) {
    return Response.json(
      { ok: false, error: { code: "BAD_REQUEST", message: "Request body is too large." } },
      { status: 413 },
    );
  }
  try {
    const body = (await request.json()) as Partial<CurationRequest>;
    if (!body || typeof body.action !== "string" || !actions.has(body.action)) {
      return Response.json(
        { ok: false, error: { code: "BAD_REQUEST", message: "Unknown curation action." } },
        { status: 400 },
      );
    }
    const response = await curate(body as CurationRequest, request.signal);
    return Response.json(response, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "CURATION_UNAVAILABLE",
          message: error instanceof Error ? error.message : "Curation is temporarily unavailable.",
        },
      },
      { status: 503 },
    );
  }
}
