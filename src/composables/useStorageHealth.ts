// 保存できる環境かどうか（DESIGN.md §7.3）。判定できるものだけ判定し、できないものは常に案内を出す。

export type InAppBrowser = 'line' | 'instagram' | 'facebook' | 'tiktok' | null

export function detectInAppBrowser(userAgent: string): InAppBrowser {
  if (/\bLine\//i.test(userAgent)) return 'line'
  if (/\bInstagram\b/i.test(userAgent)) return 'instagram'
  if (/\bFBAN\/|\bFBAV\//.test(userAgent)) return 'facebook'
  if (/BytedanceWebview|musical_ly|TikTok/i.test(userAgent)) return 'tiktok'
  return null
}

export function canUseLocalStorage(): boolean {
  try {
    const key = 'side-u:probe'
    localStorage.setItem(key, '1')
    const ok = localStorage.getItem(key) === '1'
    localStorage.removeItem(key)
    return ok
  } catch {
    return false
  }
}

/** LINE のアプリ内ブラウザで開いたときに、外部ブラウザで開き直すための URL */
export function externalBrowserUrl(href: string): string {
  const url = new URL(href)
  url.searchParams.set('openExternalBrowser', '1')
  return url.toString()
}

let cached: { canPersist: boolean; inAppBrowser: InAppBrowser } | null = null

export function useStorageHealth() {
  cached ??= { canPersist: canUseLocalStorage(), inAppBrowser: detectInAppBrowser(navigator.userAgent) }
  return cached
}
