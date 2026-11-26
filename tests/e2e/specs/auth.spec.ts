import { PASSWORD, expect, openEditor, signUp, test, uniqueEmail } from '../support/fixtures'

test('sign up lands on a blank, focused page', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Create an account/ }).click()
  await page.getByLabel('Email').fill(uniqueEmail('signup'))
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.locator('.ProseMirror')).toBeFocused()
  expect(new URL(page.url()).pathname).toMatch(/^\/d\/[0-9a-f-]{36}$/)
})

test('rejects duplicate sign-ups and wrong passwords', async ({ context, request }) => {
  const email = await signUp(context)
  expect((await request.post('/v1/auth/signup', { data: { email, password: 'another one' } })).status()).toBe(409)
  expect((await request.post('/v1/auth/login', { data: { email, password: 'wrong password' } })).status()).toBe(401)
  expect((await request.post('/v1/auth/login', { data: { email: uniqueEmail('nobody'), password: PASSWORD } })).status()).toBe(401)
  expect((await request.post('/v1/auth/login', { data: { email, password: PASSWORD } })).status()).toBe(200)
})

test('locks an email after 5 failed logins, even for the right password', async ({ context, request }) => {
  const email = await signUp(context)
  for (let i = 0; i < 5; i++) expect((await request.post('/v1/auth/login', { data: { email, password: 'nope-nope' } })).status()).toBe(401)
  expect((await request.post('/v1/auth/login', { data: { email, password: 'nope-nope' } })).status()).toBe(429)
  const locked = await request.post('/v1/auth/login', { data: { email, password: PASSWORD } })
  expect(locked.status()).toBe(429)
  expect(await locked.text()).toMatch(/try again in \d+ minutes/)
})

test('sign out ends the session', async ({ page, user }) => {
  await openEditor(page)
  await page.getByRole('button', { name: 'Menu' }).click()
  await expect(page.getByText(user)).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  expect((await page.request.get('/v1/me')).status()).toBe(401)
})

test("users can't reach each other's pages", async ({ page, user: _, browser }) => {
  const docId = await openEditor(page)
  const other = await browser.newContext()
  await signUp(other)
  expect((await other.request.delete(`/v1/docs/${docId}`)).status()).toBe(404)
  expect((await other.request.put(`/v1/docs/${docId}/mcp`, { data: { enabled: true } })).status()).toBe(404)
  expect(await (await other.request.get('/v1/docs')).json()).toEqual([])
  const otherPage = await other.newPage()
  await otherPage.goto('/health')
  const ws = await otherPage.evaluate((u) => new Promise((done) => {
    const s = new WebSocket(u)
    s.onopen = () => done('open')
    s.onerror = () => done('rejected')
  }), `${new URL(page.url()).origin.replace('http', 'ws')}/v1/sync/${docId}`)
  expect(ws).toBe('rejected')
  await other.close()
})
