import { expect, openEditor, slash, test, typeInEditor, type Page } from '../support/fixtures'

/** Waits for the browser to send event `name` and the server to accept it. */
const accepted = (page: Page, name: string) =>
  page.waitForResponse((r) => r.url().endsWith('/v1/events') && r.request().postDataJSON()?.name === name)

test('sends sheet-ready, canvas-expand and client-error events', async ({ page, user: _ }) => {
  const ready = accepted(page, 'sheet_ready')
  await openEditor(page)
  const r = await ready
  expect(r.status()).toBe(204)
  expect(r.request().postDataJSON().props.ms).toBeGreaterThan(0)

  await typeInEditor(page, 'Intro')
  await page.keyboard.press('Enter')
  await slash(page, 'canvas')
  await page.locator('[data-canvas]').click()
  const expand = accepted(page, 'canvas_expand')
  await page.keyboard.press('Meta+Shift+E')
  expect((await expand).status()).toBe(204)

  const error = accepted(page, 'client_error')
  await page.evaluate(() => setTimeout(() => { throw new Error('e2e boom') }))
  const e = await error
  expect(e.status()).toBe(204)
  expect(e.request().postDataJSON().props.message).toContain('e2e boom')
})
