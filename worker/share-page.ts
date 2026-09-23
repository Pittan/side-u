// GET /u/:payload — アプリの HTML に、その Side U の OGP メタデータを差し込む（DESIGN.md §10）
import { catalog } from '@shared/catalog-instance'
import { ogDescription } from '@shared/og-meta'
import { decodePayload } from '@shared/payload'
import { isOgDynamicEnabled } from './config'
import { withHeaders } from './headers'

export async function handleSharePage(request: Request, env: Env, payload: string): Promise<Response> {
  const url = new URL(request.url)
  // アプリの HTML（SPA のフォールバック）を取り出す
  const shell = await env.ASSETS.fetch(new URL('/index.html', url))
  const decoded = decodePayload(payload, catalog)
  const noindex = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'public, max-age=3600' }

  if (!decoded.ok || !isOgDynamicEnabled(env)) {
    // 壊れた URL でも、アプリが「読み込めませんでした」を表示する。メタデータは共通のまま
    return withHeaders(new Response(shell.body, { status: decoded.ok ? 200 : 404, headers: shell.headers }), noindex)
  }

  const description = ogDescription(decoded.value, catalog)
  const image = `${url.origin}/og/${payload}.png`
  const rewritten = new HTMLRewriter()
    .on('meta[data-og="description"]', { element: e => void e.setAttribute('content', description) })
    .on('meta[data-og="image"]', { element: e => void e.setAttribute('content', image) })
    .on('head', {
      element: e =>
        void e.append(
          `<meta name="twitter:description" content="${escapeAttribute(description)}"><meta name="twitter:image" content="${escapeAttribute(image)}"><meta name="robots" content="noindex,nofollow">`,
          { html: true },
        ),
    })
    .transform(shell)
  return withHeaders(rewritten, noindex)
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
