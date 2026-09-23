// プレイリストに入れる曲の確認と、送る内容の組み立て（DESIGN.md §8.2）。MusicKit には依存しない
import type { Catalog, CatalogSong } from '@shared/catalog'

export type TrackPlan = {
  songId: number
  /** Apple Music のカタログ ID。ない場合は undefined */
  appleMusicId?: string
  /** Apple Music にない場合の差し替え候補（同じ曲の別バージョンで、Apple Music にあるもの） */
  alternatives: CatalogSong[]
}

export function planTracks(songIds: number[], catalog: Catalog): TrackPlan[] {
  return songIds.map(songId => {
    const song = catalog.songById.get(songId)
    if (song?.appleMusicId) return { songId, appleMusicId: song.appleMusicId, alternatives: [] }
    const rootId = song?.parentId ?? songId
    const family = [catalog.songById.get(rootId), ...(catalog.childrenByParentId.get(rootId) ?? [])]
    const alternatives = family.filter(
      (candidate): candidate is CatalogSong =>
        !!candidate && candidate.id !== songId && candidate.selectable && !!candidate.appleMusicId && !songIds.includes(candidate.id),
    )
    return { songId, alternatives }
  })
}

/** 曲ごとの選択: 差し替える曲の ID、または null（その曲を除く） */
export type Resolution = Record<number, number | null>

/** 最終的に Apple Music に送るカタログ ID を、曲順どおりに並べる */
export function resolveTracks(plans: TrackPlan[], resolution: Resolution, catalog: Catalog): string[] {
  return plans.flatMap(plan => {
    if (plan.appleMusicId) return [plan.appleMusicId]
    const replacement = resolution[plan.songId]
    const id = replacement ? catalog.songById.get(replacement)?.appleMusicId : undefined
    return id ? [id] : []
  })
}

export function playlistName(displayName: string | null): string {
  return displayName ? `SIDE U - ${displayName}` : 'SIDE U'
}

/** 説明は決まった文言とタグだけで組み立てる（自由入力は入れない） */
export function playlistDescription(tagLabels: string[]): string {
  const tags = tagLabels.map(label => `#${label}`).join(' ')
  return ['SIDE U — Selected by You', tags, '非公式ファンツール SIDE U でつくりました'].filter(Boolean).join(' / ')
}

export function createPlaylistBody(name: string, description: string, appleMusicIds: string[]) {
  return {
    attributes: { name, description },
    relationships: { tracks: { data: appleMusicIds.map(id => ({ id, type: 'songs' as const })) } },
  }
}

/** ビルド時に埋め込んだ開発者トークンが使えるか（期限の 1 時間前からは使わない） */
export function isTokenUsable(token: string | undefined, expiresAtSeconds: number | undefined, now = Date.now()): boolean {
  return !!token && !!expiresAtSeconds && expiresAtSeconds * 1000 - 60 * 60 * 1000 > now
}
