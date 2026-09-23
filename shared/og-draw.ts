// 動的 OGP 画像で、背景に重ねる文字（fetch の cf.image の draw に渡す）。改行は使えないので 1 行ずつ描く
import { fitFontSize, OG_LAYOUT, ogSongLines } from './og-layout'

/** cf.image の draw に文字を指定する形。型定義（workers-types）がまだ text に対応していないので自前で定義する */
type DrawText = { text: string; font: { url: string }; size: number; color: string; top: number; left: number }

export function buildDraw(titles: string[], tagLabels: string[], fontUrl: string): DrawText[] {
  const font = { url: fontUrl }
  const draw: DrawText[] = ogSongLines(titles).map(line => {
    const size = fitFontSize(line.text)
    return {
      text: line.text,
      font,
      size,
      color: OG_LAYOUT.textColor,
      // 文字を小さくした行は、行の真ん中がそろうよう下にずらす
      top: line.top + Math.round((OG_LAYOUT.titleSize - size) / 2),
      left: line.left,
    }
  })
  if (tagLabels.length) {
    const text = tagLabels.map(label => `#${label}`).join('   ')
    draw.push({
      text,
      font,
      size: fitFontSize(text, OG_LAYOUT.tagSize, 1072),
      color: OG_LAYOUT.tagColor,
      top: OG_LAYOUT.tagsTop,
      left: OG_LAYOUT.tagsLeft,
    })
  }
  return draw
}
