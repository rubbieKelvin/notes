import { expect, latestCode, openEditor, setNoteDetails, signUp, test, typeInEditor, uniqueEmail, type Page } from '../support/fixtures'

async function share(page: Page, email: string, role: 'Can view' | 'Can edit') {
  await page.getByRole('button', { name: 'Share' }).click()
  const dialog = page.getByRole('dialog', { name: /^Share/ })
  await dialog.getByLabel('Email to share with').fill(email)
  if (role === 'Can edit') {
    await dialog.getByRole('combobox', { name: 'Access for new person' }).click()
    await page.getByRole('option', { name: 'Can edit' }).click()
  }
  await dialog.getByRole('button', { name: 'Invite', exact: true }).click()
  await expect(dialog.locator('[data-share]', { hasText: email })).toBeVisible()
  return dialog
}

test('a viewer without an account signs up with a code and reads the note live, read-only', async ({ page, browser, user: _ }) => {
  const docId = await openEditor(page)
  await typeInEditor(page, 'Shared thoughts.')
  await setNoteDetails(page, 'Team plan')
  const invitee = uniqueEmail('viewer')
  const dialog = await share(page, invitee, 'Can view')
  await expect(dialog).toContainText('Invite sent · no account yet')
  await page.keyboard.press('Escape')

  const ctx = await browser.newContext()
  const guest = await ctx.newPage()
  await guest.goto(`/d/${docId}`)
  await expect(guest.getByRole('heading', { name: 'Sign in to open this note' })).toBeVisible()
  await guest.getByLabel('Email').fill(invitee)
  await guest.getByRole('button', { name: 'Email me a sign-in code' }).click()
  await guest.getByLabel('Sign-in code').fill(await latestCode(invitee))

  await expect(guest).toHaveURL(new RegExp(`/d/${docId}$`))
  await expect(guest.locator('.ProseMirror')).toContainText('Shared thoughts.')
  await expect(guest.locator('.ProseMirror')).toHaveAttribute('contenteditable', 'false')
  await expect(guest.locator('[data-shared-badge]')).toHaveText(/shared this · Can view/)
  await expect(guest.getByRole('button', { name: 'Share' })).toHaveCount(0)
  await expect(guest.getByRole('button', { name: 'Delete this page' })).toHaveCount(0)

  await page.locator('.ProseMirror').click()
  await page.keyboard.press('End')
  await page.keyboard.type(' Live update.')
  await expect(guest.locator('.ProseMirror')).toContainText('Live update.')

  // the owner's list shows the shared note in the invitee's notes
  const list = await (await guest.request.get('/v1/docs')).json()
  expect(list.find((d: { id: string }) => d.id === docId)).toMatchObject({ role: 'view', title: 'Team plan', mcp_exposed_slug: null })
  await ctx.close()
})

test('an editor edits live; removing them takes access away', async ({ page, browser, user: _ }) => {
  const docId = await openEditor(page)
  await typeInEditor(page, 'Draft.')
  const ctx = await browser.newContext()
  const editorEmail = await signUp(ctx)
  const dialog = await share(page, editorEmail, 'Can edit')
  await page.keyboard.press('Escape')

  const other = await ctx.newPage()
  await other.goto(`/d/${docId}`)
  await expect(other.locator('[data-shared-badge]')).toHaveText(/Can edit/)
  await other.locator('.ProseMirror').click()
  await other.keyboard.press('End')
  await other.keyboard.type(' From the editor.')
  await expect(page.locator('.ProseMirror')).toContainText('Draft. From the editor.')

  await page.getByRole('button', { name: 'Share' }).click()
  await dialog.getByRole('button', { name: `Remove ${editorEmail}` }).click()
  await expect(dialog.locator('[data-share]')).toHaveCount(0)
  await other.reload()
  await expect(other.getByRole('heading', { name: "You can't open this note" })).toBeVisible()
  await ctx.close()
})

test('published notes are readable by anyone at /public/@username/<id>, with a profile', async ({ page, browser, user }) => {
  const docId = await openEditor(page)
  await typeInEditor(page, 'Open to the world.')
  await setNoteDetails(page, 'Field notes', 'What I saw today')
  const username = (await (await page.request.get('/v1/me')).json()).username
  const anon = await (await browser.newContext()).newPage()

  await anon.goto(`/public/@${username}`)
  await expect(anon.getByRole('heading', { name: 'Nothing public here' })).toBeVisible()

  await page.getByRole('button', { name: 'Share' }).click()
  await page.getByText('Publish to the web').click()
  const link = page.locator('[data-public-link]')
  await expect(link).toHaveText(new RegExp(`/public/@${username}/${docId}$`))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(2500) // title is persisted with the next save

  await anon.goto(`/public/@${username}/${docId}`)
  await expect(anon.getByRole('heading', { level: 1 })).toHaveText('Field notes')
  await expect(anon.getByText('What I saw today')).toBeVisible()
  await expect(anon.locator('.ProseMirror')).toContainText('Open to the world.')
  await expect(anon.locator('.ProseMirror')).toHaveAttribute('contenteditable', 'false')

  await anon.goto(`/public/@${username}`)
  await expect(anon.locator('[data-note-card]')).toHaveCount(1)
  await anon.locator('[data-note-card]').click()
  await expect(anon).toHaveURL(new RegExp(`/public/@${username}/${docId}$`))

  // private again: both pages go away, with the same answer as a note that never existed
  expect((await page.request.put(`/v1/docs/${docId}/public`, { data: { public: false } })).status()).toBe(200)
  await anon.reload()
  await expect(anon.getByRole('heading', { name: "This note isn't public" })).toBeVisible()
  expect((await anon.request.get(`/v1/public/@${username}`)).status()).toBe(404)
  expect(user).toBeTruthy()
})

// 1×1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64')

test('images follow their note: hidden from strangers until the note is public', async ({ page, browser, user: _ }) => {
  const docId = await openEditor(page)
  const up = await page.request.post(`/v1/assets?doc=${docId}`, { data: PNG, headers: { 'content-type': 'image/png' } })
  expect(up.status(), await up.text()).toBe(201)
  const { url } = await up.json()
  const anon = await browser.newContext()
  expect((await anon.request.get(url)).status()).toBe(404)
  await page.request.put(`/v1/docs/${docId}/public`, { data: { public: true } })
  expect((await anon.request.get(url)).status()).toBe(200)

  // and nobody can upload into a note they can't edit
  const stranger = await browser.newContext()
  await signUp(stranger)
  expect((await stranger.request.post(`/v1/assets?doc=${docId}`, { data: PNG, headers: { 'content-type': 'image/png' } })).status()).toBe(403)
  await anon.close()
  await stranger.close()
})
