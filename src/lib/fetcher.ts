import { toast } from "sonner";

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: number[];
  signal?: AbortSignal;
  toastLabel?: string;
  onAttempt?: (attempt: number, total: number) => void;
}

const DEFAULT_RETRY_STATUSES = [408, 425, 429, 500, 502, 503, 504];

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

/** Fetch with exponential backoff. Surfaces a toast on the final failure. */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: RetryOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    baseDelayMs = 500,
    maxDelayMs = 4000,
    retryOn = DEFAULT_RETRY_STATUSES,
    signal,
    toastLabel,
    onAttempt,
  } = opts;

  let attempt = 0;
  let lastErr: unknown = null;

  while (attempt <= retries) {
    onAttempt?.(attempt + 1, retries + 1);
    try {
      const res = await fetch(url, { ...init, signal: init.signal ?? signal });
      if (res.ok || !retryOn.includes(res.status)) return res;

      // Honor Retry-After
      let wait =
        Math.min(baseDelayMs * 2 ** attempt, maxDelayMs) +
        Math.random() * 200;
      const ra = res.headers.get("Retry-After");
      if (ra) {
        const secs = parseFloat(ra);
        if (!Number.isNaN(secs)) wait = Math.max(wait, secs * 1000);
      }
      lastErr = new Error(`HTTP ${res.status}`);
      if (attempt === retries) return res; // give up — return last response
      await sleep(wait, signal);
      attempt++;
      continue;
    } catch (e) {
      if ((e as any)?.name === "AbortError") throw e;
      lastErr = e;
      if (attempt === retries) break;
      const wait =
        Math.min(baseDelayMs * 2 ** attempt, maxDelayMs) + Math.random() * 200;
      await sleep(wait, signal);
      attempt++;
    }
  }

  const msg = lastErr instanceof Error ? lastErr.message : "Network error";
  if (toastLabel) {
    toast.error(`${toastLabel} failed`, { description: msg });
  }
  throw lastErr instanceof Error ? lastErr : new Error(msg);
}

/** JSON helper that retries and parses. */
export async function jsonFetch<T = any>(
  url: string,
  init: RequestInit = {},
  opts: RetryOptions = {}
): Promise<T> {
  const res = await fetchWithRetry(url, init, opts);
  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.json()).error ?? (await res.text());
    } catch {
      detail = await res.text();
    }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json();
}
