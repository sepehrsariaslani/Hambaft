import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import TaskManagerSection from '../legacy/components/TaskManagerSection'
import PlannerSection from '../legacy/components/PlannerSection'

const quickAddTaskMock = vi.fn()
const updateTaskRecordMock = vi.fn()
const deleteTaskRecordMock = vi.fn()
const getPlannerInboxMock = vi.fn()
const getPlannerTodayMock = vi.fn()

vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: () => {
      const Component = ({ children, ...props }: any) => <div {...props}>{children}</div>
      return Component
    },
  }),
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

vi.mock('../legacy/components/ViewSwitcher', () => ({
  default: () => <div data-testid="view-switcher" />,
}))

vi.mock('../legacy/components/ColumnConfigurator', () => ({
  ColumnConfigurator: () => <div data-testid="column-configurator" />,
}))

vi.mock('../legacy/components/DensityToggle', () => ({
  DensityToggle: () => <div data-testid="density-toggle" />,
}))

vi.mock('../legacy/components/QuickAddBar', () => ({
  default: ({ onSubmit }: any) => (
    <button
      type="button"
      onClick={() =>
        onSubmit({
          title: 'تسک تستی',
          status: 'today',
          priority: 'high',
          importance: 'key',
          projectId: 'PROJ-1',
          areaId: 'AREA-1',
          goalId: 'GOAL-1',
          scheduledDate: '2026-07-11',
          dueDate: '2026-07-12',
        })
      }
    >
      quick-add
    </button>
  ),
}))

vi.mock('../legacy/components/TaskRowV2', () => ({
  default: ({ task, onView, onOpenDrawer }: any) => (
    <div>
      <button type="button" onClick={onView}>
        {task.title}
      </button>
      <button type="button" onClick={onOpenDrawer}>
        {`open-drawer-${task.id}`}
      </button>
    </div>
  ),
}))

vi.mock('../legacy/components/TaskDetailDrawer', () => ({
  default: ({ task, onUpdateTask }: any) => (
    <button
      type="button"
      onClick={() => onUpdateTask({ ...task, title: `${task.title} ویرایش‌شده` })}
    >
      persist-drawer-update
    </button>
  ),
}))

vi.mock('../../src/app/hambaft-api', async () => {
  const actual = await vi.importActual('../../src/app/hambaft-api')
  return {
    ...actual,
    quickAddTask: (...args: any[]) => quickAddTaskMock(...args),
    updateTaskRecord: (...args: any[]) => updateTaskRecordMock(...args),
    deleteTaskRecord: (...args: any[]) => deleteTaskRecordMock(...args),
    getPlannerInbox: (...args: any[]) => getPlannerInboxMock(...args),
    getPlannerToday: (...args: any[]) => getPlannerTodayMock(...args),
    getPlannerNext: vi.fn().mockResolvedValue({ data: { tasks: [] } }),
    getPlannerScheduled: vi.fn().mockResolvedValue({ data: { tasks: [] } }),
    getPlannerSomeday: vi.fn().mockResolvedValue({ data: { tasks: [] } }),
    getPlannerDailyTimeline: vi.fn().mockResolvedValue({ data: {} }),
    getPlannerWeek: vi.fn().mockResolvedValue({ data: {} }),
    getPlannerMonth: vi.fn().mockResolvedValue({ data: {} }),
    getTasksGroupedByStatus: vi.fn().mockResolvedValue({ data: { groups: {} } }),
    getAreasWithSummaries: vi.fn().mockResolvedValue({ data: { areas: [] } }),
    updateTaskImportance: vi.fn().mockResolvedValue({}),
    resolveBlockedTasks: vi.fn().mockResolvedValue({ data: { resolvable_tasks: [] } }),
    getOverdueTasks: vi.fn().mockResolvedValue({ data: { tasks: [] } }),
    getKeyTasks: vi.fn().mockResolvedValue({ data: { tasks: [] } }),
    getMilestoneTasks: vi.fn().mockResolvedValue({ data: { tasks: [] } }),
    getUnscheduledTasks: vi.fn().mockResolvedValue({ data: { tasks: [] } }),
    getBlockedTasksView: vi.fn().mockResolvedValue({ data: { tasks: [] } }),
    getHighImpactTasks: vi.fn().mockResolvedValue({ data: { tasks: [] } }),
    startTaskSession: vi.fn().mockResolvedValue({}),
    stopTaskSession: vi.fn().mockResolvedValue({}),
    getActiveTaskSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  }
})

describe('task persistence wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses persisted quick-add payload in TaskManagerSection instead of falling back to a local-only title', async () => {
    quickAddTaskMock.mockResolvedValue({
      data: {
        task: {
          name: 'TASK-001',
          title: 'تسک تستی',
          status: 'today',
          priority: 'بالا',
          category: 'شخصی',
          importance: 'کلیدی',
          project: 'PROJ-1',
          area: 'AREA-1',
          goal: 'GOAL-1',
          scheduled_date: '2026-07-11',
          due_date: '2026-07-12 09:00:00',
          creation: '2026-07-11 10:00:00',
        },
      },
    })

    const onAddTask = vi.fn()

    render(
      <TaskManagerSection
        tasks={[]}
        goals={[]}
        areas={[]}
        onToggleTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onAddTask={onAddTask}
        todayDate="2026-07-11"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'quick-add' }))

    await waitFor(() => {
      expect(quickAddTaskMock).toHaveBeenCalledWith('تسک تستی', {
        project: 'PROJ-1',
        area: 'AREA-1',
        goal: 'GOAL-1',
        importance: 'key',
        status: 'today',
        priority: 'high',
        scheduledDate: '2026-07-11',
        dueDate: '2026-07-12',
        context: 'task_manager',
      })
    })

    expect(onAddTask).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'TASK-001',
        title: 'تسک تستی',
        status: 'today',
        priority: 'high',
        projectId: 'PROJ-1',
        areaId: 'AREA-1',
        goalId: 'GOAL-1',
      }),
    )
  })

  it('persists planner drawer edits through updateTaskRecord before refetching the bucket', async () => {
    getPlannerTodayMock.mockResolvedValue({
      data: {
        tasks: [
          {
            name: 'TASK-002',
            title: 'تسک پلنر',
            status: 'today',
            priority: 'متوسط',
            category: 'شخصی',
            creation: '2026-07-11 08:00:00',
          },
        ],
      },
    })
    updateTaskRecordMock.mockResolvedValue({ data: { task: { name: 'TASK-002' } } })

    render(<PlannerSection initialView="buckets" />)

    await userEvent.click(await screen.findByRole('button', { name: 'تسک پلنر' }))
    await userEvent.click(screen.getByRole('button', { name: 'persist-drawer-update' }))

    await waitFor(() => {
      expect(updateTaskRecordMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'TASK-002',
          title: 'تسک پلنر ویرایش‌شده',
        }),
      )
    })
  })

  it('opens the task drawer from an initial deep-link id without crashing render order', async () => {
    render(
      <TaskManagerSection
        tasks={[
          {
            id: 'TASK-INIT-1',
            title: 'تسک دیپ‌لینک',
            completed: false,
            createdAt: '2026-07-11',
            status: 'today',
          },
        ]}
        goals={[]}
        areas={[]}
        onToggleTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onAddTask={vi.fn()}
        todayDate="2026-07-11"
        initialDrawerTaskId="TASK-INIT-1"
      />,
    )

    expect(await screen.findByRole('button', { name: 'persist-drawer-update' })).toBeInTheDocument()
  })

  it('navigates on task title click and opens drawer only from the explicit drawer action', async () => {
    const onViewTaskDetails = vi.fn()

    render(
      <TaskManagerSection
        tasks={[
          {
            id: 'TASK-ROUTE-1',
            title: 'تسک مسیر',
            completed: false,
            createdAt: '2026-07-11',
            status: 'today',
          },
        ]}
        goals={[]}
        areas={[]}
        onToggleTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onAddTask={vi.fn()}
        todayDate="2026-07-11"
        onViewTaskDetails={onViewTaskDetails}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'تسک مسیر' }))
    expect(onViewTaskDetails).toHaveBeenCalledWith('TASK-ROUTE-1')
    expect(screen.queryByRole('button', { name: 'persist-drawer-update' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'open-drawer-TASK-ROUTE-1' }))
    expect(await screen.findByRole('button', { name: 'persist-drawer-update' })).toBeInTheDocument()
  })
})
