import { expect, mockRequests, openEditor, slash, test, typeInEditor, useMockProvider, type Page } from '../support/fixtures'

async function addCanvas(page: Page) {
  await typeInEditor(page, 'Intro')
  await page.keyboard.press('Enter')
  await slash(page, 'canvas')
  await page.locator('.tl-container').waitFor()
  return (await page.locator('.tl-container').boundingBox())!
}

test('draw, expand, collapse, and keep the drawing after reload', async ({ page, user: _ }) => {
  await openEditor(page)
  const box = await addCanvas(page)
  await page.mouse.click(box.x + 50, box.y + 50)
  await page.keyboard.press('r')
  await page.mouse.move(box.x + 100, box.y + 100)
  await page.mouse.down()
  await page.mouse.move(box.x + 250, box.y + 200, { steps: 5 })
  await page.mouse.up()
  await expect(page.locator('.tl-shape')).toHaveCount(1)

  await page.keyboard.press('Meta+Shift+E')
  await expect.poll(async () => (await page.locator('.tl-container').boundingBox())?.height).toBe(900)
  await page.keyboard.press('Escape') // deselect
  await page.keyboard.press('Escape') // collapse
  await expect.poll(async () => (await page.locator('.tl-container').boundingBox())?.height).toBeLessThan(500)

  await page.waitForTimeout(2500)
  await page.reload()
  await expect(page.locator('.tl-shape')).toHaveCount(1)
})

test('LaTeX math shapes render and sync live between tabs', async ({ page, context, user: _ }) => {
  page.on('dialog', (d) => d.accept('A = 6s^2'))
  await openEditor(page)
  await addCanvas(page)
  await page.getByRole('button', { name: '∑ Math' }).click()
  await expect(page.locator('.tl-container .katex')).toHaveCount(1)

  const second = await context.newPage()
  second.on('dialog', (d) => d.accept('x^2'))
  await second.goto(page.url())
  await expect(second.locator('.tl-container .katex')).toHaveCount(1)
  await second.getByRole('button', { name: '∑ Math' }).click()
  await expect(page.locator('.tl-container .katex')).toHaveCount(2) // no tab overwrote the other
  await expect(second.locator('.tl-container .katex')).toHaveCount(2)
})

test('AI Annotate sends the selection as an image and pins a note beside it', async ({ page, user: _ }) => {
  await useMockProvider(page.request)
  page.on('dialog', (d) => d.accept('A = 6s^2'))
  await openEditor(page)
  const box = await addCanvas(page)
  await page.getByRole('button', { name: '∑ Math' }).click()
  const annotate = page.getByRole('button', { name: 'AI Annotate' })
  await expect(annotate).toBeDisabled()
  await page.mouse.click(box.x + 30, box.y + 120)
  await page.keyboard.press('Meta+a')
  await expect(annotate).toBeEnabled()
  await annotate.click()
  await expect(page.locator('.tl-shape[data-shape-type=note]')).toContainText('A = 6s² is a cube’s surface area')
  const sent = (await mockRequests()).filter((r) => r.path === '/v1/chat/completions' && JSON.stringify(r.body).includes('image_url'))
  expect(sent.at(-1)!.body.messages[1].content[1].image_url.url).toMatch(/^data:image\/jpeg;base64,/)
})
