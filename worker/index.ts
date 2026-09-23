// 共有ページ（/u/:payload）と OGP 画像（/og/:payload.png）だけを扱う。
// それ以外は wrangler.jsonc の run_worker_first に含まれないので、静的アセットとして配信される
import { handleOgImage } from './og-image'
import { handleSharePage } from './share-page'

const SHARE_PAGE = /^\/u\/([A-Za-z0-9_-]{1,64})\/?$/
const OG_IMAGE = /^\/og\/([A-Za-z0-9_-]{1,64})\.png$/

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method Not Allowed', { status: 405 })

    const share = SHARE_PAGE.exec(pathname)
    if (share) return handleSharePage(request, env, share[1]!)

    const og = OG_IMAGE.exec(pathname)
    if (og) return handleOgImage(request, env, ctx, og[1]!)

    // /og/default.png などの静的ファイル、または存在しないパス
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
