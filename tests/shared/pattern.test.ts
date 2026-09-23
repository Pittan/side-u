import { expect, it } from 'vitest'
import { createPattern } from '@shared/pattern'

it('同じ payload なら同じ模様', () => {
  expect(createPattern('1abc')).toEqual(createPattern('1abc'))
})

it('payload が変われば模様も変わる', () => {
  expect(createPattern('1abc')).not.toEqual(createPattern('1abd'))
})

it('生成規則が変わっていない（変えるときは payload のバージョンで振り分ける）', () => {
  const pattern = createPattern('1AAEAAgADAAQABQAGAAcACAAJAAoACwAMAA0CBw0AAA')
  expect(pattern.background).toMatchSnapshot()
  expect(pattern.shapes.length).toMatchSnapshot()
})
