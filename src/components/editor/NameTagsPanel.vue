<script setup lang="ts">
// 名前とタグ（wireframes.md §1.1）
import { computed, ref } from 'vue'
import { catalog } from '@shared/catalog-instance'
import { clampDisplayName, countGraphemes, MAX_NAME_GRAPHEMES } from '@shared/display-name'

const props = defineProps<{ name: string; tagIds: readonly number[] }>()
const emit = defineEmits<{ 'update:name': [value: string]; toggleTag: [tagId: number] }>()

const nameInput = ref<HTMLInputElement>()

defineExpose({
  focusName() {
    nameInput.value?.focus()
  },
})

const categories = computed(() =>
  catalog.tagCategories.map(category => ({
    ...category,
    tags: catalog.tags.filter(tag => tag.categoryId === category.id && !tag.retired),
  })),
)

function onInput(event: Event) {
  const input = event.target as HTMLInputElement
  const value = clampDisplayName(input.value)
  // IME の変換中に書き換えると入力が壊れるので、確定後だけ切り詰める
  if (!(event as InputEvent).isComposing && value !== input.value.trim()) input.value = value
  emit('update:name', value)
}
</script>

<template>
  <section class="panel" aria-label="名前とタグ">
    <div class="field">
      <label for="display-name">名前（任意）</label>
      <div class="name-row">
        <input
          id="display-name"
          ref="nameInput"
          :value="props.name"
          type="text"
          autocomplete="nickname"
          enterkeyhint="done"
          aria-describedby="display-name-count"
          @input="onInput"
          @compositionend="onInput"
        />
        <span id="display-name-count" class="count">{{ countGraphemes(props.name) }}/{{ MAX_NAME_GRAPHEMES }}</span>
      </div>
    </div>

    <fieldset class="field">
      <legend>タグ（任意・各1つまで）</legend>
      <div v-for="category in categories" :key="category.id" class="tag-row">
        <span :id="`tag-category-${category.id}`" class="tag-category">{{ category.label }}</span>
        <div class="chips" role="group" :aria-labelledby="`tag-category-${category.id}`">
          <button
            v-for="tag in category.tags"
            :key="tag.id"
            type="button"
            class="chip"
            :aria-pressed="props.tagIds.includes(tag.id)"
            @click="emit('toggleTag', tag.id)"
          >
            <span v-if="props.tagIds.includes(tag.id)" aria-hidden="true">✓</span>{{ tag.label }}
          </button>
        </div>
      </div>
    </fieldset>
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 1rem;
}

.field {
  display: grid;
  gap: 0.375rem;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: none;
}

label,
legend {
  padding: 0;
  font-size: 0.875rem;
  font-weight: 700;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-inline-end: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  background: var(--color-bg);
}

.name-row:focus-within {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}

input {
  flex: 1;
  min-width: 0;
  min-height: 2.75rem;
  padding: 0 0.75rem;
  border: none;
  background: transparent;
  color: inherit;
  /* iOS で入力時に拡大されないよう 16px 以上にする */
  font: inherit;
  font-size: 1rem;
  outline: none;
}

.count {
  color: var(--color-muted);
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
}

.tag-row {
  display: grid;
  grid-template-columns: 5.5rem 1fr;
  align-items: center;
  min-width: 0;
}

.tag-category {
  color: var(--color-muted);
  font-size: 0.875rem;
}

.chips {
  display: flex;
  gap: 0.375rem;
  min-width: 0;
  padding-block: 0.25rem;
  overflow-x: auto;
  scrollbar-width: none;
  /* 右端をぼかして、横に続きがあることを示す */
  mask-image: linear-gradient(to right, #000 calc(100% - 2rem), transparent);
}

.chip {
  flex: none;
  min-height: 2.5rem;
  padding: 0 0.875rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-bg);
  color: inherit;
  font: inherit;
  font-size: 0.875rem;
  cursor: pointer;
}

.chip:last-child {
  margin-inline-end: 2rem;
}

.chip[aria-pressed='true'] {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: var(--color-accent-fg);
  font-weight: 700;
}
</style>
