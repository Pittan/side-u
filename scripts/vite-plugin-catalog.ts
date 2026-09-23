// catalog/*.json から、表示に必要な項目だけを残した `virtual:catalog` を生成する（DESIGN.md §2.5）。
// アプリ・Worker・テストのどれも Vite を通るので、この 1 つで共通に使える。
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import { toCatalogData } from '../shared/catalog.ts'

const VIRTUAL_ID = 'virtual:catalog'
const RESOLVED_ID = `\0${VIRTUAL_ID}`
const FILES = ['songs.json', 'releases.json', 'tags.json', 'tag-categories.json']

export function catalogPlugin(catalogDir = resolve(import.meta.dirname, '../catalog')): Plugin {
  const read = (file: string) => JSON.parse(readFileSync(resolve(catalogDir, file), 'utf8'))
  return {
    name: 'side-u:catalog',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined
    },
    load(id) {
      if (id !== RESOLVED_ID) return
      for (const file of FILES) this.addWatchFile(resolve(catalogDir, file))
      const data = toCatalogData({
        songs: read('songs.json'),
        releases: read('releases.json'),
        tags: read('tags.json'),
        tagCategories: read('tag-categories.json'),
      })
      return `export default JSON.parse(${JSON.stringify(JSON.stringify(data))})`
    },
  }
}
