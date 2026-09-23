import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { debounce } from '@/editor/debounce'

describe('debounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('最後の呼び出しから wait 後に 1 回だけ実行する', () => {
    const fn = vi.fn()
    const d = debounce(fn, 1000, 5000)
    d()
    vi.advanceTimersByTime(500)
    d()
    vi.advanceTimersByTime(999)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('呼び出しが続いても maxWait ごとに実行する', () => {
    const fn = vi.fn()
    const d = debounce(fn, 1000, 5000)
    for (let t = 0; t < 12_000; t += 200) {
      d()
      vi.advanceTimersByTime(200)
    }
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('flush で待たずに実行し、待っていなければ何もしない', () => {
    const fn = vi.fn()
    const d = debounce(fn, 1000, 5000)
    d.flush()
    expect(fn).not.toHaveBeenCalled()
    d()
    expect(d.pending).toBe(true)
    d.flush()
    expect(fn).toHaveBeenCalledTimes(1)
    expect(d.pending).toBe(false)
    vi.advanceTimersByTime(5000)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})
