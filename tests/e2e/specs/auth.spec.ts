import { expect, linkToken, openEditor, requestLink, signUp, test, uniqueEmail } from '../support/fixtures'

test('the emailed link signs in and lands on a blank, focused page', async ({ page }) => {
  const email = uniqueEmail('signin')
  await page.goto('/')
  await expect(page.getByLabel('Password')).toHaveCount(0)
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Email me a sign-in link' }).click()
  await expect(page.getByRole('status')).toContainText(`We sent a sign-in link to ${email}`)
  await page.goto(await requestLink(page.request, email))
  await expect(page.locator('.ProseMirror')).toBeFocused()
  expect(new URL(page.url()).pathname).toMatch(/^\/d\/[0-9a-f-]{36}$/)
  expect(page.url()).not.toContain('signin=') // token is scrubbed from the address bar
})

test('links work once, and the same address keeps the same account', async ({ context, request }) => {
  const email = await signUp(context)
  const link = await requestLink(request, email)
  expect((await request.post('/v1/auth/verify', { data: { token: linkToken(link) } })).status()).toBe(200)
  const reused = await request.post('/v1/auth/verify', { data: { token: linkToken(link) } })
  expect(reused.status()).toBe(401)
  expect(await reused.text()).toMatch(/expired or was already used/)
  expect((await request.post('/v1/auth/verify', { data: { token: 'not-a-token' } })).status()).toBe(401)
  expect((await (await request.get('/v1/me')).json()).email).toBe(email)
})

test('a used link shows an error on the sign-in screen', async ({ page }) => {
  const email = uniqueEmail('reuse')
  const link = await requestLink(page.request, email)
  expect((await page.request.post('/v1/auth/verify', { data: { token: linkToken(link) } })).status()).toBe(200)
  await page.request.post('/v1/auth/logout')
  await page.goto(link)
  await expect(page.getByRole('alert')).toContainText('expired or was already used')
})

test('rejects bad addresses and throttles sign-in emails per address', async ({ request }) => {
  expect((await request.post('/v1/auth/link', { data: { email: 'not-an-email' } })).status()).toBe(400)
  const email = uniqueEmail('flood')
  for (let i = 0; i < 5; i++) expect((await request.post('/v1/auth/link', { data: { email } })).status()).toBe(204)
  const limited = await request.post('/v1/auth/link', { data: { email } })
  expect(limited.status()).toBe(429)
  expect(await limited.text()).toMatch(/try again in \d+ minutes/)
})

test('sign out ends the session', async ({ page, user }) => {
  await openEditor(page)
  await page.getByRole('button', { name: 'Account' }).click()
  await expect(page.getByRole('menu').getByText(user)).toBeVisible()
  await page.getByRole('menuitem', { name: 'Sign out' }).click()
  await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toBeVisible()
  expect((await page.request.get('/v1/me')).status()).toBe(401)
})

test('deleting a page asks first, in the app', async ({ page, user: _ }) => {
  await openEditor(page)
  await page.getByRole('button', { name: 'Delete this page' }).click()
  const dialog = page.getByRole('alertdialog', { name: /^Delete/ })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(dialog).toBeHidden()
  expect(await (await page.request.get('/v1/docs')).json()).toHaveLength(1)
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
