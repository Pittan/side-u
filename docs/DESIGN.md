# SIDE U — 実装設計

> 対象: `SIDE_U_CONCEPT.md`（2026-09-23 版）
> 更新日: 2026-09-23
> ステータス: ドラフト（UI は検討中。§4 は機能要件）

## 0. 決定事項

| 項目 | 決定 | 根拠 |
| --- | --- | --- |
| ドメイン | **`sideu.perfumehub.app`** | |
| フロントエンド | **Vite + Vue 3 SPA**（`<script setup>` + TypeScript） | 静的配信を主経路にでき、バンドルが小さい |
| ホスティング | **Cloudflare Workers + Static Assets**。Worker の入口は最初から置くが、MVP ではどのパスも Worker を通さない | すべて無料の静的配信。**動的 OGP は設定とハンドラを足すだけで入れられる構成にしておく**（§5、§10） |
| 画面構成 | **編集画面が中心**。曲の追加・並べ替え・削除、名前・タグの編集を好きな順番で行える | ステップ式にせず、悩みながら入れ替えられるようにする |
| 選べる曲数 | **1 本のリストの中に境目**があり、上が Side U（最大 13 曲）、下が候補。合計 50 曲まで。完成と共有は 13 曲ちょうど | 候補を入れておいて、後から絞り込めるようにする |
| 境目の挙動 | **iPhone のホーム画面のアイコン並べ替えと同じ**。途中に入れると後ろが繰り下がり、13 曲目が候補の先頭にあふれる（§4.10） | |
| 曲を探す画面 | **ボトムシート**。戻るボタン・戻るジェスチャーで閉じる（§4.11） | |
| 名前・タグの位置 | **リストの上**。高さが十分な端末では、スクロールすると要約が上に固定される。`n / 13` は下のバーに常に表示（§4.12） | |
| 行の操作 | **行をタップすると操作ボタン（上へ・下へ・候補へ・削除）が出る**。`≡` のドラッグでも並べ替えられる | 曲名に横幅を使え、↑ を続けて押して動かせる |
| 共有画像 | **正方形 / 9:16 / 背景透過**の 3 種類。保存・共有に加えて**クリップボードへのコピー**ができる。**画面のカードもこの画像そのもの**で、3 種類を横に並べて見せる | Instagram のストーリーズで写真に重ねて使えるようにする |
| ビジュアル | **幾何学模様**を使う。模様は共有 URL から決まるので、Side U ごとに違い、同じ URL なら同じになる | 公式の素材を使わずに Perfume らしさを出す |
| フォント | **LINE Seed JP を Google Fonts から読み込む**（§6.4） | |
| 動的 OGP | **MVP では作らない**。共通の OGP 画像 1 枚にする（§10） | URL の形式は後から追加しても変えなくてよい |
| Apple Music 未配信曲 | **選択可**。プレイリスト作成前に警告し、配信されている別バージョンを提案する | |
| 別ミックス/リミックス | 親曲にまとめて、**「別バージョン」として折りたたむ** | |
| 曲 ID | **perfume-database の ID（1–224）を引き継ぐ**。新曲は 225 から採番 | |
| 共有 URL | **先頭 1 文字がバージョン**（§3） | 将来の仕様変更に対する互換性 |
| Apple のトークン発行 | **ビルド時に署名して JS に埋め込む**（§8.1）。月 1 回の定期ビルドで更新 | Worker が不要になり、止まる部分が減る |
| 状態管理 | Pinia を使わず、composable + `localStorage` | |
| DB/KV/R2 | 使わない | |

## 1. リポジトリ構成

単一パッケージ（pnpm）。UI に依存しないロジックは `shared/` に置き、アプリと Worker の両方から import できるようにしておく（動的 OGP の Worker が同じデコーダとカタログを使うため）。

```text
side-u/
├─ catalog/                      # 楽曲データの原本（人が編集する）
│  ├─ songs.json
│  ├─ releases.json              # 作品ごとの収録曲 ID
│  ├─ tags.json                  # タグの語彙（数値 ID 固定）
│  └─ published-ids.lock         # 公開済みで削除できない曲 ID・タグ ID
├─ scripts/
│  ├─ import-perfume-database.ts # 旧リポジトリからの初回取り込み（1回だけ実行）
│  ├─ generate-apple-token.ts    # ビルド時に開発者トークンを署名（§8.1）
│  ├─ validate-catalog.ts        # CI 用の検証
│  └─ verify-apple-music.ts      # Apple Catalog API で ID を照合（手動実行）
├─ shared/                       # UI に依存しないロジック（DOM・Node API には依存しない）
│  ├─ catalog.ts
│  ├─ payload/                   # 共有 URL のエンコード/デコード（バージョンごとにファイルを分ける）
│  │  ├─ index.ts
│  │  └─ v1.ts
│  ├─ display-name.ts
│  ├─ tags.ts
│  ├─ search.ts
│  └─ pattern.ts                 # payload から幾何学模様のパラメータを決める
├─ src/                          # Vue アプリ
│  ├─ main.ts / App.vue / router.ts
│  ├─ pages/
│  ├─ components/
│  ├─ render/                    # Canvas への描画（カード・模様・共有画像）
│  └─ composables/
│     ├─ useDraft.ts             # 下書きの状態 + localStorage への保存
│     ├─ useStorageHealth.ts     # 保存できる環境かどうかの判定（§7）
│     ├─ useShareImage.ts        # 画像の生成・共有・保存・コピー
│     └─ useAppleMusic.ts
├─ worker/                       # MVP ではほぼ空。動的 OGP のときにハンドラを足す
│  └─ index.ts
├─ public/
│  ├─ og/default.png
│  └─ _headers
├─ tests/
├─ wrangler.jsonc
└─ vite.config.ts
```

主な依存:

- ランタイム: `vue`, `vue-router`（フォントは Google Fonts から読み込むので依存に入れない）
- 並べ替え: ドラッグ操作を入れる場合は `vue-draggable-plus`（遅延読み込み）
- 開発: `vite`, `@cloudflare/vite-plugin`, `wrangler`, `@cloudflare/vitest-pool-workers`, `jose`（トークン署名）, `typescript`, `vue-tsc`, `vitest`, `@playwright/test`, `zod`（カタログ検証のみ）
- MusicKit JS v3 は Apple の CDN から、使うときに初めて読み込む（バンドルに含めない）

## 2. 楽曲カタログ

### 2.1 型

```ts
// shared/catalog.ts
export type SongKind = 'canonical' | 'mix' | 'remix' | 'instrumental' | 'other'

export type AppleMusicMapping =
  | { status: 'available'; songId: string; storefront: 'jp'; verifiedAt: string }
  | { status: 'unavailable'; verifiedAt: string; note?: string }

export type Song = {
  id: number            // 1..65535。一度公開した ID は削除も再利用もしない
  title: string
  kana: string          // よみ（ひらがな）
  aliases?: string[]    // 検索用の別名（例: exit の「いぐじっと」）
  artist: string        // 通常 'Perfume'（ぱふゅ〜む名義などはそのまま）
  releasedOn?: string   // YYYY-MM-DD（初出）
  parentId?: number
  kind: SongKind
  selectable: boolean   // instrumental は常に false
  appleMusic: AppleMusicMapping | null  // null = 未調査（selectable なら CI エラー）
  sources: Array<{ label: string; url: string }>
}

export type Release = {
  id: number
  title: string
  kind: 'single' | 'album' | 'digital' | 'other'
  releasedOn: string
  trackIds: number[]
}

export type TagCategory = { id: string; label: string; order: number }
export type Tag = {
  id: number            // 1..255。全カテゴリを通して一意
  categoryId: string
  label: string
  retired?: boolean     // 新しく選べなくするだけ。過去の URL での表示は続ける
}
```

### 2.2 取り込み（`scripts/import-perfume-database.ts`）

`../perfume-database/src/data/{songs,albums,singles}.ts` を読み込んで変換する。1回だけ実行し、以降は `catalog/*.json` を原本にする。

| 旧フィールド | 新フィールド |
| --- | --- |
| `id` | `id`（そのまま） |
| `parent` | `parentId` |
| `is_instrumental: true` | `kind: 'instrumental'`, `selectable: false` |
| `parent` あり・instrumental でない | `kind: 'mix'`（`remix` は手作業で分類） |
| `artist` 未指定 | `'Perfume'` |
| `subscriptions.apple_music` | `appleMusic: { status: 'available', ... }`（照合前は `null`） |
| — | `releasedOn`: 収録している作品のうち最も早い発売日 |
| — | `sources`: 収録作品の公式ディスコグラフィの URL |

`Intro` のように曲として扱わないトラックは `kind: 'other'`, `selectable: false` にする。その後、`ネビュラロマンス` の2作と、それ以降のデジタルリリースの曲（最低 22 曲）を手作業で追加する。

### 2.3 検証（`scripts/validate-catalog.ts`、CI で実行）

- ID の重複 / 範囲外
- `parentId` が存在しない / 自分自身を指している / 循環している
- `appleMusic.songId` の重複（`catalog/allowlist.json` に書いたものは除く）
- `selectable: true` なのに `appleMusic === null`
- `instrumental` なのに `selectable: true`
- `releasedOn` が `YYYY-MM-DD` になっていない / `sources[].url` が https の URL でない
- `releases[].trackIds` に存在しない ID がある
- 曲の `releasedOn` が、その曲を収録している作品の発売日より遅い（先行配信で早いのはよい）
- **`published-ids.lock` にある曲 ID が消えた、または `selectable: false` になった**
- **`published-ids.lock` にあるタグ ID が消えた**（選べなくしたいときは `retired` にする）
- タグ ID の範囲外（1..255）・重複
- `tests/fixtures/payloads/` にある過去のすべてのバージョンの URL がデコードできる

### 2.4 Apple Music の照合（`scripts/verify-apple-music.ts`）

- ローカルの開発者トークンで `GET /v1/catalog/jp/songs?ids=...` を呼び、タイトル・アルバム名をカタログと並べて表示する。人が確認して `verifiedAt` を更新する
- マッピングがない曲は `GET /v1/catalog/jp/search` で候補を表示する
- CI では実行しない

## 3. 共有 URL

### 3.1 全体の形式

```text
https://sideu.perfumehub.app/u/<version><body>#n=<表示名>
```

- **`<version>`**: 1 文字。`1`–`9` を v1–v9 に使い、足りなくなったら `a`–`z` を使う。base64url をデコードする前にこの 1 文字で振り分けるので、バージョンごとに `<body>` の長さも形式も自由に変えられる
- **fragment**: `key=value&...` の形式。今は `n`（表示名）だけ。知らないキーは無視するので、後からキーを足しても古い URL は壊れない

### 3.2 v1 の `<body>`

```text
offset  size  内容
0       26    曲 ID × 13（uint16 big-endian、曲順どおり）
26      3     タグ ID × 3（uint8、0 = なし。0 以外は昇順に詰め、0 は末尾に置く）
29      2     CRC-16/CCITT-FALSE（先頭のバージョン文字 + offset 0..28 に対して計算）
合計 31 バイト → base64url（パディングなし）42 文字。path は /u/ + 43 文字
```

共有 URL に入るのは **Side U の 13 曲だけ**。境目より下の候補は入れない。

### 3.3 デコードのルール

`decodePayload(s)` は例外を投げず、以下のいずれかに当たれば `Err` を返す。

- バージョン文字が未対応
- 長さがバージョンと合わない / base64url 以外の文字がある
- CRC が一致しない
- 曲 ID が重複している / カタログに存在しない / 選択できない
- タグ ID が存在しない / 重複している / 並びが正規形でない

同じ内容はいつも同じ文字列になる（正規形）ことをテストで保証する。幾何学模様の生成（§6.2）と、将来の動的 OGP のキャッシュキーがこれに依存する。

### 3.4 互換性のルール

- エンコードは常に最新バージョンで行う。デコーダは過去のすべてのバージョンを残す
- 公開済みのバージョンの意味は変えない。変えたくなったら新しいバージョンを作る
- **バージョンを上げなくてよい変更**: 曲の追加、タグの追加、タグの `retired` 化、カテゴリの再編成
- **バージョンを上げる必要がある変更**: 曲数を変える、タグを 4 つ以上にする、タグ ID が 255 を超える、URL に入れる項目を増やす
- バージョンごとのフィクスチャ（URL とデコード結果の組）を `tests/fixtures/payloads/v<N>.json` に置き、ずっと CI でテストし続ける
- 模様の生成規則を変えるときもバージョンで振り分ける（同じ URL の見た目が変わらないようにする）

### 3.5 タグの数（タグの言葉を考える担当に渡す条件）

| 項目 | 条件 |
| --- | --- |
| 1 つの Side U に付けられるタグ | 最大 3 個 |
| タグの総数（全カテゴリ合計、廃止分を含む） | 最大 255 個（URL の長さは個数によらず一定） |
| カテゴリ | 3 カテゴリ × 1 つずつが素直 |
| 1 カテゴリの選択肢 | 5〜8 個を推奨（スマホの 1 画面で一覧できる数） |
| ラベルの長さ | 全角 8 文字程度まで（共有画像に 3 つ並べられる長さ） |

### 3.6 表示名（fragment の `n`）

```ts
// shared/display-name.ts
export function normalizeDisplayName(input: string): string {
  let s = input.normalize('NFKC')
  // 制御文字・書式文字（双方向制御を含む）を削除する。ただし絵文字の結合に使う ZWJ は残す
  s = s.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, c => (c === '‍' ? c : ''))
  return s.replace(/\s+/gu, ' ').trim()
}
export function countGraphemes(s: string): number {
  return [...new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(s)].length
}
export const MAX_NAME_GRAPHEMES = 10
```

- fragment から読み込むときも同じ関数を通す。10 文字を超えていたら無視する（名前なしで表示する）
- 表示には必ず `{{ }}` の補間か Canvas の `fillText` を使う。`v-html` は ESLint で禁止する

## 4. 機能要件

UI を一緒に考えるための前提。画面の分け方・見た目は §4.9 の論点で決める。

### 4.1 はじめる

- F-1 コンセプトの 1 文と、非公式のファン制作ツールである旨を見せる
- F-2 `Side Uをつくる` で編集画面に入る
- F-3 下書きがあれば、その概要（曲数・先頭の数曲・最終更新）を見せて「続きから」を選べる
- F-4 下書きがある状態で「新しくつくる」を選んだら、**下書きの概要を見せたうえで**破棄してよいか確認する

### 4.2 編集画面（中心の画面）

- F-5 曲リストを表示する。**50 曲まで**入れられる
- F-6 **1 本のリストの中に境目**がある。境目より上が Side U（最大 13 曲）、下が候補。`n / 13` を常に表示する
  - Side U が 13 曲に足りないときは、空いている枠（「あと 2 曲」など）が見える
  - 候補は、Side U が 13 曲そろっていなくても置いておける
- F-7 **追加**: 曲を探すボトムシートを開き、**複数の曲をまとめて選んで一度に追加**できる。追加した曲は、Side U に空きがあればそこに入り、あふれた分は候補の末尾に入る
- F-8 **並べ替え**: ボタン操作（キーボードでも可）で必ずできる。ドラッグは補助。境目をまたいで Side U と候補を行き来できる（挙動は §4.10）
- F-9 **削除**: 1 曲ずつ削除できる。直後なら取り消せる
- F-10 **名前とタグ**: 編集画面からいつでも編集できる（曲を選ぶ前でも後でも）
- F-11 **完成**: Side U が 13 曲そろっていれば完成できる。候補は下書きに残るが共有 URL には入らない
- F-12 Apple Music にない曲は、リストでもそれとわかる

### 4.3 曲を探す（追加の画面）

- F-13 曲名・よみがな・別名（`aliases`）で検索できる（ひらがな・カタカナ・全角/半角の違いを無視する）
- F-14 検索しなくても一覧から探せる（五十音、作品ごと、など）
- F-15 複数の曲にチェックを入れて、「n 曲を追加」でまとめて追加する。合計 50 曲を超える分はチェックできず、残りの枠数を表示する
- F-16 すでにリストにある曲はそれとわかり、重複しては追加できない
- F-17 別バージョンは親曲にまとめて、展開して選べる
- F-18 Apple Music にない曲はそれとわかるが、選べる
- F-18a 初出日のわからない曲（ライブや映像でだけ披露された曲など）は、「作品・年」の部分を空欄にする
- F-19 選択状態を色だけで示さない

### 4.4 名前とタグ

- F-20 名前: 任意。10 文字（書記素クラスタ単位）まで。残り文字数がわかる
- F-21 タグ: 任意。最大 3 つ（1 カテゴリ 1 つ）。選んだタグをもう一度押すと外せる

### 4.5 完成・共有

- F-22 完成した Side U（タイトル、名前、13 曲、タグ、幾何学模様）を見られる。**画面のカードは共有画像そのもの**（Canvas で描いた画像）で、3 種類を横に並べて見せる。`alt` で全文を読み上げられる
- F-23 共有画像を 3 種類作れる: **正方形（1080×1080）、9:16（1080×1920）、背景透過**
- F-24 画像ごとにできること:
  - **共有する**（Web Share API でファイルを共有できる環境のみ）
  - **保存する**
  - **クリップボードにコピーする**（使える環境のみ。Instagram のストーリーズに貼り付けて写真に重ねる用途）
- F-25 リンクをコピーする
- F-26 編集画面に戻れる
- F-27 画像はブラウザの中で作り、サーバーには送らない

### 4.6 ほかの人の共有リンクを開く

payload が自分の下書きの Side U と一致しない場合の画面（`wireframes.md` §3.2）。

- F-28 同じ 13 曲・曲順・タグ・名前を **HTML で**見られる（Canvas の画像ではなく、テキストとして選択・読み上げできる）。幾何学模様は背景の飾りとして表示する
- F-29 **Apple Musicでこのプレイリストをつくる**: 流れは本人の場合と同じ（§8.2）
- F-30 **自分のSide Uをつくる**: `新しくつくる`（空の状態から）と `この13曲をもとにつくる`（13 曲とタグを下書きに読み込む。remix）の 2 つ
- F-31 F-30 で既存の下書きがあれば、**その概要を見せたうえで**破棄してよいか確認する
- F-32 壊れた URL では「読み込めませんでした」と作成を始める導線を出す

### 4.7 保存と実行環境

- F-33 作業中の状態は、同じ端末ならリロードしても残る
- F-34 **保存できない、または保存が消えやすい環境では、それを伝え、Safari / Chrome で開き直す方法を案内する**（§7）
- F-35 保存の状態（この端末に保存済み、など）がわかる
- F-36 確認してからリセットできる

### 4.8 Apple Music・その他

- F-37 完成した Side U（本人の画面）と、ほかの人の共有ページから、プレイリスト作成を始められる。編集中は始められない
- F-38 Apple Music にない曲があれば作成前に示し、配信されている別バージョンに差し替えるか、その曲を除くかを選んでもらう
- F-39 作成中・成功・失敗（未加入、許可されなかった、通信エラー、一部の曲だけ失敗）がわかる
- F-40 同じ Side U で二度作ろうとしたら確認する
- F-41 認可の途中でページが再読み込みされても、下書きは失われない
- F-42 プライバシー（外部への通信: Google Fonts、Apple）、利用規約・免責、データの出典と訂正の連絡先のページ
- F-43 スマホ優先。キーボードだけで最初から最後まで操作できる。フォーカスが見える
- F-44 長い曲名やミックス名の付いた曲名も、必要な情報を省略せずに表示する

### 4.9 UI で決めること

ワイヤーフレームは `docs/wireframes.md`。


- ~~13 曲と候補の分け方~~ → 1 本のリストに境目を引く
- ~~境目をまたぐ操作の挙動~~ → §4.10
- ~~曲を探す画面の形~~ → ボトムシート（§4.11）
- ~~名前・タグの位置~~ → リストの上（§4.12）
- 曲を探すシートの中の一覧の切り口（五十音 / 作品 / 年代）
- ~~並べ替えのボタンの見せ方~~ → 行をタップすると操作ボタンが出る（`wireframes.md` §1.3）
- ~~タグの並べ方~~ → カテゴリごとに 1 行の横スクロール（`wireframes.md` §1.1）
- 幾何学模様のモチーフ（三角形・プリズム・直線・円など）と色
- 3 種類の共有画像のレイアウト。特に背景透過の画像を写真の上で読みやすくする方法

### 4.10 境目の挙動（iPhone のホーム画面方式）

Side U は 13 枠のページ、候補はその次のページ、と考える。

| 操作 | 結果 |
| --- | --- |
| Side U の途中に曲を入れる（候補から移す・ドラッグで置く） | 入れた位置より後ろが 1 つずつ繰り下がる。**Side U が 14 曲になったら、13 曲目が候補の先頭にあふれる** |
| Side U から曲を外す（削除・候補へ移す） | 後ろが繰り上がって詰まる。Side U の末尾が空き枠になる。**候補から自動では繰り上がらない** |
| 候補の中で並べ替える | 候補の中だけで動く |
| 曲の追加（ボトムシートから） | Side U の空き枠に入り、残りは候補の末尾に入る |

- あふれが起きたら、「『○○』が候補に移りました」と通知し（`aria-live`）、取り消しできるようにする
- ボタン操作のとき:
  - Side U の 13 曲目で「↓」→ 候補の先頭に移る
  - 候補の先頭で「↑」→ Side U の末尾に入る（13 曲そろっていれば、13 曲目と入れ替わる形になる）
  - 行のメニューに「Side U に入れる」「候補に回す」も用意する（離れた位置への移動を 1 回で済ませるため）
- 実装: 下書きは `sideU` と `candidates` の 2 つの配列で持つ（§7.1）。すべての操作を `shared/` とは別の純粋関数（`src/editor/list-ops.ts`）にまとめ、単体テストで挙動を固定する

```ts
type ListState = { sideU: number[]; candidates: number[] }
type Pos = { list: 'sideU' | 'candidates'; index: number }
export function move(state: ListState, from: Pos, to: Pos): { state: ListState; overflowed?: number }
export function addMany(state: ListState, ids: number[]): { state: ListState; addedToSideU: number; addedToCandidates: number }
export function remove(state: ListState, at: Pos): ListState
```

### 4.11 曲を探すボトムシート

**戻るボタンのケア**

- シートを開くときに **履歴を 1 つ積む**（`router.push({ query: { sheet: 'add' } })`）。これで、次の操作はどれも「シートを閉じる」になり、編集画面から出てしまわない
  - Android の戻るボタン・戻るジェスチャー
  - iOS Safari の左端からのスワイプ
  - ブラウザの戻るボタン
- シートの「閉じる」ボタン・下スワイプ・背景のタップ・Esc キーでは、シートを開いたときに積んだ履歴なら `router.back()`、そうでなければ（`?sheet=add` を直接開いた・リロードした場合）`router.replace()` で閉じる。履歴が二重に残らないようにする
- 「n 曲を追加」を押したときも同じ方法で閉じる
- シートの中で選びかけた曲（チェックだけ入れて追加していないもの）は、閉じても編集画面にいる間は保持する。もう一度開くとチェックが残っている。確認ダイアログは出さない
- 同じルールを、ほかの重なる UI（確認ダイアログ、共有メニューなど）にも使う: `useOverlayHistory(key)` という composable にまとめる

**それ以外**

- `<dialog>` の `showModal()` を使う。フォーカスをシートの中に閉じ込め、背景は操作できないようにする
- 閉じたら「曲を追加」ボタンにフォーカスを戻す
- 高さは `90dvh`。検索欄はシートの上端に置き、iOS でキーボードが出ても隠れないようにする
- シートを開いている間は背景がスクロールしないようにする（iOS のバウンドも含む）
- 上端のつまみで下にスワイプして閉じられる。ただし一覧をスクロールしている最中は閉じない（一覧が一番上にあるときだけ閉じる）
- `prefers-reduced-motion` のときはアニメーションを省く

### 4.12 名前・タグ・`n / 13` の表示位置

- 名前の入力欄とタグは、**編集画面のリストの上**に置く
- **`n / 13`・「曲を追加」・「完成する」は下に固定されるバーに置き、どの端末でも常に表示する**
- **画面の高さが十分な端末**（目安: 表示領域の高さ 600px 以上。iPhone の Safari はツールバーを除くと 660px 前後なので、700px では多くの iPhone で出なくなる。実機で調整する）: 入力欄がスクロールで隠れたら、2 行の要約（`○○ の Side U` とタグ、`✎`）を上に固定する。`✎` を押すと一番上に戻り、名前の入力欄にフォーカスする
- **高さが足りない端末**（折りたたみ端末を開いた状態、横向きのスマホなど）: 要約は出さない。名前・タグはスクロールで隠れる
- 高さの判定は CSS の `@media (min-height: …)` で行う。入力欄が隠れたかどうかの判定には `IntersectionObserver` を使う

## 5. 配信（Cloudflare）と、動的 OGP に備えた構成

### 5.1 MVP の構成

```jsonc
// wrangler.jsonc
{
  "name": "side-u",
  "main": "worker/index.ts",
  "compatibility_date": "2026-09-01",
  "routes": [{ "pattern": "sideu.perfumehub.app", "custom_domain": true }],
  "assets": {
    "directory": "./dist/client",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application",
    "run_worker_first": false       // MVP ではどのパスも Worker を通さない（空配列は指定できない）
  }
}
```

```ts
// worker/index.ts（MVP）
export default {
  async fetch(request, env) {
    // 静的アセットにも SPA のフォールバックにも当たらなかったリクエストだけがここに来る
    return new Response('Not Found', { status: 404 })
  },
} satisfies ExportedHandler<Env>
```

- `@cloudflare/vite-plugin` を最初から使い、SPA と Worker を 1 回のビルドで出力する
- SPA のフォールバック（`index.html` を返す）は、ブラウザのページ遷移（`Sec-Fetch-Mode: navigate`）のときだけ働く。それ以外のリクエストで静的ファイルがなければ Worker に届き、404 を返す
- TypeScript は 6.x に固定する（7.x はネイティブ版で、`vue-tsc` が使う JS の API がないため）
- `/u/:payload` は SPA のフォールバックとして静的に配信され、ブラウザが path と fragment から内容を組み立てる
- `/u/*` の `noindex` は `public/_headers` で付ける

### 5.2 動的 OGP に備えて最初からやっておくこと

後から動的 OGP を入れるときに、**URL・アプリのコード・データの形を変えずに済む**ようにしておく。

| 項目 | MVP でやっておくこと | 理由 |
| --- | --- | --- |
| URL | payload を fragment ではなく path に入れる（§3） | OGP のクローラーには fragment が届かない |
| デコーダ | `shared/payload/` は DOM・Node の API を使わない（`atob` ではなく自前の base64url、`TextEncoder` 程度にとどめる） | Worker でもそのまま動かす |
| カタログ | `shared/catalog.ts` から import できる形にし、ビルド時に生成する min 版を Worker からも import できるようにする | Worker が曲名を引けるように |
| HTML | `index.html` の `<head>` に、置き換え対象の OGP メタタグを最初から置き、`data-og` 属性で目印を付ける | Worker の HTMLRewriter で中身だけ差し替えればよくなる |
| アプリ | 共有ページの表示に必要な情報は、すべてブラウザが URL から組み立てる（Worker が HTML に埋め込んだデータに依存しない） | 動的 OGP がない・失敗した場合も同じように動く |
| ビルド | Worker の入口とテスト環境（`@cloudflare/vitest-pool-workers`）を最初から用意する | 足すのがハンドラだけになる |
| 表示名 | fragment にだけ入れ、Worker には一切届かない | OGP にも出さない（コンセプトどおり） |

```html
<!-- index.html -->
<meta property="og:title" content="SIDE U — Selected by You" data-og="title">
<meta property="og:description" content="もし、あなたにも13曲を選ぶSideがあったなら。" data-og="description">
<meta property="og:image" content="https://sideu.perfumehub.app/og/default.png" data-og="image">
<meta name="twitter:card" content="summary_large_image">
```

動的 OGP を入れるときの手順は §10。

## 6. 共有画像と幾何学模様

### 6.1 画像の種類

| 種類 | サイズ | 用途 |
| --- | --- | --- |
| 正方形 | 1080×1080 | フィード投稿、X |
| 9:16 | 1080×1920 | ストーリーズ、スマホの壁紙 |
| 背景透過 | 内容に合わせる（例: 1080×1350） | 写真に重ねる |

- Canvas 2D で直接描画する（html2canvas などは使わない）。描画コードは `src/render/` にまとめる
- **画面に表示するカードも、この画像そのもの**。PNG を `blob:` URL にして `<img>` で表示し、`alt` に全文（名前、13 曲、タグ）を入れる。HTML のカードは別に作らない
- 完成画面では 3 種類を横に並べる（スマホでは横スクロール、画面幅が広ければ 3 列）。レイアウトは `wireframes.md` §3
- 背景透過の画像は、背景を塗らずに PNG の透明度を残す。写真の上でも読めるように、文字の縁取りや半透明の板を使う（デザインで決める）

### 6.2 幾何学模様

- `shared/pattern.ts` で、payload（13 曲とタグ）から乱数のシードを作り、図形の配置・角度・色を決める。出力は描画方法に依存しない図形のデータにして、Canvas（共有画像）と SVG（ほかの人の共有ページの背景）の両方で描けるようにする
- 同じ URL なら必ず同じ模様になる。曲を 1 曲変えると模様が変わる
- 乱数は決まったアルゴリズム（例: mulberry32）を自分で実装する。`Math.random` やブラウザごとに結果が違う API は使わない
- 生成規則を変えるときは payload のバージョンで振り分ける（§3.4）
- 公式のロゴ・ジャケット・映像の意匠を真似しない。汎用的な図形の組み合わせにとどめる

### 6.3 共有・保存・コピー

```ts
// 共有
if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] })

// クリップボードにコピー。Safari ではクリック処理の中で同期的に ClipboardItem を作り、
// Blob そのものではなく Promise を渡す必要がある
await navigator.clipboard.write([
  new ClipboardItem({ 'image/png': renderPng(variant) /* Promise<Blob> */ }),
])

// 保存
const a = document.createElement('a')
a.href = URL.createObjectURL(blob); a.download = 'side-u.png'; a.click()
```

- 共有の画面を開いた時点で 3 種類の画像を先に作っておき、ボタンを押したらすぐ動くようにする
- `ClipboardItem` がない、または `ClipboardItem.supports?.('image/png') === false` の環境ではコピーのボタンを出さない
- iOS の Instagram では、ストーリーズの編集画面でテキスト入力を開くと、クリップボードの画像を貼り付けるボタンが出る。**透明度が残るか、Android でも同じことができるかは実機で確認する**（M2）。できなかった場合でも、保存した PNG をスタンプとして貼る方法を案内できる
- iOS Safari でファイルと URL を同時に共有すると、どちらかが落ちることがあるので、画像とリンクは別の操作にする

### 6.4 フォント

- **LINE Seed JP を Google Fonts から読み込む**。使う太さ（例: 400 と 700）だけを指定する

  ```html
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=LINE+Seed+JP:wght@400;700&display=swap">
  ```

- Google Fonts は文字の範囲ごとにファイルを分割して配信するので、画面に出ている文字の分だけ読み込まれる
- Canvas に描画する前に、実際に描く文字を渡して `document.fonts.load()` を呼ぶ。画面にまだ出ていない文字（名前など）の分割ファイルも確実に読み込むため

  ```ts
  const text = [title, name, ...songTitles, ...tagLabels].join('')
  await Promise.all([
    document.fonts.load('700 48px "LINE Seed JP"', text),
    document.fonts.load('400 32px "LINE Seed JP"', text),
  ])
  ```

- Google Fonts のフォントは CORS 対応で配信されるので、Canvas に描いても画像の書き出しは制限されない
- LINE Seed JP にない文字（絵文字など）はシステムフォントにフォールバックさせる。Google Fonts に接続できない場合も、システムフォントで表示・画像生成できるようにする
- ブラウザが Google に接続すること（IP アドレスなどが Google に届く）をプライバシーページに書く

## 7. 下書きの保存と実行環境

### 7.1 下書き

```ts
type Draft = {
  v: 1
  sideU: number[]      // 0..13 件、曲順どおり
  candidates: number[] // 0..(50 - sideU.length) 件。sideU と重複しない
  tagIds: number[]     // 0..3 件
  name: string
  updatedAt: string
}
```

- キーは `side-u:draft`。変更のたびに 300ms デバウンスして保存する
- 読み込み時に `v` を見て最新の形に移行する。カタログにない ID や選べない ID は取り除き、その旨を伝える
- `localStorage` の読み書きはすべて `try/catch` で囲む

### 7.2 remix・新規作成のときの確認

- 下書きが空でなく、読み込もうとしている内容と違う場合だけ確認を出す
- 確認画面には、今の下書きの曲数・先頭の数曲・名前・最終更新を見せ、「破棄して始める」「やめる」を選んでもらう
- remix で読み込むのは 13 曲とタグ。**名前は引き継がず、空にする**（元の人の名前なので）
- 確認には自前の `<dialog>` を使う（`window.confirm` は使わない）

### 7.3 保存できない・消えやすい環境への対応（`useStorageHealth`）

完全には判定できないので、**判定できるものは警告し、判定できないものは常に案内を見えるところに置く**。

| 状況 | 判定 | 対応 |
| --- | --- | --- |
| `localStorage` に書き込めない | 書き込んで読み戻すテストで確実にわかる | 「この環境では保存できません」と表示し、Safari / Chrome で開き直す方法を案内する |
| アプリ内ブラウザ（Instagram、Facebook、LINE、TikTok など） | User-Agent に含まれる文字列で判定（`Instagram`, `FBAN`/`FBAV`, `Line/`, `BytedanceWebview` など） | 「アプリ内のブラウザでは保存が消えることがあります」と表示し、外部のブラウザで開く方法を案内する |
| LINE のアプリ内ブラウザ | 同上 | URL に `openExternalBrowser=1` を付けたリンクを出す（LINE が外部ブラウザで開いてくれる） |
| X のアプリ内ブラウザ、シークレットタブ | User-Agent などでは確実には判定できない | 判定はしない。保存状態の表示の近くに「シークレットモードやアプリ内ブラウザでは保存されないことがあります」と常に書いておく |
| iOS Safari の「7 日間」ルール | — | Safari は、しばらく開いていないサイトのデータを消すことがある。ヘルプに書いておく |

- 外部ブラウザに移るときに作業を引き継げるよう、案内の中に「今の 13 曲の URL をコピー」を置く（remix で読み込める）。ただし候補は引き継げないことを明記する
- 保存がうまくいかない環境でも、編集と共有はメモリ上で最後までできるようにする

## 8. Apple Music 連携

### 8.1 開発者トークンの発行（ビルド時）

MusicKit JS には、Apple の秘密鍵（`.p8`）で署名した JWT（開発者トークン）が必要。**ビルド時に署名して、静的な JS に埋め込む**。

- `scripts/generate-apple-token.ts`（`jose` で ES256 署名）
  - `iss` = Team ID、`iat` = 現在時刻、`exp` = 90 日後
  - `origin` = [`https://sideu.perfumehub.app`]（ブラウザからの利用を自分のドメインに限定する）
  - 出力を `VITE_APPLE_DEVELOPER_TOKEN` と `VITE_APPLE_DEVELOPER_TOKEN_EXP` として Vite に渡す
- 秘密鍵・Key ID・Team ID は **GitHub Actions の Secrets にだけ**置く。リポジトリにも Cloudflare にも置かない
- ローカル開発では、手元の鍵で `origin` に `http://localhost:5173` を入れたトークンを作る（`.env.local`、git 管理外）
- ブラウザ側では `exp` を確認し、期限切れなら Apple Music のボタンを「現在使えません」にする（ほかの機能には影響させない）
- トークンは誰でも見られる前提で扱う。悪用されたときは、Apple Developer の管理画面で鍵を無効にし、新しい鍵で再ビルドする

### 8.2 流れ

1. 13 曲のマッピングを確認する。`unavailable` の曲があれば一覧で示し、配信されている別バージョンを提案する（勝手には差し替えない）
2. MusicKit JS v3 を動的に読み込み、開発者トークンで `MusicKit.configure()` を呼ぶ
3. `music.authorize()` を呼ぶ前に下書きを保存し、`sessionStorage` に「作成を再開する」フラグを置く
4. `POST https://api.music.apple.com/v1/me/library/playlists`

   ```json
   {
     "attributes": {
       "name": "SIDE U - {displayName}",
       "description": "SIDE U — Selected by You / #タグ1 #タグ2 #タグ3 / 非公式ファンツールで作成"
     },
     "relationships": {
       "tracks": { "data": [{ "id": "<catalog song id>", "type": "songs" }] }
     }
   }
   ```

   - ライブラリのプレイリストは作成時点で非公開
   - 説明文は決まった文言とタグだけで組み立てる
   - プレイリスト名は、ほかの人の Side U から作る場合も `SIDE U - {その人の名前}` にする（名前がなければ `SIDE U`）
5. 成功したら `localStorage` の `side-u:am-created` に「payload → 作成日時」を保存する（F-40 で使う）
6. Music User Token は MusicKit の内部だけに置く。プレイリスト名（表示名を含む）が Apple に送られることはプライバシーページに書く

## 9. セキュリティヘッダー（`public/_headers`）

```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://js-cdn.music.apple.com; connect-src 'self' https://api.music.apple.com https://*.apple.com; img-src 'self' data: blob:; font-src https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; frame-src https://*.apple.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
  Referrer-Policy: strict-origin-when-cross-origin
  X-Content-Type-Options: nosniff
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/u/*
  X-Robots-Tag: noindex, nofollow
```

MusicKit v3 が実際に通信する先は M0 で確認して絞る。

## 10. 後回しにする機能: 動的 OGP

MVP では、すべての共有 URL で `og/default.png` と共通のメタデータを使う。§5.2 の準備をしてあるので、後から次の変更だけで対応でき、既存の URL はそのまま使える。

1. `wrangler.jsonc` の `run_worker_first` に `/u/*` と `/og/*` を足し、`images` バインディングを追加する
2. `worker/share-page.ts`: `/u/:payload` で `decodePayload` を実行し、`env.ASSETS` から取得した `index.html` の `data-og` のメタタグを HTMLRewriter で差し替える。デコードに失敗したら差し替えずにそのまま返す
3. `worker/og-image.ts`: `/og/:payload.png` で Cloudflare Images バインディングの `.text()` を使って描画し、Cache API に保存する。失敗したときや無料枠を使い切ったときは `default.png` を返す
4. `_headers` の `/u/*` の設定を Worker のレスポンスにも付ける

実装するときに確認すること:

- `.text()` で改行が使えるか / PNG で出力できるか / 1 枚の画像が無料枠（月 5,000 回）の何回分になるか
- フォント: Cloudflare Images の `font.url` には 1 つのフォントファイルの URL を渡す必要があるので、Google Fonts の分割ファイルは使えない。LINE Seed JP（OFL）の TTF を、カタログの文字でサブセット化して自前のドメインに置く

## 11. テスト

| 種類 | 対象 | ツール |
| --- | --- | --- |
| 単体 | payload の round-trip（ランダム 1 万件）、正規形、不正な入力、過去バージョンのフィクスチャ | vitest |
| 単体 | 表示名の正規化、検索の正規化、下書きの移行、模様のシードが同じ入力で同じになること | vitest |
| 単体 | 境目をまたぐ移動・あふれ・追加時の振り分け・50 曲の上限（`list-ops.ts`）
| 単体 | アプリ内ブラウザの判定（実際の User-Agent 文字列のフィクスチャ） | vitest |
| データ | カタログの検証 | `scripts/validate-catalog.ts` |
| E2E | スマホ幅で 15 曲追加 → 並べ替えて 2 曲を候補に回す → リロードしても残る → 完成 → 共有 URL を別のブラウザで開いて同じ内容 → remix で読み込む（確認ダイアログが出る）→ 名前が fragment にしか入っていない | Playwright（iPhone / Pixel） |
| E2E | キーボードだけで完成まで操作できる、アクセシビリティの自動チェック | Playwright + axe |
| E2E | ボトムシートを開いてブラウザの戻る → シートだけが閉じて編集画面に残る。`?sheet=add` を直接開いて閉じる → 履歴が増えない | Playwright |
| E2E | 高さ 500px と 664px の画面で、名前・タグのヘッダーの表示が切り替わる | Playwright |
| 実機 | 画像の共有・保存・コピー、Instagram ストーリーズへの貼り付けと透明度 | iOS Safari / Android Chrome |

## 12. CI/CD

- PR: `typecheck` → `lint` → `test` → `validate:catalog` → `build` → Playwright
- `main` への push: 上記に加えて `wrangler deploy`
- **月 1 回の定期実行**で再ビルド・デプロイし、開発者トークンを作り直す（毎回 90 日の有効期限なので、最低でも 60 日の余裕がある）
- デプロイ後に、本番の JS に埋め込まれたトークンの有効期限を確認し、30 日を切っていたらワークフローを失敗させる（GitHub の通知で気づける）
- GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`
- Cloudflare は Free プランのまま

## 13. マイルストーン

| マイルストーン | 主なタスク |
| --- | --- |
| **M0** | リポジトリの雛形／旧データの取り込み、新曲の追加／共有画像の試作ページ |
| **M1** | `shared/` とテスト、UI の設計、編集画面（追加・並べ替え・削除・名前・タグ）、下書きの保存、保存環境の案内、リセット |
| **M2** | `/u/:payload` の表示、remix、幾何学模様、3 種類の共有画像、共有・保存・コピー |
| **M3** | ビルド時のトークン生成と定期ビルド（§8.1）、MusicKit、未配信曲の警告と差し替え、プレイリスト作成、再開処理 |
| **M4** | 実機テスト、アクセシビリティの確認、CSP の最終調整、説明ページ、本番での Apple Music の確認 |
| **最後にまとめて** | Cloudflare へのデプロイと `sideu.perfumehub.app` の設定、Instagram ストーリーズへの貼り付けの実機確認（HTTPS が必要なため）、Apple Developer での MusicKit の鍵の発行、Apple Music の ID の照合、MusicKit で 13 曲のプレイリストを曲順どおりに作れるかの確認 |
| 後回し | 動的 OGP（§10） |

## 14. 未決定事項

| 項目 | 状況 |
| --- | --- |
| タグの語彙・文言 | 別の AI が §3.5 の条件で考える |
| UI・ビジュアル | §4.9 の論点から一緒に検討する |
