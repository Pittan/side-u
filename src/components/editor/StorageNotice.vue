<script setup lang="ts">
// 保存できない・消えやすい環境での案内（DESIGN.md §7.3）
import { computed } from 'vue'
import { externalBrowserUrl, useStorageHealth } from '@/composables/useStorageHealth'

const { canPersist, inAppBrowser } = useStorageHealth()
const lineUrl = computed(() => (inAppBrowser === 'line' ? externalBrowserUrl(location.href) : null))
</script>

<template>
  <aside v-if="!canPersist || inAppBrowser" class="notice" role="note">
    <p v-if="!canPersist">
      <strong>この環境では作業内容を保存できません。</strong>
      ページを閉じると消えてしまいます。
    </p>
    <p v-else>
      <strong>アプリ内のブラウザでは、作業内容が消えることがあります。</strong>
    </p>
    <p>Safari や Chrome で開き直すのがおすすめです。</p>
    <a v-if="lineUrl" :href="lineUrl" class="button">ブラウザで開く</a>
    <p v-else class="how">画面の右上や下にあるメニューから「ブラウザで開く」を選んでください。</p>
    <RouterLink to="/help/storage">くわしく</RouterLink>
  </aside>
</template>

<style scoped>
.notice {
  display: grid;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-danger);
  border-radius: var(--radius-small);
  font-size: 0.875rem;
}

.notice p {
  margin: 0;
}

.how {
  color: var(--color-muted);
}
</style>
