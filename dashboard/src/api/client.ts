const BASE = "";

interface ApiResponse<T> {
  ok: boolean;
  data: T;
  error?: { message: string; code?: string };
}

export async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const json: ApiResponse<T> = await res.json();
  if (!json.ok) {
    throw new Error(json.error?.message || "API returned ok=false");
  }
  return json.data;
}

export async function postApi<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  const json: ApiResponse<T> = await res.json();
  if (!json.ok) {
    throw new Error(json.error?.message || "API returned ok=false");
  }
  return json.data;
}
