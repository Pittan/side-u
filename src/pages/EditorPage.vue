<script setup lang="ts">
// 編集画面（wireframes.md §1、DESIGN.md §4.2・§4.10・§4.12）
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { catalog } from '@shared/catalog-instance'
import { buildFragment } from '@shared/fragment'
import { SIDE_U_LENGTH } from '@shared/payload'
import AppToast from '@/components/common/AppToast.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import NameTagsPanel from '@/components/editor/NameTagsPanel.vue'
import SongRow from '@/components/editor/SongRow.vue'
import SongPickerSheet from '@/components/picker/SongPickerSheet.vue'
import StorageNotice from '@/components/editor/StorageNotice.vue'
import { useDraft } from '@/composables/useDraft'
import { useToast } from '@/composables/useToast'
import {
  addMany,
  move,
  moveDown,
  moveUp,
  remove,
  toCandidates,
  toSideU,
  totalCount,
  type ListName,
  type ListState,
  type OpResult,
  type Pos,
} from '@/editor/list-ops'
import { pendingSongIds } from '@/editor/picker-state'
import { useSortableLists } from '@/editor/useSortableLists'
import { isAppleMusicUnavailable, songMeta } from '@/editor/song-meta'

const router = useRouter()
const { draft, listState, isComplete, currentPayload, saveStatus, removedOnLoad, setLists, setName, toggleTag, replace, markCompleted } =
  useDraft()
const toast = useToast()

const picker = ref<InstanceType<typeof SongPickerSheet>>()
const resetDialog = ref<InstanceType<typeof ConfirmDialog>>()
const panel = ref<InstanceType<typeof NameTagsPanel>>()
const panelSentinel = ref<HTMLElement>()
const panelVisible = ref(true)
const selectedId = ref<number | null>(null)
const sideUList = ref<HTMLElement>()
const candidateList = ref<HTMLElement>()
const announcement = ref('')

const presentIds = computed(() => new Set([...draft.value.sideU, ...draft.value.candidates]))
const emptySlots = computed(() => SIDE_U_LENGTH - draft.value.sideU.length)
const tagLabels = computed(() => draft.value.tagIds.map(id => `#${catalog.tagById.get(id)?.label ?? ''}`))
const title = (id: number) => catalog.songById.get(id)?.title ?? ''

function posOf(state: ListState, id: number): Pos | null {
  for (const list of ['sideU', 'candidates'] as const) {
    const index = state[list].indexOf(id)
    if (index !== -1) return { list, index }
  }
  return null
}

function describe(state: ListState, id: number): string {
  const pos = posOf(state, id)
  if (!pos) return ''
  return pos.list === 'sideU' ? `${title(id)}、${pos.index + 1}曲目` : `${title(id)}、候補の${pos.index + 1}番目`
}

/** 操作を適用し、あふれが起きたら取り消しできる通知を出す */
function apply(op: (state: ListState) => OpResult, id: number) {
  const before = listState.value
  const { state, overflowed } = op(before)
  setLists(state)
  announcement.value = describe(state, id)
  if (overflowed !== undefined) {
    toast.show(`『${title(overflowed)}』が候補に移りました`, { label: '取り消す', run: () => setLists(before) })
  }
}

function onRowAction(action: 'up' | 'down' | 'other' | 'remove', id: number) {
  const pos = posOf(listState.value, id)
  if (!pos) return
  if (action === 'remove') {
    const before = listState.value
    setLists(remove(before, pos))
    selectedId.value = null
    toast.show(`『${title(id)}』を削除しました`, { label: '取り消す', run: () => setLists(before) })
    return
  }
  const op = { up: moveUp, down: moveDown, other: pos.list === 'sideU' ? toCandidates : toSideU }[action]
  apply(state => op(state, pos), id)
}

useSortableLists({ sideU: sideUList, candidates: candidateList }, (from, to) => {
  const id = listState.value[from.list][from.index]
  if (id !== undefined) apply(state => move(state, from, to), id)
})

function canMoveUp(list: ListName, index: number) {
  return !(list === 'sideU' && index === 0)
}

function canMoveDown(list: ListName, index: number) {
  return !(list === 'candidates' && index === draft.value.candidates.length - 1)
}

function onAdd(ids: number[]) {
  const result = addMany(listState.value, ids)
  setLists(result.state)
  const parts = []
  if (result.addedToSideU.length) parts.push(`Side U に${result.addedToSideU.length}曲`)
  if (result.addedToCandidates.length) parts.push(`候補に${result.addedToCandidates.length}曲`)
  if (parts.length) toast.show(`${parts.join('、')}追加しました`)
}

function complete() {
  const payload = currentPayload.value
  if (!payload) return
  markCompleted(payload)
  router.push(`/u/${payload}${buildFragment({ name: draft.value.name || null })}`)
}

function reset() {
  replace()
  pendingSongIds.value = []
  selectedId.value = null
  toast.show('リセットしました')
}

function editName() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
  panel.value?.focusName()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') selectedId.value = null
}

let observer: IntersectionObserver | undefined
onMounted(() => {
  observer = new IntersectionObserver(([entry]) => (panelVisible.value = entry?.isIntersecting ?? true))
  if (panelSentinel.value) observer.observe(panelSentinel.value)
  addEventListener('keydown', onKeydown)
  if (removedOnLoad.value.length) {
    toast.show(`公開されなくなった曲 ${removedOnLoad.value.length} 曲を下書きから外しました`)
    removedOnLoad.value = []
  }
})
onBeforeUnmount(() => {
  observer?.disconnect()
  removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="editor">
    <header class="app-header">
      <RouterLink to="/" class="logo">SIDE U</RouterLink>
      <span class="save-status" aria-live="polite">
        {{ saveStatus === 'unavailable' ? '保存できません' : saveStatus === 'pending' ? '保存中…' : 'この端末に保存済み' }}
      </span>
      <details class="menu">
        <summary aria-label="メニュー">⋯</summary>
        <div class="menu-items">
          <button type="button" @click="resetDialog?.open()">リセット</button>
          <RouterLink to="/help/storage">保存について</RouterLink>
          <RouterLink to="/privacy">プライバシー</RouterLink>
          <RouterLink to="/">トップへ</RouterLink>
        </div>
      </details>
    </header>

    <!-- 名前・タグの要約。高さが十分な端末で、入力欄がスクロールで隠れたときだけ出す（§4.12） -->
    <div v-if="!panelVisible" class="summary">
      <div class="summary-text">
        <span class="summary-name">{{ draft.name ? `${draft.name} の Side U` : 'Side U' }}</span>
        <span v-if="tagLabels.length" class="summary-tags">{{ tagLabels.join(' ') }}</span>
      </div>
      <button type="button" class="summary-edit" aria-label="名前とタグを編集" @click="editName">✎</button>
    </div>

    <main class="content">
      <StorageNotice />

      <NameTagsPanel
        ref="panel"
        :name="draft.name"
        :tag-ids="draft.tagIds"
        @update:name="setName"
        @toggle-tag="toggleTag"
      />
      <div ref="panelSentinel" class="sentinel" aria-hidden="true" />

      <section class="side-u" aria-labelledby="side-u-heading">
        <h2 id="side-u-heading" class="list-heading">SIDE U</h2>
        <ol ref="sideUList" class="song-list">
          <SongRow
            v-for="(id, index) in draft.sideU"
            :key="id"
            :song="catalog.songById.get(id)!"
            :meta="songMeta(catalog.songById.get(id)!, catalog)"
            :number="index + 1"
            list="sideU"
            :expanded="selectedId === id"
            :can-move-up="canMoveUp('sideU', index)"
            :can-move-down="canMoveDown('sideU', index)"
            :unavailable-on-apple-music="isAppleMusicUnavailable(catalog.songById.get(id)!)"
            @toggle="selectedId = selectedId === id ? null : id"
            @up="onRowAction('up', id)"
            @down="onRowAction('down', id)"
            @other="onRowAction('other', id)"
            @remove="onRowAction('remove', id)"
          />
          <li v-for="n in emptySlots" :key="`empty-${n}`" class="empty-slot">
            <button type="button" @click="picker?.open()">
              <span class="number" aria-hidden="true">{{ String(draft.sideU.length + n).padStart(2, '0') }}</span>
              <span>空き<span class="visually-hidden">（曲を追加）</span></span>
            </button>
          </li>
        </ol>
      </section>

      <div class="divider" role="separator"><span>ここまでが Side U</span></div>

      <section aria-labelledby="candidates-heading">
        <h2 id="candidates-heading" class="list-heading">候補（{{ draft.candidates.length }}）</h2>
        <p v-if="draft.candidates.length === 0" class="hint">
          13曲に入りきらない曲や、迷っている曲をここに置いておけます。共有されるのは Side U の13曲だけです。
        </p>
        <ul ref="candidateList" class="song-list" :class="{ 'is-empty': draft.candidates.length === 0 }">
          <SongRow
            v-for="(id, index) in draft.candidates"
            :key="id"
            :song="catalog.songById.get(id)!"
            :meta="songMeta(catalog.songById.get(id)!, catalog)"
            list="candidates"
            :expanded="selectedId === id"
            :can-move-up="canMoveUp('candidates', index)"
            :can-move-down="canMoveDown('candidates', index)"
            :unavailable-on-apple-music="isAppleMusicUnavailable(catalog.songById.get(id)!)"
            @toggle="selectedId = selectedId === id ? null : id"
            @up="onRowAction('up', id)"
            @down="onRowAction('down', id)"
            @other="onRowAction('other', id)"
            @remove="onRowAction('remove', id)"
          />
        </ul>
      </section>

      <p class="visually-hidden" aria-live="polite">{{ announcement }}</p>
    </main>

    <footer class="bottom-bar">
      <div class="count">
        <span class="count-number">{{ draft.sideU.length }}/{{ SIDE_U_LENGTH }}</span>
        <span v-if="!isComplete" class="count-rest">あと{{ emptySlots }}曲</span>
      </div>
      <button type="button" class="button" :disabled="totalCount(listState) >= 50" @click="picker?.open()">
        ＋ 曲を追加
      </button>
      <button type="button" class="button button-primary" :disabled="!isComplete" @click="complete">完成する</button>
    </footer>

    <AppToast />
    <SongPickerSheet ref="picker" :present-ids="presentIds" :total-count="totalCount(listState)" @add="onAdd" />
    <ConfirmDialog ref="resetDialog" overlay-key="reset" title="リセットしますか？" confirm-label="リセットする" danger @confirm="reset">
      <p>Side U、候補、名前、タグがすべて消えます。元には戻せません。</p>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.editor {
  min-height: 100dvh;
  padding-bottom: calc(var(--bottom-bar-height) + env(safe-area-inset-bottom));
}

.app-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 40rem;
  margin: 0 auto;
  padding: 0.5rem 1rem;
}

.logo {
  color: inherit;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-decoration: none;
}

.save-status {
  flex: 1;
  color: var(--color-muted);
  font-size: 0.75rem;
  text-align: end;
}

.menu {
  position: relative;
}

.menu summary {
  display: grid;
  place-items: center;
  width: 2.75rem;
  height: 2.75rem;
  cursor: pointer;
  list-style: none;
}

.menu summary::-webkit-details-marker {
  display: none;
}

.menu-items {
  position: absolute;
  right: 0;
  display: grid;
  min-width: 10rem;
  padding: 0.25rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-bg);
  z-index: 20;
}

.menu-items > * {
  min-height: 2.75rem;
  padding: 0 0.75rem;
  border: none;
  background: transparent;
  color: inherit;
  font: inherit;
  line-height: 2.75rem;
  text-align: start;
  text-decoration: none;
}

.summary {
  display: none;
}

/* 高さが十分な端末だけ、要約を上に固定する（DESIGN.md §4.12） */
@media (min-height: 600px) {
  .summary {
    position: sticky;
    top: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 40rem;
    margin: 0 auto;
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--color-border);
    border-inline-start: 4px solid var(--color-accent);
    background: var(--color-bg);
    z-index: 10;
  }
}

.summary-text {
  display: grid;
  flex: 1;
  min-width: 0;
}

.summary-name {
  font-weight: 700;
}

.summary-tags {
  color: var(--color-muted);
  font-size: 0.8125rem;
}

.summary-edit {
  width: 2.75rem;
  height: 2.75rem;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 1.125rem;
}

.content {
  display: grid;
  gap: 1rem;
  padding-top: 0.5rem;
}

.sentinel {
  height: 1px;
  margin-top: -1rem;
}

.list-heading {
  margin: 0 0 0.25rem;
  font-size: 0.875rem;
  letter-spacing: 0.08em;
}

.song-list {
  display: grid;
  gap: 0.125rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.song-list.is-empty {
  min-height: 3rem;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-small);
}

.empty-slot button {
  display: flex;
  gap: 0.75rem;
  width: 100%;
  min-height: 3.25rem;
  /* つまみの幅だけ空けて、番号の位置を曲の行とそろえる */
  padding: 0.5rem 0.75rem 0.5rem var(--row-handle-width);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-small);
  background: transparent;
  color: var(--color-muted);
  font: inherit;
  text-align: start;
  cursor: pointer;
}

.number {
  width: 1.75rem;
  font-variant-numeric: tabular-nums;
}

.divider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: var(--color-accent);
  font-size: 0.8125rem;
  font-weight: 700;
}

.divider::before,
.divider::after {
  flex: 1;
  height: 2px;
  background: currentColor;
  content: '';
}

.hint {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.875rem;
}

.bottom-bar {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: var(--bottom-bar-height);
  padding: 0.5rem max(1rem, calc((100vw - 40rem) / 2)) calc(0.5rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
  background: var(--color-bg);
  z-index: 20;
}

.count {
  display: grid;
  flex: 1;
  line-height: 1.2;
}

.count-number {
  font-size: 1.25rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.count-rest {
  color: var(--color-muted);
  font-size: 0.75rem;
}
</style>
