// perfume-database（旧 Angular アプリ）の楽曲データを catalog/*.json に変換する。
// 1回だけ実行し、以降は catalog/*.json を原本として手で編集する（DESIGN.md §2.2）。
//
//   pnpm catalog:import [path/to/perfume-database]
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Release, ReleaseKind, Song, SongKind } from '../shared/catalog.ts'

type LegacySong = {
  id: number
  title: string
  kana: string
  artist?: string
  parent?: number
  is_instrumental?: boolean
  memo?: string
  subscriptions?: { spotify?: string; apple_music?: string }
}

type LegacyAlbum = {
  id: number
  title: string
  kana: string
  album_type: 'SINGLE' | 'ALBUM' | 'COMPILATION' | 'DIGITAL' | 'OTHER'
  released_on?: string
  editions: Array<{ name: string; songs: number[][]; released_on?: string }>
}

const SOURCE_REPO = 'https://github.com/Pittan/perfume-database'
const INSTRUMENTAL_PATTERN = /instrumental|カラオケ/i
const NON_SONG_TITLES = new Set(['Intro'])

const root = resolve(process.argv[2] ?? '../perfume-database')
const dataDir = resolve(root, 'src/data')
if (!existsSync(dataDir)) {
  console.error(`perfume-database が見つかりません: ${dataDir}`)
  process.exit(1)
}

const legacy = (await import(pathToFileURL(resolve(dataDir, 'index.ts')).href)) as {
  SONGS: LegacySong[]
  ALBUMS: LegacyAlbum[]
  SINGLES: LegacyAlbum[]
}

const toIsoDate = (value: string) => value.replaceAll('/', '-')

const releaseKind = (type: LegacyAlbum['album_type']): ReleaseKind => {
  switch (type) {
    case 'SINGLE':
      return 'single'
    case 'ALBUM':
    case 'COMPILATION':
      return 'album'
    case 'DIGITAL':
      return 'digital'
    default:
      return 'other'
  }
}

// 作品
const legacyReleases = [...legacy.ALBUMS, ...legacy.SINGLES]
const releases: Release[] = legacyReleases
  .map(album => {
    const editionDates = album.editions.map(e => e.released_on).filter((d): d is string => !!d)
    const releasedOn = album.released_on ?? editionDates.sort()[0]
    if (!releasedOn) throw new Error(`発売日がありません: ${album.title}`)
    const edition = album.editions.find(e => e.name === '通常盤') ?? album.editions[0]
    return {
      id: album.id,
      title: album.title,
      kana: album.kana,
      kind: releaseKind(album.album_type),
      releasedOn: toIsoDate(releasedOn),
      trackIds: edition ? edition.songs.flat() : [],
    }
  })
  .sort((a, b) => a.releasedOn.localeCompare(b.releasedOn) || a.id - b.id)

// 曲ごとの初出日（すべての盤を対象にする）
const firstReleasedOn = new Map<number, string>()
for (const album of legacyReleases) {
  for (const edition of album.editions) {
    const date = edition.released_on ?? album.released_on
    if (!date) continue
    const iso = toIsoDate(date)
    for (const id of edition.songs.flat()) {
      const current = firstReleasedOn.get(id)
      if (!current || iso < current) firstReleasedOn.set(id, iso)
    }
  }
}

// 曲
const songKind = (song: LegacySong): SongKind => {
  if (song.is_instrumental || INSTRUMENTAL_PATTERN.test(song.title)) return 'instrumental'
  if (NON_SONG_TITLES.has(song.title)) return 'other'
  if (song.parent !== undefined) return /remix/i.test(song.title) ? 'remix' : 'mix'
  return 'canonical'
}

const songs: Song[] = legacy.SONGS.map(song => {
  const kind = songKind(song)
  const appleMusicId = song.subscriptions?.apple_music
  const result: Song = {
    id: song.id,
    title: song.title,
    kana: song.kana,
    artist: song.artist ?? 'Perfume',
    kind,
    selectable: kind !== 'instrumental' && kind !== 'other',
    appleMusic: appleMusicId
      ? { status: 'available', songId: appleMusicId, storefront: 'jp', verifiedAt: null }
      : null,
    sources: [{ label: 'perfume-database', url: SOURCE_REPO }],
  }
  const releasedOn = firstReleasedOn.get(song.id)
  if (releasedOn) result.releasedOn = releasedOn
  if (song.parent !== undefined) result.parentId = song.parent
  if (song.memo) result.memo = song.memo
  return result
}).sort((a, b) => a.id - b.id)

const write = (file: string, data: unknown) =>
  writeFileSync(resolve('catalog', file), `${JSON.stringify(data, null, 2)}\n`)

write('songs.json', songs)
write('releases.json', releases)

const count = (predicate: (s: Song) => boolean) => songs.filter(predicate).length
console.log(`songs: ${songs.length}（選択可 ${count(s => s.selectable)}、instrumental ${count(s => s.kind === 'instrumental')}、mix/remix ${count(s => s.kind === 'mix' || s.kind === 'remix')}、other ${count(s => s.kind === 'other')}）`)
console.log(`  Apple Music の ID あり（未照合）: ${count(s => s.appleMusic !== null)}`)
console.log(`  初出日なし: ${count(s => !s.releasedOn)} → ${songs.filter(s => !s.releasedOn).map(s => `${s.id}:${s.title}`).join(', ')}`)
console.log(`releases: ${releases.length}`)
