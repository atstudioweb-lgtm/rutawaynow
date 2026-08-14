export interface FetchWithRetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
}

export interface FetchWithRetryResponse extends Response {
  errorType?: "rate_limit" | "api_error";
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions: FetchWithRetryOptions = {},
): Promise<FetchWithRetryResponse> {
  const { maxRetries = 3, baseDelayMs = 1000 } = retryOptions;
  let lastResponse: FetchWithRetryResponse | null = null; // eslint-disable-line prefer-const

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = (await fetch(url, options)) as FetchWithRetryResponse;

    if (response.ok) {
      return response;
    }

    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const delay = retryAfter
        ? parseFloat(retryAfter) * 1000
        : baseDelayMs * Math.pow(2, attempt);

      if (attempt < maxRetries) {
        console.warn(
          `[fetchWithRetry] Rate limited (429), retrying after ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      response.errorType = "rate_limit";
      return response;
    }

    if (response.status >= 500) {
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[fetchWithRetry] Server error (${response.status}), retrying after ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      response.errorType = "api_error";
      return response;
    }

    response.errorType = "api_error";
    return response;
  }

  return lastResponse!;
}

// Unreachable: loop always returns before this point