import { describe, expect, it } from 'vitest'
import { decodeBase64Url, encodeBase64Url } from '@shared/base64url'

describe('base64url', () => {
  it('RFC 4648 のテストベクタと一致する', () => {
    const vectors: Array<[string, string]> = [
      ['', ''],
      ['f', 'Zg'],
      ['fo', 'Zm8'],
      ['foo', 'Zm9v'],
      ['foob', 'Zm9vYg'],
      ['fooba', 'Zm9vYmE'],
      ['foobar', 'Zm9vYmFy'],
    ]
    for (const [plain, encoded] of vectors) {
      const bytes = new TextEncoder().encode(plain)
      expect(encodeBase64Url(bytes)).toBe(encoded)
      expect(decodeBase64Url(encoded)).toEqual(bytes)
    }
  })

  it('+ / の代わりに - _ を使う', () => {
    expect(encodeBase64Url(new Uint8Array([0xfb, 0xff]))).toBe('-_8')
  })

  it('ランダムなバイト列で往復できる', () => {
    for (let n = 0; n < 200; n++) {
      const bytes = crypto.getRandomValues(new Uint8Array(n % 40))
      expect(decodeBase64Url(encodeBase64Url(bytes))).toEqual(bytes)
    }
  })

  it('不正な入力は null', () => {
    expect(decodeBase64Url('Zm9v=')).toBeNull() // パディング
    expect(decodeBase64Url('Zm+v')).toBeNull() // base64 の文字
    expect(decodeBase64Url('Z')).toBeNull() // 長さ
    expect(decodeBase64Url('Zh')).toBeNull() // 余りのビットが 0 でない（正規形でない）
  })
})
