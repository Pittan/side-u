import type { Catalog } from '../catalog'

export const SIDE_U_LENGTH = 13
export const MAX_TAGS = 3

/** 共有 URL で表す内容。表示名は fragment にあるので含まない */
export type SideU = {
  /** 曲順どおりの 13 曲 */
  songIds: number[]
  /** 0〜3 個。正規形では昇順 */
  tagIds: number[]
}

export type DecodeError =
  | 'unsupported-version'
  | 'malformed'
  | 'checksum-mismatch'
  | 'duplicate-song'
  | 'unknown-song'
  | 'unselectable-song'
  | 'unknown-tag'
  | 'duplicate-tag'
  | 'multiple-tags-in-category'
  | 'non-canonical'

export type DecodeResult = { ok: true; value: SideU } | { ok: false; error: DecodeError }

export type PayloadCodec = {
  encode(sideU: SideU): string
  decode(body: string, catalog: Catalog): DecodeResult
}
