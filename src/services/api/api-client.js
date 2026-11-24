import { API_BASE_URL, API_TIMEOUT_MS } from "@/lib/constants";

/** Error type thrown by the API client with a safe, user-facing message. */
export class ApiError extends Error {
  /**
   * @param {string} message user-safe message
   * @param {{status?: number, kind?: "network"|"timeout"|"http"|"parse"|"aborted"}} [meta]
   */
  constructor(message, { status, kind = "http" } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.kind = kind;
  }
}

function buildUrl(path, params) {
  const url = new URL(path, API_BASE_URL);
  Object.entries(params ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  return url.toString();
}

/**
 * GET JSON from the API with timeout, cancellation and consistent errors.
 * @param {string} path e.g. "/products"
 * @param {{params?: object, signal?: AbortSignal, timeoutMs?: number}} [options]
 */
export async function apiGet(path, { params, signal, timeoutMs = API_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  // Forward cancellation from TanStack Query (e.g. a newer search superseded this one).
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const res = await fetch(buildUrl(path, params), {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      throw new ApiError(
        res.status === 404
          ? "We couldn't find what you were looking for."
          : "The store is having trouble right now. Please try again.",
        { status: res.status, kind: "http" },
      );
    }
    try {
      return await res.json();
    } catch {
      throw new ApiError("We received an unexpected response from the store.", { kind: "parse" });
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (timedOut) throw new ApiError("The request took too long. Please try again.", { kind: "timeout" });
    if (signal?.aborted) throw new ApiError("Request cancelled.", { kind: "aborted" });
    throw new ApiError("Network error. Check your connection and try again.", { kind: "network" });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** Retry policy for TanStack Query: never retry 4xx or cancellations, retry others twice. */
export function shouldRetry(failureCount, error) {
  if (error instanceof ApiError) {
    if (error.kind === "aborted") return false;
    if (error.status && error.status >= 400 && error.status < 500) return false;
  }
  return failureCount < 2;
}
