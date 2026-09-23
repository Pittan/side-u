// ドラッグでの並べ替え（DESIGN.md §4.2 F-8）。ボタン操作が主で、ドラッグは補助。
// SortableJS には「どこからどこへ動かしたか」の検出だけを任せる。
// DOM の変更は元に戻し、状態の変更は list-ops の move() に通す（13 曲目のあふれなどを同じ規則で扱うため）。
import { onBeforeUnmount, onMounted, type Ref } from 'vue'
import type Sortable from 'sortablejs'
import type { ListName, Pos } from './list-ops'

export function useSortableLists(
  lists: Record<ListName, Ref<HTMLElement | undefined>>,
  onMove: (from: Pos, to: Pos) => void,
) {
  const instances: Sortable[] = []

  onMounted(async () => {
    // ドラッグを使わない人もいるので、後から読み込む
    const { default: SortableJS } = await import('sortablejs')
    for (const list of ['sideU', 'candidates'] as const) {
      const element = lists[list].value
      if (!element) continue
      element.dataset.list = list
      instances.push(
        SortableJS.create(element, {
          group: 'side-u',
          handle: '.handle',
          draggable: '.row',
          animation: 150,
          // ブラウザ組み込みのドラッグ＆ドロップを使わず、どの端末でも同じ動きにする
          forceFallback: true,
          fallbackTolerance: 4,
          emptyInsertThreshold: 24,
          ghostClass: 'row-ghost',
          chosenClass: 'row-chosen',
          onEnd(event) {
            const { item, from, to, oldIndex, oldDraggableIndex, newDraggableIndex } = event
            if (oldDraggableIndex === undefined || newDraggableIndex === undefined || oldIndex === undefined) return
            // SortableJS が動かした DOM を元の位置に戻す（描画は Vue に任せる）
            item.remove()
            from.insertBefore(item, from.children[oldIndex] ?? null)
            const fromList = from.dataset.list as ListName
            const toList = to.dataset.list as ListName
            if (fromList === toList && oldDraggableIndex === newDraggableIndex) return
            onMove({ list: fromList, index: oldDraggableIndex }, { list: toList, index: newDraggableIndex })
          },
        }),
      )
    }
  })

  onBeforeUnmount(() => {
    for (const instance of instances) instance.destroy()
  })
}
