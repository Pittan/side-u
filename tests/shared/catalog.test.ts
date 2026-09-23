import { expect, it } from 'vitest'
import { catalog } from '../helpers'

it('ブラウザ用のカタログには出典などの項目が含まれない', () => {
  const song = catalog.songs[0]!
  expect(song).not.toHaveProperty('sources')
  expect(song).not.toHaveProperty('memo')
})

it('初出の作品がわかる', () => {
  const moon = catalog.songs.find(song => song.title === 'Moon')!
  expect(catalog.releaseById.get(moon.firstReleaseId!)?.title).toBe('Moon')
})

it('別バージョンを親曲から引ける', () => {
  const edge = catalog.songs.find(song => song.title === 'edge')!
  expect(catalog.childrenByParentId.get(edge.id)?.map(song => song.title)).toContain('edge(⊿-mix)')
})
