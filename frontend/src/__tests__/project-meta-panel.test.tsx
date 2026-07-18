import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import ProjectMetaPanel from '../legacy/components/ProjectMetaPanel'
import type { Goal } from '../legacy/types'

const goals: Goal[] = [
  {
    id: 'GOAL-1',
    title: 'هدف محصول',
    description: '',
    category: 'career',
    targetDate: '2026-12-01',
    milestones: [],
    createdAt: '2026-07-15',
    completed: false,
  },
  {
    id: 'GOAL-2',
    title: 'هدف شخصی',
    description: '',
    category: 'personal',
    targetDate: '2026-12-20',
    milestones: [],
    createdAt: '2026-07-15',
    completed: false,
  },
]

describe('ProjectMetaPanel', () => {
  it('shows task-detail-style metadata and lets the user change the linked goal', async () => {
    const onMoveProjectToGoal = vi.fn()

    render(
      <ProjectMetaPanel
        project={{
          id: 'PROJ-1',
          title: 'پروژه داشبورد',
          completed: false,
          createdAt: '2026-07-15',
          goalId: 'GOAL-1',
          goalTitle: 'هدف محصول',
          goalCategory: 'career',
          status: 'in_progress',
          priority: 'high',
          estimatedHours: 8,
          actualMinutes: 135,
          startDate: '2026-07-16',
          targetDate: '2026-08-01',
          tasks: [],
        }}
        goals={goals}
        onMoveProjectToGoal={onMoveProjectToGoal}
        onOpenGoal={vi.fn()}
      />,
    )

    expect(screen.getByText('وضعیت')).toBeInTheDocument()
    expect(screen.getByText('زمان صرف‌شده')).toBeInTheDocument()
    expect(screen.getByText('هدف')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('تغییر هدف پروژه'), 'GOAL-2')

    expect(onMoveProjectToGoal).toHaveBeenCalledWith('GOAL-1', 'PROJ-1', 'GOAL-2')
  })
})
