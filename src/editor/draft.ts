// 下書きの形と、保存データの読み込み・整形（DESIGN.md §7.1）
import type { Catalog } from '@shared/catalog'
import { clampDisplayName } from '@shared/display-name'
import { MAX_TAGS, SIDE_U_LENGTH } from '@shared/payload'
import { MAX_TOTAL_SONGS } from './list-ops'

export type Draft = {
  v: 1
  sideU: number[]
  candidates: number[]
  tagIds: number[]
  name: string
  updatedAt: string
  /** 「完成する」を押したときの payload。その後に曲やタグを変えると、今の内容と一致しなくなる */
  completedPayload?: string
}

/**
 * - empty: 何もない
 * - editing: 作成中（一度も完成していない）
 * - completed: 完成したときの内容のまま
 * - editedAfterComplete: 完成したあとに曲やタグを変えた
 */
export type DraftStatus = 'empty' | 'editing' | 'completed' | 'editedAfterComplete'

export function draftStatus(draft: Draft, currentPayload: string | null): DraftStatus {
  if (isDraftEmpty(draft)) return 'empty'
  if (!draft.completedPayload) return 'editing'
  return draft.completedPayload === currentPayload ? 'completed' : 'editedAfterComplete'
}

export function emptyDraft(): Draft {
  return { v: 1, sideU: [], candidates: [], tagIds: [], name: '', updatedAt: new Date(0).toISOString() }
}

export function isDraftEmpty(draft: Draft): boolean {
  return draft.sideU.length === 0 && draft.candidates.length === 0 && draft.tagIds.length === 0 && !draft.name
}

export type LoadResult = { draft: Draft; removedSongIds: number[] }

const numbers = (value: unknown): number[] =>
  Array.isArray(value) ? value.filter((v): v is number => Number.isInteger(v)) : []

/**
 * 保存データを読み込む。壊れていても例外にせず、使える部分だけを残す。
 * カタログにない曲・選べない曲・重複は取り除き、removedSongIds で知らせる。
 */
export function parseDraft(raw: unknown, catalog: Catalog): LoadResult {
  if (typeof raw !== 'object' || raw === null || (raw as { v?: unknown }).v !== 1) {
    return { draft: emptyDraft(), removedSongIds: [] }
  }
  const input = raw as Record<string, unknown>
  const seen = new Set<number>()
  const removedSongIds: number[] = []
  const keep = (id: number) => {
    const song = catalog.songById.get(id)
    if (!song?.selectable) {
      removedSongIds.push(id)
      return false
    }
    if (seen.has(id)) return false
    seen.add(id)
    return true
  }

  const sideU = numbers(input.sideU).filter(keep)
  const candidates = [...sideU.splice(SIDE_U_LENGTH), ...numbers(input.candidates).filter(keep)]
  candidates.splice(MAX_TOTAL_SONGS - sideU.length)

  const categories = new Set<string>()
  const tagIds = numbers(input.tagIds)
    .filter(id => {
      const tag = catalog.tagById.get(id)
      if (!tag || tag.retired || categories.has(tag.categoryId)) return false
      categories.add(tag.categoryId)
      return true
    })
    .slice(0, MAX_TAGS)

  const completedPayload = typeof input.completedPayload === 'string' ? input.completedPayload : undefined
  return {
    draft: {
      v: 1,
      sideU,
      candidates,
      tagIds,
      name: typeof input.name === 'string' ? clampDisplayName(input.name) : '',
      updatedAt: typeof input.updatedAt === 'string' ? input.updatedAt : new Date(0).toISOString(),
      ...(completedPayload ? { completedPayload } : {}),
    },
    removedSongIds,
  }
}

/** 同じカテゴリのタグは 1 つだけ。選択中のタグを押すと外れる */
export function toggleTag(tagIds: number[], tagId: number, catalog: Catalog): number[] {
  if (tagIds.includes(tagId)) return tagIds.filter(id => id !== tagId)
  const categoryId = catalog.tagById.get(tagId)?.categoryId
  return [...tagIds.filter(id => catalog.tagById.get(id)?.categoryId !== categoryId), tagId]
}
