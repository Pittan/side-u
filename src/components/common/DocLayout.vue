<script setup lang="ts">
// 説明ページの共通レイアウト
defineProps<{ title: string; updatedOn: string }>()
</script>

<template>
  <div class="doc">
    <header class="app-header">
      <RouterLink to="/" class="logo">SIDE U</RouterLink>
    </header>
    <main>
      <h1>{{ title }}</h1>
      <p class="updated">最終更新 {{ updatedOn }}</p>
      <slot />
      <nav class="doc-nav" aria-label="説明ページ">
        <RouterLink to="/privacy">プライバシーと外部への通信</RouterLink>
        <RouterLink to="/terms">利用規約・免責</RouterLink>
        <RouterLink to="/sources">データの出典と訂正</RouterLink>
        <RouterLink to="/help/storage">保存について</RouterLink>
      </nav>
    </main>
  </div>
</template>

<style scoped>
.app-header {
  max-width: 40rem;
  margin: 0 auto;
  padding: 0.75rem 1rem 0;
}

.logo {
  color: inherit;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-decoration: none;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
}

.updated {
  margin: 0.25rem 0 1.5rem;
  color: var(--color-muted);
  font-size: 0.8125rem;
}

main :deep(h2) {
  margin: 2rem 0 0.5rem;
  font-size: 1.125rem;
}

main :deep(table) {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

main :deep(th),
main :deep(td) {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  text-align: start;
  vertical-align: top;
}

main :deep(.table-scroll) {
  overflow-x: auto;
}

/* スマホの幅では、表の行をカードにして縦に並べる（列が細くなって 1 文字ずつ折り返すのを防ぐ） */
@media (max-width: 40rem) {
  main :deep(.responsive-table),
  main :deep(.responsive-table tbody),
  main :deep(.responsive-table tr),
  main :deep(.responsive-table td) {
    display: block;
  }

  main :deep(.responsive-table thead) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  main :deep(.responsive-table tr) {
    margin-bottom: 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-small);
  }

  main :deep(.responsive-table td) {
    border: none;
    border-bottom: 1px solid var(--color-border);
  }

  main :deep(.responsive-table td:last-child) {
    border-bottom: none;
  }

  main :deep(.responsive-table td[data-label])::before {
    display: block;
    color: var(--color-muted);
    font-size: 0.75rem;
    font-weight: 700;
    content: attr(data-label);
  }

  main :deep(.responsive-table td:first-child) {
    background: var(--color-surface);
    font-weight: 700;
  }

  main :deep(.responsive-table td:first-child)::before {
    display: none;
  }
}

main :deep(a) {
  color: var(--color-accent);
}

.doc-nav {
  display: grid;
  gap: 0.5rem;
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.875rem;
}
</style>
