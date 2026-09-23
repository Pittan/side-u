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

// 新しい版をデプロイすると古い画面のファイルがなくなるので、デプロイ前から開いていたページでは
// 画面の切り替えでファイルの読み込みに失敗する。移動先を 1 回だけ読み込み直す（同じ移動先で繰り返さない）
const CHUNK_ERROR = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i
const RELOAD_KEY = 'side-u:chunk-reload'

// ページを離れるときは、読み込み途中のファイルが打ち切られて同じエラーになる。そのときは読み込み直さない
let leaving = false
addEventListener('beforeunload', () => (leaving = true))
addEventListener('pagehide', () => (leaving = true))
addEventListener('pageshow', () => (leaving = false))

router.onError((error, to) => {
  if (leaving || !(error instanceof Error) || !CHUNK_ERROR.test(error.message)) return
  try {
    if (sessionStorage.getItem(RELOAD_KEY) === to.fullPath) return
    sessionStorage.setItem(RELOAD_KEY, to.fullPath)
  } catch {
    // sessionStorage が使えなくても、1 回は読み込み直す
  }
  location.assign(to.fullPath)
})

router.afterEach(() => {
  try {
    sessionStorage.removeItem(RELOAD_KEY)
  } catch {
    // 何もしない
  }
})
