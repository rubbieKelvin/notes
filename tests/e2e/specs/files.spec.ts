import { expect, openEditor, signUp, slash, test } from '../support/fixtures'

type Stored = { id: string; name: string; notes: { id: string; title: string }[] }
// 2×2 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEElEQVR4nGP4z8AARAwQCgAf7gP9i18U1AAAAABJRU5ErkJggg==', 'base64')
const MB = 1024 * 1024

test('a file uploaded in a note previews, shows in storage with its note, and can be reused and deleted', async ({ page, user: _ }) => {
  const first = await openEditor(page)
  await page.locator('.ProseMirror').click()
  await slash(page, 'file')
  await page.locator('[data-file-input]').setInputFiles({ name: 'notes.csv', mimeType: 'text/csv', buffer: Buffer.from('a,b\n1,2\n') })
  const block = page.locator('[data-file-block]')
  await expect(block).toContainText('notes.csv')
  await expect(block.locator('pre')).toContainText('a,b') // text preview

  // The server records which notes show the file when the note saves.
  const files = async () => ((await (await page.request.get('/v1/files')).json()).files as Stored[])
  await expect.poll(async () => (await files())[0]?.notes.map((n) => n.id)).toEqual([first])

  // The same file goes into a second note from "Your files".
  const res = await page.request.post('/v1/docs', { data: { title: 'Second' } })
  const { id: second } = await res.json()
  await openEditor(page, `/d/${second}`)
  await page.locator('.ProseMirror').click()
  await slash(page, 'file')
  await page.getByRole('button', { name: 'Your files' }).click()
  await page.getByRole('list', { name: 'Your files' }).getByRole('button', { name: /notes\.csv/ }).click()
  await expect(page.locator('[data-file-block]')).toContainText('notes.csv')
  await expect.poll(async () => (await files())[0]?.notes.length).toBe(2)

  // Storage page lists it with both notes, and deleting it leaves the notes saying so.
  await page.goto('/files')
  const row = page.locator('[data-file-row]').filter({ hasText: 'notes.csv' })
  await expect(row.locator('a[href^="/d/"]')).toHaveCount(2)
  await expect(page.getByText(/of 500 MB used/)).toBeVisible()
  await row.getByRole('button', { name: 'Delete notes.csv' }).click()
  await page.getByRole('button', { name: 'Delete file' }).click()
  await expect(row).toHaveCount(0)
  await openEditor(page, `/d/${first}`)
  await expect(page.locator('[data-file-block]')).toContainText('Deleted')
})

test('uploads are limited by type, and the type comes from the bytes', async ({ page, user: _ }) => {
  const big = (head: Buffer, size: number) => Buffer.concat([head, Buffer.alloc(size - head.length)])
  const up = (name: string, data: Buffer) => page.request.post(`/v1/files?name=${name}`, { data, headers: { 'content-type': 'video/mp4' } })

  const image = await up('big.png', big(PNG, 11 * MB))
  expect(image.status()).toBe(413)
  expect(await image.text()).toContain('Images can be at most 10 MB')

  const other = await up('big.bin', big(Buffer.from('hello'), 6 * MB)) // claims video/mp4, isn't one
  expect(other.status()).toBe(413)
  expect(await other.text()).toContain('at most 5 MB')

  const pdf = await up('paper.pdf', big(Buffer.from('%PDF-1.7\n'), 12 * MB))
  expect(pdf.status(), await pdf.text()).toBe(201)
  expect((await pdf.json()).mime).toBe('application/pdf')

  const html = await up('x.html', Buffer.from('<html><script>alert(1)</script>'))
  const { url } = await html.json()
  const served = await page.request.get(url)
  expect(served.headers()['content-type']).toBe('application/octet-stream')
  expect(served.headers()['content-disposition']).toMatch(/^attachment/)
})

test("a storage upload is private until a note you share shows it", async ({ page, browser, user: _ }) => {
  const up = await page.request.post('/v1/files?name=dot.png', { data: PNG })
  const { url } = await up.json()
  const stranger = await browser.newContext()
  await signUp(stranger)
  expect((await stranger.request.get(url)).status()).toBe(404)
  expect((await stranger.request.delete(url)).status()).toBe(404)
  // range requests work (video seeking)
  const part = await page.request.get(url, { headers: { range: 'bytes=0-3' } })
  expect(part.status()).toBe(206)
  await stranger.close()
})

test('files dropped or pasted into a note upload as file blocks', async ({ page, user: _ }) => {
  await openEditor(page)
  await page.locator('.ProseMirror').click()
  // Build the File in the page: drag-and-drop and clipboard events can't carry files from Playwright directly.
  const send = (type: 'drop' | 'paste', name: string, text: string) => page.locator('.ProseMirror').evaluate((el, [type, name, text]) => {
    const dt = new DataTransfer()
    dt.items.add(new File([text], name, { type: 'text/plain' }))
    const box = el.getBoundingClientRect()
    el.dispatchEvent(type === 'drop'
      ? new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: box.left + 20, clientY: box.top + 10 })
      : new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  }, [type, name, text] as const)

  await send('drop', 'dropped.txt', 'from a drop')
  await expect(page.locator('[data-file-block]').filter({ hasText: 'dropped.txt' }).locator('pre')).toContainText('from a drop')
  await send('paste', 'pasted.md', '# from the clipboard')
  await expect(page.locator('[data-file-block]').filter({ hasText: 'pasted.md' }).locator('pre')).toContainText('from the clipboard')
  await expect.poll(async () => (await (await page.request.get('/v1/files')).json()).files.length).toBe(2)
})

test('a previewed file keeps its name and controls inside the preview, shown on hover', async ({ page, user: _ }) => {
  await openEditor(page)
  await page.locator('.ProseMirror').click()
  await slash(page, 'image')
  await page.locator('[data-file-input]').setInputFiles({ name: 'dot.png', mimeType: 'image/png', buffer: PNG })
  const block = page.locator('[data-file-block]')
  await expect(block.locator('img')).toBeVisible()
  await page.mouse.move(0, 0)
  await expect(block.locator('[data-file-name]')).toHaveCSS('opacity', '0')
  await expect(block.locator('[data-file-controls]')).toHaveCSS('opacity', '0')
  await page.screenshot({ path: 'test-results/file-idle.png', clip: { x: 300, y: 60, width: 840, height: 220 } })
  await block.hover()
  await expect(block.locator('[data-file-name]')).toHaveCSS('opacity', '1')
  await expect(block.locator('[data-file-name]')).toContainText('dot.png')
  await page.screenshot({ path: 'test-results/file-hover.png', clip: { x: 300, y: 60, width: 840, height: 220 } })
  await block.getByRole('button', { name: 'Open preview' }).click()
  await expect(page.getByRole('dialog')).toContainText('dot.png')
})
