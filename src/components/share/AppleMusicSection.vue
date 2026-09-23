<script setup lang="ts">
// Apple Music のプレイリスト作成（DESIGN.md §8）。M3 で実装する。今は配信状況の表示だけ
import { computed } from 'vue'
import { catalog } from '@shared/catalog-instance'

const props = defineProps<{ songIds: number[]; label?: string }>()
const unavailable = computed(() => props.songIds.filter(id => catalog.songById.get(id)?.appleMusicId === null).length)
</script>

<template>
  <section class="apple-music" aria-labelledby="apple-music-heading">
    <h2 id="apple-music-heading" class="section-heading">Apple Music</h2>
    <button type="button" class="button" disabled>{{ label ?? 'Apple MusicにSide Uをつくる' }}（準備中）</button>
    <p v-if="unavailable" class="note">※ 13曲中{{ unavailable }}曲が Apple Music にありません</p>
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
