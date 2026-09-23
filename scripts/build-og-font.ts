// 動的 OGP（Cloudflare Images の .text()）で使うフォントを作る。
// LINE Seed JP Bold（OFL-1.1）から、曲名・タグ・固定の文字だけを抜き出して public/fonts に置く。
// 曲やタグを追加したら再実行する（足りない文字があると catalog:validate がエラーにする）。
//
//   pnpm og:font
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import subsetFont from 'subset-font'

const SOURCE_URL = 'https://raw.githubusercontent.com/google/fonts/main/ofl/lineseedjp/LINESeedJP-Bold.ttf'
const root = resolve(import.meta.dirname, '..')
const cacheDir = resolve(root, 'node_modules/.cache/side-u')
const cachePath = resolve(cacheDir, 'LINESeedJP-Bold.ttf')
export const OG_FONT_PATH = resolve(root, 'public/fonts/og-lineseedjp-bold.woff2')
export const OG_CHARS_PATH = resolve(root, 'public/fonts/og-chars.txt')

/** OGP に描く可能性のある文字（曲名・タグ・番号・記号・ASCII） */
export function ogCharacters(): string {
  const songs = JSON.parse(readFileSync(resolve(root, 'catalog/songs.json'), 'utf8')) as Array<{ title: string }>
  const tags = JSON.parse(readFileSync(resolve(root, 'catalog/tags.json'), 'utf8')) as Array<{ label: string }>
  const ascii = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('')
  const text = [ascii, '#・', ...songs.map(s => s.title), ...tags.map(t => t.label)].join('')
  return [...new Set(text)].sort().join('')
}

if (import.meta.main ?? process.argv[1]?.endsWith('build-og-font.ts')) {
  if (!existsSync(cachePath)) {
    mkdirSync(cacheDir, { recursive: true })
    const response = await fetch(SOURCE_URL)
    if (!response.ok) throw new Error(`フォントを取得できませんでした: ${response.status}`)
    writeFileSync(cachePath, Buffer.from(await response.arrayBuffer()))
  }
  const characters = ogCharacters()
  const subset = await subsetFont(readFileSync(cachePath), characters, { targetFormat: 'woff2' })
  writeFileSync(OG_FONT_PATH, subset)
  writeFileSync(OG_CHARS_PATH, characters)
  console.log(`${characters.length} 文字、${(subset.length / 1024).toFixed(1)} KB → public/fonts/og-lineseedjp-bold.woff2`)
}
