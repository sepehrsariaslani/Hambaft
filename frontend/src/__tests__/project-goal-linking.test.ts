import { describe, expect, it } from 'vitest'

import { moveProjectBetweenGoals, syncProjectTaskGoalIds } from '../legacy/project-goal-linking'
import type { Goal, Task } from '../legacy/types'

const baseTask: Task = {
  id: 'TASK-1',
  title: 'تسک پروژه',
  completed: false,
  createdAt: '2026-07-15',
  projectId: 'PROJ-1',
  goalId: 'GOAL-1',
}

const baseGoals: Goal[] = [
  {
    id: 'GOAL-1',
    title: 'هدف اول',
    description: '',
    category: 'career',
    targetDate: '2026-12-01',
    milestones: [],
    createdAt: '2026-07-15',
    completed: false,
    projects: [
      {
        id: 'PROJ-1',
        title: 'پروژه نمونه',
        completed: false,
        createdAt: '2026-07-15',
        linkedGoalId: 'GOAL-1',
        tasks: [baseTask],
      },
    ],
  },
  {
    id: 'GOAL-2',
    title: 'هدف دوم',
    description: '',
    category: 'personal',
    targetDate: '2026-12-20',
    milestones: [],
    createdAt: '2026-07-15',
    completed: false,
    projects: [],
  },
]

describe('project goal linking helpers', () => {
  it('moves a project into the target goal and rewrites project task goal ids', () => {
    const result = moveProjectBetweenGoals(baseGoals, {
      fromGoalId: 'GOAL-1',
      projectId: 'PROJ-1',
      toGoalId: 'GOAL-2',
    })

    expect(result.movedProject?.linkedGoalId).toBe('GOAL-2')
    expect(result.goals[0].projects).toHaveLength(0)
    expect(result.goals[1].projects).toHaveLength(1)
    expect(result.goals[1].projects?.[0].tasks[0].goalId).toBe('GOAL-2')
  })

  it('rewrites global task goal ids only for tasks under the moved project', () => {
    const updated = syncProjectTaskGoalIds(
      [
        baseTask,
        {
          id: 'TASK-2',
          title: 'تسک دیگر',
          completed: false,
          createdAt: '2026-07-15',
          projectId: 'PROJ-2',
          goalId: 'GOAL-9',
        },
      ],
      'PROJ-1',
      'GOAL-2',
    )

    expect(updated[0].goalId).toBe('GOAL-2')
    expect(updated[1].goalId).toBe('GOAL-9')
  })
})
