import { describe, expect, it } from 'vitest'
import { createCatalog, type CatalogData } from '@shared/catalog'
import {
  createPlaylistBody,
  isTokenUsable,
  planTracks,
  playlistDescription,
  playlistName,
  resolveTracks,
} from '@/apple-music/plan'

const song = (id: number, extra: object = {}) => ({ id, title: `曲${id}`, kana: 'きょく', kind: 'canonical' as const, selectable: true, ...extra })
const data: CatalogData = {
  songs: [
    song(1, { appleMusicId: 'a1' }),
    song(2), // 配信なし・別バージョンもなし
    song(3), // 配信なし。別バージョン 4 は配信あり
    song(4, { parentId: 3, kind: 'mix', appleMusicId: 'a4' }),
    song(5, { parentId: 3, kind: 'instrumental', selectable: false, appleMusicId: 'a5' }),
  ],
  releases: [],
  tagCategories: [],
  tags: [],
}
const catalog = createCatalog(data)

describe('planTracks / resolveTracks', () => {
  it('配信されていない曲には、配信されている別バージョン（選べるものだけ）を提案する', () => {
    const plans = planTracks([1, 2, 3], catalog)
    expect(plans.map(plan => plan.appleMusicId)).toEqual(['a1', undefined, undefined])
    expect(plans[1]!.alternatives).toEqual([])
    expect(plans[2]!.alternatives.map(s => s.id)).toEqual([4])
  })

  it('別バージョンから見て親曲も候補になる。すでに入っている曲は候補にしない', () => {
    const withParent = createCatalog({ ...data, songs: [song(3, { appleMusicId: 'a3' }), song(4, { parentId: 3, kind: 'mix' })] })
    expect(planTracks([4], withParent)[0]!.alternatives.map(s => s.id)).toEqual([3])
    expect(planTracks([4, 3], withParent)[0]!.alternatives).toEqual([])
  })

  it('差し替え・除外を反映して、曲順どおりに並べる（勝手に差し替えない）', () => {
    const plans = planTracks([3, 1, 2], catalog)
    expect(resolveTracks(plans, {}, catalog)).toEqual(['a1'])
    expect(resolveTracks(plans, { 3: 4, 2: null }, catalog)).toEqual(['a4', 'a1'])
  })
})

describe('送る内容', () => {
  it('名前がなければ SIDE U だけ', () => {
    expect(playlistName('あもん')).toBe('SIDE U - あもん')
    expect(playlistName(null)).toBe('SIDE U')
  })

  it('説明は決まった文言とタグだけ', () => {
    expect(playlistDescription(['深夜に', '浸りたい'])).toBe('SIDE U — Selected by You / #深夜に #浸りたい / 非公式ファンツール SIDE U でつくりました')
    expect(playlistDescription([])).toBe('SIDE U — Selected by You / 非公式ファンツール SIDE U でつくりました')
  })

  it('Apple Music API の形', () => {
    expect(createPlaylistBody('SIDE U', 'd', ['a1', 'a4'])).toEqual({
      attributes: { name: 'SIDE U', description: 'd' },
      relationships: { tracks: { data: [{ id: 'a1', type: 'songs' }, { id: 'a4', type: 'songs' }] } },
    })
  })
})

it('トークンは期限の 1 時間前から使わない', () => {
  const now = Date.UTC(2026, 8, 23)
  expect(isTokenUsable(undefined, undefined, now)).toBe(false)
  expect(isTokenUsable('t', now / 1000 + 2 * 3600, now)).toBe(true)
  expect(isTokenUsable('t', now / 1000 + 1800, now)).toBe(false)
})
