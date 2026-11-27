import { createToken, expect, openEditor, test } from '../support/fixtures'

test('ingest webhook enforces token scopes and validates input', async ({ context, user: _ }) => {
  const request = context.request
  const ingest = await createToken(request, ['ingest'])
  const mcpOnly = await createToken(request, ['mcp'])
  const post = (token: string, data: object) => request.post('/v1/notes/ingest', { data, headers: { authorization: `Bearer ${token}` } })
  expect((await post(ingest, { content_md: 'trace', agent_id: 'ci' })).status()).toBe(201)
  expect((await post(mcpOnly, { content_md: 'x' })).status()).toBe(403)
  expect((await post('on_not-a-token', { content_md: 'x' })).status()).toBe(401)
  expect((await post(ingest, { content_md: '   ' })).status()).toBe(400)
})

test('inbox items can be rewritten, inserted, dragged in, or dismissed', async ({ page, user: _ }) => {
  const token = await createToken(page.request, ['ingest'])
  for (const [title, body, source] of [['Trace', 'NullPointerException at Foo.bar', 'javascript:alert(1)'], ['Hook', 'Boxes everywhere at 0:14', null], ['Drag me', 'Dragged text', null], ['Noise', 'ignore me', null]]) {
    const res = await page.request.post('/v1/notes/ingest', { data: { title, content_md: body, agent_id: 'bot', source_uri: source }, headers: { authorization: `Bearer ${token}` } })
    expect(res.status()).toBe(201)
  }
  await openEditor(page)
  const pill = page.getByRole('button', { name: /^\d+ AI$/ })
  await expect(pill).toHaveText('4 AI')
  await pill.click()
  const dialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'AI inbox' }) })
  await expect(dialog.locator('a')).toHaveCount(0) // javascript: source links are never rendered

  await dialog.locator('article', { hasText: 'Trace' }).getByRole('button', { name: 'Rewrite-to-Own' }).click()
  await expect(page.locator('div[data-type=ai-source][data-provenance=human_edited]')).toContainText('NullPointerException')

  await pill.click()
  await dialog.locator('article', { hasText: 'Hook' }).getByRole('button', { name: 'Insert' }).click()
  await expect(page.locator('div[data-type=ai-source][data-provenance=ai_agent]')).toContainText('Boxes everywhere')

  await pill.click()
  await dialog.locator('article', { hasText: 'Noise' }).getByRole('button', { name: 'Dismiss' }).click()
  await expect(pill).toHaveText('1 AI')

  // Dismiss keeps the inbox open for triage
  await dialog.locator('article', { hasText: 'Drag me' }).dragTo(page.locator('.ProseMirror > p').last())
  await expect(page.locator('.ProseMirror > div[data-type=ai-source]', { hasText: 'Dragged text' })).toHaveCount(1)
  await expect(pill).toHaveCount(0)
  expect(await (await page.request.get('/v1/inbox')).json()).toEqual([])
})
