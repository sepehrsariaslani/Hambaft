/**
 * GalleryPage — Pinterest-style gallery for Hambaft.
 *
 * Domain model:
 *   Board = Goal (with lazy-create)
 *   Section = Project within a Goal
 *   Pin = Image (from Task/Project/Goal/direct upload)
 *   Orphan = Images with no Goal/Project
 *
 * Features:
 *   - Masonry grid (2 cols mobile, 4+ cols desktop)
 *   - Lightbox viewer
 *   - Upload from gallery
 *   - Persistent reorder via Hambaft Gallery Pin Order
 *   - Drag-to-reorder (desktop) / long-press reorder (mobile)
 *   - Full RTL + Persian + Hambaft theme
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowRight, Plus, X, Upload, ChevronDown,
  Image as ImageIcon, Trash2, FolderKanban,
  Target, Search, GripVertical, Download,
  ArrowUpRight,
} from 'lucide-react'
import {
  getGalleryBoards, uploadGalleryImage, deleteGalleryPin,
  reorderGalleryPins, backfillGalleryPins,
  type GalleryBoard, type GalleryPin, type GallerySection,
} from '../../app/hambaft-api'

// ─── Main Component ─────────────────────────────────────────
interface GalleryPageProps {
  onBack?: () => void
  onNavigate?: (tab: string, id?: string) => void
}

export default function GalleryPage({ onBack, onNavigate }: GalleryPageProps) {
  const [boards, setBoards] = useState<GalleryBoard[]>([])
  const [orphanPins, setOrphanPins] = useState<GalleryPin[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBoard, setExpandedBoard] = useState<string | null>(null)
  const [lightboxPin, setLightboxPin] = useState<GalleryPin | null>(null)
  const [uploadModal, setUploadModal] = useState<{ doctype: string; docname: string; label: string; scopeType: string; scopeId: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [reorderMode, setReorderMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragItem = useRef<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const resp = await getGalleryBoards()
      const d = resp?.data
      setBoards(d?.boards || [])
      setOrphanPins(d?.orphan_pins || [])
    } catch {
      // API might not be deployed yet
      setBoards([])
      setOrphanPins([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-expand first board
  useEffect(() => {
    if (boards.length > 0 && !expandedBoard) {
      setExpandedBoard(boards[0].board_id)
    }
  }, [boards, expandedBoard])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadModal) return
    setUploading(true)
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      await uploadGalleryImage(dataUrl, file.name, uploadModal.doctype, uploadModal.docname)
      await fetchData()
    } catch (err) {
      console.error('[hambaft] gallery upload failed', err)
    } finally {
      setUploading(false)
      setUploadModal(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (fileName: string) => {
    try {
      await deleteGalleryPin(fileName)
      await fetchData()
    } catch {
      try {
        const { call: frappeCall } = await import('../../app/frappe')
        await frappeCall('frappe.client.delete', { doctype: 'File', name: fileName })
        await fetchData()
      } catch (err2) {
        console.error('[hambaft] gallery delete failed', err2)
      }
    }
  }

  const handleReorder = async (pins: GalleryPin[], scopeType: string, scopeId: string) => {
    const items = pins.map((p, idx) => ({
      file_name: p.file_name,
      sort_order: idx,
      scope_type: scopeType,
      scope_id: scopeId,
    }))
    try {
      await reorderGalleryPins(items)
    } catch (err) {
      console.error('[hambaft] reorder failed', err)
    }
  }

  const handleBackfill = async () => {
    try {
      await backfillGalleryPins()
      await fetchData()
    } catch (err) {
      console.error('[hambaft] backfill failed', err)
    }
  }

  // Filter boards by search
  const filteredBoards = useMemo(() => {
    if (!search.trim()) return boards
    const q = search.trim().toLowerCase()
    return boards.filter(b =>
      b.board_title.toLowerCase().includes(q) ||
      b.sections.some(s => s.section_title.toLowerCase().includes(q)) ||
      b.sections.some(s => s.pins.some(p => p.source_title?.toLowerCase().includes(q)))
    )
  }, [boards, search])

  const totalImages = useMemo(() => {
    let count = orphanPins.length
    boards.forEach(b => {
      count += b.board_pins.length
      b.sections.forEach(s => { count += s.pins.length })
    })
    return count
  }, [boards, orphanPins])

  // ─── Drag handlers for reorder ───
  const handleDragStart = (fileName: string) => {
    dragItem.current = fileName
  }

  const handleDragOver = (e: React.DragEvent, targetFileName: string, pins: GalleryPin[], scopeType: string, scopeId: string) => {
    e.preventDefault()
    if (!dragItem.current || dragItem.current === targetFileName) return
    
    const fromIdx = pins.findIndex(p => p.file_name === dragItem.current)
    const toIdx = pins.findIndex(p => p.file_name === targetFileName)
    if (fromIdx === -1 || toIdx === -1) return
    
    // Reorder locally
    const newPins = [...pins]
    const [moved] = newPins.splice(fromIdx, 1)
    newPins.splice(toIdx, 0, moved)
    
    // Update the relevant board/section in state
    setBoards(prev => {
      const newBoards = prev.map(b => {
        if (scopeType === 'board' && b.board_id === scopeId) {
          return { ...b, board_pins: newPins }
        }
        if (scopeType === 'section') {
          const newSections = b.sections.map(s => {
            if (s.section_id === scopeId) {
              return { ...s, pins: newPins }
            }
            return s
          })
          return { ...b, sections: newSections }
        }
        return b
      })
      return newBoards
    })
  }

  const handleDragEnd = (pins: GalleryPin[], scopeType: string, scopeId: string) => {
    dragItem.current = null
    handleReorder(pins, scopeType, scopeId)
  }

  // ─── Render ───
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdf9f2_0%,#f3ebdf_100%)] dark:bg-[linear-gradient(180deg,#121411_0%,#1B1D16_100%)] overflow-x-hidden" dir="rtl">
      {/* ═══ Header ═══ */}
      <div className="sticky top-0 z-30 bg-[#F9F6EE]/80 dark:bg-[#1B1D16]/80 backdrop-blur-xl border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40">
        <div className="flex items-center gap-3 px-3 py-2.5">
          {onBack && (
            <button onClick={onBack}
              className="p-1.5 rounded-lg text-[#8D7F72] dark:text-[#9D978B] hover:text-[#2D3025] dark:hover:text-[#E8ECE0] hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5 cursor-pointer transition-all active:scale-90">
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A]" />
            <h1 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">گالری</h1>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A]">
            {totalImages}
          </span>
          <div className="flex-1" />
          <button onClick={() => setReorderMode(!reorderMode)}
            className={`p-1.5 rounded-lg cursor-pointer transition-all ${reorderMode ? 'bg-[#7C8363]/15 dark:bg-[#9ECE9A]/15 text-[#7C8363] dark:text-[#9ECE9A]' : 'text-[#8D7F72] dark:text-[#9D978B] hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5'}`}
            title="مرتب‌سازی">
            <GripVertical className="w-4 h-4" />
          </button>
        </div>
        {/* Search */}
        <div className="px-3 pb-2.5">
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1B1D16] rounded-lg border border-[#E6DFD3]/60 dark:border-[#3D4133]/60">
            <Search className="w-3.5 h-3.5 text-[#8D7F72] dark:text-[#9D978B] shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="جستجو در گالری..."
              className="flex-1 bg-transparent text-[11px] text-[#2D3025] dark:text-[#E8ECE0] placeholder:text-[#D6CFC3] dark:placeholder:text-[#3D4133] focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* ═══ Content ═══ */}
      <div className="px-3 py-3 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-[#7C8363]/30 dark:border-[#9ECE9A]/30 border-t-[#7C8363] dark:border-t-[#9ECE9A] rounded-full animate-spin" />
            <span className="text-[11px] text-[#8D7F72] dark:text-[#9D978B]">در حال بارگذاری...</span>
          </div>
        ) : filteredBoards.length === 0 && orphanPins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <ImageIcon className="w-12 h-12 text-[#E6DFD3] dark:text-[#3D4133]" />
            <div className="text-center">
              <p className="text-sm font-bold text-[#2D3025] dark:text-[#E8ECE0]">هنوز تصویری نیست</p>
              <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] mt-1">تصاویر تسک‌ها و پروژه‌هاتون اینجا نمایش داده می‌شه</p>
            </div>
            <button onClick={handleBackfill}
              className="px-4 py-2 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] rounded-full text-[10px] font-bold cursor-pointer hover:opacity-90">
              آپدیت گالری
            </button>
          </div>
        ) : (
          <>
            {/* ─── Boards (Goals) ─── */}
            {filteredBoards.map(board => {
              const isExpanded = expandedBoard === board.board_id
              return (
                <div key={board.board_id} className="bg-white dark:bg-[#1B1D16] rounded-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60 overflow-hidden shadow-sm">
                  {/* Board header */}
                  <button onClick={() => setExpandedBoard(isExpanded ? null : board.board_id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-[#F9F6EE]/60 dark:hover:bg-[#3D4133]/30 transition-colors">
                    <div className="flex items-center gap-3">
                      {board.cover_url ? (
                        <img src={board.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 flex items-center justify-center">
                          <Target className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A]" />
                        </div>
                      )}
                      <div className="text-right">
                        <span className="text-[12px] font-black text-[#2D3025] dark:text-[#E8ECE0] block">{board.board_title}</span>
                        <span className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B]">{board.pin_count} تصویر</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); setUploadModal({ doctype: 'Goal', docname: board.board_id, label: board.board_title, scopeType: 'board', scopeId: board.board_id }); fileInputRef.current?.click() }}
                        className="p-1.5 rounded-lg text-[#8D7F72] dark:text-[#9D978B] hover:text-[#7C8363] dark:hover:text-[#9ECE9A] hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5 cursor-pointer transition-all">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <ChevronDown className={`w-4 h-4 text-[#8D7F72] dark:text-[#9D978B] transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                    </div>
                  </button>

                  {/* Board content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div className="px-3 pb-3 space-y-5">
                          {/* Board-level pins */}
                          {board.board_pins.length > 0 && (
                            <MasonryGrid
                              pins={board.board_pins}
                              onPinClick={reorderMode ? undefined : setLightboxPin}
                              onDelete={handleDelete}
                              reorderMode={reorderMode}
                              scopeType="board"
                              scopeId={board.board_id}
                              onDragStart={handleDragStart}
                              onDragOver={handleDragOver}
                              onDragEnd={handleDragEnd}
                            />
                          )}

                          {/* Sections (Projects) */}
                          {board.sections.map(section => (
                            <div key={section.section_id}>
                              <div className="flex items-center gap-2 mb-2.5">
                                <FolderKanban className="w-3.5 h-3.5 text-[#8D7F72] dark:text-[#9D978B]" />
                                <span className="text-[11px] font-bold text-[#8D7F72] dark:text-[#9D978B]">{section.section_title}</span>
                                <span className="text-[8px] font-bold text-[#9D978B]">({section.pins.length})</span>
                                <div className="flex-1" />
                                <button onClick={() => { setUploadModal({ doctype: 'Hambaft Project', docname: section.section_id, label: section.section_title, scopeType: 'section', scopeId: section.section_id }); fileInputRef.current?.click() }}
                                  className="p-1 rounded text-[#8D7F72] dark:text-[#9D978B] hover:text-[#7C8363] dark:hover:text-[#9ECE9A] cursor-pointer">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <MasonryGrid
                                pins={section.pins}
                                onPinClick={reorderMode ? undefined : setLightboxPin}
                                onDelete={handleDelete}
                                reorderMode={reorderMode}
                                showTaskName
                                scopeType="section"
                                scopeId={section.section_id}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDragEnd={handleDragEnd}
                              />
                            </div>
                          ))}

                          {/* No pins yet */}
                          {board.board_pins.length === 0 && board.sections.length === 0 && (
                            <div className="text-[10px] text-[#9D978B] text-center py-4">هنوز تصویری در این بورد نیست</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}

            {/* ─── Orphan Pins ─── */}
            {orphanPins.length > 0 && (
              <div className="bg-white dark:bg-[#1B1D16] rounded-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60 overflow-hidden shadow-sm">
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#8D7F72] dark:text-[#9D978B]" />
                    <span className="text-[12px] font-black text-[#2D3025] dark:text-[#E8ECE0]">سایر تصاویر</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A]">{orphanPins.length}</span>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <MasonryGrid
                    pins={orphanPins}
                    onPinClick={setLightboxPin}
                    onDelete={handleDelete}
                    scopeType="orphan"
                    scopeId="orphan"
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═══ Upload Modal ═══ */}
      <AnimatePresence>
        {uploadModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setUploadModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1B1D16] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[#7C8363] dark:text-[#9ECE9A]" />
                </div>
                <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">آپلود تصویر</h3>
                <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] mt-1.5">{uploadModal.label}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-4 px-6 py-2.5 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] rounded-full text-[11px] font-bold cursor-pointer hover:opacity-90 transition-all disabled:opacity-50 shadow-sm">
                  {uploading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white dark:border-[#121411]/30 dark:border-t-[#121411] rounded-full animate-spin" />
                      در حال آپلود...
                    </span>
                  ) : 'انتخاب تصویر'}
                </button>
                <button onClick={() => setUploadModal(null)}
                  className="mt-2 block mx-auto text-[10px] text-[#8D7F72] dark:text-[#9D978B] cursor-pointer hover:text-[#2D3025] dark:hover:text-[#E8ECE0] transition-colors">انصراف</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Lightbox ═══ */}
      <AnimatePresence>
        {lightboxPin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxPin(null)}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-4xl max-h-[90vh] w-full">
              <img src={lightboxPin.file_url} alt=""
                className="max-w-full max-h-[85vh] mx-auto object-contain rounded-lg shadow-2xl"
                onClick={e => e.stopPropagation()} />
              {/* Info bar */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <div>
                    {lightboxPin.source_title && (
                      <span className="text-[11px] font-bold text-white">{lightboxPin.source_title}</span>
                    )}
                    <span className="text-[9px] text-white/50 block mt-0.5">
                      {lightboxPin.source_type === 'task' ? 'تسک' : lightboxPin.source_type === 'project' ? 'پروژه' : lightboxPin.source_type === 'goal' ? 'هدف' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {lightboxPin.file_url && (
                      <a href={lightboxPin.file_url} download target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer transition-all">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button onClick={() => { handleDelete(lightboxPin.file_name); setLightboxPin(null) }}
                      className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-red-500/80 cursor-pointer transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
            <button onClick={() => setLightboxPin(null)}
              className="absolute top-4 left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer transition-all">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Masonry Grid — Pinterest-style responsive columns
// ══════════════════════════════════════════════════════════════
function MasonryGrid({ pins, onPinClick, onDelete, showTaskName, reorderMode, scopeType, scopeId, onDragStart, onDragOver, onDragEnd }: {
  pins: GalleryPin[]
  onPinClick?: (pin: GalleryPin) => void
  onDelete: (fileName: string) => void
  showTaskName?: boolean
  reorderMode?: boolean
  scopeType: string
  scopeId: string
  onDragStart?: (fileName: string) => void
  onDragOver?: (e: React.DragEvent, targetFileName: string, pins: GalleryPin[], scopeType: string, scopeId: string) => void
  onDragEnd?: (pins: GalleryPin[], scopeType: string, scopeId: string) => void
}) {
  // Determine column count based on viewport
  const [cols, setCols] = useState(2)
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth
      if (w >= 1280) setCols(5)
      else if (w >= 1024) setCols(4)
      else if (w >= 640) setCols(3)
      else setCols(2)
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  // Distribute pins into columns for masonry
  const columns: GalleryPin[][] = useMemo(() => {
    const c: GalleryPin[][] = Array.from({ length: cols }, () => [])
    pins.forEach((pin, idx) => {
      c[idx % cols].push(pin)
    })
    return c
  }, [pins, cols])

  return (
    <div className="flex gap-2">
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="flex-1 space-y-2">
          {col.map(pin => (
            <div
              key={pin.file_name}
              draggable={reorderMode}
              onDragStart={() => onDragStart?.(pin.file_name)}
              onDragOver={e => onDragOver?.(e, pin.file_name, pins, scopeType, scopeId)}
              onDragEnd={() => onDragEnd?.(pins, scopeType, scopeId)}
              className={`group relative rounded-xl overflow-hidden bg-[#F9F6EE] dark:bg-[#3D4133]/30 cursor-pointer transition-shadow ${reorderMode ? 'ring-1 ring-[#7C8363]/30 dark:ring-[#9ECE9A]/30' : ''}`}
              onClick={() => onPinClick?.(pin)}
            >
              <img src={pin.file_url} alt={pin.source_title || pin.image_name || ''}
                className="w-full object-cover rounded-xl transition-transform group-hover:scale-[1.02]"
                loading="lazy" />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl" />
              {/* Task name badge */}
              {showTaskName && pin.source_title && (
                <div className="absolute bottom-0 left-0 right-0 px-2 py-2 bg-gradient-to-t from-black/60 to-transparent rounded-b-xl">
                  <span className="text-[9px] font-bold text-white truncate block">{pin.source_title}</span>
                </div>
              )}
              {/* Action buttons */}
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {reorderMode && (
                  <div className="p-1 rounded-md bg-black/40 text-white cursor-grab">
                    <GripVertical className="w-3 h-3" />
                  </div>
                )}
                <button onClick={e => { e.stopPropagation(); onDelete(pin.file_name) }}
                  className="p-1 rounded-md bg-black/40 text-white hover:bg-red-500/80 cursor-pointer transition-all">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
