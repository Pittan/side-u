// GET /og/:payload.png — 背景画像に 13 曲とタグを重ねた OGP 画像。
// Images バインディングの .text() は Cloudflare 側の不具合で失敗するため（9410）、
// fetch の cf.image の draw で文字を描く（Cloudflare Community で報告されている回避策）。
// 同じ payload なら同じ画像なので 1 年間キャッシュする。失敗・無料枠の超過のときは共通の画像を返す（DESIGN.md §10）
import { catalog } from '@shared/catalog-instance'
import { buildDraw } from '@shared/og-draw'
import { decodePayload } from '@shared/payload'
import { isOgDynamicEnabled } from './config'

const BASE_PATH = '/images/og-base.png'
const FONT_PATH = '/fonts/og-lineseedjp-bold.woff2'

/**
 * cf.image の draw で文字が描けるのは Cloudflare 上だけ。手元の実行環境（miniflare）は、
 * 文字を描かずに cf-resized: internal=ok を付けて返すので、成功と見分けられない
 */
function canDrawText(url: URL): boolean {
  return url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && !url.hostname.endsWith('.localhost')
}

export async function handleOgImage(request: Request, env: Env, ctx: ExecutionContext, payload: string): Promise<Response> {
  const url = new URL(request.url)
  if (!canDrawText(url)) return fallback(env, url)
  const cache = caches.default
  const cacheKey = new Request(url.toString(), { method: 'GET' })
  const cached = await cache.match(cacheKey)
  if (cached) return cached

  const decoded = decodePayload(payload, catalog)
  if (!decoded.ok || !isOgDynamicEnabled(env)) return fallback(env, url)

  try {
    const titles = decoded.value.songIds.map(id => catalog.songById.get(id)?.title ?? '')
    const tags = decoded.value.tagIds.map(id => catalog.tagById.get(id)?.label ?? '')
    const fontUrl = new URL(FONT_PATH, url).toString()
    const image = await fetch(new URL(BASE_PATH, url), {
      cf: { image: { format: 'png', draw: buildDraw(titles, tags, fontUrl) } },
    } as unknown as RequestInit)
    // 変換に失敗したとき（cf-resized に err が入る）や、変換されなかったとき（cf-resized がない。手元の開発環境など）は、
    // 文字のない背景画像がそのまま返ってくる。それを 1 年間キャッシュしないよう、共通の画像に切り替える
    const resized = image.headers.get('cf-resized') ?? ''
    if (!image.ok || !image.headers.get('content-type')?.startsWith('image/') || !resized || /err/.test(resized)) {
      throw new Error(`変換に失敗しました: ${image.status} ${resized}`)
    }
    const response = new Response(image.body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Robots-Tag': 'noindex',
      },
    })
    ctx.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  } catch (error) {
    // 無料枠を使い切ったときも、ここに来る。共有自体は共通の画像で続けられる
    console.error('OGP 画像を作れませんでした', error instanceof Error ? error.message : error)
    return fallback(env, url)
  }
}

async function fallback(env: Env, url: URL): Promise<Response> {
  const image = await env.ASSETS.fetch(new URL('/og/default.png', url))
  const response = new Response(image.body, image)
  // 短めにキャッシュして、あとで作り直せるようにする
  response.headers.set('Cache-Control', 'public, max-age=3600')
  return response
}
