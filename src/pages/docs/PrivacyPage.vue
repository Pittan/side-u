<script setup lang="ts">
import DocLayout from '@/components/common/DocLayout.vue'
import ContactInfo from '@/components/common/ContactInfo.vue'
import { DOCS_UPDATED_ON } from '@/site'
</script>

<template>
  <DocLayout title="プライバシーと外部への通信" :updated-on="DOCS_UPDATED_ON">
    <p>
      SIDE U にはアカウントがなく、あなたが選んだ曲や名前を SIDE U のサーバーに保存することはありません。
      このページでは、何がどこに保存され、どこに送られるかを説明します。
    </p>

    <h2>この端末に保存するもの</h2>
    <p>
      作りかけの Side U（曲、候補、名前、タグ）と、Apple Music にプレイリストを作った記録を、ブラウザの保存領域（localStorage）に保存します。
      この端末の外には送りません。消したいときは、編集画面のメニューの「リセット」か、ブラウザのサイトデータの削除で消せます。
    </p>

    <h2>共有 URL に含まれるもの</h2>
    <p>共有 URL は、次の 2 つの部分でできています。</p>
    <ul>
      <li><code>/u/</code> のあとの文字列: 13 曲とタグ。URL を知っている人なら誰でも読み取れます。</li>
      <li>
        <code>#n=</code> のあとの文字列: 名前。ブラウザの仕組みにより、この部分は SIDE U のサーバーには送られません。
        ただし、URL を SNS やメッセージアプリに貼ると、URL 全体がそのサービスに渡ります。
      </li>
    </ul>

    <h2>共有画像</h2>
    <p>共有画像（名前入り）はブラウザの中で作ります。SIDE U のサーバーには送りません。</p>

    <h2>外部への通信</h2>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">送り先</th>
            <th scope="col">いつ</th>
            <th scope="col">送られるもの</th>
            <th scope="col">目的</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cloudflare</td>
            <td>ページを開いたとき</td>
            <td>IP アドレス、ブラウザの種類、開いた URL（<code>#</code> より後ろは含まない）</td>
            <td>サイトの配信。運用のための集計値（アクセス数など）だけを見ます</td>
          </tr>
          <tr>
            <td>Google（Google Fonts）</td>
            <td>ページを開いたとき</td>
            <td>IP アドレス、ブラウザの種類、フォントファイルの要求</td>
            <td>文字の表示に使うフォント（LINE Seed JP）の読み込み</td>
          </tr>
          <tr>
            <td>Apple</td>
            <td>Apple Music のボタンを押したときだけ</td>
            <td>
              Apple ID でのサインイン、プレイリストの名前（名前を含む）と説明、曲の ID。
              Apple Music の認証情報はブラウザと Apple の間だけでやり取りし、SIDE U のサーバーには送りません
            </td>
            <td>あなたのライブラリにプレイリストを作るため</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h2>使っていないもの</h2>
    <ul>
      <li>広告</li>
      <li>Google アナリティクスなどのアクセス解析・行動分析</li>
      <li>SIDE U 自身の Cookie</li>
    </ul>

    <h2>お問い合わせ</h2>
    <ContactInfo />
  </DocLayout>
</template>
