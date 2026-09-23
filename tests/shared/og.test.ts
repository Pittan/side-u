import { describe, expect, it } from 'vitest'
import { fitFontSize, OG_LAYOUT, ogSongLines } from '@shared/og-layout'
import { ogDescription } from '@shared/og-meta'
import { catalog, pickSongs } from '../helpers'

describe('ogSongLines', () => {
  it('13 曲を 7 曲と 6 曲の 2 列に並べる', () => {
    const lines = ogSongLines(Array.from({ length: 13 }, (_, i) => `曲${i + 1}`))
    expect(lines).toHaveLength(13)
    expect(lines[0]).toMatchObject({ text: '01  曲1', top: OG_LAYOUT.listTop, left: OG_LAYOUT.columns[0].left })
    expect(lines[7]).toMatchObject({ text: '08  曲8', top: OG_LAYOUT.listTop, left: OG_LAYOUT.columns[1].left })
    expect(lines[12]!.top).toBe(OG_LAYOUT.listTop + 5 * OG_LAYOUT.lineHeight)
  })
})

describe('fitFontSize', () => {
  it('短い曲名はそのまま、長い曲名は列の幅に収まるよう小さくする', () => {
    expect(fitFontSize('01  ポリリズム')).toBe(OG_LAYOUT.titleSize)
    const long = fitFontSize('03  Spending all my time(DV&LM remix)')
    expect(long).toBeLessThan(OG_LAYOUT.titleSize)
    expect(long).toBeGreaterThanOrEqual(16)
  })

  it('カタログのどの曲名も、最小の大きさで列の幅に収まる見積もりになる', () => {
    for (const song of catalog.songs.filter(s => s.selectable)) {
      expect(fitFontSize(`13  ${song.title}`)).toBeGreaterThanOrEqual(16)
    }
  })
})

describe('ogDescription', () => {
  it('タグのあとに曲目を並べ、長ければ切る', () => {
    const text = ogDescription({ songIds: pickSongs(), tagIds: [5, 11] }, catalog)
    expect(text.startsWith('#深夜に #浸りたい 1. ')).toBe(true)
    expect(text.length).toBeLessThanOrEqual(200)
  })
})
