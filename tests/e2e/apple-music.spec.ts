import { expect, test, type Page } from '@playwright/test'
import { addSongs } from './helpers'

/** MusicKit と Apple Music API を偽物に差し替える。送られた内容を返す */
async function mockAppleMusic(page: Page, { status = 201, authorize = true } = {}) {
  const requests: Array<{ headers: Record<string, string>; body: unknown }> = []
  await page.route('https://js-cdn.music.apple.com/**', route =>
    route.fulfill({
      contentType: 'text/javascript',
      body: `
        window.MusicKit = {
          configure: async () => ({
            authorize: async () => { ${authorize ? "return 'test-music-user-token'" : "throw new Error('cancelled')"} },
            musicUserToken: 'test-music-user-token',
          }),
        };
        document.dispatchEvent(new Event('musickitloaded'));
      `,
    }),
  )
  await page.route('https://api.music.apple.com/**', async route => {
    requests.push({ headers: route.request().headers(), body: route.request().postDataJSON() })
    await route.fulfill({ status, json: status === 201 ? { data: [{ id: 'p.test123' }] } : { errors: [] } })
  })
  return requests
}

test('プレイリストを曲順どおりに作り、名前とタグから名前と説明を組み立てる', async ({ page }) => {
  const requests = await mockAppleMusic(page)
  await page.goto('/edit')
  await page.getByLabel('名前（任意）').fill('あもん')
  await page.getByRole('button', { name: '深夜に' }).click()
  await addSongs(page, 13)
  const titles = (await page.locator('ol.song-list .title').allInnerTexts()).map(t => t.replace(/^\d+曲目\s*/, ''))
  await page.getByRole('button', { name: '完成する' }).click()

  await page.getByRole('button', { name: 'Apple MusicにSide Uをつくる' }).click()
  const dialog = page.getByRole('dialog', { name: 'Apple Music にプレイリストをつくる' })
  await expect(dialog).toContainText('SIDE U - あもん')
  const submit = dialog.getByRole('button', { name: /Apple Music でつくる/ })
  await submit.click()
  await expect(dialog).toContainText('「SIDE U - あもん」をつくりました')
  await expect(dialog.getByRole('link', { name: 'ミュージックで開く' })).toHaveAttribute('href', 'https://music.apple.com/library/playlist/p.test123')

  expect(requests).toHaveLength(1)
  const request = requests[0]!
  expect(request.headers['music-user-token']).toBe('test-music-user-token')
  expect(request.headers.authorization).toBe('Bearer test-developer-token')
  const body = request.body as { attributes: { name: string; description: string }; relationships: { tracks: { data: Array<{ id: string }> } } }
  expect(body.attributes).toEqual({ name: 'SIDE U - あもん', description: 'SIDE U — Selected by You / #深夜に / 非公式ファンツール SIDE U でつくりました' })
  // 配信のない曲は除かれるので、曲数は 13 以下。順番は Side U の順
  expect(body.relationships.tracks.data.length).toBeLessThanOrEqual(13)
  expect(titles).toHaveLength(13)

  // 二度目は作成済みと表示する
  await dialog.getByRole('button', { name: '閉じる' }).click()
  await page.getByRole('button', { name: 'Apple MusicにSide Uをつくる' }).click()
  await expect(dialog).toContainText('作成済みです')
  await expect(dialog.getByRole('button', { name: /もう一度つくる/ })).toBeVisible()
})

test('Apple Music の利用登録がないとき（403）は、その旨を表示する', async ({ page }) => {
  await mockAppleMusic(page, { status: 403 })
  await page.goto('/edit')
  await addSongs(page, 13)
  await page.getByRole('button', { name: '完成する' }).click()
  await page.getByRole('button', { name: 'Apple MusicにSide Uをつくる' }).click()
  await page.getByRole('button', { name: /Apple Music でつくる/ }).click()
  await expect(page.getByRole('alert')).toContainText('Apple Music の利用登録が必要です')
})

test('サインインをキャンセルしたときは、その旨を表示してやり直せる', async ({ page }) => {
  await mockAppleMusic(page, { authorize: false })
  await page.goto('/edit')
  await addSongs(page, 13)
  await page.getByRole('button', { name: '完成する' }).click()
  await page.getByRole('button', { name: 'Apple MusicにSide Uをつくる' }).click()
  await page.getByRole('button', { name: /Apple Music でつくる/ }).click()
  await expect(page.getByRole('alert')).toContainText('キャンセル')
  await page.getByRole('button', { name: 'もう一度' }).click()
  await expect(page.getByRole('button', { name: /Apple Music でつくる/ })).toBeVisible()
})
