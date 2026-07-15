import type { Goal, Project, Task } from './types'

interface MoveProjectArgs {
  fromGoalId: string
  projectId: string
  toGoalId: string
}

interface MoveProjectResult {
  goals: Goal[]
  movedProject: Project | null
}

export function syncProjectTaskGoalIds(tasks: Task[], projectId: string, goalId: string): Task[] {
  return tasks.map((task) => (
    task.projectId === projectId
      ? { ...task, goalId }
      : task
  ))
}

export function moveProjectBetweenGoals(goals: Goal[], args: MoveProjectArgs): MoveProjectResult {
  const { fromGoalId, projectId, toGoalId } = args

  if (fromGoalId === toGoalId) {
    return { goals, movedProject: null }
  }

  const fromGoal = goals.find((goal) => goal.id === fromGoalId)
  const toGoal = goals.find((goal) => goal.id === toGoalId)

  if (!fromGoal || !toGoal) {
    return { goals, movedProject: null }
  }

  const project = (fromGoal.projects || []).find((item) => item.id === projectId)
  if (!project) {
    return { goals, movedProject: null }
  }

  const movedProject: Project = {
    ...project,
    linkedGoalId: toGoalId,
    tasks: (project.tasks || []).map((task) => ({
      ...task,
      projectId: project.id,
      goalId: toGoalId,
    })),
  }

  const updatedGoals = goals.map((goal) => {
    if (goal.id === fromGoalId) {
      return {
        ...goal,
        projects: (goal.projects || []).filter((item) => item.id !== projectId),
      }
    }

    if (goal.id === toGoalId) {
      return {
        ...goal,
        projects: [...(goal.projects || []).filter((item) => item.id !== projectId), movedProject],
      }
    }

    return goal
  })

  return { goals: updatedGoals, movedProject }
}
