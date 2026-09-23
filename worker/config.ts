/** 動的 OGP を使うか。wrangler.jsonc の OG_DYNAMIC を "off" にすると止まる（型は設定値から "on" だけになるので文字列で比べる） */
export function isOgDynamicEnabled(env: Env): boolean {
  return String(env.OG_DYNAMIC) !== 'off'
}
