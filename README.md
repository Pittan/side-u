# SIDE U — Selected by You

Perfume の楽曲から、あなたの 13 曲「Side U」をつくる非公式ファンツール。

- コンセプト: [SIDE_U_CONCEPT.md](SIDE_U_CONCEPT.md)
- 実装設計: [docs/DESIGN.md](docs/DESIGN.md)
- ワイヤーフレーム: [docs/wireframes.md](docs/wireframes.md)

## 開発

```sh
pnpm install
pnpm dev                 # http://localhost:5173
pnpm typecheck
pnpm build
pnpm catalog:validate    # 楽曲データの検証（--strict で公開前チェック）
pnpm test                # 単体テスト
pnpm test:e2e            # E2E テスト（iPhone: WebKit / Android: Chromium）
pnpm images:generate     # 共通の OGP 画像とアイコンを作り直す
```

楽曲データの原本は `catalog/*.json`。`pnpm catalog:import` は perfume-database からの初回取り込み用で、再実行すると手作業の編集が上書きされる。

## 進み具合

M0
- [x] Vite + Vue 3 + Cloudflare Workers（静的アセット）の雛形
- [x] perfume-database からの取り込みと検証スクリプト
- [x] 共有画像の実機確認ページ `/spike/share-image`
- [x] PLASMA 以降の曲・作品の追加（249 曲 / 63 作品、コールドスリープまで）、初出日の補完

M1〜M3（アプリ）
- [x] 編集画面、曲を探すシート、ドラッグでの並べ替え、下書きの保存
- [x] 完成・共有（共有画像 3 種類、ほかの人の画面、remix）、トップページ
- [x] 説明ページ（プライバシー、利用規約・免責、データの出典、保存について）
- [x] Apple Music の流れ（MusicKit と API はテストでは偽物に差し替えて確認）
- [x] 訂正・問い合わせの連絡先（`src/site.ts` の `CONTACT`）
- [ ] ビジュアルの作り込み、タグの本番の語彙

最後にまとめて行う（外部サービスの準備が必要なもの）
- [ ] Cloudflare へのデプロイ、`sideu.perfumehub.app` の設定（`wrangler login` が必要）
- [ ] 実機確認: Instagram ストーリーズへの貼り付けと透明度（iOS / Android。HTTPS が必要）
- [ ] Apple Developer で MusicKit の鍵を発行し、`pnpm apple:token` でトークンを作って本物の Apple Music で確認
- [ ] Apple Music の ID の照合（重複 1 件: エレクトロ・ワールド #18 / #21）
- [ ] MusicKit で 13 曲のプレイリストを曲順どおりに作成できるか確認

## デプロイ

`main` に push すると、GitHub Actions（`.github/workflows/ci.yml`）がテストのあとに Cloudflare へデプロイする。
Apple Music の開発者トークン（有効期限 180 日）を作り直すため、毎月 1 日にも再デプロイする。

### 初回の準備

1. **Cloudflare**
   - `perfumehub.app` のゾーンが、デプロイ先と同じ Cloudflare アカウントにあること
   - API トークンを作る（テンプレート「Edit Cloudflare Workers」）
   - 初回だけ手元から `pnpm deploy` して、`side-u.<アカウント>.workers.dev` で動くことを確認する（`pnpm exec wrangler login` が必要）
   - 確認できたら `wrangler.jsonc` の `routes`（`sideu.perfumehub.app` の custom domain）のコメントを外して push する
2. **Apple Developer**
   - Certificates, Identifiers & Profiles → Keys で、Media Services（MusicKit）を有効にした鍵を作り、`.p8` をダウンロードする
   - 手元で確認するとき: `APPLE_TEAM_ID=… APPLE_KEY_ID=… APPLE_PRIVATE_KEY_PATH=./AuthKey_XXXX.p8 pnpm apple:token --origin http://localhost:5173 --write .env.local`
3. **GitHub**（Settings → Secrets and variables → Actions。Environment `production` に登録する）

   | Secret | 内容 |
   | --- | --- |
   | `CLOUDFLARE_API_TOKEN` | 1 の API トークン |
   | `CLOUDFLARE_ACCOUNT_ID` | Cloudflare のアカウント ID |
   | `APPLE_TEAM_ID` | Apple Developer の Team ID |
   | `APPLE_KEY_ID` | 2 の鍵の Key ID |
   | `APPLE_PRIVATE_KEY` | 2 の `.p8` の中身（`-----BEGIN PRIVATE KEY-----` から全部） |

   Secrets がないあいだは、デプロイ（Cloudflare）や Apple Music 連携を警告付きで飛ばす。

### 公開前のチェックリスト

- [ ] `pnpm catalog:validate --strict` が通る（Apple Music の ID をすべて照合済み）
- [ ] タグの本番の語彙を `catalog/tags.json` に入れ、公開する ID を `catalog/published-ids.lock` に記録する
- [ ] 実機確認: iPhone Safari / Android Chrome で作成〜共有、Instagram ストーリーズへの貼り付け（透過）、iPhone でのドラッグ
- [ ] 本物の Apple Music で 13 曲のプレイリストが曲順どおりにできる
- [ ] 実機確認用のページ `/spike/share-image` を削除する（`src/spikes/`、`src/router.ts`、`public/_headers`）
- [ ] 共有 URL を X・LINE・Discord に貼って、共通の OGP 画像が出る
