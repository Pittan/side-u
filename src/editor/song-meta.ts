import type { Catalog, CatalogSong } from '@shared/catalog'

/** 「作品・年」。初出がわからない曲は空文字（DESIGN.md F-18a） */
export function songMeta(song: CatalogSong, catalog: Catalog): string {
  const release = song.firstReleaseId === undefined ? undefined : catalog.releaseById.get(song.firstReleaseId)
  const year = song.releasedOn?.slice(0, 4)
  return [release?.title, year].filter(Boolean).join('・')
}

export function isAppleMusicUnavailable(song: CatalogSong): boolean {
  return song.appleMusicId === null
}
