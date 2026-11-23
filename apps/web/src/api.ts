const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export type ApiOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  token?: string
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: 'Request failed' })) as {
      detail?: string | Array<{ msg?: string; loc?: string[] }>
    }
    const errorMessage = typeof payload.detail === 'string'
      ? payload.detail
      : Array.isArray(payload.detail)
        ? payload.detail.map(d => d.msg || JSON.stringify(d)).join(', ')
        : 'Request failed'
    throw new Error(errorMessage)
  }
  return response.json() as Promise<T>
}
