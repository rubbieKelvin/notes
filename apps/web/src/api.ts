export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type Me = { email: string; anthropic_key_hint: string | null }
export type DocInfo = { id: string; title: string; mcp_exposed_slug: string | null; updated_at: string }

/** JSON fetch against our server; throws ApiError with the server's message. */
export async function api<T = void>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const hasBody = init.body !== undefined
  const res = await fetch(path, {
    method: init.method ?? (hasBody ? 'POST' : 'GET'),
    headers: hasBody ? { 'content-type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(init.body) : undefined,
  })
  if (res.status === 401 && path !== '/v1/me' && !path.startsWith('/v1/auth')) window.dispatchEvent(new Event('opennotes:signed-out'))
  if (!res.ok) throw new ApiError(res.status, (await res.text()) || res.statusText)
  if (res.status === 204) return undefined as T
  return (res.headers.get('content-type')?.includes('json') ? res.json() : res.text()) as Promise<T>
}

export const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e))
