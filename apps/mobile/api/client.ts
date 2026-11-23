const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

export type RequestOptions = { method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; body?: unknown; token?: string };

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}/v1${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Request failed" })) as { detail?: string };
    throw new Error(payload.detail ?? "Request failed");
  }
  return response.json() as Promise<T>;
}
