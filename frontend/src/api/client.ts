// In Vite development use the same-origin proxy. This avoids browser-level
// localhost/127.0.0.1 cross-origin failures while still targeting the local API.
const BASE = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8010').replace(/\/$/, '');

export async function api<T>(path: string, opts?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
      ...opts,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Network request to ${url} failed: ${detail}. Confirm the API is running and restart Vite after changing frontend/.env or vite.config.ts.`);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status} from ${url}: ${body}`);
  }
  return res.json();
}
