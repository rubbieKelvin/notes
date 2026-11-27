import { answerPrompt, expect, mockRequests, openEditor, slash, test, typeInEditor, useMockProvider, type Page } from '../support/fixtures'

const canvasEl = (page: Page) => page.locator('[data-canvas]')
/** Shapes on the canvas itself (not the minimap or someone's in-progress draft). */
const shapes = (page: Page, type?: string) => page.locator(`[data-canvas] > svg > g > [data-shape-id]${type ? `[data-shape-type=${type}]` : ''}`)

async function addCanvas(page: Page) {
  await typeInEditor(page, 'Intro')
  await page.keyboard.press('Enter')
  await slash(page, 'canvas')
  await canvasEl(page).waitFor()
  return (await canvasEl(page).boundingBox())!
}

async function drag(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  await page.mouse.move(to.x, to.y, { steps: 6 })
  await page.mouse.up()
}

test('draw, expand, collapse, and keep the drawing after reload', async ({ page, user: _ }) => {
  await openEditor(page)
  const box = await addCanvas(page)
  await page.mouse.click(box.x + 50, box.y + 50)
  await page.keyboard.press('r')
  await drag(page, { x: box.x + 100, y: box.y + 100 }, { x: box.x + 250, y: box.y + 200 })
  await expect(shapes(page, 'rect')).toHaveCount(1)

  await page.keyboard.press('Meta+Shift+E')
  await expect.poll(async () => (await canvasEl(page).boundingBox())?.height).toBe(900)
  await expect(page.locator('[data-minimap]')).toBeVisible()
  await page.keyboard.press('Escape') // deselect
  await page.keyboard.press('Escape') // collapse
  await expect.poll(async () => (await canvasEl(page).boundingBox())?.height).toBeLessThan(500)

  await page.waitForTimeout(2500)
  await page.reload()
  await expect(shapes(page, 'rect')).toHaveCount(1)
})

test('two tabs drawing at once both keep their shapes, and math syncs live', async ({ page, context, user: _ }) => {
  await openEditor(page)
  const box = await addCanvas(page)
  const second = await context.newPage()
  await second.goto(page.url())
  const box2 = (await canvasEl(second).boundingBox())!

  await page.mouse.click(box.x + 20, box.y + 300)
  await page.keyboard.press('r')
  await second.mouse.click(box2.x + 20, box2.y + 300)
  await second.keyboard.press('o')
  // Interleave the two gestures so both edits are in flight together.
  await page.mouse.move(box.x + 60, box.y + 60); await page.mouse.down()
  await second.mouse.move(box2.x + 300, box2.y + 60); await second.mouse.down()
  await page.mouse.move(box.x + 160, box.y + 160, { steps: 4 })
  await second.mouse.move(box2.x + 400, box2.y + 160, { steps: 4 })
  await page.mouse.up()
  await second.mouse.up()
  for (const p of [page, second]) {
    await expect(shapes(p, 'rect')).toHaveCount(1)
    await expect(shapes(p, 'ellipse')).toHaveCount(1)
  }

  await page.getByRole('button', { name: 'Math' }).click()
  await answerPrompt(page, 'A = 6s^2')
  await expect(second.locator('[data-canvas] .katex')).toHaveCount(1)
})

test('a pen stroke uses pressure and renders as a filled path', async ({ page, user: _ }) => {
  await openEditor(page)
  const box = await addCanvas(page)
  await page.mouse.click(box.x + 20, box.y + 300)
  await page.keyboard.press('d')
  await page.evaluate(({ x, y }) => {
    const el = document.querySelector('[data-canvas]')!
    const fire = (type: string, i: number, pressure: number) =>
      el.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: 'pen', isPrimary: true, button: 0, buttons: 1, pressure, clientX: x + i * 10, clientY: y + i * 3 }))
    fire('pointerdown', 0, 0.2)
    for (let i = 1; i <= 15; i++) fire('pointermove', i, 0.2 + i * 0.05)
    fire('pointerup', 15, 0)
  }, { x: box.x + 60, y: box.y + 80 })
  await expect(shapes(page, 'draw')).toHaveCount(1)
  expect(await shapes(page, 'draw').locator('path').getAttribute('d')).toMatch(/^M[\d.-]+,[\d.-]+Q.+Z$/)
})

test('an arrow stays attached when its shape moves', async ({ page, user: _ }) => {
  await openEditor(page)
  const box = await addCanvas(page)
  await page.mouse.click(box.x + 20, box.y + 300)
  await page.keyboard.press('r')
  await drag(page, { x: box.x + 300, y: box.y + 100 }, { x: box.x + 400, y: box.y + 200 })
  await page.keyboard.press('a')
  await drag(page, { x: box.x + 60, y: box.y + 150 }, { x: box.x + 350, y: box.y + 150 })
  const line = shapes(page, 'arrow').locator('line')
  const end = async () => [Number(await line.getAttribute('x2')), Number(await line.getAttribute('y2'))]
  const [x0, y0] = await end()

  await page.keyboard.press('v')
  await drag(page, { x: box.x + 380, y: box.y + 120 }, { x: box.x + 380, y: box.y + 220 }) // move the rectangle down
  await expect.poll(async () => (await end())[1]).toBeGreaterThan(y0 + 40)
  expect((await end())[0]).toBeLessThanOrEqual(x0 + 1) // still meets the box edge
})

test('the eraser removes strokes it passes over', async ({ page, user: _ }) => {
  await openEditor(page)
  const box = await addCanvas(page)
  await page.mouse.click(box.x + 20, box.y + 300)
  await page.keyboard.press('d')
  await drag(page, { x: box.x + 100, y: box.y + 150 }, { x: box.x + 300, y: box.y + 150 })
  await expect(shapes(page, 'draw')).toHaveCount(1)
  await page.keyboard.press('e')
  await drag(page, { x: box.x + 200, y: box.y + 100 }, { x: box.x + 200, y: box.y + 200 })
  await expect(shapes(page, 'draw')).toHaveCount(0)
  await page.keyboard.press('Meta+z')
  await expect(shapes(page, 'draw')).toHaveCount(1)
})

// 2×2 red PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGP4z8AARAwQCgAf7gP9i18U1AAAAABJRU5ErkJggg==', 'base64')

test('an uploaded image is still there after reload, and the canvas exports to PNG', async ({ page, user: _ }) => {
  await openEditor(page)
  await addCanvas(page)
  await page.locator('[data-canvas] input[type=file]').setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: PNG })
  await expect(shapes(page, 'image')).toHaveCount(1)
  const src = await shapes(page, 'image').locator('image').getAttribute('href')
  expect(src).toMatch(/^\/v1\/assets\//)
  expect((await page.request.get(src!)).headers()['content-type']).toBe('image/png')

  await page.waitForTimeout(2500)
  await page.reload()
  await expect(shapes(page, 'image')).toHaveCount(1)

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export' }).click()
  await page.getByRole('menuitem', { name: 'PNG image' }).click()
  expect((await download).suggestedFilename()).toBe('canvas.png')
})

test('AI Annotate sends the selection as an image and pins a note beside it', async ({ page, user: _ }) => {
  await useMockProvider(page.request)
  await openEditor(page)
  const box = await addCanvas(page)
  await page.getByRole('button', { name: 'Math' }).click()
  await answerPrompt(page, 'A = 6s^2')
  const annotate = page.getByRole('button', { name: 'AI Annotate' })
  await page.mouse.click(box.x + 10, box.y + 300) // empty spot: clears the selection
  await expect(annotate).toBeDisabled()
  await page.keyboard.press('Meta+a')
  await expect(annotate).toBeEnabled()
  await annotate.click()
  await expect(shapes(page, 'note')).toContainText('A = 6s² is a cube’s surface area')
  const sent = (await mockRequests()).filter((r) => r.path === '/v1/chat/completions' && JSON.stringify(r.body).includes('image_url'))
  expect(sent.at(-1)!.body.messages[1].content[1].image_url.url).toMatch(/^data:image\/jpeg;base64,/)
})

test('inline toolbar folds shapes, color and size into labelled popovers', async ({ page, user: _ }) => {
  await openEditor(page)
  const box = await addCanvas(page)
  await expect(page.getByRole('button', { name: 'Rectangle' })).toHaveCount(0) // folded while inline
  await page.mouse.move(box.x + 200, box.y + 200)

  await page.getByRole('button', { name: /^Color:/ }).click()
  await page.getByRole('button', { name: 'Red' }).click()
  await page.getByRole('button', { name: /^Size:/ }).click()
  await page.getByRole('button', { name: 'Thick' }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Shapes' }).click()
  await page.getByRole('button', { name: /Ellipse/ }).click()
  await drag(page, { x: box.x + 100, y: box.y + 100 }, { x: box.x + 220, y: box.y + 200 })
  const ellipse = shapes(page, 'ellipse').locator('ellipse')
  await expect(ellipse).toHaveAttribute('stroke', '#dc2626')
  await expect(ellipse).toHaveAttribute('stroke-width', '10')

  await page.keyboard.press('Meta+Shift+E')
  await expect(page.getByRole('button', { name: 'Rectangle' })).toBeVisible() // full toolbar when expanded
})

test('inline toolbar shows only while the mouse is over the canvas', async ({ page, user: _ }) => {
  await openEditor(page)
  const box = await addCanvas(page)
  const toolbar = page.getByRole('toolbar', { name: 'Canvas tools' }).locator('..')
  await page.mouse.move(box.x + 200, box.y + 200)
  await expect(toolbar).toHaveCSS('opacity', '1')
  await page.mouse.move(box.x + 200, box.y - 40)
  await expect(toolbar).toHaveCSS('opacity', '0')
})

test('a canvas title shows top-left, syncs, and survives reload', async ({ page, context, user: _ }) => {
  await openEditor(page)
  await addCanvas(page)
  const title = page.getByRole('textbox', { name: 'Canvas title' })
  await expect(title).toHaveAttribute('placeholder', 'Untitled canvas')
  await title.fill('Cube net')
  await title.press('Enter')
  const second = await context.newPage()
  await second.goto(page.url())
  await expect(second.getByRole('textbox', { name: 'Canvas title' })).toHaveValue('Cube net')

  const [t, c] = await Promise.all([title.boundingBox(), canvasEl(page).boundingBox()])
  expect(t!.x - c!.x).toBeLessThan(20)
  expect(t!.y - c!.y).toBeLessThan(20)

  await page.waitForTimeout(2500)
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Canvas title' })).toHaveValue('Cube net')
})
