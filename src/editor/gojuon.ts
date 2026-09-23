// 五十音の行（あ・か・さ…）でグループ分けする
const ROWS = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'] as const
const ROW_CHARS = [
  'あいうえおぁぃぅぇぉ',
  'かきくけこ',
  'さしすせそ',
  'たちつてとっ',
  'なにぬねの',
  'はひふへほ',
  'まみむめも',
  'やゆよゃゅょ',
  'らりるれろ',
  'わをんゎ',
]
export const OTHER_ROW = '英数・記号'

export function gojuonRow(kana: string): string {
  // 濁点・半濁点を外す（が → か、ゔ → う）
  const first = kana.normalize('NFD').charAt(0)
  const index = ROW_CHARS.findIndex(chars => chars.includes(first))
  return index === -1 ? OTHER_ROW : ROWS[index]!
}

export const GOJUON_ORDER: string[] = [...ROWS, OTHER_ROW]
