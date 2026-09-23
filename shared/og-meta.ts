// 共有ページの OGP メタデータ（Worker が HTML に差し込む）。表示名は fragment にあってサーバーに届かないので使わない
import type { Catalog } from './catalog'
import type { SideU } from './payload'

export const OG_TITLE = 'SIDE U — Selected by You'
export const OG_DEFAULT_DESCRIPTION = 'もし、あなたにも13曲を選ぶSideがあったなら。'
/** SNS のカードで途中が切られても読めるよう、先頭の数曲とタグを優先する */
const MAX_DESCRIPTION_LENGTH = 200

export function ogDescription(sideU: SideU, catalog: Catalog): string {
  const tags = sideU.tagIds.map(id => `#${catalog.tagById.get(id)?.label ?? ''}`).join(' ')
  const songs = sideU.songIds.map((id, i) => `${i + 1}. ${catalog.songById.get(id)?.title ?? ''}`).join(' / ')
  const text = [tags, songs].filter(Boolean).join(' ')
  return text.length > MAX_DESCRIPTION_LENGTH ? `${text.slice(0, MAX_DESCRIPTION_LENGTH - 1)}…` : text
}
