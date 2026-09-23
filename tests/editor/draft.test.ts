import { describe, expect, it } from 'vitest'
import { emptyDraft, parseDraft, toggleTag } from '@/editor/draft'
import { catalog, selectableIds, unselectableId } from '../helpers'

describe('parseDraft', () => {
  it('壊れたデータや知らないバージョンは空の下書き', () => {
    for (const raw of [null, 'x', 1, {}, { v: 2, sideU: [1] }]) {
      expect(parseDraft(raw, catalog).draft).toEqual(emptyDraft())
    }
  })

  it('カタログにない曲・選べない曲・重複を取り除く', () => {
    const [a, b, c] = selectableIds
    const { draft, removedSongIds } = parseDraft({ v: 1, sideU: [a, 60000, a, unselectableId, b], candidates: [b, c, 'x'] }, catalog)
    expect(draft.sideU).toEqual([a, b])
    expect(draft.candidates).toEqual([c])
    expect(removedSongIds).toEqual([60000, unselectableId])
  })

  it('Side U が 13 曲を超えていたら、あふれた分を候補の先頭に回す', () => {
    const ids = selectableIds.slice(0, 15)
    const { draft } = parseDraft({ v: 1, sideU: ids, candidates: [] }, catalog)
    expect(draft.sideU).toEqual(ids.slice(0, 13))
    expect(draft.candidates).toEqual(ids.slice(13))
  })

  it('合計 50 曲まで', () => {
    const { draft } = parseDraft({ v: 1, sideU: [], candidates: selectableIds.slice(0, 60) }, catalog)
    expect(draft.candidates).toHaveLength(50)
  })

  it('タグは 1 カテゴリ 1 つまで、名前は整形する', () => {
    const { draft } = parseDraft({ v: 1, tagIds: [1, 2, 9, 999], name: '‮あいうえおかきくけこさし' }, catalog)
    expect(draft.tagIds).toEqual([1, 9])
    expect(draft.name).toBe('あいうえおかきくけこ')
  })
})

describe('toggleTag', () => {
  it('同じカテゴリのタグは入れ替わり、選択中のタグは外れる', () => {
    expect(toggleTag([1, 9], 2, catalog)).toEqual([9, 2])
    expect(toggleTag([1, 9], 9, catalog)).toEqual([1])
    expect(toggleTag([], 16, catalog)).toEqual([16])
  })
})

describe('draftStatus', () => {
  const base = { ...emptyDraft(), sideU: [1], name: 'x' }

  it('空 / 作成中 / 完成 / 完成後に編集', async () => {
    const { draftStatus } = await import('@/editor/draft')
    expect(draftStatus(emptyDraft(), null)).toBe('empty')
    expect(draftStatus(base, null)).toBe('editing')
    expect(draftStatus({ ...base, completedPayload: '1abc' }, '1abc')).toBe('completed')
    expect(draftStatus({ ...base, completedPayload: '1abc' }, '1abd')).toBe('editedAfterComplete')
    expect(draftStatus({ ...base, completedPayload: '1abc' }, null)).toBe('editedAfterComplete')
  })

  it('完成したときの payload を読み込める', () => {
    expect(parseDraft({ v: 1, completedPayload: '1abc' }, catalog).draft.completedPayload).toBe('1abc')
    expect(parseDraft({ v: 1, completedPayload: 3 }, catalog).draft).not.toHaveProperty('completedPayload')
  })
})
