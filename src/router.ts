import { createRouter, createWebHistory } from 'vue-router'
import { useToast } from './composables/useToast'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./pages/HomePage.vue') },
    { path: '/edit', component: () => import('./pages/EditorPage.vue') },
    { path: '/u/:payload', component: () => import('./pages/SharePage.vue') },
    // M0 の実機確認用。公開前に削除する
    { path: '/spike/share-image', component: () => import('./spikes/ShareImageSpike.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('./pages/NotFoundPage.vue') },
  ],
})

// ページを移動したら、前のページの通知は消す（シートの開閉など、同じページ内の移動では消さない）
router.afterEach((to, from) => {
  if (to.path !== from.path) useToast().dismiss()
})
