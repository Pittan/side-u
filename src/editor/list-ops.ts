// 編集画面のリスト操作（DESIGN.md §4.10）。iPhone のホーム画面のアイコン並べ替えと同じ考え方:
// Side U は 13 枠のページ、候補はその次のページ。途中に入れると後ろが繰り下がり、
// 14 曲目になった曲は候補の先頭にあふれる。Side U から外しても候補からは繰り上がらない。
import { SIDE_U_LENGTH } from '@shared/payload'

export const MAX_TOTAL_SONGS = 50

export type ListName = 'sideU' | 'candidates'
export type ListState = { sideU: number[]; candidates: number[] }
export type Pos = { list: ListName; index: number }
export type OpResult = { state: ListState; overflowed?: number }

const clone = (state: ListState): ListState => ({ sideU: [...state.sideU], candidates: [...state.candidates] })

export function totalCount(state: ListState): number {
  return state.sideU.length + state.candidates.length
}

export function findPos(state: ListState, id: number): Pos | null {
  for (const list of ['sideU', 'candidates'] as const) {
    const index = state[list].indexOf(id)
    if (index !== -1) return { list, index }
  }
  return null
}

function insert(state: ListState, id: number, to: Pos): OpResult {
  const next = clone(state)
  const target = next[to.list]
  target.splice(Math.min(Math.max(to.index, 0), target.length), 0, id)
  if (next.sideU.length > SIDE_U_LENGTH) {
    const overflowed = next.sideU.pop()!
    next.candidates.unshift(overflowed)
    return { state: next, overflowed }
  }
  return { state: next }
}

export function remove(state: ListState, at: Pos): ListState {
  const next = clone(state)
  next[at.list].splice(at.index, 1)
  return next
}

/** `to` は移動後にその曲が来る位置 */
export function move(state: ListState, from: Pos, to: Pos): OpResult {
  const id = state[from.list][from.index]
  if (id === undefined) return { state }
  return insert(remove(state, from), id, to)
}

/** 候補から Side U に入れるときの位置: 空きがあれば末尾、13 曲そろっていれば 13 曲目（入れ替えになる） */
function sideUEntryIndex(state: ListState): number {
  return Math.min(state.sideU.length, SIDE_U_LENGTH - 1)
}

export function moveUp(state: ListState, at: Pos): OpResult {
  if (at.index > 0) return move(state, at, { list: at.list, index: at.index - 1 })
  if (at.list === 'candidates') return toSideU(state, at)
  return { state }
}

export function moveDown(state: ListState, at: Pos): OpResult {
  const list = state[at.list]
  if (at.index < list.length - 1) return move(state, at, { list: at.list, index: at.index + 1 })
  if (at.list === 'sideU') return toCandidates(state, at)
  return { state }
}

export function toSideU(state: ListState, at: Pos): OpResult {
  if (at.list !== 'candidates') return { state }
  const removed = remove(state, at)
  return insert(removed, state.candidates[at.index]!, { list: 'sideU', index: sideUEntryIndex(removed) })
}

export function toCandidates(state: ListState, at: Pos): OpResult {
  if (at.list !== 'sideU') return { state }
  return move(state, at, { list: 'candidates', index: 0 })
}

export type AddResult = {
  state: ListState
  addedToSideU: number[]
  addedToCandidates: number[]
  /** すでに入っていた、または上限を超えたため追加しなかった曲 */
  skipped: number[]
}

/** Side U の空き枠を先に埋め、残りは候補の末尾に入れる */
export function addMany(state: ListState, ids: number[]): AddResult {
  const next = clone(state)
  const present = new Set([...next.sideU, ...next.candidates])
  const result: AddResult = { state: next, addedToSideU: [], addedToCandidates: [], skipped: [] }
  for (const id of ids) {
    if (present.has(id) || totalCount(next) >= MAX_TOTAL_SONGS) {
      result.skipped.push(id)
      continue
    }
    present.add(id)
    if (next.sideU.length < SIDE_U_LENGTH) {
      next.sideU.push(id)
      result.addedToSideU.push(id)
    } else {
      next.candidates.push(id)
      result.addedToCandidates.push(id)
    }
  }
  return result
}
