import type { Task } from '../legacy/types'

/**
 * Given a task and a lookup index of all tasks by id, returns the titles of
 * dependencies that are not yet completed (i.e. the tasks that are blocking
 * the given task from being started).
 * 
 * Dependencies are stored in `blockedBy` (array of task IDs) which maps to
 * `blocked_by_json` on the backend.
 */
export function findBlockingTaskTitles(task: Task, allTasksById: Map<string, Task>): string[] {
  if (!task.blockedBy || task.blockedBy.length === 0) return []
  const blocking: string[] = []
  for (const depId of task.blockedBy) {
    const dep = allTasksById.get(depId)
    if (dep && !dep.completed) blocking.push(dep.title)
  }
  return blocking
}

export function buildTaskIndex(tasks: Task[]): Map<string, Task> {
  const index = new Map<string, Task>()
  for (const task of tasks) {
    index.set(task.id, task)
  }
  return index
}
