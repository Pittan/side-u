<script setup lang="ts">
// トップページ。下書きの状態でボタンを変える
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { catalog } from '@shared/catalog-instance'
import { buildFragment } from '@shared/fragment'
import { SIDE_U_LENGTH } from '@shared/payload'
import DiscardDraftDialog from '@/components/common/DiscardDraftDialog.vue'
import { useDraft } from '@/composables/useDraft'
import { startWireframeScene } from '@/render/wireframe-scene'
import { DISCLAIMER } from '@/site'

const router = useRouter()
const { draft, status, replace } = useDraft()
const canvas = ref<HTMLCanvasElement>()
const discardDialog = ref<InstanceType<typeof DiscardDraftDialog>>()

const titles = computed(() => draft.value.sideU.slice(0, 3).map(id => catalog.songById.get(id)?.title ?? ''))
const updatedAt = computed(() =>
  new Date(draft.value.updatedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
)
const completedUrl = computed(() =>
  draft.value.completedPayload ? `/u/${draft.value.completedPayload}${buildFragment({ name: draft.value.name || null })}` : null,
)
const statusLabel = computed(
  () =>
    ({
      empty: '',
      editing: '作りかけの Side U',
      completed: '完成した Side U',
      editedAfterComplete: '完成後に編集中の Side U',
    })[status.value],
)

function startNew() {
  replace()
  router.push('/edit')
}

let stop: (() => void) | undefined
onMounted(() => {
  if (canvas.value) stop = startWireframeScene(canvas.value)
})
onBeforeUnmount(() => stop?.())
</script>

<template>
  <div class="home">
    <canvas ref="canvas" class="scene" aria-hidden="true" />
    <main class="content">
      <header class="hero">
        <h1 class="logo">SIDE U</h1>
        <p class="tagline">Selected by You</p>
        <p class="lead">もし、あなたにも13曲を選ぶSideがあったなら。<br />Perfumeの楽曲から、あなたの「Side U」をつくろう。</p>
      </header>

      <RouterLink v-if="status === 'empty'" to="/edit" class="button button-primary cta">Side Uをつくる</RouterLink>

      <template v-else>
        <section class="draft" aria-labelledby="draft-heading">
          <h2 id="draft-heading" class="draft-label">{{ statusLabel }}</h2>
          <p class="draft-name">{{ draft.name ? `${draft.name} の Side U` : 'Side U' }}</p>
          <p class="draft-meta">
            {{ draft.sideU.length }}/{{ SIDE_U_LENGTH }}曲<template v-if="draft.candidates.length">・候補 {{ draft.candidates.length }}曲</template>
          </p>
          <p v-if="titles.length" class="draft-titles">{{ titles.join(' / ') }}{{ draft.sideU.length > 3 ? ' / …' : '' }}</p>
          <p class="draft-meta">最終更新 {{ updatedAt }}</p>
          <div class="draft-actions">
            <template v-if="status === 'completed' && completedUrl">
              <RouterLink :to="completedUrl" class="button button-primary">完成した Side U を見る</RouterLink>
              <RouterLink to="/edit" class="button">編集する</RouterLink>
            </template>
            <RouterLink v-else to="/edit" class="button button-primary">続きから</RouterLink>
          </div>
        </section>
        <button type="button" class="button new" @click="discardDialog?.open()">新しくつくる</button>
      </template>

      <footer class="footer">
        <p>{{ DISCLAIMER }}</p>
        <nav class="links" aria-label="説明ページ">
          <RouterLink to="/privacy">プライバシー</RouterLink>
          <RouterLink to="/terms">利用規約・免責</RouterLink>
          <RouterLink to="/sources">データの出典</RouterLink>
        </nav>
      </footer>
    </main>
    <DiscardDraftDialog ref="discardDialog" overlay-key="discard-home" confirm-label="破棄して新しくつくる" @confirm="startNew" />
  </div>
</template>

<style scoped>
.home {
  position: relative;
  min-height: 100dvh;
  background: #0d0f1a;
  color: #f5f7ff;
  overflow: hidden;
}

.scene {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
}

.content {
  position: relative;
  display: grid;
  align-content: center;
  gap: 1.5rem;
  min-height: 100dvh;
}

.logo {
  margin: 0;
  font-size: clamp(3.5rem, 18vw, 6rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.04em;
}

.tagline {
  margin: 0.25rem 0 0;
  opacity: 0.8;
  letter-spacing: 0.1em;
}

.lead {
  margin: 1.5rem 0 0;
  line-height: 1.9;
}

.cta {
  justify-self: start;
  min-height: 3.25rem;
  padding-inline: 2rem;
}

.draft {
  padding: 1rem 1.25rem;
  border: 1px solid rgb(255 255 255 / 0.2);
  border-radius: var(--radius);
  background: rgb(13 15 26 / 0.7);
  backdrop-filter: blur(6px);
}

.draft p {
  margin: 0;
}

.draft-label {
  margin: 0 0 0.25rem;
  color: #5ce1e6;
  font-size: 0.8125rem;
}

.draft-name {
  font-size: 1.125rem;
  font-weight: 700;
}

.draft-titles {
  margin-top: 0.25rem !important;
}

.draft-meta {
  opacity: 0.75;
  font-size: 0.8125rem;
}

.draft-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.new {
  justify-self: start;
  border-color: rgb(255 255 255 / 0.4);
  background: transparent;
  color: inherit;
}

.footer {
  opacity: 0.7;
  font-size: 0.75rem;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.links a {
  color: inherit;
}
</style>
