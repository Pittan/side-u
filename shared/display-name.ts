// 表示名の正規化（DESIGN.md §3.6）。表示には必ずテキストとして使い、HTML として挿入しない。

export const MAX_NAME_GRAPHEMES = 10

const ZWJ = '‍'
const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' })

export function normalizeDisplayName(input: string): string {
  return (
    input
      .normalize('NFKC')
      // 改行・タブなどは、制御文字として消す前に空白にしておく（単語がつながらないように）
      .replace(/[\t\n\v\f\r\p{Zl}\p{Zp}]/gu, ' ')
      // 制御文字・書式文字（双方向制御やゼロ幅文字を含む）を削除する。絵文字の結合に使う ZWJ だけは残す
      .replace(/[\p{Cc}\p{Cf}]/gu, char => (char === ZWJ ? char : ''))
      .replace(/\s+/gu, ' ')
      .trim()
  )
}

export function countGraphemes(text: string): number {
  let count = 0
  for (const _ of segmenter.segment(text)) count++
  return count
}

/** 入力欄用。正規化してから MAX_NAME_GRAPHEMES 文字で切る */
export function clampDisplayName(input: string): string {
  const normalized = normalizeDisplayName(input)
  const graphemes = Array.from(segmenter.segment(normalized), s => s.segment)
  return graphemes.length > MAX_NAME_GRAPHEMES
    ? graphemes.slice(0, MAX_NAME_GRAPHEMES).join('').trim()
    : normalized
}

/** URL から読み込む用。長すぎる名前は切り詰めずに無視する */
export function parseDisplayName(input: string): string | null {
  const normalized = normalizeDisplayName(input)
  if (!normalized || countGraphemes(normalized) > MAX_NAME_GRAPHEMES) return null
  return normalized
}
