<script setup lang="ts">
// Apple Music のプレイリスト作成の入口（DESIGN.md §8）
import { computed, onMounted, ref } from 'vue'
import { catalog } from '@shared/catalog-instance'
import { isAppleMusicAvailable, shouldResume } from '@/composables/useAppleMusic'
import AppleMusicDialog from './AppleMusicDialog.vue'

const props = defineProps<{ payload: string; songIds: number[]; name: string | null; tagIds: number[]; label?: string }>()

const available = isAppleMusicAvailable()
const dialog = ref<InstanceType<typeof AppleMusicDialog>>()
const unavailable = computed(() => props.songIds.filter(id => !catalog.songById.get(id)?.appleMusicId).length)
const tagLabels = computed(() => props.tagIds.map(id => catalog.tagById.get(id)?.label ?? ''))

onMounted(() => {
  // 認可の途中でページが再読み込みされたら、確認画面から再開する
  if (available && shouldResume(props.payload)) dialog.value?.open()
})
</script>

<template>
  <section class="apple-music" aria-labelledby="apple-music-heading">
    <h2 id="apple-music-heading" class="section-heading">Apple Music</h2>
    <button type="button" class="button" :disabled="!available" @click="dialog?.open()">
      {{ label ?? 'Apple MusicにSide Uをつくる' }}
    </button>
    <p v-if="!available" class="note">Apple Music の連携は現在使えません。</p>
    <p v-else-if="unavailable" class="note">※ 13曲中{{ unavailable }}曲が Apple Music にありません。つくる前に確認できます。</p>
    <AppleMusicDialog v-if="available" ref="dialog" :payload="payload" :song-ids="songIds" :name="name" :tag-labels="tagLabels" />
  </section>
</template>

<style scoped>
.section-heading {
  margin: 1.5rem 0 0.5rem;
  font-size: 1rem;
}

.note {
  margin: 0.5rem 0 0;
  color: var(--color-muted);
  font-size: 0.8125rem;
}
</style>
