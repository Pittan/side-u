<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()
</script>

<template>
  <main>
    <h1>共有ページ</h1>
    <p>payload: <code>{{ route.params.payload }}</code></p>
    <p>M2 で実装します。</p>
  </main>
</template>
