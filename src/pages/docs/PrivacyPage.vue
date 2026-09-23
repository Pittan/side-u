<script setup lang="ts">
import DocLayout from '@/components/common/DocLayout.vue'
import ContactInfo from '@/components/common/ContactInfo.vue'
import { DOCS_UPDATED_ON } from '@/site'
</script>

<template>
  <DocLayout title="プライバシーと外部への通信" :updated-on="DOCS_UPDATED_ON">
    <p>
      SIDE U にはアカウントがなく、あなたが選んだ曲や名前を、SIDE U のサーバーのデータベースなどに保存することはありません。
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
      <li>
        <code>/u/</code> のあとの文字列: 13 曲とタグ。URL を知っている人なら誰でも読み取れます。
        SIDE U のサーバーもこの部分を読み取って、SNS に貼ったときのカードを作ります（下の「SNS のカード」）。
      </li>
      <li>
        <code>#n=</code> のあとの文字列: 名前。ブラウザの仕組みにより、この部分は SIDE U のサーバーには送られません。
        ただし、URL を SNS やメッセージアプリに貼ると、URL 全体がそのサービスに渡ります。
      </li>
    </ul>

    <h2>共有画像</h2>
    <p>完成画面で作る共有画像（名前入り）は、ブラウザの中で作ります。SIDE U のサーバーには送りません。</p>

    <h2>SNS のカード</h2>
    <p>
      共有 URL が開かれると（X や LINE などが、カードを表示するために URL を読みに来たときも含みます）、
      SIDE U のサーバーが URL の <code>/u/</code> のあとの部分から 13 曲とタグを読み取り、カードの説明文と画像を作ります。
    </p>
    <ul>
      <li>カードに入るのは、曲名とタグだけです。<strong>名前は入りません</strong>（名前はサーバーに届かないため）。</li>
      <li>どれも、URL を知っている人なら誰でも読み取れる情報です。誰が作ったか、誰が開いたかは記録しません。</li>
      <li>
        作った画像は、表示を速くするために Cloudflare の配信網に一時的に保存されます（キャッシュ。最長 1 年）。
        同じ 13 曲とタグの組み合わせには同じ画像を使うだけで、あなたの選曲をデータベースに記録するものではありません。
      </li>
    </ul>

    <h2>外部への通信</h2>
    <div class="table-scroll">
      <table class="responsive-table">
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
            <td data-label="送り先">Cloudflare</td>
            <td data-label="いつ">ページを開いたとき</td>
            <td data-label="送られるもの">IP アドレス、ブラウザの種類、開いた URL（<code>#</code> より後ろは含まない。共有 URL なら 13 曲とタグを含む）</td>
            <td data-label="目的">サイトの配信と、SNS のカード（説明文と画像）を作るため。運用のための集計値（アクセス数など）だけを見ます</td>
          </tr>
          <tr>
            <td data-label="送り先">Google（Google Fonts）</td>
            <td data-label="いつ">ページを開いたとき</td>
            <td data-label="送られるもの">IP アドレス、ブラウザの種類、フォントファイルの要求</td>
            <td data-label="目的">文字の表示に使うフォント（LINE Seed JP）の読み込み</td>
          </tr>
          <tr>
            <td data-label="送り先">Apple</td>
            <td data-label="いつ">Apple Music のボタンを押したときだけ</td>
            <td data-label="送られるもの">
              Apple ID でのサインイン、プレイリストの名前（名前を含む）と説明、曲の ID。
              Apple Music の認証情報はブラウザと Apple の間だけでやり取りし、SIDE U のサーバーには送りません
            </td>
            <td data-label="目的">あなたのライブラリにプレイリストを作るため</td>
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
