// Worker が返すレスポンスに付けるセキュリティヘッダー。public/_headers と同じ内容にする（テストで確認している）
export const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' https://js-cdn.music.apple.com; connect-src 'self' https://api.music.apple.com https://*.apple.com; img-src 'self' data: blob:; font-src https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; frame-src https://*.apple.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export function withHeaders(response: Response, extra: Record<string, string> = {}): Response {
  const next = new Response(response.body, response)
  for (const [name, value] of Object.entries({ ...SECURITY_HEADERS, ...extra })) next.headers.set(name, value)
  return next
}
