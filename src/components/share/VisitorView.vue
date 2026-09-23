<script setup lang="ts">
// ほかの人が開いた場合（wireframes.md §3.2）。HTML で表示する
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import type { SideU } from '@shared/payload'
import { catalog } from '@shared/catalog-instance'
import { songMeta } from '@/editor/song-meta'
import { useDraft } from '@/composables/useDraft'
import DiscardDraftDialog from '@/components/common/DiscardDraftDialog.vue'
import AppleMusicSection from './AppleMusicSection.vue'
import PatternBackground from './PatternBackground.vue'

const props = defineProps<{ payload: string; sideU: SideU; name: string | null }>()
const router = useRouter()
const { isEmpty, replace } = useDraft()

const newDialog = ref<InstanceType<typeof DiscardDraftDialog>>()
const remixDialog = ref<InstanceType<typeof DiscardDraftDialog>>()

function startNew() {
  replace()
  router.push('/edit')
}

function remix() {
  replace(props.sideU)
  router.push('/edit')
}
</script>

<template>
  <section class="card" aria-labelledby="side-u-title">
    <PatternBackground :payload="payload" />
    <div class="card-body">
      <h1 id="side-u-title" class="title">{{ name ? `${name} さんの Side U` : '誰かの Side U' }}</h1>
      <p v-if="sideU.tagIds.length" class="tags">
        <span v-for="id in sideU.tagIds" :key="id">#{{ catalog.tagById.get(id)?.label }}</span>
      </p>
      <ol class="songs">
        <li v-for="(id, index) in sideU.songIds" :key="id">
          <span class="number" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
          <span class="song">
            <span class="song-title">{{ catalog.songById.get(id)?.title }}</span>
            <span class="song-meta">{{ songMeta(catalog.songById.get(id)!, catalog) }}</span>
          </span>
        </li>
      </ol>
    </div>
  </section>

  <AppleMusicSection :song-ids="sideU.songIds" label="Apple Musicでこのプレイリストをつくる" />

  <section aria-labelledby="create-heading">
    <h2 id="create-heading" class="section-heading">自分のSide Uをつくる</h2>
    <div class="create-actions">
      <button type="button" class="button button-primary" @click="isEmpty ? startNew() : newDialog?.open()">新しくつくる</button>
      <button type="button" class="button" @click="isEmpty ? remix() : remixDialog?.open()">この13曲をもとにつくる</button>
    </div>
  </section>

  <DiscardDraftDialog ref="newDialog" overlay-key="discard-new" confirm-label="破棄して新しくつくる" @confirm="startNew" />
  <DiscardDraftDialog ref="remixDialog" overlay-key="discard-remix" confirm-label="破棄してこの13曲をもとにつくる" @confirm="remix" />
</template>

<style scoped>
.card {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  color: #f5f7ff;
}

.card-body {
  position: relative;
  padding: 1.5rem 1.25rem;
  background: linear-gradient(to bottom, rgb(0 0 0 / 0.1), rgb(0 0 0 / 0.45));
}

.title {
  margin: 0;
  font-size: 1.5rem;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 0.25rem 0 0;
  font-weight: 700;
}

.songs {
  display: grid;
  gap: 0.5rem;
  margin: 1.25rem 0 0;
  padding: 0;
  list-style: none;
}

.songs li {
  display: flex;
  gap: 0.75rem;
}

.number {
  flex: none;
  width: 1.75rem;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}

.song {
  display: grid;
}

.song-title {
  font-weight: 700;
}

.song-meta {
  opacity: 0.75;
  font-size: 0.8125rem;
}

.section-heading {
  margin: 1.5rem 0 0.5rem;
  font-size: 1rem;
}

.create-actions {
  display: grid;
  gap: 0.5rem;
}
</style>
