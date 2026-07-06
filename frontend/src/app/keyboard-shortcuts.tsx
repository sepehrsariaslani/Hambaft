import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { dispatchAction, navigateTo, subscribeAction } from './navigation-bus'

type Shortcut = { keys: string; label: string }

const SHORTCUTS: Shortcut[] = [
  { keys: 'Ctrl/Cmd + K', label: 'پالت فرمان' },
  { keys: 'N', label: 'کار جدید' },
  { keys: 'G', label: 'هدف جدید' },
  { keys: 'E', label: 'رویداد تقویم جدید' },
  { keys: '$', label: 'تراکنش مالی جدید' },
  { keys: 'H', label: 'عادت جدید' },
  { keys: 'T', label: 'تاگل تایمر تسک جاری' },
  { keys: 'Space', label: 'تیک / لغو تسک مرورشده' },
  { keys: '?', label: 'نمایش این راهنما' },
  { keys: 'G then D', label: 'داشبورد' },
  { keys: 'G then J', label: 'کارها' },
  { keys: 'G then C', label: 'تقویم' },
  { keys: 'G then I', label: 'جعبه ورودی' },
]

type Ctx = { open: () => void }
const KeyboardShortcutsContext = createContext<Ctx>({ open: () => undefined })

export function useKeyboardShortcuts() {
  return useContext(KeyboardShortcutsContext)
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [helpOpen, setHelpOpen] = useState(false)

  const value = useMemo<Ctx>(() => ({ open: () => setHelpOpen(true) }), [])

  useEffect(() => {
    return subscribeAction((action) => {
      if (action === 'show-shortcuts') setHelpOpen(true)
    })
  }, [])

  useEffect(() => {
    let pendingG = false
    let pendingGTimer: ReturnType<typeof setTimeout> | null = null

    const clearPending = () => {
      pendingG = false
      if (pendingGTimer) {
        clearTimeout(pendingGTimer)
        pendingGTimer = null
      }
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isEditableTarget(event.target)) return

      // "G then X" jump-to sequences.
      if (pendingG) {
        const map: Record<string, string> = {
          d: '/',
          j: '/journal',
          c: '/calendar',
          i: '/inbox',
          g: '/goals',
          p: '/projects',
          f: '/finance',
          h: '/habits',
        }
        const path = map[event.key.toLowerCase()]
        if (path) {
          event.preventDefault()
          navigateTo(path)
        }
        clearPending()
        return
      }

      switch (event.key) {
        case '?':
          event.preventDefault()
          setHelpOpen(true)
          break
        case 'n':
        case 'N':
          event.preventDefault()
          dispatchAction('quick-add', 'task')
          break
        case 'g':
        case 'G':
          // Enter "G then X" sequence mode.
          pendingG = true
          pendingGTimer = setTimeout(clearPending, 1200)
          break
        case 'e':
        case 'E':
          event.preventDefault()
          dispatchAction('quick-add', 'event')
          break
        case 'h':
        case 'H':
          event.preventDefault()
          dispatchAction('quick-add', 'habit')
          break
        case '$':
          event.preventDefault()
          dispatchAction('quick-add', 'expense')
          break
        case 't':
        case 'T':
          event.preventDefault()
          dispatchAction('toggle-timer')
          break
        case ' ':
          if (document.activeElement instanceof HTMLElement && document.activeElement.dataset?.hambaftTaskId) {
            event.preventDefault()
            dispatchAction('toggle-task', document.activeElement.dataset.hambaftTaskId)
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      clearPending()
    }
  }, [])

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
      {helpOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setHelpOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#E6DFD3] bg-[#FDFBF7] shadow-2xl p-5"
            dir="rtl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E6DFD3] pb-3 mb-3">
              <h3 className="text-sm font-black text-[#2D3025]">میانبرهای صفحه‌کلید</h3>
              <button
                onClick={() => setHelpOpen(false)}
                className="text-[#8D7F72] text-lg leading-none"
              >
                ×
              </button>
            </div>
            <ul className="space-y-2">
              {SHORTCUTS.map((shortcut) => (
                <li
                  key={shortcut.keys}
                  className="flex items-center justify-between text-xs text-[#3D3D3D]"
                >
                  <span>{shortcut.label}</span>
                  <kbd className="px-2 py-1 rounded-md bg-[#E8ECE0] text-[10px] font-mono text-[#2D3025]">
                    {shortcut.keys}
                  </kbd>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[10px] text-[#8D7F72]">
              همه ی دستورات را می‌توانید از پالت فرمان (Ctrl/Cmd+K) هم دسترسی کنید.
            </p>
          </div>
        </div>
      )}
    </KeyboardShortcutsContext.Provider>
  )
}
