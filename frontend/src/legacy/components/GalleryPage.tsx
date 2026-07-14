/**
 * GalleryPage — Pinterest-style gallery for Hambaft.
 *
 * Structure:
 *   Goals = Boards (Pinterest boards)
 *   Projects = Sections within boards
 *   Task images = Pins within sections (with task name below)
 *   Project/Goal images = Board-level pins
 *
 * Features:
 *   - Masonry grid (2 cols mobile, 3-4 cols desktop)
 *   - Click to enlarge (lightbox)
 *   - Upload images directly from gallery
 *   - Reorder via drag (visual)
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowRight, Plus, X, Upload, ChevronDown, ChevronLeft,
  Image as ImageIcon, Trash2, GripVertical, FolderKanban,
  Target, Search,
} from 'lucide-react'
import { getGalleryData, uploadGalleryImage, deleteTaskAttachment } from '../../app/hambaft-api'

// ─── Types ──────────────────────────────────────────────────
interface GalleryPin {
  file_name: string
  file_url: string
  file_size?: number
  file_type?: string
  image_name?: string
  task_id?: string
  task_title?: string
  project_id?: string
  project_title?: string
  source_type: 'task' | 'project' | 'goal'
}

interface GallerySection {
  project_id: string
  project_title: string
  pins: GalleryPin[]
}

interface GalleryBoard {
  goal_id: string
  goal_title: string
  goal_progress?: number
  sections: GallerySection[]
  board_pins: GalleryPin[]
}

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
  const [uploadTarget, setUploadTarget] = useState<{ doctype: string; docname: string; label: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const resp = await getGalleryData()
      const d = resp?.data
      setBoards(d?.boards || [])
      setOrphanPins(d?.orphan_pins || [])
    } catch {
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
      setExpandedBoard(boards[0].goal_id)
    }
  }, [boards, expandedBoard])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !uploadTarget) return
    setUploading(true)
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      await uploadGalleryImage(dataUrl, file.name, uploadTarget.doctype, uploadTarget.docname)
      await fetchData()
    } catch (err) {
      console.error('[hambaft] gallery upload failed', err)
    } finally {
      setUploading(false)
      setUploadTarget(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (fileName: string) => {
    try {
      await deleteTaskAttachment(fileName)
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

  // Filter boards by search
  const filteredBoards = useMemo(() => {
    if (!search.trim()) return boards
    const q = search.trim().toLowerCase()
    return boards.filter(b =>
      b.goal_title.toLowerCase().includes(q) ||
      b.sections.some(s => s.project_title.toLowerCase().includes(q)) ||
      b.sections.some(s => s.pins.some(p => p.task_title?.toLowerCase().includes(q)))
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

  // ─── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdf9f2_0%,#f3ebdf_100%)] dark:bg-[linear-gradient(180deg,#121411_0%,#1B1D16_100%)] overflow-x-hidden" dir="rtl">
      {/* ═══ Header ═══ */}
      <div className="sticky top-0 z-30 bg-[#F9F6EE]/80 dark:bg-[#1B1D16]/80 backdrop-blur-xl">
        <div className="flex items-center gap-3 px-3 py-2">
          <button onClick={onBack}
            className="p-1.5 rounded-lg text-[#8D7F72] dark:text-[#9D978B] hover:text-[#2D3025] dark:hover:text-[#E8ECE0] hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5 cursor-pointer transition-all active:scale-90">
            <ArrowRight className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">گالری</h1>
          <span className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B]">{totalImages} تصویر</span>
          <div className="flex-1" />
        </div>
        {/* Search */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-[#1B1D16] rounded-lg border border-[#E6DFD3]/60 dark:border-[#3D4133]/60">
            <Search className="w-3.5 h-3.5 text-[#8D7F72] dark:text-[#9D978B]" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="جستجو در گالری..."
              className="flex-1 bg-transparent text-[11px] text-[#2D3025] dark:text-[#E8ECE0] placeholder:text-[#D6CFC3] dark:placeholder:text-[#3D4133] focus:outline-none" />
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* ═══ Content ═══ */}
      <div className="px-3 py-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-[#7C8363]/30 dark:border-[#9ECE9A]/30 border-t-[#7C8363] dark:border-t-[#9ECE9A] rounded-full animate-spin" />
            <span className="text-[11px] text-[#8D7F72] dark:text-[#9D978B]">در حال بارگذاری گالری...</span>
          </div>
        ) : filteredBoards.length === 0 && orphanPins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <ImageIcon className="w-12 h-12 text-[#E6DFD3] dark:text-[#3D4133]" />
            <div className="text-center">
              <p className="text-sm font-bold text-[#2D3025] dark:text-[#E8ECE0]">هنوز تصویری نیست</p>
              <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] mt-1">تصاویر تسک‌ها و پروژه‌هاتون اینجا نمایش داده می‌شه</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* ─── Boards (Goals) ─── */}
            {filteredBoards.map(board => {
              const isExpanded = expandedBoard === board.goal_id
              const allPins = [
                ...board.board_pins,
                ...board.sections.flatMap(s => s.pins),
              ]
              return (
                <div key={board.goal_id} className="bg-white dark:bg-[#1B1D16] rounded-xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60 overflow-hidden">
                  {/* Board header */}
                  <button onClick={() => setExpandedBoard(isExpanded ? null : board.goal_id)}
                    className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#F9F6EE]/60 dark:hover:bg-[#3D4133]/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <Target className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A]" />
                      <span className="text-[12px] font-black text-[#2D3025] dark:text-[#E8ECE0]">{board.goal_title}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A]">
                        {allPins.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={e => { e.stopPropagation(); setUploadTarget({ doctype: 'Goal', docname: board.goal_id, label: board.goal_title }); fileInputRef.current?.click() }}
                        className="p-1 rounded text-[#8D7F72] dark:text-[#9D978B] hover:text-[#7C8363] dark:hover:text-[#9ECE9A] cursor-pointer">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <ChevronDown className={`w-3.5 h-3.5 text-[#8D7F72] dark:text-[#9D978B] transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                    </div>
                  </button>

                  {/* Board content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div className="px-3 pb-3 space-y-4">
                          {/* Board-level pins (project images, goal images) */}
                          {board.board_pins.length > 0 && (
                            <MasonryGrid pins={board.board_pins} onPinClick={setLightboxPin} onDelete={handleDelete} />
                          )}

                          {/* Sections (Projects) */}
                          {board.sections.map(section => (
                            <div key={section.project_id}>
                              <div className="flex items-center gap-2 mb-2">
                                <FolderKanban className="w-3 h-3 text-[#8D7F72] dark:text-[#9D978B]" />
                                <span className="text-[11px] font-bold text-[#8D7F72] dark:text-[#9D978B]">{section.project_title}</span>
                                <span className="text-[8px] font-bold text-[#9D978B]">({section.pins.length})</span>
                                <div className="flex-1" />
                                <button onClick={() => { setUploadTarget({ doctype: 'Hambaft Project', docname: section.project_id, label: section.project_title }); fileInputRef.current?.click() }}
                                  className="p-0.5 rounded text-[#8D7F72] dark:text-[#9D978B] hover:text-[#7C8363] dark:hover:text-[#9ECE9A] cursor-pointer">
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                              <MasonryGrid pins={section.pins} onPinClick={setLightboxPin} onDelete={handleDelete} showTaskName />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}

            {/* ─── Orphan Pins ─── */}
            {orphanPins.length > 0 && (
              <div className="bg-white dark:bg-[#1B1D16] rounded-xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60 overflow-hidden">
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#8D7F72] dark:text-[#9D978B]" />
                    <span className="text-[12px] font-black text-[#2D3025] dark:text-[#E8ECE0]">سایر تصاویر</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A]">{orphanPins.length}</span>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <MasonryGrid pins={orphanPins} onPinClick={setLightboxPin} onDelete={handleDelete} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ Upload overlay ═══ */}
      <AnimatePresence>
        {uploadTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setUploadTarget(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1B1D16] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <div className="text-center">
                <Upload className="w-8 h-8 mx-auto text-[#7C8363] dark:text-[#9ECE9A] mb-3" />
                <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">آپلود تصویر</h3>
                <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] mt-1">{uploadTarget.label}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="mt-4 px-6 py-2 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] rounded-full text-[11px] font-bold cursor-pointer hover:opacity-90 transition-all disabled:opacity-50">
                  {uploading ? 'در حال آپلود...' : 'انتخاب فایل'}
                </button>
                <button onClick={() => setUploadTarget(null)}
                  className="mt-2 block mx-auto text-[10px] text-[#8D7F72] dark:text-[#9D978B] cursor-pointer hover:text-[#2D3025] dark:hover:text-[#E8ECE0]">انصراف</button>
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
              className="relative max-w-4xl max-h-[90vh] w-full">
              <img src={lightboxPin.file_url} alt=""
                className="max-w-full max-h-[85vh] mx-auto object-contain rounded-lg"
                onClick={e => e.stopPropagation()} />
              {/* Info bar */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <div>
                    {lightboxPin.task_title && (
                      <span className="text-[11px] font-bold text-white">{lightboxPin.task_title}</span>
                    )}
                    {lightboxPin.project_title && (
                      <span className="text-[9px] text-white/60 block">{lightboxPin.project_title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {lightboxPin.file_url && (
                      <a href={lightboxPin.file_url} download target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer">
                        <Upload className="w-3.5 h-3.5 rotate-180" />
                      </a>
                    )}
                    <button onClick={() => { handleDelete(lightboxPin.file_name); setLightboxPin(null) }}
                      className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-red-500/60 cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
            {/* Close button */}
            <button onClick={() => setLightboxPin(null)}
              className="absolute top-4 left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer">
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
function MasonryGrid({ pins, onPinClick, onDelete, showTaskName }: {
  pins: GalleryPin[]
  onPinClick: (pin: GalleryPin) => void
  onDelete: (fileName: string) => void
  showTaskName?: boolean
}) {
  // Distribute pins into columns for masonry effect
  const columnCount = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 4 : typeof window !== 'undefined' && window.innerWidth >= 640 ? 3 : 2
  const columns: GalleryPin[][] = Array.from({ length: columnCount }, () => [])
  pins.forEach((pin, idx) => {
    columns[idx % columnCount].push(pin)
  })

  return (
    <div className="flex gap-2">
      {columns.map((col, colIdx) => (
        <div key={colIdx} className="flex-1 space-y-2">
          {col.map(pin => (
            <div key={pin.file_name} className="group relative rounded-lg overflow-hidden bg-[#F9F6EE] dark:bg-[#3D4133]/30 cursor-pointer"
              onClick={() => onPinClick(pin)}>
              <img src={pin.file_url} alt={pin.task_title || pin.image_name || ''}
                className="w-full object-cover rounded-lg transition-transform group-hover:scale-[1.02]"
                loading="lazy" />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg" />
              {/* Task name badge */}
              {showTaskName && pin.task_title && (
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/60 to-transparent">
                  <span className="text-[9px] font-bold text-white truncate block">{pin.task_title}</span>
                </div>
              )}
              {/* Delete button */}
              <button onClick={e => { e.stopPropagation(); onDelete(pin.file_name) }}
                className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500/80 cursor-pointer transition-all">
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
