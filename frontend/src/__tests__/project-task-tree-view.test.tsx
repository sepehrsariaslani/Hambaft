import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import ProjectTaskTreeView from '../legacy/components/ProjectTaskTreeView'

describe('ProjectTaskTreeView', () => {
  it('separates full-page navigation from explicit drawer opening', async () => {
    const onViewTaskDetails = vi.fn()
    const onOpenTaskDrawer = vi.fn()

    render(
      <ProjectTaskTreeView
        tasks={[
          {
            id: 'TASK-PROJECT-1',
            title: 'تسک پروژه',
            completed: false,
            createdAt: '2026-07-11',
            status: 'today',
          },
        ]}
        onToggleTask={vi.fn()}
        onDeleteTask={vi.fn()}
        onUpdateTask={vi.fn()}
        onAddTask={vi.fn()}
        onViewTaskDetails={onViewTaskDetails}
        onOpenTaskDrawer={onOpenTaskDrawer}
      />,
    )

    await userEvent.click(screen.getByText('تسک پروژه'))
    expect(onViewTaskDetails).toHaveBeenCalledWith('TASK-PROJECT-1')

    await userEvent.hover(screen.getByText('تسک پروژه'))
    await userEvent.click(screen.getByTitle('باز کردن در پنل'))
    expect(onOpenTaskDrawer).toHaveBeenCalledWith('TASK-PROJECT-1')
  })
})
