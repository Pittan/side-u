// 共有 URL の payload（DESIGN.md §3）。先頭 1 文字がバージョンで、残りの <body> の形式はバージョンごとに異なる。
// 公開済みのバージョンの意味は変えない。デコーダは過去のすべてのバージョンを残す（§3.4）。
import type { Catalog } from '../catalog'
import type { DecodeResult, PayloadCodec, SideU } from './types'
import { validateSideU } from './validate'
import { v1, VERSION_CHAR as V1 } from './v1'

export * from './types'

const CODECS: Record<string, PayloadCodec> = { [V1]: v1 }
const LATEST = V1

export class InvalidSideUError extends Error {}

/** 常に最新バージョンでエンコードする。内容が不正なら例外 */
export function encodePayload(sideU: SideU, catalog: Catalog): string {
  const error = validateSideU(sideU, catalog)
  if (error) throw new InvalidSideUError(error)
  return LATEST + CODECS[LATEST]!.encode(sideU)
}

/** 例外は投げない。不正な入力は { ok: false } を返す */
export function decodePayload(payload: string, catalog: Catalog): DecodeResult {
  const codec = CODECS[payload.charAt(0)]
  if (!codec) return { ok: false, error: 'unsupported-version' }
  return codec.decode(payload.slice(1), catalog)
}
