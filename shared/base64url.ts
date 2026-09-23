// パディングなしの base64url。atob/btoa や Buffer を使わず、ブラウザと Worker の両方で同じように動かす。

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
const LOOKUP = new Map([...ALPHABET].map((char, index) => [char, index]))

export function encodeBase64Url(bytes: Uint8Array): string {
  let result = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]!
    const b1 = bytes[i + 1]
    const b2 = bytes[i + 2]
    result += ALPHABET[b0 >> 2]
    result += ALPHABET[((b0 & 0x03) << 4) | ((b1 ?? 0) >> 4)]
    if (b1 !== undefined) result += ALPHABET[((b1 & 0x0f) << 2) | ((b2 ?? 0) >> 6)]
    if (b2 !== undefined) result += ALPHABET[b2 & 0x3f]
  }
  return result
}

/** 不正な文字・長さ、または使われないビットが 0 でない（正規形でない）場合は null */
export function decodeBase64Url(text: string): Uint8Array | null {
  if (text.length % 4 === 1) return null
  const bytes = new Uint8Array(Math.floor((text.length * 3) / 4))
  let buffer = 0
  let bits = 0
  let offset = 0
  for (const char of text) {
    const value = LOOKUP.get(char)
    if (value === undefined) return null
    buffer = (buffer << 6) | value
    bits += 6
    if (bits >= 8) {
      bits -= 8
      bytes[offset++] = (buffer >> bits) & 0xff
    }
  }
  if ((buffer & ((1 << bits) - 1)) !== 0) return null
  return bytes
}
