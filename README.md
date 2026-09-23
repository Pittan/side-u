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
