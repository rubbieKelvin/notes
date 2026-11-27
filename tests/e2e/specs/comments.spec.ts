import { expect, openEditor, signUp, test, typeInEditor, type Page } from '../support/fixtures'

const panel = (p: Page) => p.getByRole('complementary', { name: 'Comments' })

async function comment(p: Page, text: string) {
  await panel(p).getByRole('textbox', { name: 'Comment' }).fill(text)
  await panel(p).locator('form').getByRole('button', { name: /^(Comment|Reply)$/ }).click()
  await expect(panel(p)).toContainText(text)
}

test('people with view access comment, reply and react; the owner moderates and can turn comments off', async ({ page, browser, user: _ }) => {
  const docId = await openEditor(page)
  await typeInEditor(page, 'Plan.')
  const ctx = await browser.newContext()
  const viewer = await signUp(ctx)
  expect((await page.request.post(`/v1/docs/${docId}/shares`, { data: { email: viewer, role: 'view' } })).status()).toBe(200)

  const v = await ctx.newPage()
  await v.goto(`/d/${docId}`)
  await v.getByRole('button', { name: /^Comments/ }).click()
  await comment(v, 'Looks good to me')
  const first = panel(v).locator('[data-comment]').first()
  await first.getByRole('button', { name: 'Add reaction' }).click()
  await v.getByRole('button', { name: 'React 🎉' }).click()
  await expect(first.getByRole('button', { name: '🎉 1' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: /^Comments/ }).click()
  await expect(panel(page)).toContainText('Looks good to me')
  await panel(page).getByRole('button', { name: 'Reply' }).click()
  await comment(page, 'Thanks!')
  await expect(panel(page).locator('[data-reply]')).toContainText('Thanks!')
  await expect(panel(page).getByRole('button', { name: '🎉 1' })).toHaveAttribute('aria-pressed', 'false') // someone else's

  // the viewer may delete only their own comment; the owner may delete anyone's (replies go with it)
  await v.reload()
  await v.getByRole('button', { name: /^Comments/ }).click()
  await expect(panel(v).getByRole('button', { name: /^Delete comment by/ })).toHaveCount(1)
  await panel(page).getByRole('button', { name: /^Delete comment by/ }).first().click()
  await expect(panel(page).locator('[data-comment]')).toHaveCount(0)

  // turned off: nobody else sees the thread or can post
  await panel(page).getByRole('switch', { name: 'Allow comments' }).click()
  await v.reload()
  await expect(v.getByRole('button', { name: /^Comments/ })).toHaveCount(0)
  const blocked = await v.request.post(`/v1/docs/${docId}/comments`, { data: { body: 'sneaky' } })
  expect(blocked.status()).toBe(403)
  await ctx.close()
})

test('public notes: guests comment with a name but cannot react; signed-in readers react to the note', async ({ page, browser, user: _ }) => {
  const docId = await openEditor(page)
  await typeInEditor(page, 'Hello world.')
  const username = (await (await page.request.get('/v1/me')).json()).username
  // private: strangers get nothing
  const anonCtx = await browser.newContext()
  expect((await anonCtx.request.get(`/v1/docs/${docId}/comments`)).status()).toBe(404)
  await page.request.put(`/v1/docs/${docId}/public`, { data: { public: true } })

  const anon = await anonCtx.newPage()
  await anon.goto(`/public/@${username}/${docId}`)
  await anon.getByRole('button', { name: /^Comments/ }).click()
  await panel(anon).getByRole('textbox', { name: 'Your name' }).fill('Ada')
  await comment(anon, 'Great read')
  await expect(panel(anon)).toContainText('guest')
  await expect(panel(anon).getByRole('button', { name: 'Add reaction' })).toHaveCount(0)
  expect((await anonCtx.request.post(`/v1/docs/${docId}/reactions`, { data: { emoji: '👍' } })).status()).toBe(401)

  // guest clicking a note reaction is sent to sign in, and comes back
  await anon.getByRole('group', { name: 'Reactions' }).getByRole('button', { name: '❤️ 0' }).click()
  await expect(anon).toHaveURL(/\/signin\?next=/)

  const readerCtx = await browser.newContext()
  await signUp(readerCtx)
  const reader = await readerCtx.newPage()
  await reader.goto(`/public/@${username}/${docId}`)
  const reactions = reader.getByRole('group', { name: 'Reactions' })
  await reactions.getByRole('button', { name: '❤️ 0' }).click()
  await expect(reactions.getByRole('button', { name: '❤️ 1' })).toHaveAttribute('aria-pressed', 'true')
  await reactions.getByRole('button', { name: '❤️ 1' }).click() // toggles off
  await expect(reactions.getByRole('button', { name: '❤️ 0' })).toBeVisible()

  // signed-in readers of a public note can react to comments too
  await reader.getByRole('button', { name: /^Comments/ }).click()
  await panel(reader).getByRole('button', { name: 'Add reaction' }).first().click()
  await reader.getByRole('button', { name: 'React 👍' }).click()
  await expect(panel(reader).getByRole('button', { name: '👍 1' })).toBeVisible()
  await anonCtx.close()
  await readerCtx.close()
})

test('guest comments need a name and are rate-limited', async ({ page, browser, user: _ }) => {
  const docId = await openEditor(page)
  await page.request.put(`/v1/docs/${docId}/public`, { data: { public: true } })
  const anon = await browser.newContext()
  const post = (data: object) => anon.request.post(`/v1/docs/${docId}/comments`, { data, headers: { 'x-real-ip': `203.0.113.${Math.floor(Math.random() * 250)}` } })
  expect((await post({ body: 'no name' })).status()).toBe(400)
  const ip = { 'x-real-ip': '198.51.100.7' }
  const statuses = []
  for (let i = 0; i < 6; i++) statuses.push((await anon.request.post(`/v1/docs/${docId}/comments`, { data: { body: `c${i}`, guest_name: 'Bot' }, headers: ip })).status())
  expect(statuses).toEqual([201, 201, 201, 201, 201, 429])
  await anon.close()
})
