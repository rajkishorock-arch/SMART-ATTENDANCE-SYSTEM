export function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchJson(url, token, options = {}) {
  const headers = {
    ...authHeaders(token),
    ...options.headers,
  };
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || data.message || 'Request failed');
  }
  return res.json();
}

export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const {
    retries = 1,
    timeoutMs = 15000,
    retryDelayMs = 900,
  } = retryOptions;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        signal: options.signal || controller.signal,
      });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      if (attempt >= retries) break;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
  throw lastError || new Error('Request failed');
}
