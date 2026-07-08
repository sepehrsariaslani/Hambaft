import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, Plus, Star, Trash2, ChevronDown, ChevronLeft, FileText, MoreHorizontal, Edit2, Copy, ArrowRightLeft, Archive, X, BookOpen } from 'lucide-react'
import type { NotePage } from '../types'
import BlockEditor from './BlockEditor'

interface NotesLayoutProps {
  pages: NotePage[]
  onAddPage: (parentId?: string) => NotePage | undefined
  onUpdatePage: (pageId: string, patch: Partial<NotePage>) => void
  onDeletePage: (pageId: string) => void
  onDuplicatePage: (pageId: string) => NotePage | undefined
  onMovePage: (pageId: string, newParentId?: string) => void
  onAddBlock: (pageId: string, afterBlockId?: string, type?: any) => any
  onUpdateBlock: (pageId: string, blockId: string, patch: any) => void
  onDeleteBlock: (pageId: string, blockId: string) => void
  onMoveBlock: (pageId: string, blockId: string, dir: 'up' | 'down') => void
  onReorderBlocks: (pageId: string, blockIds: string[]) => void
  savingState: string
}

function PageTreeItem({
  page, pages, depth, activePageId, onSelect, onAddSub, onDelete, onDuplicate, onToggleFav,
}: {
  page: NotePage
  pages: NotePage[]
  depth: number
  activePageId: string
  onSelect: (id: string) => void
  onAddSub: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onToggleFav: (id: string) => void
}) {
  const [open, setOpen] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const children = pages.filter((p) => p.parentId === page.id)
  const hasChildren = children.length > 0

  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
          activePageId === page.id ? 'bg-[#E8ECE0] dark:bg-[#1E2218] text-[#2D3025] dark:text-[#E8ECE0]' : 'hover:bg-[#F9F6EE] dark:hover:bg-[#1B1D16] text-[#3D3D3D] dark:text-[#D6CFC3]'
        }`}
        style={{ paddingRight: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(page.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
            className="p-0.5 text-[#8D7F72] hover:text-[#2D3025] shrink-0"
          >
            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <span className="text-xs shrink-0">{page.icon || '📄'}</span>
        <span className="text-[11px] font-bold truncate flex-1 text-right">{page.title}</span>
        {page.isFavorite && <Star className="w-3 h-3 text-amber-500 fill-amber-500 shrink-0" />}
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
          className="opacity-0 group-hover:opacity-100 p-1 text-[#8D7F72] hover:text-[#2D3025] shrink-0"
        >
          <MoreHorizontal className="w-3 h-3" />
        </button>
        {showMenu && (
          <div className="absolute left-2 mt-16 bg-white dark:bg-[#151713] border border-[#E6DFD3] dark:border-[#2D3025] rounded-xl shadow-lg p-1 w-36 z-50 flex flex-col gap-0.5">
            <button onClick={() => { onAddSub(page.id); setShowMenu(false) }} className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold text-[#3D3D3D] dark:text-[#D6CFC3] hover:bg-[#E8ECE0]/50 rounded-lg text-right">
              <Plus className="w-3 h-3" /> زیرصفحه
            </button>
            <button onClick={() => { onToggleFav(page.id); setShowMenu(false) }} className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold text-[#3D3D3D] dark:text-[#D6CFC3] hover:bg-[#E8ECE0]/50 rounded-lg text-right">
              <Star className="w-3 h-3" /> علاقه‌مندی
            </button>
            <button onClick={() => { onDuplicate(page.id); setShowMenu(false) }} className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold text-[#3D3D3D] dark:text-[#D6CFC3] hover:bg-[#E8ECE0]/50 rounded-lg text-right">
              <Copy className="w-3 h-3" /> کپی
            </button>
            <div className="border-t border-[#E6DFD3]/50 my-0.5" />
            <button onClick={() => { onDelete(page.id); setShowMenu(false) }} className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 rounded-lg text-right">
              <Trash2 className="w-3 h-3" /> حذف
            </button>
          </div>
        )}
      </div>
      {open && hasChildren && (
        <div className="mt-0.5">
          {children.map((child) => (
            <PageTreeItem
              key={child.id}
              page={child}
              pages={pages}
              depth={depth + 1}
              activePageId={activePageId}
              onSelect={onSelect}
              onAddSub={onAddSub}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onToggleFav={onToggleFav}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function NotesLayout({
  pages, onAddPage, onUpdatePage, onDeletePage, onDuplicatePage, onMovePage,
  onAddBlock, onUpdateBlock, onDeleteBlock, onMoveBlock, onReorderBlocks, savingState,
}: NotesLayoutProps) {
  const [activePageId, setActivePageId] = useState<string>(pages[0]?.id || '')
  const [search, setSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [editingTitle, setEditingTitle] = useState(false)
  const [tempTitle, setTempTitle] = useState('')

  const activePage = pages.find((p) => p.id === activePageId) || pages[0]
  const rootPages = pages.filter((p) => !p.parentId)
  const favorites = pages.filter((p) => p.isFavorite && !p.isTrashed)

  const filteredPages = useMemo(() => {
    if (!search.trim()) return []
    return pages.filter((p) => p.title.includes(search) || p.blocks.some((b) => b.content.some((c) => c.text.includes(search))))
  }, [search, pages])

  const handleTitleSave = () => {
    if (activePage && tempTitle.trim()) {
      onUpdatePage(activePage.id, { title: tempTitle.trim() })
    }
    setEditingTitle(false)
  }

  return (
    <div className="flex h-full bg-[#FDFBF7] dark:bg-[#1B1D16] rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] overflow-hidden" dir="rtl">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-l border-[#E6DFD3] dark:border-[#2D3025] bg-[#F9F6EE] dark:bg-[#121411] flex flex-col shrink-0 overflow-hidden"
          >
            <div className="p-4 border-b border-[#E6DFD3] dark:border-[#2D3025]">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 bg-[#E8ECE0] dark:bg-[#1E2218] text-[#7C8363] dark:text-[#9ECE9A] rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">دفترچه یادداشت</h2>
                  <p className="text-[9px] text-[#8D7F72] font-semibold">{pages.length} صفحه</p>
                </div>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8D7F72] absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجو..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-[10px] px-3 py-2 pr-8 border border-[#E6DFD3] dark:border-[#2D3025] rounded-xl bg-white dark:bg-[#1B1D16] text-[#2D3025] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <button
                onClick={() => { const p = onAddPage(); if (p) setActivePageId(p.id) }}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#7C8363] hover:bg-[#5A5D45] text-white text-[10px] font-black rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> صفحه جدید
              </button>

              {search.trim() ? (
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-[#8D7F72] px-1">نتایج جستجو</span>
                  {filteredPages.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setActivePageId(p.id); setSearch('') }}
                      className="w-full text-right px-2 py-1.5 rounded-lg hover:bg-[#E8ECE0] dark:hover:bg-[#1E2218] text-[11px] font-bold text-[#3D3D3D] dark:text-[#D6CFC3] truncate"
                    >
                      {p.title}
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  {favorites.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-[#8D7F72] px-1 flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" /> علاقه‌مندی‌ها
                      </span>
                      {favorites.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setActivePageId(p.id)}
                          className={`w-full text-right px-2 py-1.5 rounded-lg text-[11px] font-bold truncate transition-colors ${
                            activePageId === p.id ? 'bg-[#E8ECE0] dark:bg-[#1E2218]' : 'hover:bg-[#F9F6EE] dark:hover:bg-[#1B1D16]'
                          }`}
                        >
                          {p.title}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-[#8D7F72] px-1">صفحه‌ها</span>
                    {rootPages.map((p) => (
                      <PageTreeItem
                        key={p.id}
                        page={p}
                        pages={pages}
                        depth={0}
                        activePageId={activePageId}
                        onSelect={setActivePageId}
                        onAddSub={(id) => { const sub = onAddPage(id); if (sub) setActivePageId(sub.id) }}
                        onDelete={onDeletePage}
                        onDuplicate={onDuplicatePage}
                        onToggleFav={(id) => {
                          const pg = pages.find((x) => x.id === id)
                          if (pg) onUpdatePage(id, { isFavorite: !pg.isFavorite })
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6DFD3] dark:border-[#2D3025] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 hover:bg-[#E8ECE0] dark:hover:bg-[#1E2218] rounded-lg text-[#8D7F72] transition-colors"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
            </button>
            <div className="text-[10px] text-[#8D7F72] font-bold flex items-center gap-1">
              <span>یادداشت‌ها</span>
              <ChevronLeft className="w-3 h-3" />
              <span className="text-[#2D3025] dark:text-[#E8ECE0]">{activePage?.title || 'بدون عنوان'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
              savingState === 'saving' ? 'bg-amber-50 text-amber-700' :
              savingState === 'saved' ? 'bg-emerald-50 text-emerald-700' :
              'bg-[#F9F6EE] text-[#8D7F72]'
            }`}>
              {savingState === 'saving' ? 'در حال ذخیره...' : savingState === 'saved' ? 'ذخیره شد' : 'آماده'}
            </span>
          </div>
        </div>

        {/* Page Content */}
        {activePage && (
          <div className="flex-1 overflow-y-auto px-6 py-6 md:px-12 md:py-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Title */}
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">{activePage.icon || '📄'}</span>
                <div className="flex-1">
                  {editingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tempTitle}
                        onChange={(e) => setTempTitle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave() }}
                        onBlur={handleTitleSave}
                        autoFocus
                        className="text-xl md:text-2xl font-black text-[#2D3025] dark:text-[#E8ECE0] bg-transparent border-b-2 border-[#7C8363] focus:outline-none w-full"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <h1
                        onClick={() => { setTempTitle(activePage.title); setEditingTitle(true) }}
                        className="text-xl md:text-2xl font-black text-[#2D3025] dark:text-[#E8ECE0] cursor-pointer"
                      >
                        {activePage.title}
                      </h1>
                      <button
                        onClick={() => { setTempTitle(activePage.title); setEditingTitle(true) }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#8D7F72] hover:text-[#2D3025] transition-opacity"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <span className="text-[9px] text-[#8D7F72] font-semibold mt-1 block">
                    آخرین ویرایش: {new Date(activePage.updatedAt).toLocaleDateString('fa-IR')}
                  </span>
                </div>
              </div>

              {/* Blocks */}
              <BlockEditor
                page={activePage}
                onUpdatePage={(patch) => onUpdatePage(activePage.id, patch)}
                onUpdateBlock={(blockId, patch) => onUpdateBlock(activePage.id, blockId, patch)}
                onAddBlock={(afterBlockId, type) => onAddBlock(activePage.id, afterBlockId, type)}
                onDeleteBlock={(blockId) => onDeleteBlock(activePage.id, blockId)}
                onMoveBlock={(blockId, dir) => onMoveBlock(activePage.id, blockId, dir)}
                onReorderBlocks={(blockIds) => onReorderBlocks(activePage.id, blockIds)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
