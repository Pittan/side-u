import { expect, it } from 'vitest'
import { detectInAppBrowser, externalBrowserUrl } from '@/composables/useStorageHealth'

it.each([
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/15.10.0', 'line'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 380.0.0.0.0', 'instagram'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0]', 'facebook'],
  ['Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36 BytedanceWebview/d8a21c6', 'tiktok'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1', null],
  ['Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36', null],
])('%s → %s', (userAgent, expected) => {
  expect(detectInAppBrowser(userAgent)).toBe(expected)
})

it('LINE で外部ブラウザを開く URL', () => {
  expect(externalBrowserUrl('https://sideu.perfumehub.app/u/1abc#n=x')).toBe('https://sideu.perfumehub.app/u/1abc?openExternalBrowser=1#n=x')
})
