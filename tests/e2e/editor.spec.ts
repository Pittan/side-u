import { expect, test } from '@playwright/test'
import { addSongs } from './helpers'

test('トップから入って追加した曲が保存され、トップに戻ると作りかけとして表示される', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Side Uをつくる' }).click()
  await page.getByLabel('名前（任意）').fill('あもん')
  await addSongs(page, 3)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '作りかけの Side U' })).toBeVisible()
  await expect(page.locator('.draft-meta').first()).toHaveText('3/13曲')
})

test('ボトムシートは戻る操作でシートだけが閉じ、選びかけの曲は残る', async ({ page }) => {
  await page.goto('/edit')
  await page.getByRole('button', { name: '＋ 曲を追加' }).click()
  await expect(page).toHaveURL(/sheet=add/)
  await page.locator('dialog[open] input[type=checkbox]').first().check()
  await page.goBack()
  await expect(page).toHaveURL(/\/edit$/)
  await expect(page.locator('dialog[open]')).toHaveCount(0)
  await page.getByRole('button', { name: '＋ 曲を追加' }).click()
  await expect(page.locator('dialog[open] .sheet-footer button')).toHaveText('1 曲を追加')
})

test('シートの URL を直接開いて閉じても、履歴が増えない', async ({ page }) => {
  await page.goto('/edit?sheet=add')
  await expect(page.locator('dialog[open]')).toHaveCount(1)
  const before = await page.evaluate(() => history.length)
  await page.getByRole('button', { name: '閉じる' }).click()
  await expect(page).toHaveURL(/\/edit$/)
  expect(await page.evaluate(() => history.length)).toBe(before)
})

test('13 曲そろっているところに候補から入れると、13 曲目が候補にあふれて取り消せる', async ({ page }) => {
  await page.goto('/edit')
  await addSongs(page, 14)
  await expect(page.locator('.count-number')).toHaveText('13/13')
  // 行の曲名には読み上げ用の「13曲目」が隠れて入っているので取り除く
  const thirteenth = (await page.locator('ol.song-list .title').nth(12).innerText()).replace(/^\d+曲目\s*/, '')
  await page.locator('ul.song-list .main').first().click()
  await page.getByRole('button', { name: '↑ 上へ' }).click()
  await expect(page.locator('.toast')).toContainText('が候補に移りました')
  await expect(page.locator('ul.song-list .title').first()).toHaveText(thirteenth)
  await page.getByRole('button', { name: '取り消す' }).click()
  await expect(page.locator('ol.song-list .title').nth(12)).toContainText(thirteenth)
})

test('リロードしても下書きが残る', async ({ page }) => {
  await page.goto('/edit')
  await addSongs(page, 13)
  await page.reload()
  await expect(page.locator('.count-number')).toHaveText('13/13')
})
