// MVP では静的アセットにも SPA のフォールバックにも当たらなかったリクエストだけがここに来る。
// 動的 OGP を入れるときに /u/:payload と /og/:payload.png のハンドラを足す（DESIGN.md §10）。
export default {
  async fetch() {
    return new Response('Not Found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
