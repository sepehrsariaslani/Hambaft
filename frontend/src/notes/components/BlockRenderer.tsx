import { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'motion/react'
import { GripVertical, Plus, Trash2, ChevronDown, ChevronLeft, ImagePlus, Loader2 } from 'lucide-react'
import { uploadFile } from '../../app/frappe'
import type { Block } from '../types'

interface BlockRendererProps {
  block: Block
  index: number
  isFocused: boolean
  onFocus: () => void
  onChange: (content: Block['content']) => void
  onKeyDown: (e: React.KeyboardEvent) => void
  onAddBelow: () => void
  onDelete: () => void
  onTurnInto: (type: Block['type']) => void
  onMove: (dir: 'up' | 'down') => void
  onToggleCollapse?: () => void
  onUpdateBlock?: (patch: Partial<Block>) => void
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  isDragging?: boolean
  isDropTarget?: boolean
}

function renderInlineText(content: Block['content']) {
  if (!content || content.length === 0) return <br />
  return content.map((c, i) => {
    let el: React.ReactNode = c.text
    if (c.marks) {
      c.marks.forEach((m) => {
        if (m.type === 'bold') el = <strong key={m.type}>{el}</strong>
        if (m.type === 'italic') el = <em key={m.type}>{el}</em>
        if (m.type === 'underline') el = <u key={m.type}>{el}</u>
        if (m.type === 'strikethrough') el = <s key={m.type}>{el}</s>
        if (m.type === 'code') el = <code key={m.type} className="bg-[#E8ECE0] dark:bg-[#2D3025] px-1 py-0.5 rounded text-[10px] font-mono">{el}</code>
        if (m.type === 'link') el = <a key={m.type} href={m.attrs?.href} className="text-[#7C8363] underline" target="_blank" rel="noreferrer">{el}</a>
      })
    }
    return <span key={i}>{el}</span>
  })
}

function getPlaceholder(type: Block['type']): string {
  switch (type) {
    case 'heading_1': return 'تیتر ۱'
    case 'heading_2': return 'تیتر ۲'
    case 'heading_3': return 'تیتر ۳'
    case 'bullet_list': return 'مورد لیست'
    case 'numbered_list': return 'مورد لیست'
    case 'todo': return 'کار جدید'
    case 'quote': return 'نقل قول'
    case 'callout': return 'یادداشت مهم...'
    case 'code': return '// کد را اینجا بنویسید'
    default: return 'شروع به نوشتن کنید یا / را بزنید'
  }
}

export default function BlockRenderer({
  block, index, isFocused, onFocus, onChange, onKeyDown, onAddBelow, onDelete, onTurnInto, onMove, onToggleCollapse, onUpdateBlock,
  onDragStart, onDragOver, onDrop, onDragEnd, isDragging, isDropTarget,
}: BlockRendererProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showTypeMenu, setShowTypeMenu] = useState(false)

  useEffect(() => {
    if (isFocused && editorRef.current) {
      editorRef.current.focus()
    }
  }, [isFocused])

  useEffect(() => {
    const el = editorRef.current
    if (!el) return
    const text = block.content.map((c) => c.text).join('')
    if (el.innerText !== text) {
      el.innerHTML = text
    }
  }, [block.content])

  const handleInput = () => {
    const el = editorRef.current
    if (!el) return
    onChange([{ text: el.innerText }])
  }

  const blockTypeMenu = (
    <div className="absolute right-full top-0 mr-2 bg-white dark:bg-[#151713] border border-[#E6DFD3] dark:border-[#2D3025] rounded-xl shadow-lg p-1 w-44 z-50 flex flex-col gap-0.5">
      {[
        { type: 'paragraph' as const, label: 'متن' },
        { type: 'heading_1' as const, label: 'تیتر ۱' },
        { type: 'heading_2' as const, label: 'تیتر ۲' },
        { type: 'heading_3' as const, label: 'تیتر ۳' },
        { type: 'bullet_list' as const, label: 'لیست نشانه‌دار' },
        { type: 'numbered_list' as const, label: 'لیست شماره‌دار' },
        { type: 'todo' as const, label: 'لیست کار' },
        { type: 'quote' as const, label: 'نقل قول' },
        { type: 'callout' as const, label: 'کال‌اوت' },
        { type: 'code' as const, label: 'کد' },
        { type: 'divider' as const, label: 'جداکننده' },
      ].map((opt) => (
        <button
          key={opt.type}
          onClick={() => { onTurnInto(opt.type); setShowTypeMenu(false) }}
          className={`flex items-center gap-2 px-2 py-1.5 text-[11px] font-bold rounded-lg text-right w-full cursor-pointer transition-colors ${
            block.type === opt.type ? 'bg-[#7C8363] text-white' : 'hover:bg-[#E8ECE0]/50 dark:hover:bg-[#1E2218] text-[#3D3D3D] dark:text-[#D6CFC3]'
          }`}
        >
          <span className="text-[10px]">{opt.label}</span>
        </button>
      ))}
    </div>
  )

  const dragHandle = (
    <div
      className={`absolute right-full top-1/2 -translate-y-1/2 mr-1 flex items-center gap-0.5 transition-opacity ${isFocused || showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
    >
      <button
        onMouseDown={(e) => { /* prevent focus loss */ }}
        onClick={() => setShowMenu(!showMenu)}
        draggable
        onDragStart={onDragStart}
        className="p-1 text-[#8D7F72] hover:text-[#2D3025] dark:hover:text-[#E8ECE0] cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <button onClick={onAddBelow} className="p-1 text-[#8D7F72] hover:text-[#7C8363] cursor-pointer">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )

  const moreMenu = showMenu && (
    <div className="absolute right-full top-0 mr-8 bg-white dark:bg-[#151713] border border-[#E6DFD3] dark:border-[#2D3025] rounded-xl shadow-lg p-1 w-36 z-50 flex flex-col gap-0.5">
      <button onClick={() => { onMove('up'); setShowMenu(false) }} className="px-2 py-1.5 text-[10px] font-bold text-[#3D3D3D] dark:text-[#D6CFC3] hover:bg-[#E8ECE0]/50 rounded-lg text-right">↑ حرکت به بالا</button>
      <button onClick={() => { onMove('down'); setShowMenu(false) }} className="px-2 py-1.5 text-[10px] font-bold text-[#3D3D3D] dark:text-[#D6CFC3] hover:bg-[#E8ECE0]/50 rounded-lg text-right">↓ حرکت به پایین</button>
      <button onClick={() => { onTurnInto('paragraph'); setShowMenu(false) }} className="px-2 py-1.5 text-[10px] font-bold text-[#3D3D3D] dark:text-[#D6CFC3] hover:bg-[#E8ECE0]/50 rounded-lg text-right">تبدیل به متن</button>
      <div className="border-t border-[#E6DFD3]/50 my-0.5" />
      <button onClick={() => { onDelete(); setShowMenu(false) }} className="px-2 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 rounded-lg text-right flex items-center gap-1">
        <Trash2 className="w-3 h-3" /> حذف
      </button>
    </div>
  )

  const commonProps = {
    ref: editorRef,
    contentEditable: true,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onFocus: onFocus,
    onKeyDown: onKeyDown,
    dir: 'auto',
    className: 'outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#8D7F72] empty:before:cursor-text',
    'data-placeholder': getPlaceholder(block.type),
  }

  const renderBlock = () => {
    switch (block.type) {
      case 'heading_1':
        return <h1 {...commonProps} className={`${commonProps.className} text-xl md:text-2xl font-black text-[#2D3025] dark:text-[#E8ECE0] py-1`} />
      case 'heading_2':
        return <h2 {...commonProps} className={`${commonProps.className} text-base md:text-lg font-extrabold text-[#2D3025] dark:text-[#E8ECE0] py-0.5`} />
      case 'heading_3':
        return <h3 {...commonProps} className={`${commonProps.className} text-sm md:text-base font-bold text-[#2D3025] dark:text-[#E8ECE0] py-0.5`} />
      case 'bullet_list':
        return (
          <div className="flex items-start gap-2">
            <span className="text-[#7C8363] dark:text-[#9ECE9A] font-bold mt-1.5 shrink-0 select-none text-xs">•</span>
            <div {...commonProps} className={`${commonProps.className} flex-1 text-xs text-[#3D3D3D] dark:text-[#D6CFC3] py-0.5`} />
          </div>
        )
      case 'numbered_list':
        return (
          <div className="flex items-start gap-2">
            <span className="text-[#7C8363] dark:text-[#9ECE9A] font-bold mt-1.5 shrink-0 select-none text-xs">{index + 1}.</span>
            <div {...commonProps} className={`${commonProps.className} flex-1 text-xs text-[#3D3D3D] dark:text-[#D6CFC3] py-0.5`} />
          </div>
        )
      case 'todo':
        return (
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={!!block.props?.checked}
              onChange={(e) => {
                onUpdateBlock?.({ props: { ...block.props, checked: e.target.checked } })
              }}
              className="mt-1.5 w-3.5 h-3.5 rounded border-[#D6CFC3] text-[#7C8363] focus:ring-[#7C8363]/20 cursor-pointer shrink-0"
            />
            <div {...commonProps} className={`${commonProps.className} flex-1 text-xs text-[#3D3D3D] dark:text-[#D6CFC3] py-0.5 ${block.props?.checked ? 'line-through opacity-50' : ''}`} />
          </div>
        )
      case 'toggle':
        return (
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <button onClick={onToggleCollapse} className="mt-1.5 text-[#8D7F72] hover:text-[#7C8363] shrink-0">
                {block.collapsed ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <div {...commonProps} className={`${commonProps.className} flex-1 text-xs font-bold text-[#2D3025] dark:text-[#E8ECE0] py-0.5`} />
            </div>
            {!block.collapsed && block.children && (
              <div className="pr-6 border-r-2 border-[#E6DFD3] dark:border-[#2D3025] mr-1.5 space-y-1">
                {block.children.map((child) => (
                  <div key={child.id} className="text-xs text-[#3D3D3D] dark:text-[#D6CFC3] py-0.5 pr-2">
                    {child.content.map((c) => c.text).join('')}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      case 'quote':
        return (
          <div className="border-r-4 border-[#E26645] pr-3 py-1 bg-[#F9F6EE]/60 dark:bg-[#1A1815] rounded-l-xl">
            <div {...commonProps} className={`${commonProps.className} text-xs text-[#5A5A40] dark:text-[#B6B690] italic`} />
          </div>
        )
      case 'callout':
        return (
          <div className="flex items-start gap-2 bg-[#F9F6EE] dark:bg-[#1A1815] border border-[#E6DFD3] dark:border-[#2D3025] rounded-xl p-3">
            <span className="text-sm shrink-0">{block.props?.icon || '💡'}</span>
            <div {...commonProps} className={`${commonProps.className} flex-1 text-xs text-[#3D3D3D] dark:text-[#D6CFC3]`} />
          </div>
        )
      case 'divider':
        return <hr className="border-[#E6DFD3] dark:border-[#2D3025] my-2" />
      case 'code':
        return (
          <div className="bg-[#2D3025] dark:bg-[#151713] p-3 rounded-xl font-mono text-[10px] text-[#DDE2D5] dark:text-[#9ECE9A]">
            <div {...commonProps} className={`${commonProps.className} whitespace-pre-wrap`} />
          </div>
        )
      case 'image':
        return <ImageBlock block={block} onUpdateBlock={onUpdateBlock} />
      case 'table':
        return <TableBlock block={block} onUpdateBlock={onUpdateBlock} />
      default:
        return <div {...commonProps} className={`${commonProps.className} text-xs text-[#3D3D3D] dark:text-[#D6CFC3] leading-relaxed py-0.5`} />
    }
  }

  const dropIndicator = isDropTarget ? (
    <div className="absolute inset-x-0 -top-0.5 h-0.5 bg-[#7C8363] rounded-full z-40" />
  ) : null

  const dragOpacity = isDragging ? 'opacity-40' : ''

  if (block.type === 'divider') {
    return (
      <motion.div
        layout
        className={`group relative py-1 ${dragOpacity}`}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        {dropIndicator}
        {dragHandle}
        {renderBlock()}
      </motion.div>
    )
  }

  return (
    <motion.div
      layout
      className={`group relative flex items-start gap-1 py-0.5 ${dragOpacity}`}
      dir="rtl"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {dropIndicator}
      {dragHandle}
      <div className="relative shrink-0 mt-1 z-30">
        <button
          onClick={() => { setShowTypeMenu(!showTypeMenu); setShowMenu(false) }}
          className="w-6 h-6 bg-[#F9F6EE] dark:bg-[#151713] hover:bg-[#E6DFD3] dark:hover:bg-[#2D3025] rounded-md border border-[#D6CFC3] dark:border-[#2D3025] flex items-center justify-center text-[8px] text-[#8D7F72] dark:text-[#9D978B] transition-colors cursor-pointer"
        >
          {block.type.startsWith('heading') ? block.type.split('_')[1] : block.type === 'bullet_list' ? '•' : block.type === 'numbered_list' ? '1.' : block.type === 'todo' ? '☐' : block.type === 'quote' ? '"' : block.type === 'code' ? '</>' : '▤'}
        </button>
        {showTypeMenu && blockTypeMenu}
      </div>
      <div className="flex-1 min-w-0 relative">
        {renderBlock()}
      </div>
      {moreMenu}
    </motion.div>
  )
}

/* ─── Image Block ─── */
function ImageBlock({ block, onUpdateBlock }: { block: Block; onUpdateBlock?: (patch: Partial<Block>) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUpdateBlock) return
    setUploading(true)
    setError(null)
    try {
      const result = await uploadFile(file, { folder: 'Home/Notes' })
      onUpdateBlock({ props: { ...block.props, src: result.file_url } })
    } catch (err: any) {
      setError(err?.message || 'خطا در آپلود تصویر')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [block.props, onUpdateBlock])

  const src = block.props?.src as string | undefined

  if (src) {
    return (
      <div className="relative group">
        <img
          src={src}
          alt=""
          className="max-w-full rounded-xl border border-[#E6DFD3] dark:border-[#2D3025]"
          loading="lazy"
        />
        <button
          onClick={() => onUpdateBlock?.({ props: { ...block.props, src: undefined } })}
          className="absolute top-2 left-2 p-1.5 bg-white/90 dark:bg-black/70 rounded-lg shadow text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          title="حذف تصویر"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-[#F9F6EE] dark:bg-[#121411] border border-dashed border-[#D6CFC3] dark:border-[#2D3025] rounded-xl p-6 text-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="flex flex-col items-center gap-2 mx-auto text-[#8D7F72] hover:text-[#7C8363] transition-colors cursor-pointer disabled:opacity-50"
      >
        {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImagePlus className="w-6 h-6" />}
        <span className="text-[10px] font-bold">
          {uploading ? 'در حال آپلود...' : 'کلیک کنید یا تصویر را اینجا رها کنید'}
        </span>
      </button>
      {error && <p className="text-red-500 text-[9px] mt-2">{error}</p>}
    </div>
  )
}

/* ─── Table Block ─── */
function TableBlock({ block, onUpdateBlock }: { block: Block; onUpdateBlock?: (patch: Partial<Block>) => void }) {
  const rows: string[][] = block.props?.rows || [
    ['ستون ۱', 'ستون ۲', 'ستون ۳'],
    ['مقدار ۱', 'مقدار ۲', 'مقدار ۳'],
  ]

  const updateCell = (rowIdx: number, colIdx: number, value: string) => {
    const next = rows.map((r, ri) => r.map((c, ci) => (ri === rowIdx && ci === colIdx ? value : c)))
    onUpdateBlock?.({ props: { ...block.props, rows: next } })
  }

  const addRow = () => {
    const colCount = rows[0]?.length || 3
    const next = [...rows, Array(colCount).fill('')]
    onUpdateBlock?.({ props: { ...block.props, rows: next } })
  }

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return
    const next = rows.filter((_, i) => i !== idx)
    onUpdateBlock?.({ props: { ...block.props, rows: next } })
  }

  const addCol = () => {
    const next = rows.map(r => [...r, ''])
    onUpdateBlock?.({ props: { ...block.props, rows: next } })
  }

  const removeCol = (idx: number) => {
    if ((rows[0]?.length || 0) <= 1) return
    const next = rows.map(r => r.filter((_, i) => i !== idx))
    onUpdateBlock?.({ props: { ...block.props, rows: next } })
  }

  return (
    <div className="border border-[#E6DFD3] dark:border-[#2D3025] rounded-xl overflow-hidden">
      <table className="w-full text-[10px]">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri === 0 ? 'border-b border-[#E6DFD3] dark:border-[#2D3025]' : ''}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-3 py-2 text-right min-w-[80px] ${
                    ri === 0
                      ? 'bg-[#F9F6EE] dark:bg-[#1B1D16] text-[#2D3025] dark:text-[#E8ECE0] font-bold'
                      : 'text-[#3D3D3D] dark:text-[#D6CFC3]'
                  }`}
                >
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => updateCell(ri, ci, e.currentTarget.innerText)}
                    className="outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#8D7F72]"
                    data-placeholder={ri === 0 ? 'سرستون' : 'مقدار'}
                  >
                    {cell}
                  </div>
                </td>
              ))}
              {ri === 0 && (
                <td className="px-1 py-2 bg-[#F9F6EE] dark:bg-[#1B1D16] border-b border-[#E6DFD3] dark:border-[#2D3025]">
                  <div className="flex items-center gap-0.5">
                    <button onClick={addCol} className="p-0.5 text-[#7C8363] hover:bg-[#E8ECE0] rounded cursor-pointer" title="افزودن ستون">
                      <Plus className="w-3 h-3" />
                    </button>
                    {row.length > 1 && (
                      <button onClick={() => removeCol(row.length - 1)} className="p-0.5 text-red-500 hover:bg-red-50 rounded cursor-pointer" title="حذف آخرین ستون">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F9F6EE]/50 dark:bg-[#1B1D16]/50 border-t border-[#E6DFD3] dark:border-[#2D3025]">
        <button onClick={addRow} className="flex items-center gap-1 text-[9px] font-bold text-[#7C8363] hover:text-[#5A5A40] cursor-pointer">
          <Plus className="w-3 h-3" />
          سطر
        </button>
        {rows.length > 1 && (
          <button onClick={() => removeRow(rows.length - 1)} className="flex items-center gap-1 text-[9px] font-bold text-red-500 hover:text-red-700 cursor-pointer">
            <Trash2 className="w-3 h-3" />
            آخرین سطر
          </button>
        )}
      </div>
    </div>
  )
}
