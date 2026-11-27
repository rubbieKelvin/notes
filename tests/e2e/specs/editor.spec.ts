import { answerPrompt, expect, setNoteDetails, openEditor, slash, test, typeInEditor } from '../support/fixtures'

test('slash menu inserts headings and math', async ({ page, user: _ }) => {
  await openEditor(page)
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('/head')
  await expect(page.getByRole('option')).toHaveCount(3)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Boxes')
  await expect(page.locator('.ProseMirror h1')).toHaveText('Boxes')
  await page.keyboard.press('Enter')
  await slash(page, 'math')
  await answerPrompt(page, 'E = mc^2')
  await expect(page.locator('[data-type=block-math] .katex')).toBeVisible()
  await page.keyboard.type('Inline $$a^2$$ ')
  await expect(page.locator('[data-type=inline-math] .katex')).toBeVisible()
})

test('epistemic callouts, clips and runbooks', async ({ page, user: _ }) => {
  await openEditor(page)
  await page.locator('.ProseMirror').click()
  for (const [cmd, text] of [['hypothesis', 'Boxes are cubes.'], ['evidence', 'Measured 3.'], ['contradicts', 'Shoebox.']]) {
    await slash(page, cmd)
    await page.keyboard.type(text)
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
  }
  await expect(page.locator('div[data-type=callout]')).toHaveCount(3)
  expect(await page.locator('div[data-type=callout]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.kind))).toEqual(['hypothesis', 'fact', 'contradicts'])

  await slash(page, 'clip')
  await answerPrompt(page, 'https://www.youtube.com/watch?v=abc 14:22-15:08')
  await page.keyboard.type('Boxes are everywhere.')
  await expect(page.locator('[data-type=clip] a')).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc&t=862s')
  await expect(page.locator('[data-type=clip] a')).toHaveText('14:22 – 15:08')
  await page.keyboard.press('Enter')

  await slash(page, 'runbook')
  await page.keyboard.type('psql -c "select 1"')
  const runbook = page.locator('[data-type=runbook]')
  const status = runbook.locator('[data-runbook-status]')
  await expect(status).toHaveText('Untested')
  await status.click()
  await page.getByRole('menuitem', { name: 'Works' }).click()
  await expect(status).toHaveText('Works')
  // one box: the code area has no border of its own
  await expect(runbook.locator('pre')).toHaveCSS('border-top-width', '0px')
  await runbook.screenshot({ path: 'test-results/runbook.png' })
})

test('writing and title persist on the server and sync live across tabs', async ({ page, context, user: _ }) => {
  await openEditor(page)
  await typeInEditor(page, 'I like boxes.')
  await setNoteDetails(page, 'Box Geometry')

  const second = await context.newPage()
  await second.goto(page.url())
  await expect(second.locator('.ProseMirror')).toContainText('I like boxes.')
  await expect(second.getByRole('button', { name: 'Switch note' })).toHaveText('Box Geometry')
  await second.locator('.ProseMirror').click()
  await second.keyboard.press('End')
  await second.keyboard.type(' From tab two.')
  await expect(page.locator('.ProseMirror')).toContainText('From tab two.')
  await second.close()

  await page.waitForTimeout(2500) // server persists every 2s
  await page.reload()
  await expect(page.locator('.ProseMirror')).toContainText('I like boxes. From tab two.')
  await expect(page).toHaveTitle('Box Geometry · opennotes')
})

test('the note switcher searches, switches, and creates notes', async ({ page, user: _ }) => {
  const first = await openEditor(page)
  await typeInEditor(page, 'first page')
  await setNoteDetails(page, 'Box Geometry', 'Volumes and nets')
  await page.getByRole('button', { name: 'Switch note' }).click()
  await page.getByRole('button', { name: 'New page' }).click()
  await expect(page).not.toHaveURL(new RegExp(first))
  await expect(page.locator('.ProseMirror')).not.toContainText('first page')

  // search by description, then Enter opens the match
  await page.getByRole('button', { name: 'Switch note' }).click()
  await page.getByRole('combobox', { name: 'Search notes' }).fill('nets')
  await expect(page.getByRole('option')).toHaveCount(1)
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(new RegExp(first))
  await expect(page.locator('.ProseMirror')).toContainText('first page')

  // no match: the footer offers to create a note with that title
  await page.getByRole('button', { name: 'Switch note' }).click()
  await page.getByRole('combobox', { name: 'Search notes' }).fill('Prisms')
  await page.getByRole('button', { name: 'Create “Prisms”' }).click()
  await expect(page.getByRole('button', { name: 'Switch note' })).toHaveText('Prisms')
  await expect(page).toHaveTitle('Prisms · opennotes')
})

test('all notes page shows every note as a card', async ({ page, user: _ }) => {
  await openEditor(page)
  await setNoteDetails(page, 'Box Geometry', 'Volumes and nets')
  await page.waitForTimeout(2500) // the list reads what the server last persisted
  await page.getByRole('button', { name: 'Switch note' }).click()
  await page.getByRole('link', { name: 'See all notes' }).click()
  await expect(page).toHaveURL(/\/notes$/)
  const card = page.locator('[data-note-card]', { hasText: 'Box Geometry' })
  await expect(card).toContainText('Volumes and nets')
  await card.click()
  await expect(page).toHaveURL(/\/d\//)
})

test('note blocks get their own toolbar: switch callout kind, unwrap, delete', async ({ page, user: _ }) => {
  await openEditor(page)
  await page.locator('.ProseMirror').click()
  await slash(page, 'hypothesis')
  await page.keyboard.type('Boxes are cubes.')
  const toolbar = page.getByRole('toolbar', { name: 'Callout actions' })
  await expect(toolbar).toBeVisible()
  await toolbar.getByRole('button', { name: 'Evidence' }).click()
  await expect(page.locator('div[data-type=callout]')).toHaveAttribute('data-kind', 'fact')
  await expect(page.locator('.ProseMirror')).toBeFocused() // toolbar keeps you writing
  await toolbar.getByRole('button', { name: 'Unwrap' }).click()
  await expect(page.locator('div[data-type=callout]')).toHaveCount(0)
  await expect(page.locator('.ProseMirror p', { hasText: 'Boxes are cubes.' })).toBeVisible()

  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await slash(page, 'runbook')
  await page.keyboard.type('ls -la')
  await page.getByRole('toolbar', { name: 'Runbook actions' }).getByRole('button', { name: 'Delete runbook' }).click()
  await expect(page.locator('[data-type=runbook]')).toHaveCount(0)
})
