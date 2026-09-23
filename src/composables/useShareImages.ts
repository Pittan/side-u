// 3 種類の共有画像を作り、共有・コピー・保存する（DESIGN.md §6.1・§6.3）。
// 画像はブラウザの中だけで作り、どこにもアップロードしない。
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { canvasToBlob, drawShareImage, loadFonts, VARIANTS, type ImageVariant, type ShareImageData } from '@/render/share-image'

export type GeneratedImage = { variant: ImageVariant; blob: Blob; url: string }

const BACKDROP_KEY = 'side-u:transparent-backdrop'

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

/** 透過版のグラデーションのオン・オフ。前回の選択を覚えておく（初期値はオン） */
function readBackdrop(): boolean {
  try {
    return localStorage.getItem(BACKDROP_KEY) !== 'off'
  } catch {
    return true
  }
}

export function useShareImages(data: Ref<ShareImageData | null>) {
  const images = ref<GeneratedImage[]>([])
  const generating = ref(false)
  const backdrop = ref(readBackdrop())
  const canCopy = supportsImageClipboard()
  const canShare = supportsFileShare()

  async function render(variant: ImageVariant, value: ShareImageData): Promise<GeneratedImage> {
    const blob = await canvasToBlob(drawShareImage(variant, value, { backdrop: backdrop.value }))
    return { variant, blob, url: URL.createObjectURL(blob) }
  }

  function revoke(list: GeneratedImage[]) {
    for (const image of list) URL.revokeObjectURL(image.url)
  }

  watch(
    data,
    async value => {
      revoke(images.value)
      images.value = []
      if (!value) return
      generating.value = true
      await loadFonts(value)
      const next: GeneratedImage[] = []
      for (const variant of Object.keys(VARIANTS) as ImageVariant[]) next.push(await render(variant, value))
      images.value = next
      generating.value = false
    },
    { immediate: true },
  )

  // グラデーションを切り替えたら、透過版だけを作り直す
  watch(backdrop, async value => {
    try {
      localStorage.setItem(BACKDROP_KEY, value ? 'on' : 'off')
    } catch {
      // 覚えておけなくても切り替えはできる
    }
    if (!data.value) return
    const index = images.value.findIndex(image => image.variant === 'transparent')
    if (index === -1) return
    const next = await render('transparent', data.value)
    revoke([images.value[index]!])
    images.value = images.value.map((image, i) => (i === index ? next : image))
  })

  onBeforeUnmount(() => revoke(images.value))

  const fileName = (variant: ImageVariant) => `side-u-${variant}.png`

  async function copy(image: GeneratedImage) {
    // Safari はクリック処理の中で同期的に ClipboardItem を作る必要がある
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': Promise.resolve(image.blob) })])
  }

  async function share(image: GeneratedImage) {
    await navigator.share({ files: [new File([image.blob], fileName(image.variant), { type: 'image/png' })] })
  }

  function save(image: GeneratedImage) {
    const a = document.createElement('a')
    a.href = image.url
    a.download = fileName(image.variant)
    a.click()
  }

  return { images, generating, backdrop, canCopy, canShare, copy, share, save }
}
