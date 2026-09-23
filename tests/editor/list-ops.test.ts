import { describe, expect, it } from 'vitest'
import { addMany, move, moveDown, moveUp, MAX_TOTAL_SONGS, remove, toCandidates, toSideU, type ListState } from '@/editor/list-ops'

const range = (from: number, count: number) => Array.from({ length: count }, (_, i) => from + i)
const full = (): ListState => ({ sideU: range(1, 13), candidates: [101, 102] })

describe('move', () => {
  it('Side U の途中に入れると後ろが繰り下がり、13 曲目が候補の先頭にあふれる', () => {
    const { state, overflowed } = move(full(), { list: 'candidates', index: 1 }, { list: 'sideU', index: 2 })
    expect(state.sideU).toEqual([1, 2, 102, ...range(3, 10)])
    expect(overflowed).toBe(13)
    expect(state.candidates).toEqual([13, 101])
  })

  it('Side U に空きがあればあふれない', () => {
    const { state, overflowed } = move({ sideU: [1, 2, 3], candidates: [9] }, { list: 'candidates', index: 0 }, { list: 'sideU', index: 1 })
    expect(state).toEqual({ sideU: [1, 9, 2, 3], candidates: [] })
    expect(overflowed).toBeUndefined()
  })

  it('Side U から外すと詰まり、候補からは繰り上がらない', () => {
    const { state } = move(full(), { list: 'sideU', index: 0 }, { list: 'candidates', index: 2 })
    expect(state.sideU).toEqual(range(2, 12))
    expect(state.candidates).toEqual([101, 102, 1])
  })

  it('Side U の中での移動はあふれない', () => {
    const { state, overflowed } = move(full(), { list: 'sideU', index: 12 }, { list: 'sideU', index: 0 })
    expect(state.sideU).toEqual([13, ...range(1, 12)])
    expect(overflowed).toBeUndefined()
  })

  it('範囲外の位置は端に寄せる', () => {
    const { state } = move({ sideU: [1, 2], candidates: [9] }, { list: 'candidates', index: 0 }, { list: 'sideU', index: 99 })
    expect(state.sideU).toEqual([1, 2, 9])
  })

  it('元の状態を変更しない', () => {
    const original = full()
    move(original, { list: 'candidates', index: 0 }, { list: 'sideU', index: 0 })
    expect(original).toEqual(full())
  })
})

describe('ボタン操作', () => {
  it('↑ で 1 つ上へ', () => {
    expect(moveUp(full(), { list: 'sideU', index: 3 }).state.sideU.slice(0, 4)).toEqual([1, 2, 4, 3])
  })

  it('Side U の先頭で ↑ は何もしない', () => {
    expect(moveUp(full(), { list: 'sideU', index: 0 }).state).toEqual(full())
  })

  it('候補の先頭で ↑ → 13 曲そろっていれば 13 曲目と入れ替わる', () => {
    const { state, overflowed } = moveUp(full(), { list: 'candidates', index: 0 })
    expect(state.sideU).toEqual([...range(1, 12), 101])
    expect(state.candidates).toEqual([13, 102])
    expect(overflowed).toBe(13)
  })

  it('候補の先頭で ↑ → 空きがあれば Side U の末尾に入る', () => {
    const { state, overflowed } = moveUp({ sideU: [1, 2], candidates: [9, 8] }, { list: 'candidates', index: 0 })
    expect(state).toEqual({ sideU: [1, 2, 9], candidates: [8] })
    expect(overflowed).toBeUndefined()
  })

  it('Side U の最後の曲で ↓ → 候補の先頭に移る', () => {
    const { state } = moveDown(full(), { list: 'sideU', index: 12 })
    expect(state.sideU).toEqual(range(1, 12))
    expect(state.candidates).toEqual([13, 101, 102])
  })

  it('13 曲に満たなくても、Side U の最後の曲で ↓ → 候補の先頭に移る', () => {
    expect(moveDown({ sideU: [1, 2], candidates: [9] }, { list: 'sideU', index: 1 }).state).toEqual({ sideU: [1], candidates: [2, 9] })
  })

  it('候補の最後で ↓ は何もしない', () => {
    expect(moveDown(full(), { list: 'candidates', index: 1 }).state).toEqual(full())
  })

  it('↑ を続けて押すと、候補から Side U の上まで動かせる', () => {
    let state = full()
    let pos = { list: 'candidates' as const, index: 1 } as { list: 'sideU' | 'candidates'; index: number }
    const id = 102
    for (let i = 0; i < 20; i++) {
      state = moveUp(state, pos).state
      pos = state.sideU.includes(id) ? { list: 'sideU', index: state.sideU.indexOf(id) } : { list: 'candidates', index: state.candidates.indexOf(id) }
    }
    expect(state.sideU[0]).toBe(102)
    expect(state.sideU).toHaveLength(13)
    expect(state.candidates).toEqual([13, 101])
  })

  it('候補へ / Side U へ', () => {
    expect(toCandidates(full(), { list: 'sideU', index: 5 }).state.candidates).toEqual([6, 101, 102])
    expect(toSideU(full(), { list: 'candidates', index: 1 }).state.sideU.at(-1)).toBe(102)
  })
})

describe('remove', () => {
  it('削除すると詰まる', () => {
    expect(remove(full(), { list: 'sideU', index: 0 }).sideU).toEqual(range(2, 12))
  })
})

describe('addMany', () => {
  it('Side U の空き枠を先に埋め、残りは候補の末尾に入れる', () => {
    const result = addMany({ sideU: range(1, 11), candidates: [101] }, [201, 202, 203, 204])
    expect(result.state.sideU).toEqual([...range(1, 11), 201, 202])
    expect(result.state.candidates).toEqual([101, 203, 204])
    expect(result.addedToSideU).toEqual([201, 202])
    expect(result.addedToCandidates).toEqual([203, 204])
  })

  it('すでに入っている曲は追加しない', () => {
    const result = addMany(full(), [1, 101, 300, 300])
    expect(result.skipped).toEqual([1, 101, 300])
    expect(result.state.candidates).toEqual([101, 102, 300])
  })

  it(`合計 ${MAX_TOTAL_SONGS} 曲まで`, () => {
    const result = addMany(full(), range(1000, 40))
    expect(result.state.sideU.length + result.state.candidates.length).toBe(MAX_TOTAL_SONGS)
    expect(result.skipped).toHaveLength(40 - (MAX_TOTAL_SONGS - 15))
  })
})
