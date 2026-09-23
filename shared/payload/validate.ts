import type { Catalog } from '../catalog'
import { MAX_TAGS, SIDE_U_LENGTH, type DecodeError, type SideU } from './types'

/** カタログに照らした検証。エンコード前とデコード後の両方で使う */
export function validateSideU({ songIds, tagIds }: SideU, catalog: Catalog): DecodeError | null {
  if (songIds.length !== SIDE_U_LENGTH || tagIds.length > MAX_TAGS) return 'malformed'
  if (new Set(songIds).size !== songIds.length) return 'duplicate-song'
  for (const id of songIds) {
    const song = catalog.songById.get(id)
    if (!song) return 'unknown-song'
    if (!song.selectable) return 'unselectable-song'
  }

  if (new Set(tagIds).size !== tagIds.length) return 'duplicate-tag'
  const categories = new Set<string>()
  for (const id of tagIds) {
    const tag = catalog.tagById.get(id)
    if (!tag) return 'unknown-tag'
    if (categories.has(tag.categoryId)) return 'multiple-tags-in-category'
    categories.add(tag.categoryId)
  }
  return null
}
