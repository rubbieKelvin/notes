import { expect, openEditor, signUp, test, typeInEditor } from '../support/fixtures'

type Doc = { id: string; tags: string[] }

test('tabs are pages of one note: they sync, keep their own content, and survive reload', async ({ page, user: _ }) => {
  const docId = await openEditor(page)
  await typeInEditor(page, 'Main page text')
  await page.getByRole('button', { name: 'Add tab' }).click()
  const tabs = page.getByRole('tab')
  await expect(tabs).toHaveText(['Main', 'Tab 2'])
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true')
  await typeInEditor(page, 'Budget numbers')
  await expect(page.locator('.ProseMirror')).not.toContainText('Main page text')

  // rename through the tab menu
  await page.getByRole('button', { name: 'Tab 2 tab options' }).click()
  await page.getByRole('menuitem', { name: 'Rename' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox').fill('Budget')
  await dialog.locator('button[type=submit]').click()
  await expect(tabs.nth(1)).toHaveText('Budget')
  await expect(page).toHaveURL(/\?tab=/)

  // another tab of the same account sees the tab live
  const other = await page.context().newPage()
  await openEditor(other, `/d/${docId}`)
  await expect(other.getByRole('tab')).toHaveText(['Main', 'Budget'])
  await expect(other.locator('.ProseMirror')).toContainText('Main page text')
  await other.getByRole('tab', { name: 'Budget' }).click()
  await expect(other.locator('.ProseMirror')).toContainText('Budget numbers')

  // a reload with ?tab= lands on that tab, after the save
  await page.waitForTimeout(2500)
  await page.reload()
  await expect(page.getByRole('tab', { name: 'Budget' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.ProseMirror')).toContainText('Budget numbers')

  // deleting the tab takes its content with it
  await page.getByRole('button', { name: 'Budget tab options' }).click()
  await page.getByRole('menuitem', { name: 'Delete tab' }).click()
  await page.getByRole('button', { name: 'Delete tab' }).click()
  await expect(page.getByRole('tab')).toHaveCount(0)
  await expect(page.locator('.ProseMirror')).toContainText('Main page text')
  await other.close()
})

test('[[ links another note, and the link opens it', async ({ page, user: _ }) => {
  const res = await page.request.post('/v1/docs', { data: { title: 'Target note' } })
  const { id: target } = await res.json()
  const { id: source } = await (await page.request.post('/v1/docs', { data: { title: 'Source' } })).json()
  await openEditor(page, `/d/${source}`)
  await typeInEditor(page, 'See [[Targ')
  await expect(page.getByRole('listbox', { name: 'Link a note' })).toContainText('Target note')
  await page.keyboard.press('Enter')
  const link = page.locator('.ProseMirror a.note-ref')
  await expect(link).toHaveText('Target note')
  await expect(link).toHaveAttribute('href', `/d/${target}`)
  await link.click()
  await expect(page).toHaveURL(new RegExp(`/d/${target}$`))
})

test('tags are personal: set in the note, shown and filtered on All notes, invisible to others', async ({ page, browser, user: _ }) => {
  const docId = await openEditor(page)
  await page.getByRole('button', { name: 'Tags' }).click()
  const input = page.getByRole('textbox', { name: 'Add a tag' })
  await input.fill('work')
  await input.press('Enter')
  await input.fill('#ideas')
  await input.press('Enter')
  await expect(page.getByRole('list', { name: 'Your tags' })).toContainText('ideas')
  await expect(page.getByRole('list', { name: 'Your tags' })).toContainText('work')

  await page.request.post('/v1/docs', { data: { title: 'Untagged' } })
  await page.goto('/notes')
  await expect(page.locator('[data-note-card]')).toHaveCount(2)
  await page.getByRole('group', { name: 'Filter by tag' }).getByRole('button', { name: '#work' }).click()
  await expect(page.locator('[data-note-card]')).toHaveCount(1)
  await expect(page.locator('[data-note-card]')).toContainText('#ideas')

  // shared with someone else: they see the note, not my tags, and can keep their own
  const ctx = await browser.newContext()
  const email = await signUp(ctx)
  expect((await ctx.request.put(`/v1/docs/${docId}/tags`, { data: { tags: ['x'] } })).status()).toBe(404)
  await page.request.post(`/v1/docs/${docId}/shares`, { data: { email, role: 'view' } })
  const theirs = (await (await ctx.request.get('/v1/docs')).json()) as Doc[]
  expect(theirs.find((d) => d.id === docId)?.tags).toEqual([])
  expect((await ctx.request.put(`/v1/docs/${docId}/tags`, { data: { tags: ['mine'] } })).status()).toBe(200)
  const mine = (await (await page.request.get('/v1/docs')).json()) as Doc[]
  expect(mine.find((d) => d.id === docId)?.tags).toEqual(['ideas', 'work'])
  await ctx.close()
})
