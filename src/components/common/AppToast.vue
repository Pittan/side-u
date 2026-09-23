<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { current, dismiss } = useToast()

function runAction() {
  current.value?.action?.run()
  dismiss()
}
</script>

<template>
  <div class="toast-region" role="status" aria-live="polite">
    <div v-if="current" :key="current.id" class="toast">
      <span>{{ current.message }}</span>
      <button v-if="current.action" type="button" class="toast-action" @click="runAction">
        {{ current.action.label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.toast-region {
  position: fixed;
  inset-inline: 0;
  bottom: calc(var(--bottom-bar-height) + 0.75rem + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
  padding-inline: 1rem;
  pointer-events: none;
  z-index: 30;
}

.toast {
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 36rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius);
  background: var(--color-fg);
  color: var(--color-bg);
  pointer-events: auto;
}

.toast-action {
  flex: none;
  min-height: 2.75rem;
  padding-inline: 0.75rem;
  border: 1px solid currentColor;
  border-radius: var(--radius-small);
  background: transparent;
  color: inherit;
  font: inherit;
  font-weight: 700;
}
</style>
