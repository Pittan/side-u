// catalog/*.json の検証（DESIGN.md §2.3）。CI で実行する。
//
//   pnpm catalog:validate           未照合の Apple Music ID は警告だけ出す
//   pnpm catalog:validate --strict  未照合も失敗にする（公開前に使う）
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { MAX_SONG_ID, MAX_TAG_ID } from '../shared/catalog.ts'

const strict = process.argv.includes('--strict')
const errors: string[] = []
const warnings: string[] = []

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)), '存在しない日付')
const httpsUrl = z.url({ protocol: /^https$/ })

const songSchema = z.strictObject({
  id: z.int().min(1).max(MAX_SONG_ID),
  title: z.string().min(1),
  kana: z.string().min(1),
  aliases: z.array(z.string().min(1)).min(1).optional(),
  artist: z.string().min(1),
  releasedOn: isoDate.optional(),
  parentId: z.int().optional(),
  kind: z.enum(['canonical', 'mix', 'remix', 'instrumental', 'other']),
  selectable: z.boolean(),
  appleMusic: z
    .discriminatedUnion('status', [
      z.strictObject({
        status: z.literal('available'),
        songId: z.string().regex(/^\d+$/),
        storefront: z.literal('jp'),
        verifiedAt: isoDate.nullable(),
      }),
      z.strictObject({ status: z.literal('unavailable'), verifiedAt: isoDate, note: z.string().optional() }),
    ])
    .nullable(),
  sources: z.array(z.strictObject({ label: z.string().min(1), url: httpsUrl })).min(1),
  memo: z.string().optional(),
})

const releaseSchema = z.strictObject({
  id: z.int().min(1),
  title: z.string().min(1),
  kana: z.string().min(1),
  kind: z.enum(['single', 'album', 'digital', 'other']),
  releasedOn: isoDate,
  trackIds: z.array(z.int()),
})

const tagSchema = z.strictObject({
  id: z.int().min(1).max(MAX_TAG_ID),
  categoryId: z.string().min(1),
  label: z.string().min(1),
  retired: z.boolean().optional(),
})

const readJson = (file: string): unknown => JSON.parse(readFileSync(resolve('catalog', file), 'utf8'))
const readOptionalJson = (file: string, fallback: unknown) =>
  existsSync(resolve('catalog', file)) ? readJson(file) : fallback

const songs = z.array(songSchema).parse(readJson('songs.json'))
const releases = z.array(releaseSchema).parse(readJson('releases.json'))
const tags = z.array(tagSchema).parse(readOptionalJson('tags.json', []))
const allowlist = z
  .strictObject({ duplicateAppleMusicIds: z.array(z.string()).default([]) })
  .parse(readOptionalJson('allowlist.json', {}))
const lock = z
  .strictObject({ songIds: z.array(z.int()), tagIds: z.array(z.int()) })
  .parse(readOptionalJson('published-ids.lock', { songIds: [], tagIds: [] }))

const label = (s: { id: number; title: string }) => `#${s.id} ${s.title}`

// 曲 ID の重複
const byId = new Map<number, (typeof songs)[number]>()
for (const song of songs) {
  if (byId.has(song.id)) errors.push(`曲 ID が重複しています: ${label(song)}`)
  byId.set(song.id, song)
}

for (const song of songs) {
  // 親子関係
  if (song.parentId !== undefined) {
    if (song.parentId === song.id) errors.push(`自分自身を親にしています: ${label(song)}`)
    else if (!byId.has(song.parentId)) errors.push(`親曲が存在しません: ${label(song)} → #${song.parentId}`)
    else {
      const seen = new Set([song.id])
      let current = byId.get(song.parentId)
      while (current?.parentId !== undefined) {
        if (seen.has(current.id)) {
          errors.push(`親子関係が循環しています: ${label(song)}`)
          break
        }
        seen.add(current.id)
        current = byId.get(current.parentId)
      }
    }
  }

  // 種類と選択可否
  if (song.kind === 'instrumental' && song.selectable) errors.push(`instrumental なのに選択可になっています: ${label(song)}`)
  if (song.kind !== 'instrumental' && /instrumental|カラオケ/i.test(song.title)) {
    errors.push(`タイトルが instrumental に見えますが kind が ${song.kind} です: ${label(song)}`)
  }

  // Apple Music
  if (song.selectable) {
    if (song.appleMusic === null) {
      ;(strict ? errors : warnings).push(`選択可なのに Apple Music のマッピングがありません: ${label(song)}`)
    } else if (song.appleMusic.status === 'available' && song.appleMusic.verifiedAt === null) {
      ;(strict ? errors : warnings).push(`Apple Music の ID が未照合です: ${label(song)}`)
    }
  }
  if (!song.releasedOn) warnings.push(`初出日がありません: ${label(song)}`)
}

// Apple Music ID の重複
const byAppleMusicId = new Map<string, number[]>()
for (const song of songs) {
  if (song.appleMusic?.status !== 'available') continue
  const ids = byAppleMusicId.get(song.appleMusic.songId) ?? []
  ids.push(song.id)
  byAppleMusicId.set(song.appleMusic.songId, ids)
}
for (const [appleMusicId, ids] of byAppleMusicId) {
  if (ids.length > 1 && !allowlist.duplicateAppleMusicIds.includes(appleMusicId)) {
    errors.push(`Apple Music の ID ${appleMusicId} が複数の曲に使われています: ${ids.map(id => `#${id}`).join(', ')}`)
  }
}

// 作品
const releaseIds = new Set<number>()
for (const release of releases) {
  if (releaseIds.has(release.id)) errors.push(`作品 ID が重複しています: ${label(release)}`)
  releaseIds.add(release.id)
  for (const id of release.trackIds) {
    if (!byId.has(id)) errors.push(`作品に存在しない曲 ID があります: ${label(release)} → #${id}`)
  }
}

// 初出日が、収録している作品の発売日より遅くなっていないか
for (const song of songs) {
  if (!song.releasedOn) continue
  const earliest = releases
    .filter(release => release.trackIds.includes(song.id))
    .map(release => release.releasedOn)
    .sort()[0]
  if (earliest && earliest < song.releasedOn) {
    errors.push(`初出日 ${song.releasedOn} が収録作品の発売日 ${earliest} より遅くなっています: ${label(song)}`)
  }
}

// タグ
const tagIds = new Set<number>()
for (const tag of tags) {
  if (tagIds.has(tag.id)) errors.push(`タグ ID が重複しています: #${tag.id} ${tag.label}`)
  tagIds.add(tag.id)
}

// 動的 OGP 用のフォントに、曲名とタグの文字がすべて入っているか（足りなければ pnpm og:font を実行する）
const ogCharsPath = resolve('public/fonts/og-chars.txt')
if (existsSync(ogCharsPath)) {
  const ogChars = new Set(readFileSync(ogCharsPath, 'utf8'))
  const texts = [...songs.filter(song => song.selectable).map(song => song.title), ...tags.map(tag => tag.label)]
  const missing = [...new Set(texts.join(''))].filter(char => !ogChars.has(char))
  if (missing.length) errors.push(`OGP 用のフォントにない文字があります: ${missing.join('')}（pnpm og:font を実行してください）`)
}

// 公開済みの ID（共有 URL が壊れないように）
for (const id of lock.songIds) {
  const song = byId.get(id)
  if (!song) errors.push(`公開済みの曲 ID が削除されています: #${id}`)
  else if (!song.selectable) errors.push(`公開済みの曲が選択不可になっています: ${label(song)}`)
}
for (const id of lock.tagIds) {
  if (!tagIds.has(id)) errors.push(`公開済みのタグ ID が削除されています: #${id}（選べなくするには retired にしてください）`)
}

if (warnings.length) {
  console.warn(`⚠ 警告 ${warnings.length} 件`)
  for (const w of warnings) console.warn(`  ${w}`)
}
if (errors.length) {
  console.error(`✖ エラー ${errors.length} 件`)
  for (const e of errors) console.error(`  ${e}`)
  process.exit(1)
}
console.log(`✔ songs ${songs.length} / releases ${releases.length} / tags ${tags.length}`)
