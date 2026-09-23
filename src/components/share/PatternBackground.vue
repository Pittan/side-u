<script setup lang="ts">
// ほかの人の共有ページの背景の飾り（SVG）。payload から決めるので、同じ URL なら同じ模様になる
import { computed } from 'vue'
import { createPattern, trianglePoints } from '@shared/pattern'

const props = defineProps<{ payload: string }>()
const WIDTH = 1000
const HEIGHT = 1000
const pattern = computed(() => createPattern(props.payload))
</script>

<template>
  <svg class="pattern" :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <rect :width="WIDTH" :height="HEIGHT" :fill="pattern.background" />
    <template v-for="(shape, i) in pattern.shapes" :key="i">
      <polygon
        v-if="shape.kind === 'triangle'"
        :points="trianglePoints(shape, WIDTH, HEIGHT).map(p => p.join(',')).join(' ')"
        :fill="shape.filled ? shape.color : 'none'"
        :fill-opacity="shape.filled ? shape.opacity * 0.35 : 0"
        :stroke="shape.filled ? 'none' : shape.color"
        :stroke-opacity="shape.opacity"
        stroke-width="4"
      />
      <circle
        v-else-if="shape.kind === 'ring'"
        :cx="shape.cx * WIDTH"
        :cy="shape.cy * HEIGHT"
        :r="shape.r * Math.min(WIDTH, HEIGHT)"
        fill="none"
        :stroke="shape.color"
        :stroke-opacity="shape.opacity"
        stroke-width="4"
      />
      <line
        v-else
        :x1="shape.x1 * WIDTH"
        :y1="shape.y1 * HEIGHT"
        :x2="shape.x2 * WIDTH"
        :y2="shape.y2 * HEIGHT"
        :stroke="shape.color"
        :stroke-opacity="shape.opacity"
        stroke-width="2"
      />
    </template>
  </svg>
</template>

<style scoped>
.pattern {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
