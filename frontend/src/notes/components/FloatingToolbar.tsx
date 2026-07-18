import { useEffect, useRef, useState } from 'react'
import { Bold, Italic, Underline, Strikethrough, Code, Link, Type, Palette } from 'lucide-react'

interface FloatingToolbarProps {
  onFormat: (command: string, value?: string) => void
}

export default function FloatingToolbar({ onFormat }: FloatingToolbarProps) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setShow(false)
        return
      }
      const range = sel.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      if (rect.width === 0) {
        setShow(false)
        return
      }
      setPos({ x: rect.left + rect.width / 2, y: rect.top - 48 })
      setShow(true)
    }
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [])

  if (!show) return null

  const btnClass = "p-1.5 rounded-md hover:bg-[#E8ECE0] dark:hover:bg-[#2D3025] text-[#3D3D3D] dark:text-[#D6CFC3] transition-colors"

  return (
    <div
      ref={ref}
      className="fixed z-[100] bg-white dark:bg-[#1B1D16] border border-[#E6DFD3] dark:border-[#2D3025] rounded-xl shadow-xl px-2 py-1.5 flex items-center gap-0.5"
      style={{ left: pos.x, top: pos.y, transform: 'translateX(-50%)' }}
    >
      <button className={btnClass} onMouseDown={(e) => { e.preventDefault(); onFormat('bold') }} title="Bold">
        <Bold className="w-3.5 h-3.5" />
      </button>
      <button className={btnClass} onMouseDown={(e) => { e.preventDefault(); onFormat('italic') }} title="Italic">
        <Italic className="w-3.5 h-3.5" />
      </button>
      <button className={btnClass} onMouseDown={(e) => { e.preventDefault(); onFormat('underline') }} title="Underline">
        <Underline className="w-3.5 h-3.5" />
      </button>
      <button className={btnClass} onMouseDown={(e) => { e.preventDefault(); onFormat('strikeThrough') }} title="Strikethrough">
        <Strikethrough className="w-3.5 h-3.5" />
      </button>
      <button className={btnClass} onMouseDown={(e) => { e.preventDefault(); onFormat('removeFormat') }} title="Clear">
        <Type className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-[#E6DFD3] dark:bg-[#2D3025] mx-0.5" />
      <button className={btnClass} onMouseDown={(e) => { e.preventDefault(); onFormat('formatBlock', 'CODE') }} title="Inline Code">
        <Code className="w-3.5 h-3.5" />
      </button>
      <button className={btnClass} onMouseDown={(e) => { e.preventDefault(); const url = prompt('لینک را وارد کنید:'); if (url) onFormat('createLink', url) }} title="Link">
        <Link className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
