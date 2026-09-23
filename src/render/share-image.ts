// 共有画像（DESIGN.md §6.1）。本人の完成画面のカードもこの画像そのもの。見た目は仮。
import { createPattern, trianglePoints, type Pattern } from '@shared/pattern'

export type ImageVariant = 'story' | 'square' | 'transparent'

export const VARIANTS: Record<ImageVariant, { label: string; width: number; height: number; transparent: boolean }> = {
  story: { label: '9:16', width: 1080, height: 1920, transparent: false },
  square: { label: '正方形', width: 1080, height: 1080, transparent: false },
  transparent: { label: '背景透過', width: 1080, height: 1350, transparent: true },
}

export type ShareImageData = {
  payload: string
  name: string | null
  titles: string[]
  tags: string[]
}

const FONT = '"LINE Seed JP", system-ui, sans-serif'
const SITE_LABEL = 'sideu.perfumehub.app ・ 非公式ファンツール'

export function subtitle(name: string | null): string {
  return name ? `Selected by ${name}` : 'Selected by You'
}

export function altText({ name, titles, tags }: ShareImageData): string {
  const songs = titles.map((title, i) => `${i + 1} ${title}`).join('、')
  const tagText = tags.length ? `タグ: ${tags.join('、')}。` : ''
  return `SIDE U。${name ? `${name} の` : ''}13曲。${songs}。${tagText}`
}

/** 描く前に、使う文字のフォントを読み込む（Google Fonts は文字の範囲ごとに分割されているため） */
export async function loadFonts(data: ShareImageData): Promise<void> {
  const text = ['SIDE U', subtitle(data.name), SITE_LABEL, '0123456789#', ...data.titles, ...data.tags].join('')
  try {
    await Promise.all([document.fonts.load(`700 64px ${FONT}`, text), document.fonts.load(`400 40px ${FONT}`, text)])
  } catch {
    // 読み込めなくてもシステムフォントで描く
  }
}

function drawPattern(ctx: CanvasRenderingContext2D, pattern: Pattern, width: number, height: number) {
  for (const shape of pattern.shapes) {
    ctx.save()
    ctx.globalAlpha = shape.opacity
    ctx.strokeStyle = shape.color
    ctx.fillStyle = shape.color
    ctx.lineWidth = 4
    ctx.beginPath()
    if (shape.kind === 'triangle') {
      const points = trianglePoints(shape, width, height)
      points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
      ctx.closePath()
      if (shape.filled) {
        ctx.globalAlpha = shape.opacity * 0.35
        ctx.fill()
      } else {
        ctx.stroke()
      }
    } else if (shape.kind === 'ring') {
      ctx.arc(shape.cx * width, shape.cy * height, shape.r * Math.min(width, height), 0, Math.PI * 2)
      ctx.stroke()
    } else {
      ctx.lineWidth = 2
      ctx.moveTo(shape.x1 * width, shape.y1 * height)
      ctx.lineTo(shape.x2 * width, shape.y2 * height)
      ctx.stroke()
    }
    ctx.restore()
  }
}

/** 幅に収まるまでフォントを小さくする（曲名は省略しない） */
function fitText(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number, minSize: number) {
  let current = size
  ctx.font = `${weight} ${current}px ${FONT}`
  while (current > minSize && ctx.measureText(text).width > maxWidth) {
    current -= 1
    ctx.font = `${weight} ${current}px ${FONT}`
  }
  return current
}

export function drawShareImage(variant: ImageVariant, data: ShareImageData): HTMLCanvasElement {
  const { width, height, transparent } = VARIANTS[variant]
  const pattern = createPattern(data.payload)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const padding = 80
  if (transparent) {
    // 写真の上でも読めるよう、半透明の板を敷く
    ctx.save()
    ctx.fillStyle = pattern.background
    ctx.globalAlpha = 0.78
    ctx.beginPath()
    ctx.roundRect(padding / 2, padding / 2, width - padding, height - padding, 56)
    ctx.fill()
    ctx.restore()
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(padding / 2, padding / 2, width - padding, height - padding, 56)
    ctx.clip()
    drawPattern(ctx, pattern, width, height)
    ctx.restore()
  } else {
    ctx.fillStyle = pattern.background
    ctx.fillRect(0, 0, width, height)
    drawPattern(ctx, pattern, width, height)
  }

  const left = padding + (transparent ? 24 : 0)
  const maxWidth = width - left * 2
  const top = variant === 'story' ? 220 : padding + (transparent ? 24 : 0)
  const bottom = height - (variant === 'story' ? 220 : padding + (transparent ? 24 : 0))

  ctx.fillStyle = pattern.foreground
  ctx.textBaseline = 'alphabetic'

  let y = top + 96
  ctx.font = `800 104px ${FONT}`
  ctx.fillText('SIDE U', left, y)
  y += 60
  fitText(ctx, subtitle(data.name), 400, 40, maxWidth, 24)
  ctx.globalAlpha = 0.85
  ctx.fillText(subtitle(data.name), left, y)
  ctx.globalAlpha = 1

  // フッターとタグの位置を先に決め、残りの高さに 13 曲を収める
  const footerY = bottom
  const tagsY = footerY - (data.tags.length ? 72 : 20)
  const listTop = y + 72
  const listBottom = tagsY - (data.tags.length ? 64 : 24)
  const lineHeight = (listBottom - listTop) / data.titles.length
  const fontSize = Math.min(48, Math.floor(lineHeight * 0.62))
  const numberWidth = fontSize * 1.8

  data.titles.forEach((title, i) => {
    const baseline = listTop + lineHeight * (i + 0.72)
    ctx.globalAlpha = 0.6
    ctx.font = `700 ${fontSize}px ${FONT}`
    ctx.fillText(String(i + 1).padStart(2, '0'), left, baseline)
    ctx.globalAlpha = 1
    fitText(ctx, title, 700, fontSize, maxWidth - numberWidth, Math.floor(fontSize * 0.6))
    ctx.fillText(title, left + numberWidth, baseline)
  })

  if (data.tags.length) {
    ctx.fillStyle = pattern.accent
    fitText(ctx, data.tags.map(tag => `#${tag}`).join('   '), 700, 40, maxWidth, 24)
    ctx.fillText(data.tags.map(tag => `#${tag}`).join('   '), left, tagsY)
    ctx.fillStyle = pattern.foreground
  }

  ctx.globalAlpha = 0.6
  fitText(ctx, SITE_LABEL, 400, 26, maxWidth, 18)
  ctx.fillText(SITE_LABEL, left, footerY)
  ctx.globalAlpha = 1

  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('画像を作れませんでした'))), 'image/png')
  })
}
