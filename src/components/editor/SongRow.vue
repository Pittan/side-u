<script setup lang="ts">
// 曲リストの 1 行。タップすると操作ボタンが出る（wireframes.md §1.3）
import type { CatalogSong } from '@shared/catalog'
import type { ListName } from '@/editor/list-ops'

defineProps<{
  song: CatalogSong
  meta: string
  number?: number
  list: ListName
  expanded: boolean
  canMoveUp: boolean
  canMoveDown: boolean
  unavailableOnAppleMusic: boolean
}>()
const emit = defineEmits<{ toggle: []; up: []; down: []; other: []; remove: [] }>()
</script>

<template>
  <li class="row" :class="{ expanded }">
    <div class="row-head">
    <!-- ドラッグ用のつまみ。キーボードや読み上げでは、行の操作ボタンで並べ替える -->
    <span class="handle" aria-hidden="true" title="ドラッグで並べ替え">
      <svg viewBox="0 0 10 16" width="10" height="16" fill="currentColor">
        <circle cx="2" cy="2" r="1.5" /><circle cx="8" cy="2" r="1.5" />
        <circle cx="2" cy="8" r="1.5" /><circle cx="8" cy="8" r="1.5" />
        <circle cx="2" cy="14" r="1.5" /><circle cx="8" cy="14" r="1.5" />
      </svg>
    </span>
    <button type="button" class="main" :aria-expanded="expanded" @click="emit('toggle')">
      <span v-if="number !== undefined" class="number" aria-hidden="true">{{ String(number).padStart(2, '0') }}</span>
      <span class="text">
        <span class="title">
          <span v-if="number !== undefined" class="visually-hidden">{{ number }}曲目 </span>{{ song.title }}
        </span>
        <span v-if="meta || unavailableOnAppleMusic" class="meta">
          <span>{{ meta }}</span>
          <span v-if="unavailableOnAppleMusic" class="badge">AM未配信</span>
        </span>
      </span>
    </button>
    </div>
    <div v-if="expanded" class="actions" role="group" :aria-label="`${song.title} の操作`">
      <button type="button" class="action" :disabled="!canMoveUp" @click="emit('up')">↑ 上へ</button>
      <button type="button" class="action" :disabled="!canMoveDown" @click="emit('down')">↓ 下へ</button>
      <button type="button" class="action" @click="emit('other')">{{ list === 'sideU' ? '候補へ' : 'Side U へ' }}</button>
      <button type="button" class="action action-danger" @click="emit('remove')">削除</button>
    </div>
  </li>
</template>

<style scoped>
.row {
  border-radius: var(--radius-small);
}

.row.expanded {
  outline: 2px solid var(--color-accent);
  background: var(--color-surface);
}

.row-head {
  display: flex;
  align-items: flex-start;
}

/* つまみは曲名の 1 行目にそろえる（行の上下中央にしない） */
.handle {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: var(--row-handle-width);
  height: calc(1.6em + 1rem);
  color: var(--color-muted);
  opacity: 0.7;
  cursor: grab;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.row-ghost {
  opacity: 0.4;
}

.row-chosen {
  background: var(--color-surface);
}

.main {
  display: flex;
  flex: 1;
  min-width: 0;
  gap: 0.75rem;
  width: 100%;
  min-height: 3.25rem;
  padding: 0.5rem 0.75rem 0.5rem 0;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.number {
  flex: none;
  width: 1.75rem;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

.text {
  display: grid;
  min-width: 0;
}

.title {
  font-weight: 700;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: var(--color-muted);
  font-size: 0.8125rem;
}

.badge {
  padding: 0 0.375rem;
  border: 1px solid currentColor;
  border-radius: 4px;
}

.actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.375rem;
  padding: 0 0.75rem 0.75rem;
}

.action {
  min-height: 2.75rem;
  padding: 0 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-bg);
  color: inherit;
  font: inherit;
  font-size: 0.875rem;
}

.action:disabled {
  opacity: 0.4;
}

.action-danger {
  color: var(--color-danger);
}
</style>
