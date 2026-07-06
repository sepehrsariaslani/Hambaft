import { useMemo, useState } from 'react'
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from '@dnd-kit/core'
import { CalendarDays, CalendarRange, Sun, ChevronLeft, ChevronRight } from 'lucide-react'

import CalendarSection, { type ScheduleItem } from './CalendarSection'
import type { Task, Transaction, Habit, MealLog, WorkoutLog, SleepLog, Occasion } from '../types'
import {
  getJalaliMonthName,
  getJalaliWeekdayName,
  gregorianDateForJalali,
  jalaliParts,
  toPersianDigits,
  JALALI_WEEKDAYS,
} from '../utils/jalali'
import { expandRecurringOccasions } from '../../app/occasion-utils'

type CalendarMode = 'day' | 'week' | 'month'

type Props = React.ComponentProps<typeof CalendarSection> & {
  occasions?: Occasion[]
}

function todayISO(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, (m || 1) - 1, d || 1)
  dt.setDate(dt.getDate() + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}

export default function CalendarViewSwitcher(props: Props) {
  const [mode, setMode] = useState<CalendarMode>('week')

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-[#E6DFD3] bg-[#FDFBF7] p-1">
          <ModeButton active={mode === 'day'} onClick={() => setMode('day')} icon={<Sun className="w-3.5 h-3.5" />} label="روز" />
          <ModeButton active={mode === 'week'} onClick={() => setMode('week')} icon={<CalendarRange className="w-3.5 h-3.5" />} label="هفته" />
          <ModeButton active={mode === 'month'} onClick={() => setMode('month')} icon={<CalendarDays className="w-3.5 h-3.5" />} label="ماه" />
        </div>
      </div>

      {mode === 'week' && <CalendarSection {...props} />}
      {mode === 'day' && <DayView {...props} />}
      {mode === 'month' && <MonthView {...props} />}
    </div>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
        active ? 'bg-[#2D3025] text-white' : 'text-[#3D3D3D] hover:bg-[#E8ECE0]/60'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

// ─── Day View ───────────────────────────────────────────────────────────────────

function DayView(props: Props) {
  const { scheduleItems, tasks, todayDate, onToggleScheduleItem, onToggleTask } = props
  const [current, setCurrent] = useState<string>(() => todayDate || todayISO())

  const dayEvents = useMemo(
    () => (scheduleItems || []).filter((item) => item.date === current || (!item.date && current === todayDate)),
    [scheduleItems, current, todayDate],
  )
  const dayTasks = useMemo(
    () => (tasks || []).filter((task) => task.dueDate === current),
    [tasks, current],
  )

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const parts = jalaliParts(current)

  return (
    <div className="rounded-2xl border border-[#E6DFD3] bg-[#FDFBF7] p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrent(addDays(current, -1))}
          className="p-1.5 rounded-lg hover:bg-[#E8ECE0]"
          aria-label="روز قبل"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="text-center">
          <h3 className="text-sm font-black text-[#2D3025]">
            {parts ? `${toPersianDigits(parts.day)} ${getJalaliMonthName(parts.month)} ${toPersianDigits(parts.year)}` : current}
          </h3>
          <p className="text-[10px] text-[#8D7F72] font-bold">{getJalaliWeekdayName(new Date(current).getDay())}</p>
        </div>
        <button
          onClick={() => setCurrent(addDays(current, 1))}
          className="p-1.5 rounded-lg hover:bg-[#E8ECE0]"
          aria-label="روز بعد"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-[48px_1fr] gap-1">
        {hours.map((hour) => {
          const hourEvents = dayEvents.filter((event) => {
            const time = event.time || '09:00'
            const eventHour = parseInt(time.split(':')[0], 10)
            return eventHour === hour
          })
          return (
            <>
              <div key={`h-${hour}`} className="text-[10px] text-[#8D7F72] font-mono text-left pt-1">
                {toPersianDigits(String(hour).padStart(2, '0'))}:۰۰
              </div>
              <div key={`c-${hour}`} className="min-h-[36px] border-t border-dashed border-[#E6DFD3] py-1 space-y-1">
                {hourEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onToggleScheduleItem(event.id)}
                    className={`w-full text-right text-[11px] font-bold px-2 py-1 rounded-lg ${
                      event.completed
                        ? 'bg-[#DDE2D5] text-[#8D7F72] line-through'
                        : 'bg-[#E8ECE0] text-[#2D3025] hover:bg-[#DDE2D5]'
                    }`}
                  >
                    <span className="font-mono text-[10px] text-[#7C8363] ms-1">{event.time}</span>
                    {event.title}
                  </button>
                ))}
              </div>
            </>
          )
        })}
      </div>

      {dayTasks.length > 0 && (
        <div className="mt-5 pt-4 border-t border-[#E6DFD3]">
          <p className="text-[10px] font-black text-[#8D7F72] mb-2">کارهای با مهلت امروز</p>
          <ul className="space-y-1.5">
            {dayTasks.map((task) => (
              <li key={task.id} className="flex items-center gap-2 text-[11px]">
                <button
                  onClick={() => onToggleTask(task.id)}
                  className={`w-3.5 h-3.5 rounded border ${
                    task.completed ? 'bg-[#7C8363] border-[#7C8363]' : 'bg-white border-[#8D7F72]'
                  }`}
                  aria-label="تیک"
                />
                <span className={task.completed ? 'text-[#8D7F72] line-through' : 'text-[#2D3025] font-bold'}>
                  {task.title}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Month View (with DnD) ────────────────────────────────────────────────────────────

type MonthCell = { iso: string; jDay: number; inMonth: boolean }

function buildMonthGrid(anchorIso: string): MonthCell[] {
  const parts = jalaliParts(anchorIso)
  if (!parts) return []
  const firstIso = gregorianDateForJalali(parts.year, parts.month, 1)
  if (!firstIso) return []
  const firstDate = new Date(firstIso + 'T00:00:00')
  // Persian week starts on Saturday; JS getDay() Sat=6.
  const shift = (firstDate.getDay() + 1) % 7
  const cells: MonthCell[] = []
  // Fill leading days from previous month.
  for (let i = shift - 1; i >= 0; i--) {
    const dt = new Date(firstDate)
    dt.setDate(firstDate.getDate() - (i + 1))
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
    const p = jalaliParts(iso)
    cells.push({ iso, jDay: p?.day || 0, inMonth: false })
  }
  // Fill current month days (max 31, actual will vary).
  for (let day = 1; day <= 31; day++) {
    const iso = gregorianDateForJalali(parts.year, parts.month, day)
    if (!iso) break
    const p = jalaliParts(iso)
    if (!p || p.month !== parts.month) break
    cells.push({ iso, jDay: day, inMonth: true })
  }
  // Pad to 42 cells (6 rows x 7 columns).
  while (cells.length < 42) {
    const last = cells[cells.length - 1]
    if (!last) break
    const lastDate = new Date(last.iso + 'T00:00:00')
    lastDate.setDate(lastDate.getDate() + 1)
    const iso = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}-${String(lastDate.getDate()).padStart(2, '0')}`
    const p = jalaliParts(iso)
    cells.push({ iso, jDay: p?.day || 0, inMonth: false })
  }
  return cells
}

function DraggableEvent({ item }: { item: ScheduleItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`text-[9px] font-bold px-1 py-0.5 rounded truncate cursor-grab ${
        item.completed ? 'bg-[#DDE2D5] text-[#8D7F72]' : 'bg-[#E8ECE0] text-[#2D3025]'
      } ${isDragging ? 'opacity-40' : ''}`}
      title={item.title}
    >
      {item.title}
    </div>
  )
}

function DroppableDay({
  cell,
  todayISOString,
  events,
  tasks,
  onSelectDay,
}: {
  cell: MonthCell
  todayISOString: string
  events: ScheduleItem[]
  tasks: Task[]
  onSelectDay: (iso: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `day::${cell.iso}` })
  const isToday = cell.iso === todayISOString
  return (
    <div
      ref={setNodeRef}
      onClick={() => onSelectDay(cell.iso)}
      className={`min-h-[76px] rounded-lg border p-1 text-right cursor-pointer transition-colors ${
        cell.inMonth ? 'bg-white' : 'bg-[#F9F6EE]/60'
      } ${
        isToday ? 'border-[#E26645] ring-2 ring-[#E26645]/20' : 'border-[#E6DFD3]'
      } ${isOver ? 'ring-2 ring-[#7C8363]/40' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] font-mono ${cell.inMonth ? 'text-[#2D3025] font-black' : 'text-[#8D7F72]'}`}>
          {toPersianDigits(cell.jDay)}
        </span>
        {(events.length > 0 || tasks.length > 0) && (
          <span className="text-[8px] font-mono text-[#7C8363]">
            {events.length > 0 && <span>{toPersianDigits(events.length)}♥</span>}
            {tasks.length > 0 && <span className="ms-0.5">{toPersianDigits(tasks.length)}✓</span>}
          </span>
        )}
      </div>
      <div className="space-y-0.5">
        {events.slice(0, 2).map((event) => (
          <DraggableEvent key={event.id} item={event} />
        ))}
        {events.length > 2 && (
          <div className="text-[8px] text-[#8D7F72]">+ {toPersianDigits(events.length - 2)}</div>
        )}
      </div>
    </div>
  )
}

function MonthView(props: Props) {
  const { scheduleItems, tasks, todayDate, occasions, onUpdateScheduleItem } = props
  const [anchor, setAnchor] = useState<string>(() => todayDate || todayISO())
  const parts = jalaliParts(anchor)

  const cells = useMemo(() => buildMonthGrid(anchor), [anchor])
  const currentYear = parts?.year ?? 1400

  const expandedOccasions = useMemo(() => {
    if (!occasions) return []
    return expandRecurringOccasions(occasions, currentYear - 1, currentYear + 1)
  }, [occasions, currentYear])

  const shiftMonth = (delta: number) => {
    if (!parts) return
    let m = parts.month + delta
    let y = parts.year
    while (m < 1) { m += 12; y -= 1 }
    while (m > 12) { m -= 12; y += 1 }
    const iso = gregorianDateForJalali(y, m, 1)
    if (iso) setAnchor(iso)
  }

  const onDragEnd = (event: DragEndEvent) => {
    const eventId = String(event.active.id)
    const overId = event.over?.id ? String(event.over.id) : null
    if (!overId || !overId.startsWith('day::')) return
    const targetDate = overId.replace('day::', '')
    const existing = scheduleItems.find((item) => item.id === eventId)
    if (!existing) return
    onUpdateScheduleItem(eventId, { date: targetDate })
  }

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>()
    for (const item of scheduleItems || []) {
      if (!item.date) continue
      if (!map.has(item.date)) map.set(item.date, [])
      map.get(item.date)!.push(item)
    }
    return map
  }, [scheduleItems])

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const task of tasks || []) {
      if (!task.dueDate) continue
      if (!map.has(task.dueDate)) map.set(task.dueDate, [])
      map.get(task.dueDate)!.push(task)
    }
    return map
  }, [tasks])

  const occasionsByDate = useMemo(() => {
    const map = new Map<string, Occasion[]>()
    for (const occ of expandedOccasions) {
      if (!occ.date) continue
      if (!map.has(occ.date)) map.set(occ.date, [])
      map.get(occ.date)!.push(occ)
    }
    return map
  }, [expandedOccasions])

  return (
    <div className="rounded-2xl border border-[#E6DFD3] bg-[#FDFBF7] p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => shiftMonth(-1)} className="p-1.5 rounded-lg hover:bg-[#E8ECE0]" aria-label="ماه قبل">
          <ChevronRight className="w-4 h-4" />
        </button>
        <h3 className="text-sm font-black text-[#2D3025]">
          {parts ? `${getJalaliMonthName(parts.month)} ${toPersianDigits(parts.year)}` : anchor}
        </h3>
        <button onClick={() => shiftMonth(1)} className="p-1.5 rounded-lg hover:bg-[#E8ECE0]" aria-label="ماه بعد">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {JALALI_WEEKDAYS.map((weekday) => (
          <div key={weekday} className="text-center text-[10px] font-black text-[#8D7F72] py-1">
            {weekday}
          </div>
        ))}
      </div>
      <DndContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => (
            <DroppableDay
              key={cell.iso}
              cell={cell}
              todayISOString={todayDate}
              events={eventsByDate.get(cell.iso) || []}
              tasks={tasksByDate.get(cell.iso) || []}
              onSelectDay={() => undefined}
            />
          ))}
        </div>
      </DndContext>

      {occasionsByDate.size > 0 && (
        <div className="mt-4 pt-3 border-t border-[#E6DFD3]">
          <p className="text-[10px] font-black text-[#8D7F72] mb-2">مناسبت‌های تکراری این ماه</p>
          <ul className="flex flex-wrap gap-1.5">
            {Array.from(occasionsByDate.entries()).slice(0, 8).map(([date, list]) => (
              <li key={date} className="text-[10px] px-2 py-1 rounded-lg bg-[#F9F6EE] border border-[#E6DFD3] text-[#3D3D3D]">
                {list.map((occ) => occ.title).slice(0, 1).join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
