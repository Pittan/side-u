<script setup lang="ts">
// 作った本人が開いた場合（wireframes.md §3.1）。カードは共有画像そのもの
import { computed } from 'vue'
import { altText, VARIANTS, type ShareImageData } from '@/render/share-image'
import { useShareImages, type GeneratedImage } from '@/composables/useShareImages'
import { useToast } from '@/composables/useToast'
import AppleMusicSection from './AppleMusicSection.vue'

const props = defineProps<{ data: ShareImageData; shareUrl: string; songIds: number[]; tagIds: number[] }>()
const toast = useToast()
const { images, generating, backdrop, canCopy, canShare, copy, share, save } = useShareImages(computed(() => props.data))
const alt = computed(() => altText(props.data))

async function run(action: () => Promise<void> | void, success?: string) {
  try {
    await action()
    if (success) toast.show(success)
  } catch (error) {
    // 共有シートを閉じただけのときは何も出さない
    if ((error as DOMException).name !== 'AbortError') toast.show('うまくいきませんでした。保存を試してください')
  }
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(props.shareUrl)
    toast.show('リンクをコピーしました')
  } catch {
    toast.show('コピーできませんでした。リンクを長押ししてコピーしてください')
  }
}

const label = (image: GeneratedImage) => VARIANTS[image.variant].label
</script>

<template>
  <section aria-labelledby="images-heading">
    <h2 id="images-heading" class="visually-hidden">共有画像</h2>
    <p v-if="generating" class="status">画像を作っています…</p>
    <ul class="images">
      <li v-for="image in images" :key="image.variant" class="image-item">
        <div class="frame" :class="{ checker: image.variant === 'transparent' }">
          <img :src="image.url" :alt="alt" :width="VARIANTS[image.variant].width" :height="VARIANTS[image.variant].height" />
        </div>
        <p class="image-label">{{ label(image) }}</p>
        <label v-if="image.variant === 'transparent'" class="switch">
          <input v-model="backdrop" type="checkbox" role="switch" />
          <span>文字の後ろを暗くする</span>
        </label>
        <div class="actions">
          <button v-if="canShare" type="button" class="button" @click="run(() => share(image))">共有</button>
          <button v-if="canCopy" type="button" class="button" @click="run(() => copy(image), '画像をコピーしました')">
            コピー
          </button>
          <button type="button" class="button" @click="run(() => save(image))">保存</button>
        </div>
      </li>
    </ul>
  </section>

  <section class="link" aria-labelledby="link-heading">
    <h2 id="link-heading" class="section-heading">リンク</h2>
    <div class="link-row">
      <a :href="shareUrl" class="link-url">{{ shareUrl }}</a>
      <button type="button" class="button" @click="copyLink">コピー</button>
    </div>
    <p class="note">名前は「#」より後ろに入っていて、SIDE U のサーバーには送られません。</p>
  </section>

  <AppleMusicSection :payload="data.payload" :song-ids="songIds" :name="data.name" :tag-ids="tagIds" />
</template>

<style scoped>
.status {
  color: var(--color-muted);
}

.images {
  display: grid;
  grid-auto-columns: 78%;
  grid-auto-flow: column;
  gap: 1rem;
  margin: 0 -1rem;
  padding: 0 1rem 0.5rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 1rem;
  list-style: none;
}

@media (min-width: 48rem) {
  .images {
    grid-auto-columns: 1fr;
    overflow-x: visible;
  }
}

.image-item {
  display: grid;
  align-content: start;
  gap: 0.5rem;
  scroll-snap-align: start;
}

.frame {
  display: grid;
  place-items: center;
  aspect-ratio: 9 / 16;
  border-radius: var(--radius-small);
  background: var(--color-surface);
  overflow: hidden;
}

.checker {
  background: repeating-conic-gradient(#c8c8d0 0% 25%, #f4f4f6 0% 50%) 50% / 20px 20px;
}

.frame img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-label {
  margin: 0;
  font-weight: 700;
}

.switch {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.switch input {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: var(--color-accent);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.section-heading {
  margin: 1.5rem 0 0.5rem;
  font-size: 1rem;
}

.link-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.link-url {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--color-muted);
  font-size: 0.875rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note {
  margin: 0.5rem 0 0;
  color: var(--color-muted);
  font-size: 0.8125rem;
}
</style>
