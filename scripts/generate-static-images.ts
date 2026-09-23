// 共通の OGP 画像とアイコンを作る。見た目を変えたら再実行してコミットする。
//
//   pnpm images:generate
//
// Playwright の Chromium で HTML を描いて PNG にする（フォントは Google Fonts の LINE Seed JP）
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'

const BACKGROUND = '#0d0f1a'
const FOREGROUND = '#f5f7ff'
const COLORS = ['#5ce1e6', '#b388ff', '#ff6ec7']

const FONT_CSS = 'https://fonts.googleapis.com/css2?family=LINE+Seed+JP:wght@400;700;800&display=block'

function triangle(cx: number, cy: number, r: number, rotation: number) {
  return [0, 1, 2]
    .map(i => {
      const a = rotation + (i * Math.PI * 2) / 3
      return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`
    })
    .join(' ')
}

function prisms(cx: number, cy: number, size: number) {
  return [0, 1, 2, 3]
    .map(
      i =>
        `<polygon points="${triangle(cx + i * size * 0.06, cy - i * size * 0.04, size * (0.55 + i * 0.18), -Math.PI / 2 + i * 0.28)}"
          fill="none" stroke="${COLORS[i % 3]}" stroke-opacity="${0.75 - i * 0.12}" stroke-width="${Math.max(2, size / 90)}" />`,
    )
    .join('')
}

const ogHtml = `<!doctype html><html><head><link rel="stylesheet" href="${FONT_CSS}"><style>
  body { margin: 0; width: 1200px; height: 630px; background: ${BACKGROUND}; color: ${FOREGROUND};
    font-family: 'LINE Seed JP', sans-serif; overflow: hidden; position: relative; }
  svg { position: absolute; inset: 0; }
  .text { position: absolute; left: 88px; top: 150px; }
  h1 { margin: 0; font-size: 168px; font-weight: 800; line-height: 1; letter-spacing: 0.02em; }
  .sub { margin: 16px 0 0; font-size: 40px; letter-spacing: 0.08em; opacity: 0.85; }
  .lead { margin: 48px 0 0; font-size: 34px; font-weight: 700; }
  .note { position: absolute; left: 88px; bottom: 56px; font-size: 22px; opacity: 0.6; }
</style></head><body>
  <svg width="1200" height="630">${prisms(900, 330, 260)}
    ${Array.from({ length: 6 }, (_, i) => `<line x1="${-200 + i * 26}" y1="700" x2="${900 + i * 26}" y2="-100" stroke="${COLORS[0]}" stroke-opacity="0.12" stroke-width="2" />`).join('')}
  </svg>
  <div class="text">
    <h1>SIDE U</h1>
    <p class="sub">Selected by You</p>
    <p class="lead">Perfumeの楽曲から、あなたの13曲を。</p>
  </div>
  <p class="note">sideu.perfumehub.app ・ 非公式ファンツール</p>
</body></html>`

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="${BACKGROUND}"/>
  <polygon points="${triangle(32, 36, 22, -Math.PI / 2)}" fill="none" stroke="${COLORS[0]}" stroke-width="3.5" stroke-linejoin="round"/>
  <polygon points="${triangle(34, 34, 14, -Math.PI / 2 + 0.35)}" fill="none" stroke="${COLORS[2]}" stroke-width="2.5" stroke-linejoin="round" stroke-opacity="0.9"/>
</svg>
`

const publicDir = resolve(import.meta.dirname, '../public')
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
  await page.setContent(ogHtml, { waitUntil: 'networkidle' })
  await page.evaluate('document.fonts.ready')
  await page.screenshot({ path: resolve(publicDir, 'og/default.png') })

  writeFileSync(resolve(publicDir, 'favicon.svg'), iconSvg)
  const icon = await browser.newPage({ viewport: { width: 180, height: 180 } })
  // iOS はアイコンの角を自分で丸めるので、角を丸めない四角で出力する
  const touchIconSvg = iconSvg.replace('<svg ', '<svg width="180" height="180" ').replace('rx="14"', 'rx="0"')
  await icon.setContent(`<body style="margin:0">${touchIconSvg}</body>`)
  await icon.screenshot({ path: resolve(publicDir, 'apple-touch-icon.png') })
} finally {
  await browser.close()
}
console.log('public/og/default.png, public/favicon.svg, public/apple-touch-icon.png を作りました')
