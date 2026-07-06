import { describe, expect, it } from 'vitest'

import { workspaceRouteConfigs } from '../app/screens/workspace-routes'

describe('workspaceRouteConfigs', () => {
  it('maps each public path to an explicit workspace tab', () => {
    expect(workspaceRouteConfigs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: '', tab: 'dashboard' }),
        expect.objectContaining({ path: 'coach', tab: 'coach' }),
        expect.objectContaining({ path: 'contacts', tab: 'contacts' }),
        expect.objectContaining({ path: 'journal', tab: 'journal' }),
        expect.objectContaining({ path: 'calendar', tab: 'calendar' }),
        expect.objectContaining({ path: 'goals', tab: 'goals' }),
        expect.objectContaining({ path: 'goals/:goalId', tab: 'goals' }),
        expect.objectContaining({ path: 'projects', tab: 'projects' }),
        expect.objectContaining({ path: 'projects/:projectId', tab: 'projects' }),
        expect.objectContaining({ path: 'finance', tab: 'finance' }),
        expect.objectContaining({ path: 'documents', tab: 'documents' }),
        expect.objectContaining({ path: 'profile', tab: 'profile' }),
      ]),
    )
  })
})
