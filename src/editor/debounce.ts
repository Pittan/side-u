// 最後の呼び出しから wait ミリ秒たったら実行する。呼び出しが続いても maxWait ミリ秒に 1 回は実行する
export type Debounced = {
  (): void
  /** 待っている実行があれば、すぐに実行する */
  flush(): void
  cancel(): void
  readonly pending: boolean
}

export function debounce(fn: () => void, wait: number, maxWait: number): Debounced {
  let timer: ReturnType<typeof setTimeout> | undefined
  let firstCallAt: number | null = null

  function run() {
    clearTimeout(timer)
    timer = undefined
    firstCallAt = null
    fn()
  }

  const debounced = (() => {
    const now = Date.now()
    firstCallAt ??= now
    clearTimeout(timer)
    const delay = Math.min(wait, Math.max(0, firstCallAt + maxWait - now))
    timer = setTimeout(run, delay)
  }) as Debounced

  debounced.flush = () => {
    if (timer !== undefined) run()
  }
  debounced.cancel = () => {
    clearTimeout(timer)
    timer = undefined
    firstCallAt = null
  }
  Object.defineProperty(debounced, 'pending', { get: () => timer !== undefined })
  return debounced
}
