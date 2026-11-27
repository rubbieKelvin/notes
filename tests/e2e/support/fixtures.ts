import { test as base, expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test'
import { readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export { expect }
export type { Page }
export const MOCK = `http://127.0.0.1:${process.env.MOCK_AI_PORT ?? 19999}`
export const GOOD_KEY = 'sk-good-key-123456'

export const uniqueEmail = (tag = 'u') => `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`

type Mail = { file: string; to: string[]; subject: string; html: string; text: string | null }
const mailDir = join(tmpdir(), 'opennotes-e2e-mail')

/** Emails to `to` written by the server's `fs` driver, oldest first. */
function inbox(to: string): Mail[] {
  let files: string[] = []
  try { files = readdirSync(mailDir).filter((f) => f.endsWith('.json')).sort() } catch { return [] }
  return files.flatMap((file) => {
    try {
      const m = JSON.parse(readFileSync(join(mailDir, file), 'utf8'))
      return m.to.includes(to) ? [{ ...m, file }] : []
    } catch { return [] } // half-written
  })
}

/** Waits for the next email to `to` whose subject matches, and removes it so later calls see only newer mail. */
export async function nextMail(to: string, subject: RegExp): Promise<Mail> {
  let mail: Mail | undefined
  await expect.poll(() => (mail = inbox(to).find((m) => subject.test(m.subject))), { message: `email to ${to} matching ${subject}` }).toBeTruthy()
  rmSync(join(mailDir, mail!.file), { force: true })
  return mail!
}

const SIGN_IN = /sign-in code/

/** Asks for a sign-in email and returns its link. */
export async function requestLink(request: APIRequestContext, email: string) {
  for (const m of inbox(email)) rmSync(join(mailDir, m.file), { force: true }) // only the email this call triggers
  const res = await request.post('/v1/auth/link', { data: { email } })
  expect(res.status(), await res.text()).toBe(204)
  return (await nextMail(email, SIGN_IN)).text!.match(/https?:\/\/\S+#signin=\S+/)![0]
}

/** The 6-digit code from the next sign-in email to `email`. Call after the email is requested. */
export async function latestCode(email: string) {
  return (await nextMail(email, SIGN_IN)).subject.match(/^(\d{6}) /)![1]
}

export const linkToken = (link: string) => new URLSearchParams(new URL(link).hash.slice(1)).get('signin')!

/** Signs `context` in through a magic link, creating the account on first use. */
export async function signUp(context: BrowserContext, email = uniqueEmail()) {
  const token = linkToken(await requestLink(context.request, email))
  const res = await context.request.post('/v1/auth/verify', { data: { token } })
  expect(res.status(), await res.text()).toBe(200)
  return email
}

/** Fills and confirms the in-app prompt dialog (LaTeX, clip links, …). */
export async function answerPrompt(page: Page, text: string) {
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('textbox') })
  await dialog.getByRole('textbox').fill(text)
  await dialog.locator('button[type=submit]').click()
  await expect(dialog).toBeHidden()
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

/** Sets the open note's title (and description) through the pencil dialog. */
export async function setNoteDetails(page: Page, title: string, description?: string) {
  await page.getByRole('button', { name: 'Edit title and description' }).click()
  const dialog = page.getByRole('dialog', { name: 'Note details' })
  await dialog.getByLabel('Title').fill(title)
  if (description !== undefined) await dialog.getByLabel('Description').fill(description)
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(dialog).toBeHidden()
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
