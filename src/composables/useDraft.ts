// 下書きの状態（アプリ全体で 1 つ）と localStorage への保存（DESIGN.md §7.1）
import { computed, effectScope, readonly, ref, watch } from 'vue'
import { catalog } from '@shared/catalog-instance'
import { encodePayload, SIDE_U_LENGTH, type SideU } from '@shared/payload'
import { debounce } from '@/editor/debounce'
import { draftStatus, emptyDraft, isDraftEmpty, parseDraft, toggleTag as toggle, type Draft } from '@/editor/draft'
import type { ListState } from '@/editor/list-ops'
import { useStorageHealth } from './useStorageHealth'

const STORAGE_KEY = 'side-u:draft'
/** 最後の変更から 1 秒たったら保存する。変更が続いても 5 秒に 1 回は保存する */
const SAVE_WAIT_MS = 1000
const SAVE_MAX_WAIT_MS = 5000
/** 未保存の状態がこれより長く続いたときだけ「保存中…」を出す（ふだんの操作でちらつかせない） */
const SHOW_PENDING_AFTER_MS = 1500

type SaveStatus = 'saved' | 'pending' | 'unavailable'

const draft = ref<Draft>(emptyDraft())
const saveStatus = ref<SaveStatus>('saved')
const removedOnLoad = ref<number[]>([])
let initialized = false
let pendingTimer: ReturnType<typeof setTimeout> | undefined

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
  clearTimeout(pendingTimer)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft.value))
    saveStatus.value = 'saved'
  } catch {
    saveStatus.value = 'unavailable'
  }
}

const scheduleSave = debounce(save, SAVE_WAIT_MS, SAVE_MAX_WAIT_MS)

function init() {
  if (initialized) return
  initialized = true
  if (!useStorageHealth().canPersist) saveStatus.value = 'unavailable'
  load()
  // 最初に呼んだコンポーネントに紐づくと、そのコンポーネントが消えたときに保存が止まってしまうので、
  // どのコンポーネントにも属さないスコープで監視する
  // 下書きは update() で毎回まるごと置き換えるので、中身をたどる deep な監視はいらない
  effectScope(true).run(() => {
    watch(draft, () => {
      if (saveStatus.value === 'unavailable') return
      if (!scheduleSave.pending) {
        clearTimeout(pendingTimer)
        pendingTimer = setTimeout(() => {
          if (scheduleSave.pending) saveStatus.value = 'pending'
        }, SHOW_PENDING_AFTER_MS)
      }
      scheduleSave()
    })
  })
  // タブを閉じる・アプリを切り替える・画面をロックするときは待たずに保存する（スマホで一番大事）
  addEventListener('pagehide', () => scheduleSave.flush())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') scheduleSave.flush()
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
    /** 待っている保存をすぐに実行する（ページを移動する前など） */
    flush() {
      scheduleSave.flush()
    },
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
