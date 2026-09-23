// Apple Music の開発者トークンを署名し、Vite の環境変数ファイルに書き出す（DESIGN.md §8.1）。
// 秘密鍵はリポジトリにも Cloudflare にも置かない。CI では GitHub Actions の Secrets から渡す。
//
//   APPLE_TEAM_ID=... APPLE_KEY_ID=... APPLE_PRIVATE_KEY="$(cat AuthKey_XXXX.p8)" \
//     pnpm apple:token --write .env.production.local
//   （ローカル開発）pnpm apple:token --origin http://localhost:5173 --write .env.local
//
// 出力: VITE_APPLE_DEVELOPER_TOKEN と VITE_APPLE_DEVELOPER_TOKEN_EXP（UNIX 秒）
import { readFileSync, writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { importPKCS8, SignJWT } from 'jose'

const DEFAULT_ORIGIN = 'https://sideu.perfumehub.app'
const DEFAULT_DAYS = 90
// Apple の上限は約 6 か月
const MAX_DAYS = 180

const { values } = parseArgs({
  options: {
    origin: { type: 'string', multiple: true },
    days: { type: 'string', default: String(DEFAULT_DAYS) },
    write: { type: 'string' },
  },
})

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`環境変数 ${name} がありません`)
    process.exit(1)
  }
  return value
}

const teamId = required('APPLE_TEAM_ID')
const keyId = required('APPLE_KEY_ID')
const privateKeyPem = process.env.APPLE_PRIVATE_KEY_PATH
  ? readFileSync(process.env.APPLE_PRIVATE_KEY_PATH, 'utf8')
  : required('APPLE_PRIVATE_KEY')
const days = Number(values.days)
if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
  console.error(`--days は 1〜${MAX_DAYS} で指定してください`)
  process.exit(1)
}

const issuedAt = Math.floor(Date.now() / 1000)
const expiresAt = issuedAt + days * 24 * 60 * 60
const key = await importPKCS8(privateKeyPem, 'ES256')
const token = await new SignJWT({ origin: values.origin ?? [DEFAULT_ORIGIN] })
  .setProtectedHeader({ alg: 'ES256', kid: keyId })
  .setIssuer(teamId)
  .setIssuedAt(issuedAt)
  .setExpirationTime(expiresAt)
  .sign(key)

const output = `VITE_APPLE_DEVELOPER_TOKEN=${token}\nVITE_APPLE_DEVELOPER_TOKEN_EXP=${expiresAt}\n`
if (values.write) {
  writeFileSync(values.write, output)
  console.log(`${values.write} に書き出しました（有効期限 ${new Date(expiresAt * 1000).toISOString()}）`)
} else {
  process.stdout.write(output)
}
