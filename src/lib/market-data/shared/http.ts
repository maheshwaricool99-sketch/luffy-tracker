type RequestOptions = {
  timeoutMs?: number;
  headers?: Record<string, string>;
  retries?: number;
};

async function fetchWithTimeout(url: string, options: RequestOptions = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 6_000);
  try {
    return await fetch(url, {
      cache: "no-store",
      headers: options.headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function requestText(url: string, options: RequestOptions = {}): Promise<string> {
  let lastError: Error | null = null;
  const attempts = Math.max(1, options.retries ?? 2);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`${response.status}:${body.slice(0, 120)}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("request failed");
    }
  }
  throw lastError ?? new Error("request failed");
}

export async function requestJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const text = await requestText(url, options);
  return JSON.parse(text) as T;
}

export function isBinanceRestrictionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("403") ||
    message.includes("418") ||
    message.includes("451") ||
    message.includes("restricted") ||
    message.includes("forbidden")
  );
}
