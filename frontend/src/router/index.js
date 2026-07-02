import { createRouter, createWebHistory } from 'vue-router'
import { checkFrappeSession } from '@/utils/frappe'

function buildLegacyRedirect(to) {
  const pathMatch = to.params.pathMatch
  const parts = Array.isArray(pathMatch) ? pathMatch : pathMatch ? [pathMatch] : []
  const path = parts.length ? `/${parts.join('/')}` : '/'
  return { path, query: to.query, hash: to.hash }
}

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/signup',
    name: 'Signup',
    component: () => import('@/views/SignupView.vue'),
    meta: { guest: true },
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/views/OnboardingView.vue'),
    meta: { requiresAuth: true, requiresOnboarding: true },
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomeView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('@/views/TasksView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/habits',
    name: 'Habits',
    component: () => import('@/views/HabitsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/goals',
    name: 'Goals',
    component: () => import('@/views/GoalsView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/finance',
    name: 'Finance',
    component: () => import('@/views/FinanceView.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'FinanceDashboard',
        component: () => import('@/views/finance/FinanceDashboard.vue'),
      },
      {
        path: 'accounts',
        name: 'FinanceAccounts',
        component: () => import('@/views/finance/FinanceAccounts.vue'),
      },
      {
        path: 'accounts/new',
        name: 'FinanceAccountNew',
        component: () => import('@/views/finance/FinanceAccountForm.vue'),
      },
      {
        path: 'accounts/:name',
        name: 'FinanceAccountDetail',
        component: () => import('@/views/finance/FinanceAccountDetail.vue'),
        props: true,
      },
      {
        path: 'accounts/:name/edit',
        name: 'FinanceAccountEdit',
        component: () => import('@/views/finance/FinanceAccountForm.vue'),
        props: true,
      },
      {
        path: 'categories',
        name: 'FinanceCategories',
        component: () => import('@/views/finance/FinanceCategories.vue'),
      },
      {
        path: 'transactions/new',
        name: 'FinanceTransactionNew',
        component: () => import('@/views/finance/FinanceTransactionForm.vue'),
      },
      {
        path: 'transactions/:name',
        name: 'FinanceTransactionEdit',
        component: () => import('@/views/finance/FinanceTransactionForm.vue'),
        props: true,
      },
      {
        path: 'budgets',
        name: 'FinanceBudgets',
        component: () => import('@/views/finance/FinanceBudgets.vue'),
      },
      {
        path: 'budgets/new',
        name: 'FinanceBudgetNew',
        component: () => import('@/views/finance/FinanceBudgetDetail.vue'),
      },
      {
        path: 'budgets/:name',
        name: 'FinanceBudgetDetail',
        component: () => import('@/views/finance/FinanceBudgetDetail.vue'),
        props: true,
      },
      {
        path: 'savings',
        name: 'FinanceSavings',
        component: () => import('@/views/finance/FinanceSavings.vue'),
      },
      {
        path: 'savings/:name',
        name: 'FinanceSavingsDetail',
        component: () => import('@/views/finance/FinanceSavingsDetail.vue'),
        props: true,
      },
      {
        path: 'bills',
        name: 'FinanceBills',
        component: () => import('@/views/finance/FinanceBills.vue'),
      },
      {
        path: 'subscriptions',
        name: 'FinanceSubscriptions',
        component: () => import('@/views/finance/FinanceSubscriptions.vue'),
      },
    ],
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('@/views/CalendarView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/notes',
    name: 'Notes',
    component: () => import('@/views/NotesView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/settings/security',
    name: 'SecuritySettings',
    component: () => import('@/views/SecurityView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/hambaft/:pathMatch(.*)*',
    redirect: (to) => buildLegacyRedirect(to),
  },
  {
    path: '/app/:pathMatch(.*)*',
    redirect: (to) => buildLegacyRedirect(to),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory('/'),
  routes,
})

router.beforeEach(async (to, _from, next) => {
  // For protected routes, verify Frappe session
  if (to.meta.requiresAuth) {
    const username = await checkFrappeSession()
    if (!username) {
      return next('/login')
    }
  }

  // For guest-only routes (login/signup), if already logged in, send to home
  if (to.meta.guest) {
    const username = await checkFrappeSession()
    if (username) {
      return next('/')
    }
  }

  next()
})

export default router
