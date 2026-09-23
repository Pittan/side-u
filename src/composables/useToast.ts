import { ref } from 'vue'

export type Toast = { id: number; message: string; action?: { label: string; run: () => void } }

const current = ref<Toast | null>(null)
let nextId = 1
let timer: ReturnType<typeof setTimeout> | undefined

export function useToast() {
  function show(message: string, action?: Toast['action'], durationMs = 5000) {
    clearTimeout(timer)
    const toast = { id: nextId++, message, action }
    current.value = toast
    timer = setTimeout(() => {
      if (current.value?.id === toast.id) current.value = null
    }, durationMs)
  }
  function dismiss() {
    clearTimeout(timer)
    current.value = null
  }
  return { current, show, dismiss }
}
