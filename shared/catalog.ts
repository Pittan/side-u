// 楽曲カタログの型（DESIGN.md §2.1）。DOM・Node の API に依存しない（Worker からも使う）。

export type SongKind = 'canonical' | 'mix' | 'remix' | 'instrumental' | 'other'

export type AppleMusicMapping =
  | {
      status: 'available'
      songId: string
      storefront: 'jp'
      /** null = 旧データから取り込んだだけで、まだ照合していない */
      verifiedAt: string | null
    }
  | { status: 'unavailable'; verifiedAt: string; note?: string }

export type Song = {
  /** 1..65535。一度公開した ID は削除も再利用もしない */
  id: number
  title: string
  /** 検索・並び替え用のよみ（ひらがな） */
  kana: string
  /** 検索用の別名。よみが複数ある曲や、英語表記で探されそうな曲に付ける */
  aliases?: string[]
  /** 通常 'Perfume'（ぱふゅ〜む名義などはそのまま） */
  artist: string
  /** YYYY-MM-DD（初出） */
  releasedOn?: string
  parentId?: number
  kind: SongKind
  /** instrumental は常に false */
  selectable: boolean
  /** null = 未調査（selectable なら検証エラー） */
  appleMusic: AppleMusicMapping | null
  sources: Array<{ label: string; url: string }>
  memo?: string
}

export type ReleaseKind = 'single' | 'album' | 'digital' | 'other'

export type Release = {
  id: number
  title: string
  kana: string
  kind: ReleaseKind
  releasedOn: string
  /** 通常盤（なければ最初の盤）の曲順。instrumental も含み、UI 側で除外する */
  trackIds: number[]
}

export type TagCategory = { id: string; label: string; order: number }

export type Tag = {
  /** 1..255。全カテゴリを通して一意 */
  id: number
  categoryId: string
  label: string
  /** 新しく選べなくするだけ。過去の URL での表示は続ける */
  retired?: boolean
}

export const MAX_SONG_ID = 0xffff
export const MAX_TAG_ID = 0xff

// ---------------------------------------------------------------------------
// ブラウザ・Worker に渡す軽量版（DESIGN.md §2.5）。`virtual:catalog` がビルド時に生成する。
// ---------------------------------------------------------------------------

export type CatalogSong = {
  id: number
  title: string
  kana: string
  aliases?: string[]
  /** 'Perfume' 以外の名義のときだけ入る */
  artist?: string
  parentId?: number
  kind: SongKind
  selectable: boolean
  releasedOn?: string
  /** 初出の作品（「作品・年」の表示用） */
  firstReleaseId?: number
  /** Apple Music のカタログ ID。null = 配信なしを確認済み、undefined = 未調査 */
  appleMusicId?: string | null
}

export type CatalogRelease = Pick<Release, 'id' | 'title' | 'kana' | 'kind' | 'releasedOn' | 'trackIds'>

export type CatalogData = {
  songs: CatalogSong[]
  releases: CatalogRelease[]
  tagCategories: TagCategory[]
  tags: Tag[]
}

export type Catalog = CatalogData & {
  songById: ReadonlyMap<number, CatalogSong>
  releaseById: ReadonlyMap<number, CatalogRelease>
  tagById: ReadonlyMap<number, Tag>
  /** 親曲 ID → 別バージョンの曲 */
  childrenByParentId: ReadonlyMap<number, CatalogSong[]>
}

export function toCatalogData(input: {
  songs: Song[]
  releases: Release[]
  tagCategories: TagCategory[]
  tags: Tag[]
}): CatalogData {
  const releasesByDate = [...input.releases].sort(
    (a, b) => a.releasedOn.localeCompare(b.releasedOn) || a.id - b.id,
  )
  const firstReleaseId = new Map<number, number>()
  for (const release of releasesByDate) {
    for (const id of release.trackIds) {
      if (!firstReleaseId.has(id)) firstReleaseId.set(id, release.id)
    }
  }

  const songs = input.songs.map(song => {
    const result: CatalogSong = {
      id: song.id,
      title: song.title,
      kana: song.kana,
      kind: song.kind,
      selectable: song.selectable,
    }
    if (song.aliases) result.aliases = song.aliases
    if (song.artist !== 'Perfume') result.artist = song.artist
    if (song.parentId !== undefined) result.parentId = song.parentId
    if (song.releasedOn) result.releasedOn = song.releasedOn
    const releaseId = firstReleaseId.get(song.id)
    if (releaseId !== undefined) result.firstReleaseId = releaseId
    if (song.appleMusic?.status === 'available') result.appleMusicId = song.appleMusic.songId
    else if (song.appleMusic?.status === 'unavailable') result.appleMusicId = null
    return result
  })

  const releases = input.releases.map(({ id, title, kana, kind, releasedOn, trackIds }) => ({
    id,
    title,
    kana,
    kind,
    releasedOn,
    trackIds,
  }))

  const tagCategories = [...input.tagCategories].sort((a, b) => a.order - b.order)
  return { songs, releases, tagCategories, tags: input.tags }
}

export function createCatalog(data: CatalogData): Catalog {
  const childrenByParentId = new Map<number, CatalogSong[]>()
  for (const song of data.songs) {
    if (song.parentId === undefined) continue
    const children = childrenByParentId.get(song.parentId) ?? []
    children.push(song)
    childrenByParentId.set(song.parentId, children)
  }
  return {
    ...data,
    songById: new Map(data.songs.map(song => [song.id, song])),
    releaseById: new Map(data.releases.map(release => [release.id, release])),
    tagById: new Map(data.tags.map(tag => [tag.id, tag])),
    childrenByParentId,
  }
}
