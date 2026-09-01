import "server-only";

import {
  PlanStoreError,
  type PlanApiError,
} from "@/lib/plan-store-contracts";

const MAX_PLAN_BODY_BYTES = 128_000;

export const noStoreHeaders = {
  "cache-control": "no-store, max-age=0",
};

export const checkPlanRequest = (request: Request): Response | null => {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_PLAN_BODY_BYTES) {
    return planError("BAD_REQUEST", "The plan request body is too large.", 413);
  }

  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  if (origin && origin === requestOrigin) return null;
  if (request.headers.get("sec-fetch-site") === "same-origin") return null;

  const serviceToken = process.env.SUPPER_CLUB_SERVICE_TOKEN;
  if (!serviceToken) return origin ? planError("FORBIDDEN", "Cross-origin plan requests are not allowed.", 403) : null;

  const authorization = request.headers.get("authorization");
  if (authorization !== `Bearer ${serviceToken}`) {
    return planError("FORBIDDEN", "A valid Supper Club service token is required.", 403);
  }
  return null;
};

export const planError = (
  code: PlanApiError["error"]["code"],
  message: string,
  status: number,
  details?: Record<string, unknown>,
) =>
  Response.json(
    {
      ok: false,
      error: {
        code,
        message,
        retryable: status >= 500 || code === "VERSION_CONFLICT",
        details,
      },
    } satisfies PlanApiError,
    { status, headers: noStoreHeaders },
  );

export const planStoreErrorResponse = (error: unknown) => {
  if (error instanceof PlanStoreError) {
    return planError(error.code, error.message, error.status, error.details);
  }
  return planError(
    "STORE_UNAVAILABLE",
    error instanceof Error ? error.message : "The plan store is temporarily unavailable.",
    503,
  );
};
