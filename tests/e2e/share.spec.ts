import { expect, test } from '@playwright/test'
import { addSongs } from './helpers'

test('完成 → 共有画像 → ほかの人が開いて remix（名前は引き継がない）', async ({ page, browser }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))

  await page.goto('/edit')
  await page.getByLabel('名前（任意）').fill('あもん')
  await addSongs(page, 13)
  await page.getByRole('button', { name: '完成する' }).click()
  await expect(page).toHaveURL(/\/u\/1[A-Za-z0-9_-]{42}#n=/)
  await expect(page.getByRole('heading', { name: 'あもん の Side U ができました' })).toBeVisible()
  await expect(page.locator('.images img')).toHaveCount(2)
  await expect(page.locator('.images img').first()).toHaveAttribute('alt', /^SIDE U。あもん の13曲。1 /)

  // 名前（fragment）はどのリクエストにも含まれない
  expect(requests.filter(url => url.includes('%E3%81%82%E3%82%82%E3%82%93') || url.includes('あもん'))).toEqual([])

  const other = await (await browser.newContext()).newPage()
  await other.goto(page.url())
  await expect(other.getByRole('heading', { name: 'あもん さんの Side U' })).toBeVisible()
  await expect(other.locator('ol.songs li')).toHaveCount(13)
  await other.getByRole('button', { name: 'この13曲をもとにつくる' }).click()
  await expect(other).toHaveURL(/\/edit$/)
  await expect(other.locator('.count-number')).toHaveText('13/13')
  await expect(other.getByLabel('名前（任意）')).toHaveValue('')
})

test('完成後のトップは「完成した Side U を見る」、編集すると「完成後に編集中」', async ({ page }) => {
  await page.goto('/edit')
  await addSongs(page, 13)
  await page.getByRole('button', { name: '完成する' }).click()
  await page.goto('/')
  await expect(page.getByRole('link', { name: '完成した Side U を見る' })).toBeVisible()
  await page.getByRole('link', { name: '編集する' }).click()
  await page.locator('ol.song-list .main').first().click()
  await page.getByRole('button', { name: '↓ 下へ' }).click()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '完成後に編集中の Side U' })).toBeVisible()
  await expect(page.getByRole('link', { name: '続きから' })).toBeVisible()
})

test('下書きがある状態で「新しくつくる」を押すと、下書きの概要を見せて確認する', async ({ page }) => {
  await page.goto('/edit')
  await addSongs(page, 5)
  await page.goto('/')
  await page.getByRole('button', { name: '新しくつくる' }).click()
  await expect(page.getByRole('dialog')).toContainText('Side U 5/13曲')
  await page.getByRole('button', { name: '破棄して新しくつくる' }).click()
  await expect(page).toHaveURL(/\/edit$/)
  await expect(page.locator('.count-number')).toHaveText('0/13')
})

test('壊れた URL では読み込めなかった旨を表示する', async ({ page }) => {
  await page.goto('/u/1broken')
  await expect(page.getByRole('heading', { name: 'このSide Uは読み込めませんでした' })).toBeVisible()
})

test('9:16 と正方形のそれぞれで、背景を透過にできる。透過のときだけ「文字の後ろを暗くする」が出る', async ({ page }) => {
  await page.goto('/edit')
  await addSongs(page, 13)
  await page.getByRole('button', { name: '完成する' }).click()
  const square = page.getByRole('radiogroup', { name: '正方形の背景' })
  const before = await page.locator('.images img').nth(1).getAttribute('src')
  await expect(page.getByRole('switch', { name: '文字の後ろを暗くする' })).toHaveCount(0)
  await square.getByText('透過').click()
  await expect(page.getByRole('switch', { name: '文字の後ろを暗くする' })).toHaveCount(1)
  await expect(page.locator('.images img').nth(1)).not.toHaveAttribute('src', before!)
  // 9:16 はそのまま
  await expect(page.getByRole('radiogroup', { name: '9:16の背景' }).getByLabel('模様あり')).toBeChecked()
})

test('画像の説明文（ALT）をコピーできる', async ({ page, context }, testInfo) => {
  // クリップボードの読み取りを許可できるのは Chromium だけ
  test.skip(testInfo.project.name !== 'android', 'クリップボードの読み取りは Chromium でだけ確認できる')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/edit')
  await page.getByLabel('名前（任意）').fill('あもん')
  await addSongs(page, 13)
  await page.getByRole('button', { name: '完成する' }).click()
  const alt = await page.locator('.images img').first().getAttribute('alt')
  await page.getByRole('region', { name: '画像の説明文（ALT）' }).getByRole('button', { name: 'コピー' }).click()
  await expect(page.locator('.toast')).toContainText('説明文をコピーしました')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(alt)
  expect(alt).toMatch(/^SIDE U。あもん の13曲。1 /)
})

test('共有画像の模様は「模様を変える」で変わる', async ({ page }) => {
  await page.goto('/edit')
  await addSongs(page, 13)
  await page.getByRole('button', { name: '完成する' }).click()
  const image = page.locator('.images img').first()
  await expect(image).toHaveAttribute('src', /^blob:/)
  const pixels = () =>
    image.evaluate(async (img: HTMLImageElement) => {
      await img.decode()
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      canvas.getContext('2d')!.drawImage(img, 0, 0, 64, 64)
      return Array.from(canvas.getContext('2d')!.getImageData(0, 0, 64, 64).data).join()
    })
  const before = await pixels()
  const src = await image.getAttribute('src')
  await page.getByRole('button', { name: '模様を変える' }).click()
  await expect(image).not.toHaveAttribute('src', src!)
  expect(await pixels()).not.toBe(before)
})
