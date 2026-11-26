import { test as base, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test'

export { expect }
export type { Page }
export const MOCK = `http://127.0.0.1:${process.env.MOCK_AI_PORT ?? 19999}`
export const GOOD_KEY = 'sk-good-key-123456'
export const PASSWORD = 'correct horse battery'

export const uniqueEmail = (tag = 'u') => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

export async function signUp(context: BrowserContext, email = uniqueEmail()) {
  const res = await context.request.post('/v1/auth/signup', { data: { email, password: PASSWORD } })
  expect(res.status(), await res.text()).toBe(200)
  return email
}

/** Point the signed-in user at the mock provider (OpenAI-compatible "custom" or Anthropic). */
export async function useMockProvider(request: APIRequestContext, provider: 'custom' | 'anthropic' = 'custom') {
  const data = provider === 'custom'
    ? { provider, base_url: `${MOCK}/v1`, key: GOOD_KEY, model: 'mock-vision' }
    : { provider, key: GOOD_KEY, model: 'claude-opus-5-5' }
  const res = await request.put('/v1/settings/ai', { data })
  expect(res.status(), await res.text()).toBe(200)
}

export async function createToken(request: APIRequestContext, scopes: string[]) {
  const res = await request.post('/v1/tokens', { data: { name: `e2e ${scopes.join('+')}`, scopes } })
  expect(res.status()).toBe(201)
  return (await res.json()).token as string
}

/** Opens the app and returns the current document id. */
export async function openEditor(page: Page, path = '/') {
  await page.goto(path)
  await page.locator('.ProseMirror').waitFor()
  return new URL(page.url()).pathname.split('/')[2]
}

export async function typeInEditor(page: Page, text: string) {
  await page.locator('.ProseMirror').click()
  await page.keyboard.type(text)
}

/** Selects the first occurrence of `word` in the editor. */
export async function selectText(page: Page, word: string) {
  await page.locator('.ProseMirror').focus()
  await page.evaluate((w) => {
    const walker = document.createTreeWalker(document.querySelector('.ProseMirror')!, NodeFilter.SHOW_TEXT)
    while (walker.nextNode()) {
      const n = walker.currentNode as Text
      const i = n.data.indexOf(w)
      if (i < 0) continue
      const r = document.createRange()
      r.setStart(n, i)
      r.setEnd(n, i + w.length)
      getSelection()!.removeAllRanges()
      getSelection()!.addRange(r)
      return
    }
    throw new Error(`text not found: ${w}`)
  }, word)
}

export async function slash(page: Page, command: string) {
  await page.keyboard.type(`/${command}`)
  await expect(page.getByRole('listbox')).toBeVisible()
  await page.keyboard.press('Enter')
}

export async function mockRequests(): Promise<Array<{ method: string; path: string; anthropic: boolean; headers: Record<string, string>; body: any }>> {
  return (await fetch(`${MOCK}/__requests`)).json()
}

/** Every test gets a fresh signed-in user. */
export const test = base.extend<{ user: string }>({
  user: async ({ context }, use) => use(await signUp(context)),
})
