import { catalog } from '@shared/catalog-instance'

export { catalog }

export const selectableIds = catalog.songs.filter(song => song.selectable).map(song => song.id)
export const unselectableId = catalog.songs.find(song => !song.selectable)!.id

/** 決まった順で 13 曲を返す（テストを再現可能にするため） */
export function pickSongs(offset = 0): number[] {
  return Array.from({ length: 13 }, (_, i) => selectableIds[(offset + i * 7) % selectableIds.length]!)
}

export function randomSideU(random: () => number) {
  const pool = [...selectableIds]
  const songIds: number[] = []
  while (songIds.length < 13) songIds.push(pool.splice(Math.floor(random() * pool.length), 1)[0]!)
  const tagIds = catalog.tagCategories
    .map(category => catalog.tags.filter(tag => tag.categoryId === category.id))
    .filter(() => random() < 0.6)
    .map(tags => tags[Math.floor(random() * tags.length)]!.id)
  return { songIds, tagIds: tagIds.sort((a, b) => a - b) }
}

/** mulberry32 */
export function seededRandom(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
