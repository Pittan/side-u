// 曲の検索（DESIGN.md §4.3 F-13）。ひらがな・カタカナ・全角/半角・大文字/小文字の違いと、記号・空白を無視する。
import type { CatalogSong } from './catalog'

export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60))
    .replace(/[\s\p{P}\p{S}]/gu, '')
}

export type SearchIndex = Array<{ song: CatalogSong; keys: string[] }>

export function buildSearchIndex(songs: CatalogSong[]): SearchIndex {
  return songs.map(song => ({
    song,
    keys: [song.title, song.kana, ...(song.aliases ?? [])].map(normalizeForSearch),
  }))
}

export function searchSongs(index: SearchIndex, query: string): CatalogSong[] {
  const needle = normalizeForSearch(query)
  if (!needle) return index.map(entry => entry.song)
  return index.filter(entry => entry.keys.some(key => key.includes(needle))).map(entry => entry.song)
}
