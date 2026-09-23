import { expect, test } from '@playwright/test'

test('デプロイで画面のファイルが見つからなくなっても、1 回読み込み直して表示する', async ({ page }) => {
  let failed = false
  // 開発サーバーでは画面ごとのファイルが /src/pages/... で配信される。1 回目だけ失敗させる
  await page.route(/\/src\/pages\/docs\/TermsPage\.vue/, route => {
    if (failed) return route.continue()
    failed = true
    return route.fulfill({ status: 404, body: 'not found' })
  })
  await page.goto('/')
  await page.getByRole('link', { name: '利用規約・免責' }).click()
  await expect(page).toHaveURL(/\/terms$/)
  await expect(page.getByRole('heading', { name: '利用規約・免責' })).toBeVisible()
  expect(failed).toBe(true)
})
