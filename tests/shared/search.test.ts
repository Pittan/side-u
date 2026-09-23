import { describe, expect, it } from 'vitest'
import { buildSearchIndex, normalizeForSearch, searchSongs } from '@shared/search'
import { catalog } from '../helpers'

const index = buildSearchIndex(catalog.songs)
const titles = (query: string) => searchSongs(index, query).map(song => song.title)

describe('normalizeForSearch', () => {
  it('カタカナをひらがなに、全角を半角に、大文字を小文字にする', () => {
    expect(normalizeForSearch('ポリリズム')).toBe('ぽりりずむ')
    expect(normalizeForSearch('ＥＤＧＥ')).toBe('edge')
    expect(normalizeForSearch('ヴ')).toBe('ゔ')
  })

  it('記号と空白を無視する', () => {
    expect(normalizeForSearch('チョコレイト・ディスコ')).toBe('ちょこれいとでぃすこ')
    expect(normalizeForSearch('edge (⊿-mix)')).toBe('edgemix')
  })
})

describe('searchSongs', () => {
  it('ひらがな・カタカナのどちらでも見つかる', () => {
    expect(titles('ぽりりずむ')).toContain('ポリリズム')
    expect(titles('ポリリズム')).toContain('ポリリズム')
  })

  it('よみで見つかる', () => {
    expect(titles('すぴにんぐ')).toContain('Spinning World')
  })

  it('別名で見つかる', () => {
    expect(titles('いぐじっと')).toContain('exit')
    expect(titles('えぐじっと')).toContain('exit')
  })

  it('空の検索ではすべての曲', () => {
    expect(searchSongs(index, '  ')).toHaveLength(catalog.songs.length)
  })
})
