import type { Page } from '@playwright/test'

/** ボトムシートから、上から順に間隔を空けて count 曲を追加する */
export async function addSongs(page: Page, count: number, step = 5) {
  await page.getByRole('button', { name: '＋ 曲を追加' }).click()
  const boxes = page.locator('dialog[open] input[type=checkbox]:not([disabled])')
  for (let i = 0; i < count; i++) await boxes.nth(i * step).check()
  await page.locator('dialog[open] .sheet-footer button').click()
}
