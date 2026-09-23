<script setup lang="ts">
// 曲を探すボトムシート（wireframes.md §2、DESIGN.md §4.3・§4.11）
import { computed, nextTick, ref, watch } from 'vue'
import type { CatalogSong } from '@shared/catalog'
import { catalog } from '@shared/catalog-instance'
import { buildSearchIndex, searchSongs } from '@shared/search'
import { GOJUON_ORDER, gojuonRow } from '@/editor/gojuon'
import { MAX_TOTAL_SONGS } from '@/editor/list-ops'
import { pendingSongIds } from '@/editor/picker-state'
import { isAppleMusicUnavailable, songMeta } from '@/editor/song-meta'
import { useOverlayHistory } from '@/composables/useOverlayHistory'

const props = defineProps<{ presentIds: ReadonlySet<number>; totalCount: number }>()
const emit = defineEmits<{ add: [ids: number[]] }>()

type Mode = 'gojuon' | 'release' | 'year'
const MODES: Array<{ id: Mode; label: string }> = [
  { id: 'gojuon', label: '五十音' },
  { id: 'release', label: '作品' },
  { id: 'year', label: '年代' },
]

const { isOpen, open, close } = useOverlayHistory('add')
const dialog = ref<HTMLDialogElement>()
const list = ref<HTMLElement>()
const query = ref('')
const mode = ref<Mode>('gojuon')
const expandedParents = ref(new Set<number>())

const selectable = catalog.songs.filter(song => song.selectable)
const searchIndex = buildSearchIndex(selectable)
const collator = new Intl.Collator('ja')
const byKana = (a: CatalogSong, b: CatalogSong) => collator.compare(a.kana, b.kana)
/** 別バージョンは親曲の下にまとめる。親がない（または選べない）曲だけを一覧の最上位に出す */
const topLevel = selectable.filter(song => song.parentId === undefined || !catalog.songById.get(song.parentId)?.selectable)

type Group = { key: string; label: string; songs: CatalogSong[]; nested: boolean }

const groups = computed<Group[]>(() => {
  if (query.value.trim()) {
    return [{ key: 'search', label: '検索結果', songs: searchSongs(searchIndex, query.value).sort(byKana), nested: false }]
  }
  if (mode.value === 'release') {
    return [...catalog.releases]
      .sort((a, b) => b.releasedOn.localeCompare(a.releasedOn))
      .map(release => ({
        key: `release-${release.id}`,
        label: `${release.title}（${release.releasedOn.slice(0, 4)}）`,
        songs: release.trackIds.map(id => catalog.songById.get(id)!).filter(song => song.selectable),
        nested: false,
      }))
      .filter(group => group.songs.length > 0)
  }
  if (mode.value === 'year') {
    const byYear = new Map<string, CatalogSong[]>()
    for (const song of topLevel) {
      const year = song.releasedOn?.slice(0, 4) ?? '年不明'
      byYear.set(year, [...(byYear.get(year) ?? []), song])
    }
    return [...byYear.entries()]
      .sort(([a], [b]) => (a === '年不明' ? 1 : b === '年不明' ? -1 : b.localeCompare(a)))
      .map(([year, songs]) => ({ key: `year-${year}`, label: year, songs: songs.sort(byKana), nested: true }))
  }
  const byRow = new Map<string, CatalogSong[]>()
  for (const song of topLevel) {
    const row = gojuonRow(song.kana)
    byRow.set(row, [...(byRow.get(row) ?? []), song])
  }
  return GOJUON_ORDER.filter(row => byRow.has(row)).map(row => ({
    key: `row-${row}`,
    label: row,
    songs: byRow.get(row)!.sort(byKana),
    nested: true,
  }))
})

const remaining = computed(() => MAX_TOTAL_SONGS - props.totalCount - pendingSongIds.value.length)

function children(song: CatalogSong): CatalogSong[] {
  return (catalog.childrenByParentId.get(song.id) ?? []).filter(child => child.selectable)
}

function isChecked(id: number) {
  return pendingSongIds.value.includes(id)
}

function toggle(id: number) {
  if (isChecked(id)) pendingSongIds.value = pendingSongIds.value.filter(x => x !== id)
  else if (remaining.value > 0) pendingSongIds.value = [...pendingSongIds.value, id]
}

function toggleExpanded(id: number) {
  const next = new Set(expandedParents.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedParents.value = next
}

function submit() {
  const ids = pendingSongIds.value.filter(id => !props.presentIds.has(id))
  pendingSongIds.value = []
  close()
  if (ids.length) emit('add', ids)
}

watch(
  isOpen,
  async value => {
    await nextTick()
    if (value && !dialog.value?.open) {
      // すでに追加された曲はチェックから外す
      pendingSongIds.value = pendingSongIds.value.filter(id => !props.presentIds.has(id))
      dialog.value?.showModal()
      document.documentElement.style.overflow = 'hidden'
    }
    if (!value && dialog.value?.open) {
      dialog.value.close()
      document.documentElement.style.overflow = ''
    }
  },
  { immediate: true },
)

// 上端のつまみを下にスワイプして閉じる
let dragStartY: number | null = null
const dragOffset = ref(0)
function onPointerDown(event: PointerEvent) {
  dragStartY = event.clientY
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function onPointerMove(event: PointerEvent) {
  if (dragStartY !== null) dragOffset.value = Math.max(0, event.clientY - dragStartY)
}
function onPointerUp() {
  if (dragOffset.value > 80) close()
  dragStartY = null
  dragOffset.value = 0
}

watch(mode, () => list.value?.scrollTo({ top: 0 }))

defineExpose({ open })
</script>

<template>
  <dialog
    ref="dialog"
    class="sheet"
    aria-labelledby="picker-title"
    :style="dragOffset ? { transform: `translateY(${dragOffset}px)` } : undefined"
    @cancel.prevent="close"
    @click.self="close"
  >
    <div class="sheet-body">
      <header
        class="sheet-header"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <span class="grabber" aria-hidden="true" />
        <div class="title-row">
          <h2 id="picker-title">曲を追加</h2>
          <button type="button" class="close" aria-label="閉じる" @click="close">✕</button>
        </div>
        <input
          v-model="query"
          class="search"
          type="search"
          placeholder="曲名・よみがなで検索"
          aria-label="曲名・よみがなで検索"
          enterkeyhint="search"
          @pointerdown.stop
        />
        <div v-if="!query.trim()" class="modes" role="group" aria-label="一覧の切り口">
          <button
            v-for="m in MODES"
            :key="m.id"
            type="button"
            class="mode"
            :aria-pressed="mode === m.id"
            @pointerdown.stop
            @click="mode = m.id"
          >
            {{ m.label }}
          </button>
        </div>
      </header>

      <div ref="list" class="list">
        <p v-if="groups.length === 0 || groups[0]!.songs.length === 0" class="empty">見つかりませんでした</p>
        <section v-for="group in groups" :key="group.key" :aria-labelledby="`${group.key}-heading`">
          <h3 :id="`${group.key}-heading`" class="group-heading">{{ group.label }}</h3>
          <ul class="songs">
            <li v-for="song in group.songs" :key="song.id">
              <div class="song">
                <label class="check" :class="{ present: presentIds.has(song.id) }">
                  <input
                    type="checkbox"
                    :checked="presentIds.has(song.id) || isChecked(song.id)"
                    :disabled="presentIds.has(song.id) || (!isChecked(song.id) && remaining <= 0)"
                    @change="toggle(song.id)"
                  />
                  <span class="song-text">
                    <span class="song-title">{{ song.title }}</span>
                    <span class="song-meta">
                      <span v-if="presentIds.has(song.id)">追加済み</span>
                      <span v-else>{{ songMeta(song, catalog) }}</span>
                      <span v-if="isAppleMusicUnavailable(song)" class="badge">AM未配信</span>
                    </span>
                  </span>
                </label>
                <button
                  v-if="group.nested && children(song).length"
                  type="button"
                  class="versions"
                  :aria-expanded="expandedParents.has(song.id)"
                  @click="toggleExpanded(song.id)"
                >
                  別バージョン({{ children(song).length }}) {{ expandedParents.has(song.id) ? '▴' : '▾' }}
                </button>
              </div>
              <ul v-if="group.nested && expandedParents.has(song.id)" class="songs nested">
                <li v-for="child in children(song)" :key="child.id" class="song">
                  <label class="check" :class="{ present: presentIds.has(child.id) }">
                    <input
                      type="checkbox"
                      :checked="presentIds.has(child.id) || isChecked(child.id)"
                      :disabled="presentIds.has(child.id) || (!isChecked(child.id) && remaining <= 0)"
                      @change="toggle(child.id)"
                    />
                    <span class="song-text">
                      <span class="song-title">{{ child.title }}</span>
                      <span class="song-meta">
                        <span v-if="presentIds.has(child.id)">追加済み</span>
                        <span v-else>{{ songMeta(child, catalog) }}</span>
                        <span v-if="isAppleMusicUnavailable(child)" class="badge">AM未配信</span>
                      </span>
                    </span>
                  </label>
                </li>
              </ul>
            </li>
          </ul>
        </section>
      </div>

      <footer class="sheet-footer">
        <span class="remaining" aria-live="polite">あと {{ Math.max(remaining, 0) }} 曲まで追加できます</span>
        <button type="button" class="button button-primary" :disabled="pendingSongIds.length === 0" @click="submit">
          {{ pendingSongIds.length }} 曲を追加
        </button>
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.sheet {
  width: 100%;
  max-width: 40rem;
  height: 90dvh;
  max-height: 90dvh;
  margin: auto auto 0;
  padding: 0;
  border: none;
  border-radius: var(--radius) var(--radius) 0 0;
  background: var(--color-bg);
  color: var(--color-fg);
  overscroll-behavior: contain;
}

.sheet[open] {
  animation: slide-up 0.2s ease-out;
}

@keyframes slide-up {
  from {
    transform: translateY(100%);
  }
}

.sheet::backdrop {
  background: rgb(0 0 0 / 0.5);
}

.sheet-body {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100%;
}

.sheet-header {
  display: grid;
  gap: 0.5rem;
  padding: 0.5rem 1rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
  touch-action: none;
}

.grabber {
  justify-self: center;
  width: 2.5rem;
  height: 0.3rem;
  border-radius: 999px;
  background: var(--color-border);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

h2 {
  margin: 0;
  font-size: 1.125rem;
}

.close {
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 1.25rem;
}

.search {
  min-height: 2.75rem;
  padding: 0 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-surface);
  color: inherit;
  font: inherit;
  font-size: 1rem;
}

.modes {
  display: flex;
  gap: 0.375rem;
}

.mode {
  min-height: 2.5rem;
  padding: 0 1rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg);
  color: inherit;
  font: inherit;
  font-size: 0.875rem;
}

.mode[aria-pressed='true'] {
  border-color: var(--color-fg);
  background: var(--color-fg);
  color: var(--color-bg);
  font-weight: 700;
}

.list {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: 1rem;
}

.empty {
  padding: 2rem 1rem;
  color: var(--color-muted);
  text-align: center;
}

.group-heading {
  position: sticky;
  top: 0;
  margin: 0;
  padding: 0.25rem 1rem;
  background: var(--color-surface);
  font-size: 0.875rem;
  z-index: 1;
}

.songs {
  margin: 0;
  padding: 0;
  list-style: none;
}

.nested {
  padding-inline-start: 1.5rem;
}

.song {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-inline-end: 0.5rem;
}

.check {
  display: flex;
  flex: 1;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 0;
  min-height: 3rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
}

.check input {
  flex: none;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0.2rem 0 0;
  accent-color: var(--color-accent);
}

.check.present {
  color: var(--color-muted);
  cursor: default;
}

.song-text {
  display: grid;
  min-width: 0;
}

.song-title {
  font-weight: 700;
}

.song-meta {
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

.versions {
  flex: none;
  min-height: 2.5rem;
  padding: 0 0.5rem;
  border: none;
  background: transparent;
  color: var(--color-accent);
  font: inherit;
  font-size: 0.8125rem;
}

.sheet-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
}

.remaining {
  color: var(--color-muted);
  font-size: 0.875rem;
}
</style>
