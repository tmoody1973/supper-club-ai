import type {
  CurationErrorResponse,
  CurationRequest,
  CurationResponse,
} from "@/lib/curation-contracts";

export async function requestCuration<T>(
  request: CurationRequest,
  signal: AbortSignal,
): Promise<CurationResponse<T>> {
  const response = await fetch("/api/curation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  const payload = (await response.json()) as CurationResponse<T> | CurationErrorResponse;
  if (!response.ok || !payload.ok) {
    const message = payload.ok ? "Curation request failed." : payload.error.message;
    throw new Error(message);
  }
  return payload;
}
