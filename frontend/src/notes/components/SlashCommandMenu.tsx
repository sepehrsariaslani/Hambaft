import { useState, useEffect, useRef, useMemo } from 'react'
import { SLASH_MENU_GROUPS, type BlockType } from '../types'

interface SlashCommandMenuProps {
  query: string
  onSelect: (type: BlockType) => void
  onClose: () => void
}

export default function SlashCommandMenu({ query, onSelect, onClose }: SlashCommandMenuProps) {
  const allItems = useMemo(() => SLASH_MENU_GROUPS.flatMap((g) => g.items), [])
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return allItems
    return allItems.filter((item) => item.label.includes(q) || item.shortcut.includes(q))
  }, [allItems, query])

  const [selectedIndex, setSelectedIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => (i + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = filtered[selectedIndex]
        if (item) onSelect(item.type)
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [filtered, selectedIndex, onSelect, onClose])

  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (filtered.length === 0) {
    return (
      <div className="absolute z-50 bg-white dark:bg-[#151713] border border-[#E6DFD3] dark:border-[#2D3025] rounded-xl shadow-xl p-3 w-64 text-[10px] text-[#8D7F72]">
        نتیجه‌ای یافت نشد
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="absolute z-50 bg-white dark:bg-[#151713] border border-[#E6DFD3] dark:border-[#2D3025] rounded-xl shadow-xl w-72 max-h-80 overflow-y-auto py-1.5"
      dir="rtl"
    >
      {SLASH_MENU_GROUPS.map((group) => {
        const groupItems = group.items.filter((item) => filtered.includes(item))
        if (groupItems.length === 0) return null
        return (
          <div key={group.label}>
            <div className="px-3 py-1 text-[9px] font-black text-[#8D7F72] dark:text-[#9D978B]">{group.label}</div>
            {groupItems.map((item) => {
              const idx = filtered.indexOf(item)
              const isSelected = idx === selectedIndex
              return (
                <button
                  key={item.type}
                  data-index={idx}
                  onClick={() => onSelect(item.type)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-right text-xs font-bold transition-colors ${
                    isSelected
                      ? 'bg-[#7C8363] text-white'
                      : 'text-[#3D3D3D] dark:text-[#D6CFC3] hover:bg-[#E8ECE0]/50 dark:hover:bg-[#1E2218]'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] shrink-0 ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-[#F9F6EE] dark:bg-[#1B1D16] text-[#7C8363]'
                  }`}>
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{item.label}</div>
                    <div className={`text-[9px] font-normal ${isSelected ? 'text-white/70' : 'text-[#8D7F72]'}`}>
                      {item.shortcut}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
