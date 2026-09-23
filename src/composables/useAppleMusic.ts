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

export function useAppleMusic(input: { payload: string; songIds: number[]; name: string | null; tagLabels: string[] }) {
  const plans = planTracks(input.songIds, catalog)
  const missing = plans.filter(plan => !plan.appleMusicId)
  const resolution = ref<Resolution>(Object.fromEntries(missing.map(plan => [plan.songId, null])))
  const state = ref<AppleMusicState>({ step: 'confirm' })
  const createdAt = ref(readCreated()[input.payload] ?? null)

  const trackIds = computed(() => resolveTracks(plans, resolution.value, catalog))
  const name = playlistName(input.name)

  function setResume(active: boolean) {
    try {
      if (active) sessionStorage.setItem(RESUME_KEY, input.payload)
      else sessionStorage.removeItem(RESUME_KEY)
    } catch {
      // sessionStorage が使えなくても作成はできる
    }
  }

  async function create() {
    if (!developerToken || trackIds.value.length === 0) return
    // MusicKit は必要になったときに初めて読み込む
    const { authorize, createLibraryPlaylist, libraryPlaylistUrl, AppleMusicError } = await import('@/apple-music/musickit')
    setResume(true)
    try {
      state.value = { step: 'authorizing' }
      const tokens = await authorize(developerToken)
      state.value = { step: 'creating' }
      const body = createPlaylistBody(name, playlistDescription(input.tagLabels), trackIds.value)
      const { id } = await createLibraryPlaylist(tokens, body)
      const now = new Date().toISOString()
      try {
        localStorage.setItem(CREATED_KEY, JSON.stringify({ ...readCreated(), [input.payload]: now }))
      } catch {
        // 記録できなくても作成は成功している
      }
      createdAt.value = now
      state.value = { step: 'done', url: libraryPlaylistUrl(id), added: trackIds.value.length }
    } catch (error) {
      state.value = { step: 'error', kind: error instanceof AppleMusicError ? error.kind : 'unknown' }
    } finally {
      setResume(false)
    }
  }

  function reset() {
    state.value = { step: 'confirm' }
  }

  return { name, plans, missing, resolution, trackIds, state, createdAt, create, reset, cancelResume: () => setResume(false) }
}
