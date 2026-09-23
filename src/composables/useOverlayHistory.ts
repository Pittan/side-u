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

  /**
   * 閉じ終わる（URL が変わる）まで待つ。閉じたあとに別のページへ移動する場合は、必ず await してから移動する。
   * そうしないと、移動のあとに「戻る」が走って移動が打ち消される
   */
  async function close(): Promise<void> {
    if (!isOpen.value) return
    // 自分で積んだ履歴なら戻る。URL を直接開いた・リロードした場合は置き換えて、履歴を増やさない
    if (history.state?.overlay === key) {
      await new Promise<void>(resolve => {
        const stop = router.afterEach(() => {
          stop()
          resolve()
        })
        router.back()
      })
    } else {
      const { [QUERY_KEY]: _, ...query } = route.query
      await router.replace({ query })
    }
  }

  return { isOpen, open, close }
}
