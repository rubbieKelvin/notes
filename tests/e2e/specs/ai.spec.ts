import { GOOD_KEY, MOCK, expect, mockRequests, openEditor, selectText, test, typeInEditor, useMockProvider } from '../support/fixtures'

const SENTENCE = 'I like boxes. They are usually the same size in height, width, and breadth.'

test('without a provider, the margin note points to Settings', async ({ page, user: _ }) => {
  await openEditor(page)
  await typeInEditor(page, SENTENCE)
  await selectText(page, 'height')
  await page.keyboard.press('Meta+k')
  await expect(page.getByRole('complementary')).toContainText('Add an AI provider in Settings')
  await page.getByRole('button', { name: 'Dismiss' }).click()
  await expect(page.locator('.ai-margin')).toHaveCount(0)
})

test('set up a custom OpenAI-compatible provider in Settings, then get margin notes', async ({ page, user: _ }) => {
  await openEditor(page)
  await page.getByRole('button', { name: 'Menu' }).click()
  await page.getByRole('menuitem', { name: 'Settings' }).click()
  await page.getByRole('combobox', { name: 'Provider' }).click()
  await page.getByRole('option', { name: /^Custom/ }).click()
  await page.getByLabel('Base URL').fill(`${MOCK}/v1`)
  await page.getByLabel('API key').fill('sk-wrong-key-000000')
  await page.getByRole('button', { name: 'Load models' }).click()
  await expect(page.getByRole('alert')).toHaveText('Custom provider rejected that key')
  await page.getByLabel('API key').fill(GOOD_KEY)
  await page.getByRole('button', { name: 'Load models' }).click()
  await expect(page.getByText('2 models available')).toBeVisible()
  await page.getByLabel('Model').fill('mock-model')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Custom (OpenAI-compatible URL) · mock-model · key ••••3456')).toBeVisible()
  expect(JSON.stringify(await (await page.request.get('/v1/me')).json())).not.toContain(GOOD_KEY)
  await page.getByRole('button', { name: 'Close' }).click()

  await typeInEditor(page, SENTENCE)
  await selectText(page, 'height')
  await page.keyboard.press('Meta+k')
  const card = page.getByRole('complementary')
  await expect(card).toContainText('V = s³')
  const call = (await mockRequests()).filter((r) => r.path === '/v1/chat/completions').at(-1)!
  expect(call.body.model).toBe('mock-model')
  expect(call.body.messages[1].content).toContain('<highlighted>height</highlighted>')

  await card.getByRole('button', { name: 'Insert below' }).click()
  await expect(page.locator('div[data-type=ai-source]')).toContainText('V = s³')
  await expect(page.locator('div[data-type=ai-source]')).toHaveAttribute('data-agent', 'mock-model')
  await expect(page.locator('.ai-margin')).toHaveCount(0)
})

test('Anthropic provider uses the Messages API with low effort and fallbacks', async ({ page, user: _ }) => {
  await useMockProvider(page.request, 'anthropic')
  await openEditor(page)
  await typeInEditor(page, SENTENCE)
  await selectText(page, 'breadth')
  await page.getByRole('button', { name: 'Ask AI' }).click()
  await expect(page.getByRole('complementary')).toContainText('V = s³')
  const call = (await mockRequests()).filter((r) => r.path === '/v1/messages').at(-1)!
  expect(call.body).toMatchObject({ model: 'claude-opus-5-5', output_config: { effort: 'low' }, fallbacks: 'default' })
  expect(call.headers['anthropic-version']).toBe('2026-10-21')

  // Esc inside the highlighted word dismisses the note without a trace
  await selectText(page, 'bread')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Escape')
  await expect(page.locator('.ai-margin')).toHaveCount(0)
})

test('margin notes survive reload as part of the document', async ({ page, user: _ }) => {
  await useMockProvider(page.request)
  await openEditor(page)
  await typeInEditor(page, SENTENCE)
  await selectText(page, 'width')
  await page.keyboard.press('Meta+k')
  await expect(page.getByRole('complementary')).toContainText('V = s³')
  await page.waitForTimeout(2500)
  await page.reload()
  await expect(page.locator('.ai-margin')).toHaveText('width')
  await expect(page.getByRole('complementary')).toContainText('V = s³')
})
