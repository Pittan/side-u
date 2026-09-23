import { expect, test } from '@playwright/test'
import { addSongs } from './helpers'

test('共有ページの HTML に、その Side U のメタデータが入る（表示名は入らない）', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'android', 'サーバーの応答の確認なので 1 回でよい')
  await page.goto('/edit')
  await page.getByLabel('名前（任意）').fill('あもん')
  await page.getByRole('button', { name: '深夜に' }).click()
  await addSongs(page, 13)
  await page.getByRole('button', { name: '完成する' }).click()
  await page.waitForURL(/\/u\//)
  const payload = new URL(page.url()).pathname.split('/').pop()!

  const html = await (await request.get(`/u/${payload}`, { headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html' } })).text()
  expect(html).toMatch(new RegExp(`<meta property="og:image" content="[^"]*/og/${payload}\\.png"`))
  expect(html).toMatch(/<meta property="og:description" content="#深夜に 1\. /)
  expect(html).toContain('<meta name="robots" content="noindex,nofollow">')
  expect(html).not.toContain('あもん')
})

test('壊れた URL の共有ページは 404 で、共通のメタデータのまま', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'android', 'サーバーの応答の確認なので 1 回でよい')
  const response = await request.get('/u/1broken', { headers: { 'Sec-Fetch-Mode': 'navigate', Accept: 'text/html' } })
  expect(response.status()).toBe(404)
  expect(await response.text()).toContain('og/default.png')
})

test('画像を変換できない環境（手元）では、OGP 画像は共通の画像になる', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'android', 'サーバーの応答の確認なので 1 回でよい')
  await page.goto('/edit')
  await addSongs(page, 13)
  await page.getByRole('button', { name: '完成する' }).click()
  await page.waitForURL(/\/u\//)
  const payload = new URL(page.url()).pathname.split('/').pop()!
  const [dynamic, fallback] = await Promise.all([request.get(`/og/${payload}.png`), request.get('/og/default.png')])
  expect(dynamic.status()).toBe(200)
  expect(dynamic.headers()['content-type']).toBe('image/png')
  expect(dynamic.headers()['cache-control']).toBe('public, max-age=3600')
  expect(Buffer.compare(await dynamic.body(), await fallback.body())).toBe(0)
})

test('robots.txt で共有ページや OGP 画像を禁止しない（X などのカードが出なくなるため）', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'android', 'サーバーの応答の確認なので 1 回でよい')
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).not.toMatch(/^Disallow:\s*\/(u|og)\b/m)
})
