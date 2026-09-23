<script setup lang="ts">
// 共有ページ（/u/:payload）。本人なら共有画像と共有の操作、ほかの人なら HTML の一覧と作成の導線
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { catalog } from '@shared/catalog-instance'
import { parseFragment } from '@shared/fragment'
import { decodePayload } from '@shared/payload'
import AppToast from '@/components/common/AppToast.vue'
import OwnerView from '@/components/share/OwnerView.vue'
import VisitorView from '@/components/share/VisitorView.vue'
import { useDraft } from '@/composables/useDraft'
import { DISCLAIMER } from '@/site'

const route = useRoute()
const { draft } = useDraft()

const payload = computed(() => String(route.params.payload))
const decoded = computed(() => decodePayload(payload.value, catalog))
const name = computed(() => parseFragment(route.hash).name)
const sideU = computed(() => (decoded.value.ok ? decoded.value.value : null))

/** 自分の下書きの Side U（13 曲とタグ）と一致すれば本人とみなす */
const isOwner = computed(() => {
  if (!sideU.value) return false
  const sameSongs = sideU.value.songIds.join() === draft.value.sideU.join()
  const sameTags = sideU.value.tagIds.join() === [...draft.value.tagIds].sort((a, b) => a - b).join()
  return sameSongs && sameTags
})

const shareData = computed(() =>
  sideU.value
    ? {
        payload: payload.value,
        name: name.value,
        titles: sideU.value.songIds.map(id => catalog.songById.get(id)?.title ?? ''),
        tags: sideU.value.tagIds.map(id => catalog.tagById.get(id)?.label ?? ''),
      }
    : null,
)

const shareUrl = computed(() => `${location.origin}${route.fullPath.split('#')[0]}${route.hash}`)
</script>

<template>
  <div class="page">
    <header class="app-header">
      <RouterLink v-if="isOwner" to="/edit" class="back">← 編集に戻る</RouterLink>
      <RouterLink v-else to="/" class="logo">SIDE U</RouterLink>
    </header>

    <main>
      <template v-if="!sideU">
        <h1>このSide Uは読み込めませんでした</h1>
        <p>リンクが途中で切れているか、変更されている可能性があります。</p>
        <RouterLink to="/edit" class="button button-primary">自分のSide Uをつくる</RouterLink>
      </template>

      <template v-else-if="isOwner && shareData">
        <h1 class="title">{{ name ? `${name} の Side U ができました` : 'Side U ができました' }}</h1>
        <OwnerView :data="shareData" :share-url="shareUrl" :song-ids="sideU.songIds" :tag-ids="sideU.tagIds" />
      </template>

      <VisitorView v-else :payload="payload" :side-u="sideU" :name="name" />

      <p class="disclaimer">
        {{ DISCLAIMER }}
        <RouterLink to="/privacy">プライバシー</RouterLink>・<RouterLink to="/terms">利用規約</RouterLink>
      </p>
    </main>
    <AppToast />
  </div>
</template>

<style scoped>
.app-header {
  max-width: 40rem;
  margin: 0 auto;
  padding: 0.75rem 1rem 0;
}

.back,
.logo {
  color: inherit;
  font-weight: 700;
  text-decoration: none;
}

.logo {
  font-weight: 800;
  letter-spacing: 0.08em;
}

.title {
  margin: 0 0 1rem;
  font-size: 1.375rem;
}

.disclaimer {
  margin-top: 2.5rem;
  color: var(--color-muted);
  font-size: 0.75rem;
}
</style>
