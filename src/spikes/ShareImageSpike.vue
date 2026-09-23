<script setup lang="ts">
// M0 の実機確認用ページ。公開前に削除する。
// 確認したいこと:
//   1. 画像をクリップボードにコピーして、Instagram ストーリーズのテキスト入力に貼り付けられるか
//   2. 透過 PNG の透明度が貼り付け後も残るか
//   3. Web Share API でファイルを共有できるか / 保存できるか
import { computed, onMounted, ref } from 'vue'

type Variant = 'square' | 'story' | 'transparent'

const VARIANTS: Record<Variant, { label: string; width: number; height: number; background: boolean }> = {
  square: { label: '正方形 1080×1080', width: 1080, height: 1080, background: true },
  story: { label: '9:16 1080×1920', width: 1080, height: 1920, background: true },
  transparent: { label: '背景透過 1080×1350', width: 1080, height: 1350, background: false },
}

const SONGS = [
  'ポリリズム', 'チョコレイト・ディスコ', 'Spending all my time', 'ワンルーム・ディスコ',
  'レーザービーム', 'edge (⊿-mix)', 'Dream Fighter', 'Spring of Life', '未来のミュージアム',
  'STAR TRAIN', 'FLASH', 'ポイント', 'Magic of Love',
]
const NAME = 'あもん'
const TAGS = ['#深夜に', '#浸りたい', '#隠れ名曲']

const previews = ref<Partial<Record<Variant, string>>>({})
const log = ref<string[]>([])
const fontReady = ref(false)

const env = computed(() => ({
  userAgent: navigator.userAgent,
  clipboardItem: typeof ClipboardItem !== 'undefined',
  clipboardSupportsPng:
    typeof ClipboardItem !== 'undefined' && 'supports' in ClipboardItem
      ? (ClipboardItem as unknown as { supports(type: string): boolean }).supports('image/png')
      : '不明（supports() なし）',
  canShareFiles: (() => {
    try {
      const file = new File([new Uint8Array([0])], 'x.png', { type: 'image/png' })
      return navigator.canShare?.({ files: [file] }) ?? false
    } catch {
      return false
    }
  })(),
}))

function write(message: string) {
  log.value.unshift(`${new Date().toLocaleTimeString()} ${message}`)
}

async function loadFonts() {
  const text = ['SIDE U', 'Selected by You', NAME, ...SONGS, ...TAGS, '0123456789'].join('')
  await Promise.all([
    document.fonts.load('700 64px "LINE Seed JP"', text),
    document.fonts.load('400 40px "LINE Seed JP"', text),
  ])
  fontReady.value = document.fonts.check('700 64px "LINE Seed JP"', text)
}

function draw(variant: Variant): HTMLCanvasElement {
  const { width, height, background } = VARIANTS[variant]
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  if (background) {
    ctx.fillStyle = '#101018'
    ctx.fillRect(0, 0, width, height)
  }

  // 仮の幾何学模様
  ctx.save()
  ctx.globalAlpha = background ? 0.35 : 0.8
  ctx.strokeStyle = '#7fe3ff'
  ctx.lineWidth = 6
  for (let i = 0; i < 3; i++) {
    const size = 260 + i * 120
    ctx.beginPath()
    ctx.moveTo(width - 120, 120 + i * 40)
    ctx.lineTo(width - 120 - size, 120 + i * 40)
    ctx.lineTo(width - 120 - size / 2, 120 + i * 40 + size * 0.866)
    ctx.closePath()
    ctx.stroke()
  }
  ctx.restore()

  // 透過版は写真の上でも読めるように半透明の板を敷く
  const padding = 72
  if (!background) {
    ctx.fillStyle = 'rgba(16, 16, 24, 0.72)'
    ctx.beginPath()
    ctx.roundRect(padding / 2, padding / 2, width - padding, height - padding, 48)
    ctx.fill()
  }

  ctx.fillStyle = '#ffffff'
  ctx.textBaseline = 'top'
  let y = variant === 'story' ? 240 : padding + 24

  ctx.font = '700 96px "LINE Seed JP", system-ui, sans-serif'
  ctx.fillText('SIDE U', padding + 24, y)
  y += 112
  ctx.font = '400 36px "LINE Seed JP", system-ui, sans-serif'
  ctx.fillText(`Selected by ${NAME}`, padding + 24, y)
  y += 80

  const lineHeight = variant === 'square' ? 50 : 62
  ctx.font = `400 ${variant === 'square' ? 34 : 40}px "LINE Seed JP", system-ui, sans-serif`
  SONGS.forEach((title, i) => {
    ctx.fillText(`${String(i + 1).padStart(2, '0')}  ${title}`, padding + 24, y)
    y += lineHeight
  })

  y += 24
  ctx.font = '700 36px "LINE Seed JP", system-ui, sans-serif'
  ctx.fillText(TAGS.join('  '), padding + 24, y)

  ctx.font = '400 24px "LINE Seed JP", system-ui, sans-serif'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
  ctx.fillText('sideu.perfumehub.app ・ 非公式ファンツール', padding + 24, height - padding - 24)

  return canvas
}

function toBlob(variant: Variant): Promise<Blob> {
  return new Promise((resolve, reject) => {
    draw(variant).toBlob(blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png')
  })
}

async function copy(variant: Variant) {
  try {
    // Safari ではクリック処理の中で同期的に ClipboardItem を作り、Promise を渡す必要がある
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': toBlob(variant) })])
    write(`コピー成功: ${VARIANTS[variant].label}`)
  } catch (error) {
    write(`コピー失敗: ${String(error)}`)
  }
}

async function share(variant: Variant) {
  try {
    const file = new File([await toBlob(variant)], `side-u-${variant}.png`, { type: 'image/png' })
    await navigator.share({ files: [file] })
    write(`共有成功: ${VARIANTS[variant].label}`)
  } catch (error) {
    write(`共有失敗: ${String(error)}`)
  }
}

async function save(variant: Variant) {
  const url = URL.createObjectURL(await toBlob(variant))
  const a = document.createElement('a')
  a.href = url
  a.download = `side-u-${variant}.png`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  write(`保存: ${VARIANTS[variant].label}`)
}

onMounted(async () => {
  await loadFonts()
  for (const variant of Object.keys(VARIANTS) as Variant[]) {
    previews.value[variant] = draw(variant).toDataURL('image/png')
  }
})
</script>

<template>
  <main>
    <h1>共有画像の実機確認</h1>
    <p>
      「コピー」のあと Instagram のストーリーズでテキスト入力を開き、貼り付けを試してください。
      透過版は写真の上に貼り、背景が透けるか確認します。
    </p>

    <h2>この環境</h2>
    <ul>
      <li>フォント読み込み: {{ fontReady ? 'OK' : 'NG（システムフォント）' }}</li>
      <li>ClipboardItem: {{ env.clipboardItem }}</li>
      <li>ClipboardItem.supports('image/png'): {{ env.clipboardSupportsPng }}</li>
      <li>ファイル共有 (canShare): {{ env.canShareFiles }}</li>
      <li><small>{{ env.userAgent }}</small></li>
    </ul>

    <section v-for="(meta, variant) in VARIANTS" :key="variant" class="variant">
      <h2>{{ meta.label }}</h2>
      <img v-if="previews[variant]" :src="previews[variant]" :alt="meta.label" class="checker">
      <div class="actions">
        <button type="button" @click="copy(variant)">コピー</button>
        <button type="button" @click="share(variant)">共有</button>
        <button type="button" @click="save(variant)">保存</button>
      </div>
    </section>

    <h2>ログ</h2>
    <ol>
      <li v-for="line in log" :key="line">{{ line }}</li>
    </ol>
  </main>
</template>

<style scoped>
.variant img {
  display: block;
  width: 100%;
  max-width: 360px;
  height: auto;
}

/* 透明部分がわかるように市松模様を敷く */
.checker {
  background: repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 24px 24px;
}

.actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.actions button {
  min-height: 44px;
  padding: 0 1rem;
  font: inherit;
}
</style>
