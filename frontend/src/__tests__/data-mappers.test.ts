import { mapBackendTaskCategory, mapBackendTaskPriority, mapEventToScheduleItem, toTaskPayload } from '../app/hambaft-api'

describe('hambaft data mappers', () => {
  it('maps backend task enums to frontend task enums', () => {
    expect(mapBackendTaskPriority('بالا')).toBe('high')
    expect(mapBackendTaskCategory('مالی')).toBe('finance')
  })

  it('maps calendar events into schedule items', () => {
    expect(
      mapEventToScheduleItem({
        name: 'EVT-1',
        title: 'جلسه هفتگی',
        description: 'مرور کارها',
        starts_at: '2026-07-06 09:30:00',
        ends_at: '2026-07-06 11:00:00',
        event_type: 'جلسه',
      }),
    ).toMatchObject({
      id: 'EVT-1',
      title: 'جلسه هفتگی',
      time: '09:30',
      date: '2026-07-06',
      category: 'purple',
    })
  })

  it('serializes task updates to frappe task payloads', () => {
    expect(
      toTaskPayload({
        id: 'TASK-1',
        title: 'پرداخت قبض',
        completed: true,
        createdAt: '2026-07-06',
        priority: 'high',
        category: 'finance',
      }),
    ).toMatchObject({
      title: 'پرداخت قبض',
      status: 'انجام‌شده',
      priority: 'بالا',
      category: 'مالی',
    })
  })
})
