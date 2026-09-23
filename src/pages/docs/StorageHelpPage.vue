<script setup lang="ts">
import DocLayout from '@/components/common/DocLayout.vue'
import { DOCS_UPDATED_ON } from '@/site'
</script>

<template>
  <DocLayout title="保存について" :updated-on="DOCS_UPDATED_ON">
    <p>
      作りかけの Side U は、いま使っているブラウザの中にだけ保存されます。
      次のような場合は、保存されなかったり、消えてしまったりすることがあります。
    </p>

    <h2 id="in-app">アプリの中のブラウザ</h2>
    <p>
      X、Instagram、LINE、TikTok、Facebook などのアプリでリンクを開くと、アプリの中のブラウザで開きます。
      アプリの中のブラウザは、閉じると保存した内容が消えることがあります。Safari や Chrome で開き直してください。
    </p>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">アプリ</th>
            <th scope="col">Safari・Chrome で開く方法（目安）</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>X</td>
            <td>画面の下または右上のメニューから「ブラウザで開く」</td>
          </tr>
          <tr>
            <td>Instagram・Facebook</td>
            <td>右上の「…」から「外部ブラウザで開く」</td>
          </tr>
          <tr>
            <td>LINE</td>
            <td>SIDE U の案内にある「ブラウザで開く」ボタン、または右上のメニューから「他のアプリで開く」</td>
          </tr>
          <tr>
            <td>TikTok</td>
            <td>右上の「…」から「ブラウザで開く」</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p>メニューの名前はアプリのバージョンによって変わることがあります。</p>

    <h2 id="private">シークレットモード・プライベートブラウズ</h2>
    <p>タブを閉じると、保存した内容が消えます。通常のタブで開いてください。</p>

    <h2 id="safari">しばらく開かなかった場合（iPhone・iPad の Safari）</h2>
    <p>Safari は、しばらく使っていないサイトのデータを自動で消すことがあります。完成したら、共有 URL を控えておくと安心です。</p>

    <h2 id="move">ほかのブラウザ・端末に移るには</h2>
    <p>
      完成した Side U なら、共有 URL を開いて「この13曲をもとにつくる」を選ぶと、13 曲とタグを引き継げます。
      候補の曲と名前は引き継げません。
    </p>
  </DocLayout>
</template>
