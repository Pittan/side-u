// 動的 OGP 画像（1200×630）のレイアウト。背景画像（scripts/generate-static-images.ts）と
// Worker（worker/og-image.ts）の両方がこの値を使うので、位置がずれない。
export const OG_WIDTH = 1200
export const OG_HEIGHT = 630

export const OG_LAYOUT = {
  /** 曲名の列。左に 1〜7 曲目、右に 8〜13 曲目 */
  columns: [
    { left: 64, count: 7 },
    { left: 624, count: 6 },
  ],
  listTop: 196,
  lineHeight: 46,
  titleSize: 28,
  /** 曲名 1 行の最大の幅（これを超えたら縮める） */
  maxLineWidth: 512,
  tagsTop: 540,
  tagsLeft: 64,
  tagSize: 28,
  textColor: '#f5f7ff',
  numberColor: '#8f94b3',
  tagColor: '#5ce1e6',
} as const

export function ogSongLines(titles: string[]): Array<{ text: string; top: number; left: number }> {
  const lines: Array<{ text: string; top: number; left: number }> = []
  let index = 0
  for (const column of OG_LAYOUT.columns) {
    for (let row = 0; row < column.count && index < titles.length; row++, index++) {
      lines.push({
        text: `${String(index + 1).padStart(2, '0')}  ${titles[index]}`,
        top: OG_LAYOUT.listTop + row * OG_LAYOUT.lineHeight,
        left: column.left,
      })
    }
  }
  return lines
}

/** 全角・半角の違いから、文字の幅をおおよそ見積もる（1 = 文字の大きさと同じ幅） */
function estimateWidth(text: string): number {
  let width = 0
  for (const char of text) width += /[\u0020-\u007e]/.test(char) ? 0.56 : 1
  return width
}

/** 列の幅に収まる文字の大きさ。cf.image の draw では描いた文字を縮められないので、描く前に決める */
export function fitFontSize(text: string, maxSize: number = OG_LAYOUT.titleSize, maxWidth: number = OG_LAYOUT.maxLineWidth, minSize = 16): number {
  return Math.max(minSize, Math.min(maxSize, Math.floor(maxWidth / estimateWidth(text))))
}
