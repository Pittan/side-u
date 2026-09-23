// MusicKit JS v3 の読み込みと、Apple Music API の呼び出し。
// Music User Token はこのファイルの中だけで扱い、SIDE U のサーバーには送らない（DESIGN.md §8）。
// ※ 実際の Apple Music での動作は、Apple Developer の鍵を発行したあとに確認する（README の「最後にまとめて行う」）

type MusicKitInstance = {
  authorize(): Promise<string>
  readonly musicUserToken: string
}

type MusicKitStatic = {
  configure(options: { developerToken: string; app: { name: string; build: string } }): Promise<MusicKitInstance>
  getInstance(): MusicKitInstance
}

declare global {
  interface Window {
    MusicKit?: MusicKitStatic
  }
}

const SCRIPT_URL = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'
const API_ORIGIN = 'https://api.music.apple.com'

let loading: Promise<MusicKitStatic> | null = null

function loadScript(): Promise<MusicKitStatic> {
  loading ??= new Promise((resolve, reject) => {
    if (window.MusicKit) return resolve(window.MusicKit)
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onerror = () => {
      loading = null
      reject(new AppleMusicError('network'))
    }
    document.addEventListener('musickitloaded', () => (window.MusicKit ? resolve(window.MusicKit) : reject(new AppleMusicError('network'))), {
      once: true,
    })
    document.head.append(script)
  })
  return loading
}

export type AppleMusicErrorKind = 'cancelled' | 'not-subscribed' | 'unauthorized' | 'network' | 'unknown'

export class AppleMusicError extends Error {
  constructor(readonly kind: AppleMusicErrorKind) {
    super(kind)
  }
}

export type PreparedMusicKit = { developerToken: string; instance: MusicKitInstance }

let preparing: Promise<PreparedMusicKit> | null = null

/**
 * MusicKit の読み込みと初期設定。サインインのボタンを押す前（確認画面を開いたとき）に済ませておく。
 * スマホのブラウザは「ボタンを押した直後」でないとサインインの画面（ポップアップ）を開かせないので、
 * 押してから読み込むと、その間に扱いが切れて黙って止められる
 */
export function prepareMusicKit(developerToken: string): Promise<PreparedMusicKit> {
  preparing ??= (async () => {
    const MusicKit = await loadScript()
    const instance = await MusicKit.configure({ developerToken, app: { name: 'SIDE U', build: '1' } })
    return { developerToken, instance }
  })().catch(error => {
    preparing = null
    throw error instanceof AppleMusicError ? error : new AppleMusicError('network')
  })
  return preparing
}

/** ボタンを押した処理の中で、await を挟まずに最初に呼ぶ（サインインの画面をすぐに開くため） */
export function authorize(prepared: PreparedMusicKit): Promise<{ developerToken: string; musicUserToken: string }> {
  return prepared.instance.authorize().then(
    musicUserToken => {
      if (!musicUserToken) throw new AppleMusicError('cancelled')
      return { developerToken: prepared.developerToken, musicUserToken }
    },
    () => {
      throw new AppleMusicError('cancelled')
    },
  )
}

export async function createLibraryPlaylist(
  tokens: { developerToken: string; musicUserToken: string },
  body: unknown,
): Promise<{ id: string }> {
  let response: Response
  try {
    response = await fetch(`${API_ORIGIN}/v1/me/library/playlists`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokens.developerToken}`,
        'Music-User-Token': tokens.musicUserToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AppleMusicError('network')
  }
  if (response.status === 401) throw new AppleMusicError('unauthorized')
  if (response.status === 403) throw new AppleMusicError('not-subscribed')
  if (!response.ok) throw new AppleMusicError('unknown')
  const json = (await response.json()) as { data?: Array<{ id: string }> }
  const id = json.data?.[0]?.id
  if (!id) throw new AppleMusicError('unknown')
  return { id }
}

export function libraryPlaylistUrl(id: string): string {
  return `https://music.apple.com/library/playlist/${encodeURIComponent(id)}`
}
