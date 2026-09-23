// 3 種類の共有画像を作り、共有・コピー・保存する（DESIGN.md §6.1・§6.3）。
// 画像はブラウザの中だけで作り、どこにもアップロードしない。
import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import { canvasToBlob, drawShareImage, loadFonts, VARIANTS, type ImageVariant, type ShareImageData } from '@/render/share-image'

export type GeneratedImage = { variant: ImageVariant; blob: Blob; url: string }

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

export function useShareImages(data: Ref<ShareImageData | null>) {
  const images = ref<GeneratedImage[]>([])
  const generating = ref(false)
  const canCopy = supportsImageClipboard()
  const canShare = supportsFileShare()

  function revoke() {
    for (const image of images.value) URL.revokeObjectURL(image.url)
    images.value = []
  }

  watch(
    data,
    async value => {
      revoke()
      if (!value) return
      generating.value = true
      await loadFonts(value)
      const next: GeneratedImage[] = []
      for (const variant of Object.keys(VARIANTS) as ImageVariant[]) {
        const blob = await canvasToBlob(drawShareImage(variant, value))
        next.push({ variant, blob, url: URL.createObjectURL(blob) })
      }
      images.value = next
      generating.value = false
    },
    { immediate: true },
  )
  onBeforeUnmount(revoke)

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

  return { images, generating, canCopy, canShare, copy, share, save }
}
