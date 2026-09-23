// 下書きの状態（アプリ全体で 1 つ）と localStorage への保存（DESIGN.md §7.1）
import { computed, effectScope, readonly, ref, watch } from 'vue'
import { catalog } from '@shared/catalog-instance'
import { encodePayload, SIDE_U_LENGTH, type SideU } from '@shared/payload'
import { draftStatus, emptyDraft, isDraftEmpty, parseDraft, toggleTag as toggle, type Draft } from '@/editor/draft'
import type { ListState } from '@/editor/list-ops'
import { useStorageHealth } from './useStorageHealth'

const STORAGE_KEY = 'side-u:draft'
const SAVE_DELAY_MS = 300

type SaveStatus = 'saved' | 'pending' | 'unavailable'

const draft = ref<Draft>(emptyDraft())
const saveStatus = ref<SaveStatus>('saved')
const removedOnLoad = ref<number[]>([])
let initialized = false
let timer: ReturnType<typeof setTimeout> | undefined

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    const result = parseDraft(JSON.parse(raw), catalog)
    draft.value = result.draft
    removedOnLoad.value = result.removedSongIds
  } catch {
    // 壊れたデータは無視して空から始める
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft.value))
    saveStatus.value = 'saved'
  } catch {
    saveStatus.value = 'unavailable'
  }
}

function init() {
  if (initialized) return
  initialized = true
  if (!useStorageHealth().canPersist) saveStatus.value = 'unavailable'
  load()
  // 最初に呼んだコンポーネントに紐づくと、そのコンポーネントが消えたときに保存が止まってしまうので、
  // どのコンポーネントにも属さないスコープで監視する
  effectScope(true).run(() => {
    watch(
      draft,
      () => {
        if (saveStatus.value === 'unavailable') return
        saveStatus.value = 'pending'
        clearTimeout(timer)
        timer = setTimeout(save, SAVE_DELAY_MS)
      },
      { deep: true },
    )
  })
  // タブを閉じる・アプリを切り替えるときは待たずに保存する
  addEventListener('pagehide', () => {
    if (saveStatus.value === 'pending') {
      clearTimeout(timer)
      save()
    }
  })
}

/** 今の Side U の payload。13 曲そろっていなければ null */
const currentPayload = computed(() => {
  if (draft.value.sideU.length !== SIDE_U_LENGTH) return null
  try {
    return encodePayload({ songIds: draft.value.sideU, tagIds: draft.value.tagIds }, catalog)
  } catch {
    return null
  }
})

function update(patch: Partial<Omit<Draft, 'v' | 'updatedAt'>>) {
  draft.value = { ...draft.value, ...patch, updatedAt: new Date().toISOString() }
}

export function useDraft() {
  init()
  return {
    draft: readonly(draft),
    saveStatus: readonly(saveStatus),
    removedOnLoad,
    isEmpty: computed(() => isDraftEmpty(draft.value)),
    isComplete: computed(() => draft.value.sideU.length === SIDE_U_LENGTH),
    currentPayload,
    status: computed(() => draftStatus(draft.value, currentPayload.value)),
    markCompleted(payload: string) {
      update({ completedPayload: payload })
    },
    listState: computed<ListState>(() => ({ sideU: [...draft.value.sideU], candidates: [...draft.value.candidates] })),
    sideU: computed<SideU>(() => ({ songIds: [...draft.value.sideU], tagIds: [...draft.value.tagIds] })),
    setLists(state: ListState) {
      update({ sideU: state.sideU, candidates: state.candidates })
    },
    setName(name: string) {
      update({ name })
    },
    toggleTag(tagId: number) {
      update({ tagIds: toggle(draft.value.tagIds, tagId, catalog) })
    },
    /** 新しくつくる / remix（DESIGN.md §7.2）。名前は引き継がない */
    replace(sideU?: SideU) {
      draft.value = {
        ...emptyDraft(),
        sideU: sideU ? [...sideU.songIds] : [],
        tagIds: sideU ? [...sideU.tagIds] : [],
        updatedAt: new Date().toISOString(),
      }
    },
  }
}
