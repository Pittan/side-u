<script setup lang="ts">
import DocLayout from '@/components/common/DocLayout.vue'
import { DISCLAIMER, DOCS_UPDATED_ON } from '@/site'
</script>

<template>
  <DocLayout title="利用規約・免責" :updated-on="DOCS_UPDATED_ON">
    <p><strong>{{ DISCLAIMER }}</strong></p>

    <h2>SIDE U について</h2>
    <p>
      SIDE U は、Perfume の楽曲から自分だけの 13 曲を選んで共有するための、ファンによる非公式のツールです。
      公式のアルバム『Favorites (Selected by Perfume)』の曲目を予想したり、代わりになったりするものではありません。
    </p>

    <h2>権利について</h2>
    <ul>
      <li>曲名・作品名などの権利は、それぞれの権利者に帰属します。</li>
      <li>SIDE U は、歌詞、音源、公式のジャケット画像・写真・ロゴを使いません。画面や共有画像の模様は SIDE U のオリジナルです。</li>
    </ul>

    <h2>使うときのお願い</h2>
    <ul>
      <li>名前には、ほかの人を傷つける言葉や、ほかの人になりすます言葉を使わないでください。</li>
      <li>共有 URL や共有画像は、あなたの判断で共有してください。</li>
    </ul>

    <h2>免責</h2>
    <ul>
      <li>SIDE U は現状のまま提供します。曲のデータの正確さや、いつでも使えることは保証しません。</li>
      <li>予告なく内容を変えたり、提供を終えたりすることがあります。</li>
      <li>Apple Music の連携は Apple のサービスに依存します。Apple の仕様変更などで使えなくなることがあります。</li>
      <li>SIDE U を使ったことで生じた損害について、運営者は責任を負いません（法律で責任を免れられない場合を除きます）。</li>
    </ul>
  </DocLayout>
</template>
