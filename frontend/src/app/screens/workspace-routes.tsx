import type { RouteObject } from 'react-router-dom'

import { HambaftWorkspace } from './HambaftWorkspace'

export type WorkspaceTab =
  | 'dashboard'
  | 'coach'
  | 'contacts'
  | 'journal'
  | 'tasks'
  | 'mood'
  | 'inbox'
  | 'calendar'
  | 'occasions'
  | 'balance_report'
  | 'sleep'
  | 'mindfulness'
  | 'habits'
  | 'nutrition'
  | 'fitness'
  | 'goals'
  | 'projects'
  | 'finance'
  | 'documents'
  | 'profile'
  | 'task-detail'
  | 'areas'
  | 'notes'

type WorkspaceRouteConfig = {
  path: string
  tab: WorkspaceTab
}

export const workspaceRouteConfigs: WorkspaceRouteConfig[] = [
  { path: '', tab: 'dashboard' },
  { path: 'coach', tab: 'coach' },
  { path: 'contacts', tab: 'contacts' },
  { path: 'journal', tab: 'journal' },
  { path: 'tasks', tab: 'tasks' },
  { path: 'mood', tab: 'mood' },
  { path: 'inbox', tab: 'inbox' },
  { path: 'calendar', tab: 'calendar' },
  { path: 'occasions', tab: 'occasions' },
  { path: 'balance-report', tab: 'balance_report' },
  { path: 'sleep', tab: 'sleep' },
  { path: 'mindfulness', tab: 'mindfulness' },
  { path: 'habits', tab: 'habits' },
  { path: 'nutrition', tab: 'nutrition' },
  { path: 'fitness', tab: 'fitness' },
  { path: 'goals', tab: 'goals' },
  { path: 'goals/:goalId', tab: 'goals' },
  { path: 'projects', tab: 'projects' },
  { path: 'projects/:projectId', tab: 'projects' },
  { path: 'finance', tab: 'finance' },
  { path: 'documents', tab: 'documents' },
  { path: 'profile', tab: 'profile' },
  { path: 'task/:taskId', tab: 'task-detail' },
  { path: 'areas', tab: 'areas' },
  { path: 'notes', tab: 'notes' },
]

export function buildWorkspaceRoutes(): RouteObject[] {
  return workspaceRouteConfigs.map((config) => ({
    ...(config.path ? { path: config.path } : { index: true }),
    element: <HambaftWorkspace initialTab={config.tab} />,
  }))
}
