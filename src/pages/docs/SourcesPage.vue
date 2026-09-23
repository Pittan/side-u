<script setup lang="ts">
import { catalog } from '@shared/catalog-instance'
import DocLayout from '@/components/common/DocLayout.vue'
import { CONTACT, DOCS_UPDATED_ON } from '@/site'

const selectableCount = catalog.songs.filter(song => song.selectable).length
const latestRelease = [...catalog.releases].sort((a, b) => b.releasedOn.localeCompare(a.releasedOn))[0]
</script>

<template>
  <DocLayout title="データの出典と訂正" :updated-on="DOCS_UPDATED_ON">
    <p>
      SIDE U で選べる曲は {{ selectableCount }} 曲です（{{ latestRelease?.releasedOn.slice(0, 4) }}年の『{{ latestRelease?.title }}』まで）。
    </p>

    <h2>出典</h2>
    <ul>
      <li><a href="https://www.perfume-web.jp/discography/" rel="noopener">Perfume 公式サイトのディスコグラフィ</a></li>
      <li><a href="https://www.perfume-web.jp/news/" rel="noopener">Perfume 公式サイトのニュース</a>（配信リリースの日付など）</li>
      <li><a href="https://github.com/Pittan/perfume-database" rel="noopener">perfume-database</a>（2022 年までの楽曲データ）</li>
    </ul>

    <h2>収録の方針</h2>
    <ul>
      <li>公式にリリースされた Perfume の曲を収録します。インストゥルメンタル・カラオケは選べません。</li>
      <li>公式サイトで別の名前が付いている別バージョン（例: edge と edge(⊿-mix)）は、別の曲として選べます。元の曲の「別バージョン」としてまとめて表示します。</li>
      <li>曲名の表記は公式サイトに従います。</li>
      <li>ライブや映像作品でだけ披露された曲は、初出の作品や年がわからない場合があります。</li>
    </ul>

    <h2>訂正のお願い</h2>
    <p>曲名の誤り、足りない曲などに気づいたら、お知らせください。</p>
    <p v-if="CONTACT"><a :href="CONTACT.url" rel="noopener">{{ CONTACT.label }}</a></p>
    <p v-else>連絡先は準備中です。</p>
  </DocLayout>
</template>
