// v1 の <body>（DESIGN.md §3.2）
//   offset 0  26 byte  曲 ID × 13（uint16 big-endian）
//   offset 26  3 byte  タグ ID × 3（uint8、0 = なし。0 以外は昇順、0 は末尾）
//   offset 29  2 byte  CRC-16/CCITT-FALSE（バージョン文字 + offset 0..28）
// 31 byte → base64url 42 文字
import { decodeBase64Url, encodeBase64Url } from '../base64url'
import { crc16 } from '../crc16'
import { MAX_TAGS, SIDE_U_LENGTH, type PayloadCodec } from './types'
import { validateSideU } from './validate'

export const VERSION_CHAR = '1'
const DATA_LENGTH = SIDE_U_LENGTH * 2 + MAX_TAGS
const BODY_LENGTH = DATA_LENGTH + 2

function checksum(data: Uint8Array): number {
  const bytes = new Uint8Array(1 + data.length)
  bytes[0] = VERSION_CHAR.charCodeAt(0)
  bytes.set(data, 1)
  return crc16(bytes)
}

export const v1: PayloadCodec = {
  encode({ songIds, tagIds }) {
    const bytes = new Uint8Array(BODY_LENGTH)
    const view = new DataView(bytes.buffer)
    songIds.forEach((id, i) => view.setUint16(i * 2, id))
    ;[...tagIds].sort((a, b) => a - b).forEach((id, i) => view.setUint8(SIDE_U_LENGTH * 2 + i, id))
    view.setUint16(DATA_LENGTH, checksum(bytes.subarray(0, DATA_LENGTH)))
    return encodeBase64Url(bytes)
  },

  decode(body, catalog) {
    const bytes = decodeBase64Url(body)
    if (!bytes || bytes.length !== BODY_LENGTH) return { ok: false, error: 'malformed' }
    const view = new DataView(bytes.buffer)
    if (view.getUint16(DATA_LENGTH) !== checksum(bytes.subarray(0, DATA_LENGTH))) {
      return { ok: false, error: 'checksum-mismatch' }
    }

    const songIds = Array.from({ length: SIDE_U_LENGTH }, (_, i) => view.getUint16(i * 2))
    const rawTags = Array.from({ length: MAX_TAGS }, (_, i) => view.getUint8(SIDE_U_LENGTH * 2 + i))
    const tagIds = rawTags.filter(id => id !== 0)
    // 0 は末尾、0 以外は昇順でなければ正規形ではない
    const canonical = [...tagIds].sort((a, b) => a - b)
    if (rawTags.join() !== [...canonical, ...Array(MAX_TAGS - canonical.length).fill(0)].join()) {
      return { ok: false, error: 'non-canonical' }
    }

    const sideU = { songIds, tagIds }
    const error = validateSideU(sideU, catalog)
    return error ? { ok: false, error } : { ok: true, value: sideU }
  },
}
