import { expect, latestCode, linkToken, openEditor, requestLink, signUp, test, uniqueEmail } from '../support/fixtures'

test('the emailed link signs in and lands on a blank, focused page', async ({ page }) => {
  const email = uniqueEmail('signin')
  await page.goto('/')
  await expect(page.getByLabel('Password')).toHaveCount(0)
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Email me a sign-in code' }).click()
  await expect(page.getByRole('status')).toContainText('Check your email')
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
  await expect(page.getByRole('button', { name: 'Email me a sign-in code' })).toBeVisible()
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

test('settings: profile name shows on the avatar; other devices can be signed out', async ({ page, browser, user }) => {
  await openEditor(page)
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('tab', { name: 'Profile', selected: true })).toBeVisible()
  await expect(dialog).toContainText(user)
  await dialog.getByLabel('Display name').fill('Zora Neale')
  await dialog.getByRole('button', { name: 'Save profile' }).click()
  await expect(page.getByText('Profile saved')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Account' })).toHaveText('Z')
  expect((await (await page.request.get('/v1/me')).json()).name).toBe('Zora Neale')

  // a second device, then end it from Account
  const other = await browser.newContext()
  await signUp(other, user)
  await page.reload()
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await page.getByRole('tab', { name: 'Account' }).click()
  await expect(page.getByRole('dialog')).toContainText('Signed in on 2 devices')
  await page.getByRole('button', { name: 'Sign out other devices' }).click()
  await expect(page.getByText('Signed out of 1 other device')).toBeVisible()
  expect((await other.request.get('/v1/me')).status()).toBe(401)
  expect((await page.request.get('/v1/me')).status()).toBe(200)
  await other.close()
})

test('settings: deleting the account needs the email typed and removes everything', async ({ page, user }) => {
  await openEditor(page)
  await page.getByRole('button', { name: 'Account' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await page.getByRole('tab', { name: 'Account' }).click()
  await page.getByRole('button', { name: 'Delete account…' }).click()
  const confirm = page.getByRole('alertdialog', { name: 'Delete your account?' }).or(page.getByRole('dialog', { name: 'Delete your account?' }))
  await confirm.getByRole('textbox').fill('wrong@example.com')
  await expect(confirm.getByRole('button', { name: 'Delete account' })).toBeDisabled()
  await confirm.getByRole('textbox').fill(user)
  await confirm.getByRole('button', { name: 'Delete account' }).click()
  await expect(page.getByRole('button', { name: 'Email me a sign-in code' })).toBeVisible()
  expect((await page.request.get('/v1/me')).status()).toBe(401)
})

test('the emailed code signs in on the same page; wrong codes are refused', async ({ page }) => {
  const email = uniqueEmail('code')
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Email me a sign-in code' }).click()
  const code = await latestCode(email)
  const wrong = String((Number(code) + 1) % 1_000_000).padStart(6, '0')
  await page.getByLabel('Sign-in code').fill(wrong)
  await expect(page.getByRole('alert')).toContainText('wrong or has expired')
  await page.getByLabel('Sign-in code').fill(code) // six digits submit on their own
  await expect(page.locator('.ProseMirror')).toBeVisible()
  expect((await (await page.request.get('/v1/me')).json()).username).toBe(email.split('@')[0].replace(/[^a-z0-9_]/g, ''))
})

test('a code stops working after five wrong guesses', async ({ request }) => {
  const email = uniqueEmail('guess')
  await request.post('/v1/auth/link', { data: { email } })
  const code = await latestCode(email)
  for (let i = 0; i < 5; i++) {
    expect((await request.post('/v1/auth/code', { data: { email, code: '000000' === code ? '111111' : '000000' } })).status()).toBe(401)
  }
  expect((await request.post('/v1/auth/code', { data: { email, code } })).status()).toBe(401)
})
