import { createRouter, createWebHistory } from 'vue-router'
import { useToast } from './composables/useToast'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, from, saved) => saved ?? (to.path !== from.path ? { top: 0 } : undefined),
  routes: [
    { path: '/', component: () => import('./pages/HomePage.vue') },
    { path: '/edit', component: () => import('./pages/EditorPage.vue') },
    { path: '/u/:payload', component: () => import('./pages/SharePage.vue') },
    { path: '/privacy', component: () => import('./pages/docs/PrivacyPage.vue') },
    { path: '/terms', component: () => import('./pages/docs/TermsPage.vue') },
    { path: '/sources', component: () => import('./pages/docs/SourcesPage.vue') },
    { path: '/help/storage', component: () => import('./pages/docs/StorageHelpPage.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('./pages/NotFoundPage.vue') },
  ],
})

// ページを移動したら、前のページの通知は消す（シートの開閉など、同じページ内の移動では消さない）
router.afterEach((to, from) => {
  if (to.path !== from.path) useToast().dismiss()
})
