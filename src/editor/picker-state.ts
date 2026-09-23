// ボトムシートで選びかけの曲。閉じても編集画面にいる間は残す（DESIGN.md §4.11）
import { ref } from 'vue'

export const pendingSongIds = ref<number[]>([])
