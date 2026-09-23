import { describe, expect, it } from 'vitest'
import { decodePayload, encodePayload, InvalidSideUError } from '@shared/payload'
import { decodeBase64Url, encodeBase64Url } from '@shared/base64url'
import { crc16 } from '@shared/crc16'
import { catalog, pickSongs, randomSideU, seededRandom, unselectableId } from '../helpers'

const sideU = { songIds: pickSongs(), tagIds: [2, 9, 16] }

/** v1 の body を直接組み立てる（CRC を正しく付け直す） */
function rawV1(songIds: number[], tags: number[]): string {
  const bytes = new Uint8Array(31)
  const view = new DataView(bytes.buffer)
  songIds.forEach((id, i) => view.setUint16(i * 2, id))
  tags.forEach((id, i) => view.setUint8(26 + i, id))
  const withVersion = new Uint8Array(30)
  withVersion[0] = '1'.charCodeAt(0)
  withVersion.set(bytes.subarray(0, 29), 1)
  view.setUint16(29, crc16(withVersion))
  return `1${encodeBase64Url(bytes)}`
}

describe('encodePayload / decodePayload', () => {
  it('v1 は 43 文字（バージョン 1 文字 + 42 文字）', () => {
    const payload = encodePayload(sideU, catalog)
    expect(payload).toHaveLength(43)
    expect(payload[0]).toBe('1')
    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('ランダムな 1 万件で往復できる', () => {
    const random = seededRandom(20261223)
    for (let i = 0; i < 10_000; i++) {
      const input = randomSideU(random)
      expect(decodePayload(encodePayload(input, catalog), catalog)).toEqual({ ok: true, value: input })
    }
  })

  it('同じ内容は同じ文字列になる（タグの順番は問わない）', () => {
    const a = encodePayload({ songIds: sideU.songIds, tagIds: [16, 2, 9] }, catalog)
    const b = encodePayload({ songIds: sideU.songIds, tagIds: [2, 9, 16] }, catalog)
    expect(a).toBe(b)
  })

  it('曲順は保たれる', () => {
    const reversed = { songIds: [...sideU.songIds].reverse(), tagIds: [] }
    const decoded = decodePayload(encodePayload(reversed, catalog), catalog)
    expect(decoded.ok && decoded.value.songIds).toEqual(reversed.songIds)
  })

  it('不正な内容はエンコードできない', () => {
    expect(() => encodePayload({ songIds: sideU.songIds.slice(0, 12), tagIds: [] }, catalog)).toThrow(InvalidSideUError)
    expect(() => encodePayload({ songIds: sideU.songIds, tagIds: [1, 2] }, catalog)).toThrow('multiple-tags-in-category')
  })
})

describe('decodePayload の不正な入力', () => {
  const valid = encodePayload(sideU, catalog)

  it.each([
    ['', 'unsupported-version'],
    ['9' + valid.slice(1), 'unsupported-version'],
    [valid.slice(0, -1), 'malformed'],
    [valid + 'A', 'malformed'],
    [valid.slice(0, 10) + '+' + valid.slice(11), 'malformed'],
  ])('%s → %s', (input, error) => {
    expect(decodePayload(input, catalog)).toEqual({ ok: false, error })
  })

  it('1 文字でも変わると CRC で検出する', () => {
    for (let i = 1; i < valid.length - 1; i++) {
      const char = valid[i] === 'A' ? 'B' : 'A'
      const tampered = valid.slice(0, i) + char + valid.slice(i + 1)
      const result = decodePayload(tampered, catalog)
      expect(result.ok).toBe(false)
    }
  })

  it('例外を投げない', () => {
    const random = seededRandom(1)
    for (let i = 0; i < 2_000; i++) {
      const length = Math.floor(random() * 60)
      const text = Array.from({ length }, () => String.fromCharCode(32 + Math.floor(random() * 95))).join('')
      expect(() => decodePayload(text, catalog)).not.toThrow()
    }
  })

  it('カタログに照らした検証', () => {
    const songs = pickSongs()
    expect(decodePayload(rawV1([songs[0]!, ...songs.slice(0, 12)], []), catalog)).toEqual({ ok: false, error: 'duplicate-song' })
    expect(decodePayload(rawV1([60000, ...songs.slice(1)], []), catalog)).toEqual({ ok: false, error: 'unknown-song' })
    expect(decodePayload(rawV1([unselectableId, ...songs.slice(1)], []), catalog)).toEqual({ ok: false, error: 'unselectable-song' })
    expect(decodePayload(rawV1(songs, [200]), catalog)).toEqual({ ok: false, error: 'unknown-tag' })
    expect(decodePayload(rawV1(songs, [2, 2]), catalog)).toEqual({ ok: false, error: 'duplicate-tag' })
    expect(decodePayload(rawV1(songs, [1, 2]), catalog)).toEqual({ ok: false, error: 'multiple-tags-in-category' })
  })

  it('タグが正規形でなければ受け付けない', () => {
    const songs = pickSongs()
    expect(decodePayload(rawV1(songs, [9, 2]), catalog)).toEqual({ ok: false, error: 'non-canonical' })
    expect(decodePayload(rawV1(songs, [0, 2]), catalog)).toEqual({ ok: false, error: 'non-canonical' })
    expect(decodePayload(rawV1(songs, [2, 9]), catalog).ok).toBe(true)
  })

  it('base64url の余りのビットが 0 でないものは受け付けない', () => {
    const last = valid.at(-1)!
    const bytes = decodeBase64Url(valid.slice(1))!
    expect(bytes).toHaveLength(31)
    // 最後の文字の下位 4 ビットは使われない
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
    const variant = alphabet[alphabet.indexOf(last) | 1]!
    if (variant !== last) expect(decodePayload(valid.slice(0, -1) + variant, catalog).ok).toBe(false)
  })
})
