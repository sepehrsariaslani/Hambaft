import { createRouter, createWebHistory } from 'vue-router'
import { sessionUser } from '@/utils/frappe'

const router = createRouter({
  history: createWebHistory(import.meta.env.DEV ? '/' : '/hambaft/'),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: () => import('@/pages/HomePage.vue'),
      meta: { title: 'خانه' },
    },
    {
      path: '/about',
      name: 'About',
      component: () => import('@/pages/AboutPage.vue'),
      meta: { title: 'درباره' },
    },
  ],
})

router.beforeEach(async (to, from, next) => {
  document.title = `${to.meta.title || 'Hambaft'} | Hambaft`

  if (window.user && window.user !== 'Guest') {
    return next()
  }

  try {
    const user = await sessionUser()
    if (user && user !== 'Guest') return next()
    return next()
  } catch {
    return next()
  }
})

export default router
