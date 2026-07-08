import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { appRoutes, getRouterBasename, workspaceRoutes } from '../app/router'

describe('appRoutes', () => {
  it('exposes the top-level hambaft routes', () => {
    const paths = workspaceRoutes.map((route) => `/${route.path ?? ''}`.replace(/\/$/, '') || '/')

    expect(paths).toEqual(
      expect.arrayContaining([
        '/',
        '/coach',
        '/contacts',
        '/journal',
        '/calendar',
        '/occasions',
        '/balance-report',
        '/sleep',
        '/mindfulness',
        '/habits',
        '/nutrition',
        '/fitness',
        '/goals',
        '/goals/:goalId',
        '/projects',
        '/projects/:projectId',
        '/finance',
        '/documents',
        '/profile',
        '/settings/security',
      ]),
    )
  })

  it('renders route elements inside a router context', () => {
    const route = appRoutes.find((item) => item.path === '/login')

    expect(route?.element).toBeTruthy()

    render(<MemoryRouter initialEntries={['/login']}>{route?.element}</MemoryRouter>)

    expect(screen.getByText('ورود به هم‌بافت')).toBeInTheDocument()
  })

  it('uses root basename when the app is served from site homepage', () => {
    expect(getRouterBasename('/', false)).toBe('/')
  })

  it('uses /hambaft basename when the app is served from the hambaft route', () => {
    expect(getRouterBasename('/hambaft/profile', false)).toBe('/hambaft')
  })

  it('provides a hydrate fallback on the protected root route', () => {
    const protectedRoute = appRoutes.find((item) => item.path === '/')

    expect(protectedRoute?.hydrateFallbackElement).toBeTruthy()
  })
})
