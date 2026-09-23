// ボトムシートやダイアログを履歴と結びつける（DESIGN.md §4.11）。
// 開くときに履歴を 1 つ積むので、戻るボタン・戻るジェスチャーでは重なった UI だけが閉じる。
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const QUERY_KEY = 'sheet'

export function useOverlayHistory(key: string) {
  const route = useRoute()
  const router = useRouter()

  const isOpen = computed(() => route.query[QUERY_KEY] === key)

  function open() {
    if (isOpen.value) return
    router.push({ query: { ...route.query, [QUERY_KEY]: key }, state: { overlay: key } })
  }

  function close() {
    if (!isOpen.value) return
    // 自分で積んだ履歴なら戻る。URL を直接開いた・リロードした場合は置き換えて、履歴を増やさない
    if (history.state?.overlay === key) {
      router.back()
    } else {
      const { [QUERY_KEY]: _, ...query } = route.query
      router.replace({ query })
    }
  }

  return { isOpen, open, close }
}
