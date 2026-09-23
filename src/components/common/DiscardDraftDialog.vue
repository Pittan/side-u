<script setup lang="ts">
// 下書きを破棄してよいかの確認（DESIGN.md §7.2）。下書きの概要を見せる
import { computed, ref } from 'vue'
import { catalog } from '@shared/catalog-instance'
import { useDraft } from '@/composables/useDraft'
import ConfirmDialog from './ConfirmDialog.vue'

defineProps<{ overlayKey: string; confirmLabel: string }>()
const emit = defineEmits<{ confirm: [] }>()

const { draft } = useDraft()
const dialog = ref<InstanceType<typeof ConfirmDialog>>()

const firstTitles = computed(() => draft.value.sideU.slice(0, 3).map(id => catalog.songById.get(id)?.title ?? ''))
const updatedAt = computed(() =>
  new Date(draft.value.updatedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
)

defineExpose({ open: () => dialog.value?.open() })
</script>

<template>
  <ConfirmDialog ref="dialog" :overlay-key="overlayKey" title="作りかけの Side U を破棄しますか？" :confirm-label="confirmLabel" danger @confirm="emit('confirm')">
    <div class="summary">
      <p class="name">{{ draft.name ? `${draft.name} の Side U` : 'Side U' }}</p>
      <p>Side U {{ draft.sideU.length }}/13曲、候補 {{ draft.candidates.length }}曲</p>
      <ol v-if="firstTitles.length" class="titles">
        <li v-for="title in firstTitles" :key="title">{{ title }}</li>
        <li v-if="draft.sideU.length > 3" class="more">ほか {{ draft.sideU.length - 3 }}曲</li>
      </ol>
      <p class="updated">最終更新 {{ updatedAt }}</p>
    </div>
    <p>破棄すると元には戻せません。</p>
  </ConfirmDialog>
</template>

<style scoped>
.summary {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-small);
  background: var(--color-surface);
  font-size: 0.875rem;
}

.summary p {
  margin: 0;
}

.name {
  font-weight: 700;
}

.titles {
  margin: 0.25rem 0;
  padding-inline-start: 1.25rem;
}

.more {
  list-style: none;
  color: var(--color-muted);
}

.updated {
  color: var(--color-muted);
}
</style>
