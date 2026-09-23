<script setup lang="ts">
// 確認ダイアログ。window.confirm は使わない（DESIGN.md §7.2）。開閉は履歴と結びつける
import { nextTick, ref, watch } from 'vue'
import { useOverlayHistory } from '@/composables/useOverlayHistory'

const props = defineProps<{ overlayKey: string; title: string; confirmLabel: string; danger?: boolean }>()
const emit = defineEmits<{ confirm: [] }>()

const { isOpen, open, close } = useOverlayHistory(props.overlayKey)
const dialog = ref<HTMLDialogElement>()

watch(
  isOpen,
  async value => {
    await nextTick()
    if (value && !dialog.value?.open) dialog.value?.showModal()
    if (!value && dialog.value?.open) dialog.value.close()
  },
  { immediate: true },
)

function confirm() {
  emit('confirm')
  close()
}

defineExpose({ open, close })
</script>

<template>
  <dialog ref="dialog" class="confirm" :aria-labelledby="`${overlayKey}-title`" @cancel.prevent="close" @click.self="close">
    <div class="body">
      <h2 :id="`${overlayKey}-title`">{{ title }}</h2>
      <slot />
      <div class="actions">
        <button type="button" class="button" @click="close">やめる</button>
        <button type="button" class="button" :class="danger ? 'button-danger' : 'button-primary'" @click="confirm">
          {{ confirmLabel }}
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.confirm {
  width: min(28rem, calc(100vw - 2rem));
  padding: 0;
  border: none;
  border-radius: var(--radius);
  background: var(--color-bg);
  color: var(--color-fg);
}

.confirm::backdrop {
  background: rgb(0 0 0 / 0.5);
}

.body {
  padding: 1.25rem;
}

h2 {
  margin: 0 0 0.75rem;
  font-size: 1.125rem;
}

.actions {
  display: flex;
  flex-wrap: wrap-reverse;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1.25rem;
}

/* 狭い画面では縦に並べる（ボタンの文言を折り返さない） */
.actions .button {
  flex: 1 1 auto;
  white-space: nowrap;
}
</style>
