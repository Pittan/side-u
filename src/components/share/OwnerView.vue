<script setup lang="ts">
// 作った本人が開いた場合（wireframes.md §3.1）。カードは共有画像そのもの
import { computed } from 'vue'
import { altText, FORMATS, type ImageFormat, type ShareImageData } from '@/render/share-image'
import { useShareImages } from '@/composables/useShareImages'
import { useToast } from '@/composables/useToast'
import AppleMusicSection from './AppleMusicSection.vue'

const props = defineProps<{ data: ShareImageData; shareUrl: string; songIds: number[]; tagIds: number[] }>()
const toast = useToast()
const { images, generating, transparent, backdrop, canCopy, canShare, copy, share, save, shufflePattern } = useShareImages(
  computed(() => props.data),
)
const formats = Object.keys(FORMATS) as ImageFormat[]
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

async function copyAlt() {
  try {
    await navigator.clipboard.writeText(alt.value)
    toast.show('説明文をコピーしました')
  } catch {
    toast.show('コピーできませんでした。説明文を長押ししてコピーしてください')
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

</script>

<template>
  <section aria-labelledby="images-heading">
    <h2 id="images-heading" class="visually-hidden">共有画像</h2>
    <p v-if="generating" class="status">画像を作っています…</p>
    <ul class="images">
      <li v-for="format in formats" :key="format" class="image-item">
        <div class="frame" :class="{ checker: transparent[format] }" :style="{ aspectRatio: `${FORMATS[format].width} / ${FORMATS[format].height}` }">
          <img
            v-if="images[format]"
            :src="images[format]!.url"
            :alt="alt"
            :width="FORMATS[format].width"
            :height="FORMATS[format].height"
          />
        </div>
        <p class="image-label">{{ FORMATS[format].label }}</p>
        <div class="background" role="radiogroup" :aria-label="`${FORMATS[format].label}の背景`">
          <label class="segment">
            <input v-model="transparent[format]" type="radio" :name="`background-${format}`" :value="false" />
            <span>模様あり</span>
          </label>
          <label class="segment">
            <input v-model="transparent[format]" type="radio" :name="`background-${format}`" :value="true" />
            <span>透過</span>
          </label>
        </div>
        <label v-if="transparent[format]" class="switch">
          <input v-model="backdrop" type="checkbox" role="switch" />
          <span>文字の後ろを暗くする</span>
        </label>
        <div v-if="images[format]" class="actions">
          <button v-if="canShare" type="button" class="button" @click="run(() => share(images[format]!))">共有</button>
          <button v-if="canCopy" type="button" class="button" @click="run(() => copy(images[format]!), '画像をコピーしました')">
            コピー
          </button>
          <button type="button" class="button" @click="run(() => save(images[format]!))">保存</button>
        </div>
      </li>
    </ul>
  </section>

  <button type="button" class="button shuffle" @click="shufflePattern">模様を変える</button>

  <section class="alt" aria-labelledby="alt-heading">
    <h2 id="alt-heading" class="section-heading">画像の説明文（ALT）</h2>
    <p class="note">X などに画像を投稿するとき、画像の説明として貼り付けると、読み上げ機能を使う人にも曲目が伝わります。</p>
    <div class="alt-row">
      <p class="alt-text">{{ alt }}</p>
      <button type="button" class="button" @click="copyAlt">コピー</button>
    </div>
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

.background {
  display: inline-flex;
  justify-self: start;
  padding: 0.125rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
}

.segment input {
  position: absolute;
  opacity: 0;
}

.segment span {
  display: inline-flex;
  align-items: center;
  min-height: 2.25rem;
  padding: 0 0.875rem;
  border-radius: 999px;
  font-size: 0.875rem;
  cursor: pointer;
}

.segment input:checked + span {
  background: var(--color-fg);
  color: var(--color-bg);
  font-weight: 700;
}

.segment input:focus-visible + span {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
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

.shuffle {
  margin-top: 0.75rem;
}

.alt-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.alt-text {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-small);
  background: var(--color-surface);
  font-size: 0.8125rem;
  user-select: all;
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
