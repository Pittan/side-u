<script setup lang="ts">
// Apple Music でプレイリストを作る流れ（wireframes.md §6、DESIGN.md §8.2）
import { nextTick, ref, watch } from 'vue'
import { catalog } from '@shared/catalog-instance'
import { useAppleMusic } from '@/composables/useAppleMusic'
import { useOverlayHistory } from '@/composables/useOverlayHistory'

const props = defineProps<{ payload: string; songIds: number[]; name: string | null; tagLabels: string[] }>()

const { isOpen, open, close } = useOverlayHistory('apple-music')
const dialog = ref<HTMLDialogElement>()
const { name, missing, resolution, trackIds, state, createdAt, create, reset } = useAppleMusic(props)

const ERROR_MESSAGES = {
  cancelled: 'サインインがキャンセルされました。',
  'not-subscribed': 'Apple Music の利用登録が必要です。登録後にもう一度お試しください。',
  unauthorized: 'Apple Music に接続できませんでした。時間をおいてもう一度お試しください。',
  network: '通信できませんでした。電波の良いところでもう一度お試しください。',
  unknown: 'プレイリストを作れませんでした。時間をおいてもう一度お試しください。',
} as const

const title = (id: number) => catalog.songById.get(id)?.title ?? ''
const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

watch(
  isOpen,
  async value => {
    await nextTick()
    if (value && !dialog.value?.open) dialog.value?.showModal()
    if (!value && dialog.value?.open) {
      dialog.value.close()
      if (state.value.step === 'done' || state.value.step === 'error') reset()
    }
  },
  { immediate: true },
)

function onCancel() {
  // 作成中は閉じない
  if (state.value.step !== 'authorizing' && state.value.step !== 'creating') close()
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="dialog" aria-labelledby="am-title" @cancel.prevent="onCancel" @click.self="onCancel">
    <div class="body">
      <h2 id="am-title">Apple Music にプレイリストをつくる</h2>

      <template v-if="state.step === 'confirm'">
        <dl class="summary">
          <dt>プレイリスト名</dt>
          <dd>{{ name }}</dd>
          <dt>曲数</dt>
          <dd>{{ trackIds.length }}曲<template v-if="trackIds.length < songIds.length">（13曲中）</template></dd>
        </dl>

        <section v-if="missing.length" class="missing" aria-labelledby="am-missing">
          <h3 id="am-missing">Apple Music にない曲（{{ missing.length }}）</h3>
          <template v-for="plan in missing" :key="plan.songId">
          <p v-if="plan.alternatives.length === 0" class="track track-plain">
            <strong>{{ songIds.indexOf(plan.songId) + 1 }}曲目 {{ title(plan.songId) }}</strong>
            <span>この曲は入りません</span>
          </p>
          <fieldset v-else class="track">
            <legend>{{ songIds.indexOf(plan.songId) + 1 }}曲目 {{ title(plan.songId) }}</legend>
            <label v-for="alternative in plan.alternatives" :key="alternative.id" class="choice">
              <input v-model="resolution[plan.songId]" type="radio" :name="`am-${plan.songId}`" :value="alternative.id" />
              「{{ alternative.title }}」に差し替える
            </label>
            <label class="choice">
              <input v-model="resolution[plan.songId]" type="radio" :name="`am-${plan.songId}`" :value="null" />
              この曲を除いてつくる
            </label>
          </fieldset>
          </template>
        </section>

        <p v-if="createdAt" class="warning" role="note">この Side U のプレイリストは {{ formatDate(createdAt) }} に作成済みです。もう一度つくると、同じプレイリストがもう 1 つできます。</p>

        <p class="note">
          Apple ID でサインインし、あなたのライブラリに非公開のプレイリストを 1 つつくります。Apple Music の利用登録が必要です。
          プレイリスト名（名前を含む）は Apple に送られます。
          <RouterLink to="/privacy">くわしく</RouterLink>
        </p>

        <div class="actions">
          <button type="button" class="button" @click="close">やめる</button>
          <button type="button" class="button button-primary" :disabled="trackIds.length === 0" @click="create">
            {{ createdAt ? 'もう一度つくる' : 'Apple Music でつくる' }}（{{ trackIds.length }}曲）
          </button>
        </div>
      </template>

      <p v-else-if="state.step === 'authorizing'" class="progress" role="status">Apple ID でサインインしています…</p>
      <p v-else-if="state.step === 'creating'" class="progress" role="status">プレイリストをつくっています…</p>

      <template v-else-if="state.step === 'done'">
        <p role="status">「{{ name }}」をつくりました（{{ state.added }}曲）。</p>
        <div class="actions">
          <button type="button" class="button" @click="close">閉じる</button>
          <a :href="state.url" class="button button-primary" target="_blank" rel="noopener">ミュージックで開く</a>
        </div>
      </template>

      <template v-else-if="state.step === 'error'">
        <p role="alert">{{ ERROR_MESSAGES[state.kind] }}</p>
        <div class="actions">
          <button type="button" class="button" @click="close">閉じる</button>
          <button type="button" class="button button-primary" @click="reset">もう一度</button>
        </div>
      </template>
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  width: min(30rem, calc(100vw - 2rem));
  max-height: 90dvh;
  padding: 0;
  border: none;
  border-radius: var(--radius);
  background: var(--color-bg);
  color: var(--color-fg);
}

.dialog::backdrop {
  background: rgb(0 0 0 / 0.5);
}

.body {
  padding: 1.25rem;
}

h2 {
  margin: 0 0 1rem;
  font-size: 1.125rem;
}

h3 {
  margin: 1rem 0 0.5rem;
  font-size: 1rem;
}

.summary {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 1rem;
  margin: 0;
}

.summary dt {
  color: var(--color-muted);
}

.summary dd {
  margin: 0;
  font-weight: 700;
}

.track {
  display: grid;
  gap: 0.25rem;
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
}

.track-plain {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  font-size: 0.875rem;
}

.track-plain span {
  color: var(--color-muted);
}

.track legend {
  padding: 0 0.25rem;
  font-weight: 700;
}

.choice {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.75rem;
}

.warning {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-small);
  font-size: 0.875rem;
}

.note {
  color: var(--color-muted);
  font-size: 0.8125rem;
}

.progress {
  padding: 1.5rem 0;
  text-align: center;
}

.actions {
  display: flex;
  flex-wrap: wrap-reverse;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.actions .button {
  flex: 1 1 auto;
  white-space: nowrap;
}
</style>
