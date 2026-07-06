import { useEffect, useState } from 'react'
import { createBrowserRouter, Navigate, Outlet, type RouteObject } from 'react-router-dom'

import { checkFrappeSession } from './frappe'
import { AuthPage, OnboardingPage, SecurityPage } from './screens/AuthPages'
import { buildWorkspaceRoutes } from './screens/workspace-routes'

export function getRouterBasename(pathname = window.location.pathname, isDev = import.meta.env.DEV) {
  if (isDev) {
    return '/'
  }

  return pathname.startsWith('/hambaft') ? '/hambaft' : '/'
}

function ProtectedLayout() {
  const [state, setState] = useState<'loading' | 'ready' | 'guest'>('loading')

  useEffect(() => {
    let cancelled = false

    checkFrappeSession()
      .then((user) => {
        if (cancelled) {
          return
        }

        setState(user ? 'ready' : 'guest')
      })
      .catch(() => {
        if (!cancelled) {
          setState('guest')
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (state === 'loading') {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fdf9f2_0%,#f3ebdf_100%)] px-6 py-10 text-[#2d3025]">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-[rgba(45,48,37,0.08)] bg-[rgba(255,252,246,0.92)] p-8 shadow-[0_24px_64px_rgba(84,66,37,0.08)]">
          <p className="text-xs font-bold text-[#9b6b61]">Session</p>
          <h1 className="mt-3 text-2xl font-black">در حال بررسی نشست کاربر</h1>
        </div>
      </main>
    )
  }

  if (state === 'guest') {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function redirectTo(path: string) {
  return <Navigate to={path} replace />
}

export const workspaceRoutes: RouteObject[] = [
  ...buildWorkspaceRoutes(),
  { path: 'settings/security', element: <SecurityPage /> },
  { path: 'tasks', element: redirectTo('/journal') },
  { path: 'app/:pathMatch(.*)/*', element: redirectTo('/') },
  { path: 'hambaft/:pathMatch(.*)/*', element: redirectTo('/') },
]

export const appRoutes: RouteObject[] = [
  { path: '/login', element: <AuthPage mode="login" /> },
  { path: '/signup', element: <AuthPage mode="signup" /> },
  { path: '/onboarding', element: <OnboardingPage /> },
  {
    path: '/',
    element: <ProtectedLayout />,
    children: workspaceRoutes,
  },
  { path: '*', element: redirectTo('/') },
]

export const router = createBrowserRouter(appRoutes, {
  basename: getRouterBasename(),
})
