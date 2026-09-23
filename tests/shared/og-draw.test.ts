import { expect, it } from 'vitest'
import { OG_LAYOUT } from '@shared/og-layout'
import { buildDraw } from '@shared/og-draw'

it('13 曲とタグを 14 個の文字として描く（改行は使わない）', () => {
  const draw = buildDraw(
    Array.from({ length: 13 }, (_, i) => (i === 2 ? 'Spending all my time(DV&LM remix)' : `曲${i + 1}`)),
    ['深夜に', '浸りたい'],
    'https://example.com/font.woff2',
  )
  expect(draw).toHaveLength(14)
  expect(draw.every(item => !item.text.includes('\n'))).toBe(true)
  expect(draw.at(-1)).toMatchObject({ text: '#深夜に   #浸りたい', color: OG_LAYOUT.tagColor })
  // 小さくした行は、下にずらして真ん中をそろえる
  expect(draw[2]!.size).toBeLessThan(OG_LAYOUT.titleSize)
  expect(draw[2]!.top).toBeGreaterThan(OG_LAYOUT.listTop + 2 * OG_LAYOUT.lineHeight)
})
