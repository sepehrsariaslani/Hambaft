import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import GoalProjectSummaryCard from '../legacy/components/GoalProjectSummaryCard'
import type { Goal, Project } from '../legacy/types'

const project: Project = {
  id: 'PROJ-1',
  title: 'پروژه طراحی',
  description: 'پیاده‌سازی نمای پروژه',
  completed: false,
  createdAt: '2026-07-15',
  linkedGoalId: 'GOAL-1',
  priority: 'high',
  status: 'in_progress',
  estimatedHours: 12,
  actualMinutes: 180,
  tasks: [
    { id: 'TASK-1', title: 'تسک داخلی', completed: false, createdAt: '2026-07-15' },
    { id: 'TASK-2', title: 'تسک دوم', completed: true, createdAt: '2026-07-15' },
  ],
}

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
    title: 'هدف رشد',
    description: '',
    category: 'personal',
    targetDate: '2026-12-01',
    milestones: [],
    createdAt: '2026-07-15',
    completed: false,
  },
]

describe('GoalProjectSummaryCard', () => {
  it('opens the project detail and keeps task internals out of the goal summary card', async () => {
    const onSelectProject = vi.fn()

    render(
      <GoalProjectSummaryCard
        goalId="GOAL-1"
        project={project}
        goals={goals}
        onSelectProject={onSelectProject}
        onMoveProjectToGoal={vi.fn()}
        onDeleteProject={vi.fn()}
      />,
    )

    expect(screen.getByText('پروژه طراحی')).toBeInTheDocument()
    expect(screen.queryByText('تسک داخلی')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'ورود به پروژه' }))
    expect(onSelectProject).toHaveBeenCalledWith('PROJ-1')
  })

  it('moves the project to another goal from the summary card', async () => {
    const onMoveProjectToGoal = vi.fn()

    render(
      <GoalProjectSummaryCard
        goalId="GOAL-1"
        project={project}
        goals={goals}
        onSelectProject={vi.fn()}
        onMoveProjectToGoal={onMoveProjectToGoal}
        onDeleteProject={vi.fn()}
      />,
    )

    await userEvent.selectOptions(screen.getByLabelText('انتقال پروژه به هدف'), 'GOAL-2')

    expect(onMoveProjectToGoal).toHaveBeenCalledWith('GOAL-1', 'PROJ-1', 'GOAL-2')
  })
})
