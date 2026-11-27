export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export type AiSettings = { provider: string; base_url: string | null; model: string; key_hint: string | null }
export type Me = { email: string; name: string; username: string; created_at: string; sessions: number; ai: AiSettings | null }
/** What to call the user: their display name, else the part of their email before the @. */
export const displayName = (me: Me) => me.name || me.email.split('@')[0]
export type Role = 'owner' | 'edit' | 'view'
export type DocInfo = {
  id: string; title: string; description: string; mcp_exposed_slug: string | null; is_public: boolean; updated_at: string
  role: Role; owner_name: string; owner_username: string | null
  /** The signed-in user's own tags for the note. */
  tags: string[]
}

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
