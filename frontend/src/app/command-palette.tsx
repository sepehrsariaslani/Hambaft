import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Command } from 'cmdk'

import { dispatchAction, navigateTo } from './navigation-bus'

type CommandItem = {
  id: string
  label: string
  hint?: string
  keywords?: string
  section: 'navigation' | 'create' | 'system'
  onSelect: () => void
}

type CommandPaletteContextValue = {
  open: () => void
  close: () => void
  toggle: () => void
}

const noop = () => {}
const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  open: noop,
  close: noop,
  toggle: noop,
})

export function useCommandPalette() {
  return useContext(CommandPaletteContext)
}

const PALETTE_ITEMS: Omit<CommandItem, 'onSelect'>[] = [
  { id: 'go-dashboard', label: 'داشبورد خانه', keywords: 'home overview', section: 'navigation' },
  { id: 'go-journal', label: 'کارها و ژورنال روزانه', keywords: 'tasks journal', section: 'navigation' },
  { id: 'go-calendar', label: 'تقویم توازن زندگی', keywords: 'calendar schedule', section: 'navigation' },
  { id: 'go-inbox', label: 'جعبه ورودی (Inbox)', keywords: 'inbox triage', section: 'navigation' },
  { id: 'go-goals', label: 'اهداف بلندمدت', keywords: 'goals okr', section: 'navigation' },
  { id: 'go-projects', label: 'مدیریت پروژه‌ها', keywords: 'projects kanban', section: 'navigation' },
  { id: 'go-finance', label: 'امور مالی و مخارج', keywords: 'finance money', section: 'navigation' },
  { id: 'go-habits', label: 'عادت‌های طلایی', keywords: 'habits streak', section: 'navigation' },
  { id: 'go-contacts', label: 'مخاطبان (CRM)', keywords: 'contacts crm', section: 'navigation' },
  { id: 'go-documents', label: 'مدیریت اسناد', keywords: 'documents', section: 'navigation' },
  { id: 'go-occasions', label: 'تقویم مناسبت‌ها', keywords: 'occasions', section: 'navigation' },
  { id: 'go-notes', label: 'دفترچه یادداشت‌ها', keywords: 'notes notion', section: 'navigation' },
  { id: 'go-sleep', label: 'ریتم خواب', keywords: 'sleep biorhythm', section: 'navigation' },
  { id: 'go-mindfulness', label: 'ذهن‌آگاهی', keywords: 'mindfulness meditation', section: 'navigation' },
  { id: 'go-nutrition', label: 'تغذیه و رژیم', keywords: 'nutrition diet', section: 'navigation' },
  { id: 'go-fitness', label: 'ورزش و باشگاه', keywords: 'fitness gym', section: 'navigation' },
  { id: 'go-mood', label: 'وضعیت روحی', keywords: 'mood energy', section: 'navigation' },
  { id: 'go-balance', label: 'گزارش توازن زندگی', keywords: 'balance report', section: 'navigation' },
  { id: 'go-coach', label: 'کوچ هوشمند', keywords: 'ai coach gemini', section: 'navigation' },
  { id: 'create-task', label: 'کار جدید', hint: 'N', keywords: 'new task todo', section: 'create' },
  { id: 'create-goal', label: 'هدف جدید', keywords: 'new goal', section: 'create' },
  { id: 'create-event', label: 'رویداد تقویم جدید', keywords: 'new event schedule', section: 'create' },
  { id: 'create-transaction', label: 'تراکنش مالی جدید', keywords: 'new transaction expense', section: 'create' },
  { id: 'create-habit', label: 'عادت جدید', keywords: 'new habit', section: 'create' },
  { id: 'show-shortcuts', label: 'نمایش میانبرهای صفحه‌کلید', hint: '?', keywords: 'help shortcuts', section: 'system' },
]

const NAV_MAP: Record<string, string> = {
  'go-dashboard': '/',
  'go-journal': '/journal',
  'go-calendar': '/calendar',
  'go-inbox': '/inbox',
  'go-goals': '/goals',
  'go-projects': '/projects',
  'go-finance': '/finance',
  'go-habits': '/habits',
  'go-contacts': '/contacts',
  'go-documents': '/documents',
  'go-occasions': '/occasions',
  'go-notes': '/journal',
  'go-sleep': '/sleep',
  'go-mindfulness': '/mindfulness',
  'go-nutrition': '/nutrition',
  'go-fitness': '/fitness',
  'go-mood': '/mood',
  'go-balance': '/balance-report',
  'go-coach': '/coach',
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const value = useMemo<CommandPaletteContextValue>(
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen((prev) => !prev),
    }),
    [],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const isPalette = (event.key === 'k' || event.key === 'K') && (event.metaKey || event.ctrlKey)
      if (isPalette) {
        event.preventDefault()
        setOpen((prev) => !prev)
      } else if (event.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const runItem = useCallback((id: string) => {
    setOpen(false)
    if (NAV_MAP[id]) {
      navigateTo(NAV_MAP[id])
      return
    }
    switch (id) {
      case 'create-task':
        dispatchAction('quick-add', 'task')
        break
      case 'create-goal':
        dispatchAction('quick-add', 'goal')
        break
      case 'create-event':
        dispatchAction('quick-add', 'event')
        break
      case 'create-transaction':
        dispatchAction('quick-add', 'expense')
        break
      case 'create-habit':
        dispatchAction('quick-add', 'habit')
        break
      case 'show-shortcuts':
        dispatchAction('show-shortcuts')
        break
      default:
        break
    }
  }, [])

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/50 p-4 pt-24"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[#E6DFD3] bg-[#FDFBF7] shadow-2xl overflow-hidden"
            dir="rtl"
            onClick={(event) => event.stopPropagation()}
          >
            <Command loop label="جستجوی فرمان">
              <div className="px-4 py-3 border-b border-[#E6DFD3]">
                <Command.Input
                  autoFocus
                  placeholder="برو به… یا دستوری را تایپ کنید (Ctrl/Cmd+K)"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#8D7F72] text-right"
                />
              </div>
              <Command.List className="max-h-[380px] overflow-y-auto p-2 text-right">
                <Command.Empty className="p-6 text-center text-xs text-[#8D7F72]">
                  چیزی پیدا نشد
                </Command.Empty>
                <Command.Group heading="رفتن به">
                  {PALETTE_ITEMS.filter((item) => item.section === 'navigation').map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.keywords || ''}`}
                      onSelect={() => runItem(item.id)}
                      className="px-3 py-2 rounded-xl text-xs cursor-pointer data-[selected=true]:bg-[#E8ECE0] flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      {item.hint && <kbd className="text-[10px] font-mono text-[#8D7F72]">{item.hint}</kbd>}
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading="ایجادِ…">
                  {PALETTE_ITEMS.filter((item) => item.section === 'create').map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.keywords || ''}`}
                      onSelect={() => runItem(item.id)}
                      className="px-3 py-2 rounded-xl text-xs cursor-pointer data-[selected=true]:bg-[#E8ECE0] flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      {item.hint && <kbd className="text-[10px] font-mono text-[#8D7F72]">{item.hint}</kbd>}
                    </Command.Item>
                  ))}
                </Command.Group>
                <Command.Group heading="سیستم">
                  {PALETTE_ITEMS.filter((item) => item.section === 'system').map((item) => (
                    <Command.Item
                      key={item.id}
                      value={`${item.label} ${item.keywords || ''}`}
                      onSelect={() => runItem(item.id)}
                      className="px-3 py-2 rounded-xl text-xs cursor-pointer data-[selected=true]:bg-[#E8ECE0] flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      {item.hint && <kbd className="text-[10px] font-mono text-[#8D7F72]">{item.hint}</kbd>}
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </CommandPaletteContext.Provider>
  )
}
