// 共有 URL の fragment（DESIGN.md §3.1）。`key=value&...` の形式で、知らないキーは無視する。
import { parseDisplayName } from './display-name'

export type FragmentData = { name: string | null }

export function parseFragment(hash: string): FragmentData {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const name = params.get('n')
  return { name: name === null ? null : parseDisplayName(name) }
}

export function buildFragment({ name }: FragmentData): string {
  if (!name) return ''
  // URLSearchParams は空白を + にするので、encodeURIComponent で組み立てる
  return `#n=${encodeURIComponent(name)}`
}
