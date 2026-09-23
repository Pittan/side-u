<script setup lang="ts">
import { CONTACT } from '@/site'
</script>

<template>
  <dl class="contact">
    <dt>運営</dt>
    <dd>{{ CONTACT.name }}</dd>
    <dt>X</dt>
    <dd><a :href="CONTACT.x.url" rel="noopener">{{ CONTACT.x.handle }}</a></dd>
    <dt>メール</dt>
    <dd>{{ CONTACT.email }}<span class="hint">（[at] を @ に置き換えてください）</span></dd>
  </dl>
</template>

<style scoped>
.contact {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.25rem 1rem;
  margin: 0;
}

.contact dt {
  color: var(--color-muted);
}

.contact dd {
  margin: 0;
}

.hint {
  color: var(--color-muted);
  font-size: 0.8125rem;
}
</style>
