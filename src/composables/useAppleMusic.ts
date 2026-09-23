// Apple Music のプレイリスト作成の流れ（DESIGN.md §8.2）
import { computed, ref } from 'vue'
import { catalog } from '@shared/catalog-instance'
import {
  createPlaylistBody,
  isTokenUsable,
  planTracks,
  playlistDescription,
  playlistName,
  resolveTracks,
  type Resolution,
} from '@/apple-music/plan'

const CREATED_KEY = 'side-u:am-created'
const RESUME_KEY = 'side-u:am-resume'

const developerToken = import.meta.env.VITE_APPLE_DEVELOPER_TOKEN
const tokenExpiresAt = Number(import.meta.env.VITE_APPLE_DEVELOPER_TOKEN_EXP) || undefined

export type AppleMusicState =
  | { step: 'confirm' }
  | { step: 'authorizing' }
  | { step: 'creating' }
  | { step: 'done'; url: string; added: number }
  | { step: 'error'; kind: import('@/apple-music/musickit').AppleMusicErrorKind }

function readCreated(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CREATED_KEY) ?? '{}') as Record<string, string>
  } catch {
    return {}
  }
}

export function isAppleMusicAvailable(): boolean {
  return isTokenUsable(developerToken, tokenExpiresAt)
}

/** 認可の途中でページが再読み込みされた場合に、流れを再開するか */
export function shouldResume(payload: string): boolean {
  try {
    return sessionStorage.getItem(RESUME_KEY) === payload
  } catch {
    return false
  }
}

type MusicKitModule = typeof import('@/apple-music/musickit')

export function useAppleMusic(input: { payload: string; songIds: number[]; name: string | null; tagLabels: string[] }) {
  const plans = planTracks(input.songIds, catalog)
  const missing = plans.filter(plan => !plan.appleMusicId)
  const resolution = ref<Resolution>(Object.fromEntries(missing.map(plan => [plan.songId, null])))
  const state = ref<AppleMusicState>({ step: 'confirm' })
  const createdAt = ref(readCreated()[input.payload] ?? null)
  /** MusicKit の準備（確認画面を開いたときに始める） */
  const readiness = ref<'idle' | 'preparing' | 'ready' | 'failed'>('idle')

  const trackIds = computed(() => resolveTracks(plans, resolution.value, catalog))
  const name = playlistName(input.name)

  let musicKit: MusicKitModule | null = null
  let prepared: import('@/apple-music/musickit').PreparedMusicKit | null = null
  /** やめたあとに、前のサインインの結果が届いても無視するため */
  let attempt = 0

  function setResume(active: boolean) {
    try {
      if (active) sessionStorage.setItem(RESUME_KEY, input.payload)
      else sessionStorage.removeItem(RESUME_KEY)
    } catch {
      // sessionStorage が使えなくても作成はできる
    }
  }

  async function prepare() {
    if (!developerToken || readiness.value === 'preparing' || readiness.value === 'ready') return
    readiness.value = 'preparing'
    try {
      // MusicKit は必要になったときに初めて読み込む
      musicKit = await import('@/apple-music/musickit')
      prepared = await musicKit.prepareMusicKit(developerToken)
      readiness.value = 'ready'
    } catch {
      readiness.value = 'failed'
    }
  }

  /** ボタンを押した処理そのもの。サインインを始めるまで await を挟まない */
  function create() {
    if (!musicKit || !prepared || trackIds.value.length === 0) return
    const current = ++attempt
    setResume(true)
    state.value = { step: 'authorizing' }
    const authorizing = musicKit.authorize(prepared)
    void finish(current, musicKit, authorizing)
  }

  async function finish(current: number, mk: MusicKitModule, authorizing: ReturnType<MusicKitModule['authorize']>) {
    try {
      const tokens = await authorizing
      if (current !== attempt) return
      state.value = { step: 'creating' }
      const body = createPlaylistBody(name, playlistDescription(input.tagLabels), trackIds.value)
      const { id } = await mk.createLibraryPlaylist(tokens, body)
      if (current !== attempt) return
      const now = new Date().toISOString()
      try {
        localStorage.setItem(CREATED_KEY, JSON.stringify({ ...readCreated(), [input.payload]: now }))
      } catch {
        // 記録できなくても作成は成功している
      }
      createdAt.value = now
      state.value = { step: 'done', url: mk.libraryPlaylistUrl(id), added: trackIds.value.length }
    } catch (error) {
      if (current !== attempt) return
      state.value = { step: 'error', kind: error instanceof mk.AppleMusicError ? error.kind : 'unknown' }
    } finally {
      if (current === attempt) setResume(false)
    }
  }

  /** サインインの画面が開かない・戻ってこないときに、確認画面へ戻る */
  function cancel() {
    attempt++
    setResume(false)
    state.value = { step: 'confirm' }
  }

  function reset() {
    state.value = { step: 'confirm' }
  }

  return {
    name,
    plans,
    missing,
    resolution,
    trackIds,
    state,
    createdAt,
    readiness,
    prepare,
    create,
    cancel,
    reset,
    cancelResume: () => setResume(false),
  }
}
