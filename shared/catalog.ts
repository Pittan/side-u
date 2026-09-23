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
