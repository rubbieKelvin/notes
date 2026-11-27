import { expect, openEditor, slash, test } from '../support/fixtures'

test('checklists line up, track progress, tick with ⌘↵, and can hide done tasks', async ({ page, user: _ }) => {
  await openEditor(page)
  await page.locator('.ProseMirror').click()
  await slash(page, 'checklist')
  await page.keyboard.type('Buy milk')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Call the bank')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Write report')
  const items = page.locator('ul[data-type="taskList"] > li')
  await expect(items).toHaveCount(3)

  // checkbox centred on the first line of its text, rows packed like a list
  const box = await items.nth(0).locator('input').boundingBox()
  const text = await items.nth(0).locator('p').boundingBox()
  expect(Math.abs(box!.y + box!.height / 2 - (text!.y + text!.height / 2))).toBeLessThan(2)
  const next = await items.nth(1).boundingBox()
  expect(next!.y - (text!.y + text!.height)).toBeLessThan(8)

  const progress = page.locator('[data-task-progress]')
  await expect(progress).toContainText('0/3 done')
  await page.keyboard.press('ControlOrMeta+Enter') // in "Write report"
  await expect(items.nth(2)).toHaveAttribute('data-checked', 'true')
  await items.nth(0).locator('input').click()
  await expect(progress).toContainText('2/3 done')
  await expect(items.nth(0).locator('p')).toHaveCSS('text-decoration-line', 'line-through')

  await progress.getByRole('button', { name: 'Hide done' }).click()
  await expect(items.nth(0)).toBeHidden()
  await expect(items.nth(1)).toBeVisible()
  await page.screenshot({ path: 'test-results/checklist.png', clip: { x: 300, y: 60, width: 840, height: 260 } })
  await progress.getByRole('button', { name: 'Show 2 done' }).click()
  await expect(items.nth(0)).toBeVisible()
  await page.screenshot({ path: 'test-results/checklist-all.png', clip: { x: 300, y: 60, width: 840, height: 300 } })
})
