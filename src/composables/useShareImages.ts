// 共有画像を作り、共有・コピー・保存する（DESIGN.md §6.1・§6.3）。
// 形（9:16 / 正方形）ごとに、背景を模様ありにするか透過にするかを選べる。
// 画像はブラウザの中だけで作り、どこにもアップロードしない。
import { onBeforeUnmount, reactive, ref, watch, type Ref } from 'vue'
import { canvasToBlob, drawShareImage, FORMATS, loadFonts, type ImageFormat, type ShareImageData } from '@/render/share-image'

export type GeneratedImage = { format: ImageFormat; transparent: boolean; blob: Blob; url: string }

const BACKDROP_KEY = 'side-u:transparent-backdrop'
const ALL_FORMATS = Object.keys(FORMATS) as ImageFormat[]

function supportsImageClipboard(): boolean {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false
  const supports = (ClipboardItem as unknown as { supports?: (type: string) => boolean }).supports
  return supports ? supports('image/png') : true
}

function supportsFileShare(): boolean {
  try {
    const file = new File([new Uint8Array([0])], 'probe.png', { type: 'image/png' })
    return navigator.canShare?.({ files: [file] }) ?? false
  } catch {
    return false
  }
}

/** 透過のときの「文字の後ろを暗くする」。前回の選択を覚えておく（初期値はオン） */
function readBackdrop(): boolean {
  try {
    return localStorage.getItem(BACKDROP_KEY) !== 'off'
  } catch {
    return true
  }
}

/** 模様のシード。9:16 と正方形で同じ模様になるよう、1 回の生成で 1 つだけ作る */
function newPatternSeed(): string {
  return crypto.getRandomValues(new Uint32Array(1))[0]!.toString(36)
}

export function useShareImages(data: Ref<ShareImageData | null>) {
  const images = ref<Partial<Record<ImageFormat, GeneratedImage>>>({})
  const generating = ref(false)
  /** 形ごとの「背景を透過にする」 */
  const transparent = reactive<Record<ImageFormat, boolean>>({ story: false, square: false })
  /** 形ごとの「作り直している最中」。GPU のない端末では数秒かかることがある */
  const rendering = reactive<Record<ImageFormat, boolean>>({ story: false, square: false })
  const backdrop = ref(readBackdrop())
  // 共有画像の模様は、画面を開くたび・「模様を変える」を押すたびに変える（背景の切り替えでは変えない）
  const patternSeed = ref(newPatternSeed())
  const canCopy = supportsImageClipboard()
  const canShare = supportsFileShare()

  // 切り替えを連打したときに、古い画像があとから届いて上書きしないようにする
  const latestRender: Record<ImageFormat, number> = { story: 0, square: 0 }

  async function render(format: ImageFormat) {
    if (!data.value) return
    const id = ++latestRender[format]
    rendering[format] = true
    const isTransparent = transparent[format]
    const canvas = drawShareImage(format, data.value, {
      transparent: isTransparent,
      backdrop: backdrop.value,
      patternSeed: `${data.value.payload}:${patternSeed.value}`,
    })
    const blob = await canvasToBlob(canvas)
    if (id !== latestRender[format]) return
    rendering[format] = false
    const previous = images.value[format]
    images.value = { ...images.value, [format]: { format, transparent: isTransparent, blob, url: URL.createObjectURL(blob) } }
    if (previous) URL.revokeObjectURL(previous.url)
  }

  watch(
    data,
    async value => {
      if (!value) return
      generating.value = true
      await loadFonts(value)
      for (const format of ALL_FORMATS) await render(format)
      generating.value = false
    },
    { immediate: true },
  )

  // 切り替えた形だけを作り直す
  for (const format of ALL_FORMATS) watch(() => transparent[format], () => render(format))
  watch(backdrop, value => {
    try {
      localStorage.setItem(BACKDROP_KEY, value ? 'on' : 'off')
    } catch {
      // 覚えておけなくても切り替えはできる
    }
    for (const format of ALL_FORMATS) if (transparent[format]) render(format)
  })

  async function shufflePattern() {
    patternSeed.value = newPatternSeed()
    await Promise.all(ALL_FORMATS.map(render))
  }

  onBeforeUnmount(() => {
    for (const image of Object.values(images.value)) URL.revokeObjectURL(image.url)
  })

  const fileName = (image: GeneratedImage) => `side-u-${image.format}${image.transparent ? '-transparent' : ''}.png`

  async function copy(image: GeneratedImage) {
    // Safari はクリック処理の中で同期的に ClipboardItem を作る必要がある
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': Promise.resolve(image.blob) })])
  }

  async function share(image: GeneratedImage) {
    await navigator.share({ files: [new File([image.blob], fileName(image), { type: 'image/png' })] })
  }

  function save(image: GeneratedImage) {
    const a = document.createElement('a')
    a.href = image.url
    a.download = fileName(image)
    a.click()
  }

  return { images, generating, rendering, transparent, backdrop, canCopy, canShare, copy, share, save, shufflePattern }
}
