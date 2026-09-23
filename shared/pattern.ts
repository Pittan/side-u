// 共有 URL から幾何学模様を決める（DESIGN.md §6.2）。
// 同じ payload なら必ず同じ模様になる。出力は描画方法に依存しない図形のデータで、
// Canvas（共有画像）と SVG（ほかの人の共有ページ）の両方で描ける。
// 生成規則を変えるときは payload のバージョンで振り分ける（§3.4）。見た目は仮。

/** 座標はすべて 0〜1 の相対値（幅・高さに掛けて使う） */
export type Shape =
  | { kind: 'triangle'; cx: number; cy: number; r: number; rotation: number; color: string; opacity: number; filled: boolean }
  | { kind: 'ring'; cx: number; cy: number; r: number; color: string; opacity: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; color: string; opacity: number }

export type Pattern = {
  background: string
  foreground: string
  accent: string
  shapes: Shape[]
}

const PALETTES = [
  { background: '#0d0f1a', foreground: '#f5f7ff', colors: ['#5ce1e6', '#b388ff', '#ff6ec7'] },
  { background: '#101820', foreground: '#f2f2f2', colors: ['#7fe3ff', '#ffe066', '#9dff9d'] },
  { background: '#1a0d1f', foreground: '#fff4fb', colors: ['#ff7aa2', '#ffd1e8', '#8ec5ff'] },
  { background: '#0b1a17', foreground: '#effff9', colors: ['#3ff0c4', '#c3fff0', '#ffd166'] },
] as const

/** FNV-1a 32bit */
export function hashString(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** mulberry32。ブラウザによって結果が変わらない乱数 */
export function createRandom(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createPattern(payload: string): Pattern {
  const random = createRandom(hashString(payload))
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!
  const palette = pick(PALETTES)
  const shapes: Shape[] = []

  // 大きな三角形を重ねる（プリズムのような印象）
  const count = 3 + Math.floor(random() * 3)
  const cx = 0.55 + random() * 0.35
  const cy = 0.1 + random() * 0.25
  const baseRotation = random() * Math.PI * 2
  for (let i = 0; i < count; i++) {
    shapes.push({
      kind: 'triangle',
      cx: cx + (random() - 0.5) * 0.12,
      cy: cy + (random() - 0.5) * 0.12,
      r: 0.18 + i * 0.07 + random() * 0.04,
      rotation: baseRotation + i * (0.15 + random() * 0.2),
      color: pick(palette.colors),
      opacity: 0.25 + random() * 0.35,
      filled: random() < 0.25,
    })
  }

  // 細い平行線
  const angle = random() * Math.PI
  const lines = 4 + Math.floor(random() * 4)
  for (let i = 0; i < lines; i++) {
    const offset = (i - lines / 2) * 0.035
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const ox = 0.5 - dy * offset
    const oy = 0.8 + dx * offset
    shapes.push({ kind: 'line', x1: ox - dx, y1: oy - dy, x2: ox + dx, y2: oy + dy, color: palette.colors[0], opacity: 0.18 })
  }

  // 小さな円
  for (let i = 0; i < 2; i++) {
    shapes.push({
      kind: 'ring',
      cx: random(),
      cy: 0.5 + random() * 0.5,
      r: 0.03 + random() * 0.06,
      color: pick(palette.colors),
      opacity: 0.35,
    })
  }

  return { background: palette.background, foreground: palette.foreground, accent: palette.colors[0], shapes }
}

export function trianglePoints(shape: Extract<Shape, { kind: 'triangle' }>, width: number, height: number): Array<[number, number]> {
  const size = Math.min(width, height)
  return [0, 1, 2].map(i => {
    const theta = shape.rotation + (i * Math.PI * 2) / 3
    return [shape.cx * width + Math.cos(theta) * shape.r * size, shape.cy * height + Math.sin(theta) * shape.r * size]
  })
}
