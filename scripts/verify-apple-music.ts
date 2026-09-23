// Apple Music のカタログと楽曲データを照合する（DESIGN.md §2.4）。CI では実行しない。
//
//   APPLE_TEAM_ID=… APPLE_KEY_ID=… APPLE_PRIVATE_KEY_PATH=./AuthKey_XXXX.p8 pnpm catalog:verify-am [--apply] [--report path]
//
// - ID がある曲: カタログの曲名と比べる
// - ID がない曲: 「Perfume 曲名」で検索し、アーティストが Perfume で曲名が一致する候補を探す
// - --apply: 曲名が一致し、候補が 1 つに決まるものだけを songs.json に反映する（それ以外は人が判断する）
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { importPKCS8, SignJWT } from 'jose'
import type { Song } from '../shared/catalog.ts'

const { values } = parseArgs({
  options: { apply: { type: 'boolean', default: false }, report: { type: 'string' } },
})

const API = 'https://api.music.apple.com/v1/catalog/jp'
const SONGS_PATH = resolve(import.meta.dirname, '../catalog/songs.json')
const today = new Date().toISOString().slice(0, 10)

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`環境変数 ${name} がありません`)
    process.exit(1)
  }
  return value
}

const privateKey = await importPKCS8(readFileSync(required('APPLE_PRIVATE_KEY_PATH'), 'utf8'), 'ES256')
const now = Math.floor(Date.now() / 1000)
const token = await new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: required('APPLE_KEY_ID') })
  .setIssuer(required('APPLE_TEAM_ID'))
  .setIssuedAt(now)
  .setExpirationTime(now + 60 * 60)
  .sign(privateKey)

type CatalogSong = {
  id: string
  attributes: { name: string; albumName: string; artistName: string; releaseDate?: string; durationInMillis?: number }
}

async function get<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })
    // 429: 回数制限。401: 作ったばかりの鍵が Apple のサーバーに行き渡るまで、ときどき返る
    if (response.status === 429 || response.status === 401) {
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)))
      continue
    }
    if (!response.ok) throw new Error(`${response.status} ${path}`)
    return (await response.json()) as T
  }
  throw new Error(`429 / 401 が続きました: ${path}`)
}

/** 表記の違い（全角・半角、大文字・小文字、空白、記号）を無視する。バージョン名の文字は残る */
function normalizeTitle(title: string): string {
  return title
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s\p{P}\p{S}]/gu, '')
}

const isPerfume = (artist: string) => /perfume|ぱふゅ/i.test(artist)

const songs = JSON.parse(readFileSync(SONGS_PATH, 'utf8')) as Song[]
const targets = songs.filter(song => song.selectable)

type Row = { song: Song; status: 'ok' | 'mismatch' | 'missing-id' | 'found' | 'ambiguous' | 'not-found'; detail: string; candidateId?: string }
const rows: Row[] = []

// 1. ID がある曲
const mapped = targets.filter(song => song.appleMusic?.status === 'available')
const byAppleId = new Map<string, CatalogSong>()
for (let i = 0; i < mapped.length; i += 100) {
  const ids = mapped.slice(i, i + 100).map(song => (song.appleMusic as { songId: string }).songId)
  const json = await get<{ data: CatalogSong[] }>(`/songs?ids=${ids.join(',')}`)
  for (const item of json.data) byAppleId.set(item.id, item)
}
for (const song of mapped) {
  const appleId = (song.appleMusic as { songId: string }).songId
  const item = byAppleId.get(appleId)
  if (!item) {
    rows.push({ song, status: 'missing-id', detail: `ID ${appleId} がカタログにない（配信終了など）` })
  } else if (normalizeTitle(item.attributes.name) === normalizeTitle(song.title) && isPerfume(item.attributes.artistName)) {
    rows.push({ song, status: 'ok', detail: `${item.attributes.name} / ${item.attributes.albumName}` })
  } else {
    rows.push({ song, status: 'mismatch', detail: `Apple: ${item.attributes.name} / ${item.attributes.albumName} / ${item.attributes.artistName}` })
  }
}

// 2. ID がない曲
const unmapped = targets.filter(song => song.appleMusic?.status !== 'available')
for (const song of unmapped) {
  const term = encodeURIComponent(`Perfume ${song.title}`)
  const json = await get<{ results: { songs?: { data: CatalogSong[] } } }>(`/search?types=songs&limit=25&term=${term}`)
  const candidates = (json.results.songs?.data ?? []).filter(
    item => isPerfume(item.attributes.artistName) && normalizeTitle(item.attributes.name) === normalizeTitle(song.title),
  )
  // 同じ録音が複数の作品に入っていることがあるので、曲名が一致する候補のうち最も古いものを代表にする
  const sorted = candidates.sort((a, b) => (a.attributes.releaseDate ?? '').localeCompare(b.attributes.releaseDate ?? ''))
  const albums = [...new Set(sorted.map(item => item.attributes.albumName))]
  if (sorted.length === 0) {
    rows.push({ song, status: 'not-found', detail: '曲名が一致する候補なし' })
  } else if (new Set(sorted.map(item => item.attributes.durationInMillis)).size > 1 && albums.length > 1) {
    rows.push({ song, status: 'ambiguous', detail: `候補 ${sorted.length} 件（長さの違う録音あり）: ${sorted.map(i => `${i.id} ${i.attributes.albumName}`).join(' | ')}`, candidateId: sorted[0]!.id })
  } else {
    rows.push({ song, status: 'found', detail: `${sorted[0]!.attributes.name} / ${sorted[0]!.attributes.albumName}`, candidateId: sorted[0]!.id })
  }
  await new Promise(r => setTimeout(r, 150))
}

// 3. 反映
if (values.apply) {
  for (const row of rows) {
    const song = songs.find(s => s.id === row.song.id)!
    if (row.status === 'ok') song.appleMusic = { ...(song.appleMusic as { songId: string }), status: 'available', storefront: 'jp', verifiedAt: today }
    if (row.status === 'found') song.appleMusic = { status: 'available', songId: row.candidateId!, storefront: 'jp', verifiedAt: today }
  }
  writeFileSync(SONGS_PATH, `${JSON.stringify(songs, null, 2)}\n`)
}

// 4. 報告
const LABELS: Record<Row['status'], string> = {
  ok: '一致',
  found: '検索で見つかった',
  mismatch: '曲名が一致しない',
  'missing-id': 'ID がカタログにない',
  ambiguous: '候補が複数',
  'not-found': '見つからない',
}
const lines = [`# Apple Music 照合結果（${today}）`, '']
for (const status of Object.keys(LABELS) as Row['status'][]) {
  const list = rows.filter(row => row.status === status)
  lines.push(`## ${LABELS[status]}（${list.length}）`, '')
  if (status === 'ok') {
    lines.push('（省略）', '')
    continue
  }
  for (const row of list) lines.push(`- #${row.song.id} ${row.song.title} — ${row.detail}`)
  lines.push('')
}
const report = lines.join('\n')
if (values.report) writeFileSync(values.report, report)
for (const status of Object.keys(LABELS) as Row['status'][]) {
  console.log(`${LABELS[status]}: ${rows.filter(row => row.status === status).length}`)
}
console.log(values.apply ? '「一致」と「検索で見つかった」を songs.json に反映しました' : '（--apply を付けると反映します）')
