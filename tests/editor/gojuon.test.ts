import { expect, it } from 'vitest'
import { gojuonRow, OTHER_ROW } from '@/editor/gojuon'

it.each([
  ['ぽりりずむ', 'は'],
  ['がらす', 'か'],
  ['ゔぉいす', 'あ'],
  ['っと', 'た'],
  ['わんるーむ', 'わ'],
  ['123', OTHER_ROW],
])('%s → %s', (kana, row) => {
  expect(gojuonRow(kana)).toBe(row)
})
