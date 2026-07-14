/**
 * GalleryPage — Pinterest-style gallery for Hambaft.
 *
 * Domain: Hambaft Gallery Board > Section > Pin
 * Mapping: Goal=Board, Project=Section, Task/Project/Goal images=Pins
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowRight, Plus, X, Upload, ChevronDown,
  Image as ImageIcon, Trash2, FolderKanban,
  Target, Search, GripVertical, Download,
  Pencil, Move, Check, FolderOpen, ArrowLeftRight,
} from 'lucide-react'
import {
  getGalleryBoards, uploadGalleryImage, deleteGalleryPin,
  moveGalleryPin, reorderGalleryPins, reorderGallerySections,
  updateGalleryPinMeta, syncGalleryFromExistingFiles, migratePinOrderToDomain,
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
  const [uploadModal, setUploadModal] = useState<{
    doctype: string; docname: string; label: string;
    boardId: string; sectionId: string;
  } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [reorderMode, setReorderMode] = useState(false)
  const [editingPin, setEditingPin] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [movePinModal, setMovePinModal] = useState<{ pinName: string; currentBoard: string; currentSection: string | null; pinImageUrl?: string } | null>(null)
  const [moveTargetBoard, setMoveTargetBoard] = useState<string>('')
  const [moveTargetSection, setMoveTargetSection] = useState<string>('')
  const [movingPin, setMovingPin] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragItem = useRef<string | null>(null)
  const sectionDragItem = useRef<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const resp = await getGalleryBoards()
      const d = resp?.data
      setBoards(d?.boards || [])
      setOrphanPins(d?.orphan_pins || [])
    } catch { setBoards([]); setOrphanPins([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { if (boards.length > 0 && !expandedBoard) setExpandedBoard(boards[0].board_id) }, [boards, expandedBoard])

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
      await uploadGalleryImage(dataUrl, file.name, uploadModal.doctype, uploadModal.docname, uploadModal.boardId, uploadModal.sectionId)
      await fetchData()
    } catch (err) { console.error('[hambaft] gallery upload failed', err) }
    finally {
      setUploading(false); setUploadModal(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (pinName: string) => {
    try { await deleteGalleryPin(pinName); await fetchData() }
    catch { console.error('[hambaft] gallery delete failed') }
  }

  const handleReorder = async (pins: GalleryPin[]) => {
    const items = pins.map((p, idx) => ({ pin_name: p.name, sort_order: idx }))
    try { await reorderGalleryPins(items) } catch { /* silent */ }
  }

  const handleSaveCaption = async (pinName: string) => {
    try { await updateGalleryPinMeta(pinName, editCaption); await fetchData() } catch { /* silent */ }
    setEditingPin(null)
  }

  const handleMovePin = async () => {
    if (!movePinModal || !moveTargetBoard) return
    setMovingPin(true)
    try {
      await moveGalleryPin(movePinModal.pinName, moveTargetBoard, moveTargetSection || undefined)
      await fetchData()
      setMovePinModal(null)
      setMoveTargetBoard('')
      setMoveTargetSection('')
    } catch (err) { console.error('[hambaft] move pin failed', err) }
    finally { setMovingPin(false) }
  }

  const openMovePinModal = (pinName: string, boardId: string, sectionName: string | null, imageUrl?: string) => {
    setMovePinModal({ pinName, currentBoard: boardId, currentSection: sectionName, pinImageUrl: imageUrl })
    setMoveTargetBoard(boardId)
    setMoveTargetSection(sectionName || '')
  }

  const findPinLocation = (pinName: string): { boardId: string; sectionName: string | null } => {
    for (const board of boards) {
      if (board.board_pins.some(p => p.name === pinName)) return { boardId: board.board_id, sectionName: null }
      for (const section of board.sections) {
        if (section.pins.some(p => p.name === pinName)) return { boardId: board.board_id, sectionName: section.name }
      }
    }
    return { boardId: '', sectionName: null }
  }

  const handleSectionReorder = async (boardId: string, sections: GallerySection[]) => {
    const sectionOrder = sections.map(s => s.name)
    try { await reorderGallerySections(boardId, sectionOrder) } catch { /* silent */ }
  }

  const handleSync = async () => {
    try { await migratePinOrderToDomain(); await syncGalleryFromExistingFiles(); await fetchData() }
    catch { try { await syncGalleryFromExistingFiles(); await fetchData() } catch { /* silent */ } }
  }

  const filteredBoards = useMemo(() => {
    if (!search.trim()) return boards
    const q = search.trim().toLowerCase()
    return boards.filter(b =>
      b.board_title.toLowerCase().includes(q) ||
      b.sections.some(s => s.section_title?.toLowerCase().includes(q)) ||
      b.sections.some(s => s.pins.some(p => p.source_title?.toLowerCase().includes(q)))
    )
  }, [boards, search])

  const totalImages = useMemo(() => {
    let c = orphanPins.length
    boards.forEach(b => { c += b.board_pins.length; b.sections.forEach(s => { c += s.pins.length }) })
    return c
  }, [boards, orphanPins])

  const handleDragStart = (pinName: string) => { dragItem.current = pinName }
  const handleDragOver = (e: React.DragEvent, targetPinName: string, pins: GalleryPin[], setter: (p: GalleryPin[]) => void) => {
    e.preventDefault()
    if (!dragItem.current || dragItem.current === targetPinName) return
    const fromIdx = pins.findIndex(p => p.name === dragItem.current)
    const toIdx = pins.findIndex(p => p.name === targetPinName)
    if (fromIdx === -1 || toIdx === -1) return
    const newPins = [...pins]
    const [moved] = newPins.splice(fromIdx, 1)
    newPins.splice(toIdx, 0, moved)
    setter(newPins)
  }
  const handleDragEnd = (pins: GalleryPin[]) => { dragItem.current = null; handleReorder(pins) }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdf9f2_0%,#f3ebdf_100%)] dark:bg-[linear-gradient(180deg,#121411_0%,#1B1D16_100%)] overflow-x-hidden" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#F9F6EE]/80 dark:bg-[#1B1D16]/80 backdrop-blur-xl border-b border-[#E6DFD3]/40 dark:border-[#3D4133]/40">
        <div className="flex items-center gap-3 px-3 py-2.5">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-lg text-[#8D7F72] dark:text-[#9D978B] hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5 cursor-pointer transition-all">
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <ImageIcon className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A]" />
          <h1 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">گالری</h1>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A]">{totalImages}</span>
          <div className="flex-1" />
          <button onClick={() => setReorderMode(!reorderMode)}
            className={`p-1.5 rounded-lg cursor-pointer transition-all ${reorderMode ? 'bg-[#7C8363]/15 dark:bg-[#9ECE9A]/15 text-[#7C8363] dark:text-[#9ECE9A]' : 'text-[#8D7F72] dark:text-[#9D978B] hover:bg-[#7C8363]/5'}`}
            title="مرتب‌سازی"><GripVertical className="w-4 h-4" /></button>
        </div>
        <div className="px-3 pb-2.5">
          <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#1B1D16] rounded-lg border border-[#E6DFD3]/60 dark:border-[#3D4133]/60">
            <Search className="w-3.5 h-3.5 text-[#8D7F72] dark:text-[#9D978B] shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجو..."
              className="flex-1 bg-transparent text-[11px] text-[#2D3025] dark:text-[#E8ECE0] placeholder:text-[#D6CFC3] dark:placeholder:text-[#3D4133] focus:outline-none" />
          </div>
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      {/* Content */}
      <div className="px-3 py-3 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-[#7C8363]/30 dark:border-[#9ECE9A]/30 border-t-[#7C8363] dark:border-t-[#9ECE9A] rounded-full animate-spin" />
            <span className="text-[11px] text-[#8D7F72] dark:text-[#9D978B]">در حال بارگذاری...</span>
          </div>
        ) : filteredBoards.length === 0 && orphanPins.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <ImageIcon className="w-12 h-12 text-[#E6DFD3] dark:text-[#3D4133]" />
            <p className="text-sm font-bold text-[#2D3025] dark:text-[#E8ECE0]">هنوز تصویری نیست</p>
            <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B]">تصاویر تسک‌ها و پروژه‌هاتون اینجا نمایش داده می‌شه</p>
            <button onClick={handleSync} className="px-4 py-2 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] rounded-full text-[10px] font-bold cursor-pointer">آپدیت گالری</button>
          </div>
        ) : (
          <>
            {filteredBoards.map(board => {
              const isExpanded = expandedBoard === board.board_id
              return (
                <div key={board.board_id} className="bg-white dark:bg-[#1B1D16] rounded-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60 overflow-hidden shadow-sm">
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
                    <div className="flex items-center gap-1.5">
                      <button onClick={e => { e.stopPropagation(); setUploadModal({ doctype: 'Hambaft Goal', docname: board.goal_id || '', label: board.board_title, boardId: board.board_id, sectionId: '' }); setTimeout(() => fileInputRef.current?.click(), 100) }}
                        className="p-1.5 rounded-lg text-[#8D7F72] dark:text-[#9D978B] hover:bg-[#7C8363]/5 dark:hover:bg-[#9ECE9A]/5 cursor-pointer"><Plus className="w-3.5 h-3.5" /></button>
                      <ChevronDown className={`w-4 h-4 text-[#8D7F72] dark:text-[#9D978B] transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                    </div>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
                        <div className="px-3 pb-3 space-y-5">
                          {board.board_pins.length > 0 && (
                            <PinMasonry pins={board.board_pins} onPinClick={reorderMode ? undefined : setLightboxPin}
                              onDelete={handleDelete} onReorder={handleReorder} reorderMode={reorderMode}
                              onEditCaption={(pin) => { setEditingPin(pin.name); setEditCaption(pin.caption || '') }}
                              onMovePin={(pin) => openMovePinModal(pin.name, board.board_id, null, pin.image_url)}
                              dragItem={dragItem} onDragStart={handleDragStart}
                              onDragOver={(e, target, pins, set) => handleDragOver(e, target, pins, (newPins) => {
                                setBoards(prev => prev.map(b => b.board_id === board.board_id ? { ...b, board_pins: newPins } : b))
                              })}
                              onDragEnd={(pins) => handleDragEnd(pins)} />
                          )}
                          {board.sections.map((section, secIdx) => (
                            <div key={section.name}
                              draggable={reorderMode}
                              onDragStart={() => { sectionDragItem.current = section.name }}
                              onDragOver={e => {
                                e.preventDefault()
                                if (!sectionDragItem.current || sectionDragItem.current === section.name) return
                                const fromIdx = board.sections.findIndex(s => s.name === sectionDragItem.current)
                                const toIdx = secIdx
                                if (fromIdx === -1) return
                                setBoards(prev => prev.map(b => {
                                  if (b.board_id !== board.board_id) return b
                                  const newSections = [...b.sections]
                                  const [moved] = newSections.splice(fromIdx, 1)
                                  newSections.splice(toIdx, 0, moved)
                                  return { ...b, sections: newSections }
                                }))
                              }}
                              onDragEnd={() => {
                                sectionDragItem.current = null
                                const currentBoard = boards.find(b => b.board_id === board.board_id)
                                if (currentBoard) handleSectionReorder(board.board_id, currentBoard.sections)
                              }}
                            >
                              <div className={`flex items-center gap-2 mb-2.5 ${reorderMode ? 'cursor-grab bg-[#F9F6EE]/60 dark:bg-[#3D4133]/30 rounded-lg px-2 py-1.5 -mx-2' : ''}`}>
                                {reorderMode && <GripVertical className="w-3 h-3 text-[#8D7F72] dark:text-[#9D978B] shrink-0" />}
                                <FolderKanban className="w-3.5 h-3.5 text-[#8D7F72] dark:text-[#9D978B] shrink-0" />
                                <span className="text-[11px] font-bold text-[#8D7F72] dark:text-[#9D978B]">{section.title}</span>
                                <span className="text-[8px] font-bold text-[#9D978B]">({section.pins.length})</span>
                                <div className="flex-1" />
                                <button onClick={() => { setUploadModal({ doctype: 'Hambaft Project', docname: section.project || '', label: section.title, boardId: board.board_id, sectionId: section.name }); setTimeout(() => fileInputRef.current?.click(), 100) }}
                                  className="p-1 rounded text-[#8D7F72] dark:text-[#9D978B] hover:text-[#7C8363] dark:hover:text-[#9ECE9A] cursor-pointer"><Plus className="w-3 h-3" /></button>
                              </div>
                              <PinMasonry pins={section.pins} onPinClick={reorderMode ? undefined : setLightboxPin}
                                onDelete={handleDelete} onReorder={handleReorder} reorderMode={reorderMode}
                                showTaskName onEditCaption={(pin) => { setEditingPin(pin.name); setEditCaption(pin.caption || '') }}
                                onMovePin={(pin) => openMovePinModal(pin.name, board.board_id, section.name, pin.image_url)}
                                dragItem={dragItem} onDragStart={handleDragStart}
                                onDragOver={(e, target, pins, set) => handleDragOver(e, target, pins, (newPins) => {
                                  setBoards(prev => prev.map(b => b.board_id === board.board_id ? {
                                    ...b, sections: b.sections.map(s => s.name === section.name ? { ...s, pins: newPins } : s)
                                  } : b))
                                })}
                                onDragEnd={(pins) => handleDragEnd(pins)} />
                            </div>
                          ))}
                          {board.board_pins.length === 0 && board.sections.length === 0 && (
                            <div className="text-[10px] text-[#9D978B] text-center py-4">هنوز تصویری نیست</div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
            {orphanPins.length > 0 && (
              <div className="bg-white dark:bg-[#1B1D16] rounded-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60 overflow-hidden shadow-sm">
                <div className="px-4 py-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#8D7F72] dark:text-[#9D978B]" />
                  <span className="text-[12px] font-black text-[#2D3025] dark:text-[#E8ECE0]">سایر تصاویر</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A]">{orphanPins.length}</span>
                </div>
                <div className="px-3 pb-3">
                  <PinMasonry pins={orphanPins} onPinClick={setLightboxPin} onDelete={handleDelete}
                    onReorder={handleReorder} onEditCaption={(pin) => { setEditingPin(pin.name); setEditCaption(pin.caption || '') }}
                    onMovePin={(pin) => openMovePinModal(pin.name, '', null, pin.image_url)}
                    dragItem={dragItem} onDragStart={handleDragStart}
                    onDragOver={(e, target, pins, set) => handleDragOver(e, target, pins, setOrphanPins)}
                    onDragEnd={(pins) => handleDragEnd(pins)} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {uploadModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setUploadModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1B1D16] rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[#7C8363] dark:text-[#9ECE9A]" />
                </div>
                <h3 className="text-sm font-black text-[#2D3025] dark:text-[#E8ECE0]">آپلود تصویر</h3>
                <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] mt-1">{uploadModal.label}</p>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="mt-4 px-6 py-2.5 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] rounded-full text-[11px] font-bold cursor-pointer hover:opacity-90 disabled:opacity-50 shadow-sm">
                  {uploading ? 'در حال آپلود...' : 'انتخاب تصویر'}
                </button>
                <button onClick={() => setUploadModal(null)} className="mt-2 block mx-auto text-[10px] text-[#8D7F72] dark:text-[#9D978B] cursor-pointer">انصراف</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxPin(null)}>
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="relative max-w-4xl max-h-[90vh] w-full">
              <img src={lightboxPin.image_url} alt="" className="max-w-full max-h-[85vh] mx-auto object-contain rounded-lg" onClick={e => e.stopPropagation()} />
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent rounded-b-lg" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between">
                  <div>
                    {lightboxPin.source_title && <span className="text-[11px] font-bold text-white">{lightboxPin.source_title}</span>}
                    <span className="text-[9px] text-white/50 block mt-0.5">
                      {lightboxPin.source_type === 'Task' ? 'تسک' : lightboxPin.source_type === 'Hambaft Project' ? 'پروژه' : lightboxPin.source_type === 'Hambaft Goal' ? 'هدف' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={lightboxPin.image_url} download target="_blank" rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer"><Download className="w-3.5 h-3.5" /></a>
                    <button onClick={() => { const loc = findPinLocation(lightboxPin.name); openMovePinModal(lightboxPin.name, loc.boardId, loc.sectionName, lightboxPin.image_url); setLightboxPin(null) }}
                      className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer" title="انتقال"><ArrowLeftRight className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { handleDelete(lightboxPin.name); setLightboxPin(null) }}
                      className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-red-500/80 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </div>
            </motion.div>
            <button onClick={() => setLightboxPin(null)} className="absolute top-4 left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 cursor-pointer"><X className="w-5 h-5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Caption Edit Modal */}
      <AnimatePresence>
        {editingPin && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setEditingPin(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1B1D16] rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60">
              <h3 className="text-[12px] font-black text-[#2D3025] dark:text-[#E8ECE0] mb-3">ویرایش عنوان</h3>
              <input value={editCaption} onChange={e => setEditCaption(e.target.value)}
                className="w-full px-3 py-2 bg-[#F9F6EE] dark:bg-[#3D4133]/30 rounded-lg text-[11px] text-[#2D3025] dark:text-[#E8ECE0] focus:outline-none border border-[#E6DFD3] dark:border-[#3D4133]"
                placeholder="عنوان تصویر..." autoFocus />
              <div className="flex items-center gap-2 mt-3 justify-end">
                <button onClick={() => setEditingPin(null)} className="px-3 py-1.5 text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] cursor-pointer">انصراف</button>
                <button onClick={() => handleSaveCaption(editingPin)} className="px-4 py-1.5 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] rounded-lg text-[10px] font-bold cursor-pointer">ذخیره</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move Pin Modal */}
      <AnimatePresence>
        {movePinModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => { setMovePinModal(null); setMoveTargetBoard(''); setMoveTargetSection('') }}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-[#1B1D16] rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-[#E6DFD3]/60 dark:border-[#3D4133]/60 max-h-[80vh] flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A]" />
                </div>
                <div>
                  <h3 className="text-[12px] font-black text-[#2D3025] dark:text-[#E8ECE0]">انتقال تصویر</h3>
                  <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B]">مقصد جدید رو انتخاب کن</p>
                </div>
              </div>

              {movePinModal.pinImageUrl && (
                <div className="mb-3 flex justify-center">
                  <img src={movePinModal.pinImageUrl} alt="" className="w-16 h-16 rounded-lg object-cover border border-[#E6DFD3] dark:border-[#3D4133]" />
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {boards.map(board => {
                  const isCurrentBoard = board.board_id === movePinModal.currentBoard
                  const isSelectedBoard = board.board_id === moveTargetBoard
                  return (
                    <div key={board.board_id}>
                      <button onClick={() => { setMoveTargetBoard(board.board_id); if (moveTargetSection && !board.sections.find(s => s.name === moveTargetSection)) setMoveTargetSection('') }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-right ${
                          isSelectedBoard
                            ? 'bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 ring-1 ring-[#7C8363]/30 dark:ring-[#9ECE9A]/30'
                            : 'hover:bg-[#F9F6EE] dark:hover:bg-[#3D4133]/30'
                        }`}>
                        {board.cover_url ? (
                          <img src={board.cover_url} alt="" className="w-7 h-7 rounded-md object-cover shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-md bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 flex items-center justify-center shrink-0">
                            <Target className="w-3.5 h-3.5 text-[#7C8363] dark:text-[#9ECE9A]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-bold text-[#2D3025] dark:text-[#E8ECE0] block truncate">{board.board_title}</span>
                          <span className="text-[8px] text-[#8D7F72] dark:text-[#9D978B]">{board.pin_count} تصویر</span>
                        </div>
                        {isCurrentBoard && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A] shrink-0">فعلی</span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 text-[#8D7F72] dark:text-[#9D978B] transition-transform shrink-0 ${isSelectedBoard ? '' : '-rotate-90'}`} />
                      </button>

                      {isSelectedBoard && board.sections.length > 0 && (
                        <div className="mr-6 mt-1 space-y-0.5">
                          {/* Board-level option */}
                          <button onClick={() => setMoveTargetSection('')}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-right ${
                              moveTargetSection === ''
                                ? 'bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 ring-1 ring-[#7C8363]/30 dark:ring-[#9ECE9A]/30'
                                : 'hover:bg-[#F9F6EE] dark:hover:bg-[#3D4133]/30'
                            }`}>
                            <FolderOpen className="w-3 h-3 text-[#8D7F72] dark:text-[#9D978B] shrink-0" />
                            <span className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">سطح بورد</span>
                            {isCurrentBoard && !movePinModal.currentSection && (
                              <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A] mr-auto">فعلی</span>
                            )}
                          </button>
                          {board.sections.map(section => {
                            const isCurrentSection = isCurrentBoard && section.name === movePinModal.currentSection
                            return (
                              <button key={section.name} onClick={() => setMoveTargetSection(section.name)}
                                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-right ${
                                  moveTargetSection === section.name
                                    ? 'bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 ring-1 ring-[#7C8363]/30 dark:ring-[#9ECE9A]/30'
                                    : 'hover:bg-[#F9F6EE] dark:hover:bg-[#3D4133]/30'
                                }`}>
                                <FolderKanban className="w-3 h-3 text-[#8D7F72] dark:text-[#9D978B] shrink-0" />
                                <span className="text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">{section.title}</span>
                                <span className="text-[7px] text-[#9D978B]">({section.pin_count})</span>
                                {isCurrentSection && (
                                  <span className="text-[7px] font-bold px-1 py-0.5 rounded bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10 text-[#7C8363] dark:text-[#9ECE9A] mr-auto">فعلی</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#E6DFD3]/40 dark:border-[#3D4133]/40">
                <button onClick={() => { setMovePinModal(null); setMoveTargetBoard(''); setMoveTargetSection('') }}
                  className="px-3 py-1.5 text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B] cursor-pointer">انصراف</button>
                <div className="flex-1" />
                <button onClick={handleMovePin} disabled={movingPin || !moveTargetBoard || (moveTargetBoard === movePinModal.currentBoard && ((moveTargetSection || '') === (movePinModal.currentSection || '')))}
                  className="px-4 py-1.5 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] rounded-lg text-[10px] font-bold cursor-pointer hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                  {movingPin ? 'در حال انتقال...' : 'انتقال'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Masonry Grid ───────────────────────────────────────────
function PinMasonry({ pins, onPinClick, onDelete, onReorder, showTaskName, reorderMode, onEditCaption, onMovePin, dragItem, onDragStart, onDragOver, onDragEnd }: {
  pins: GalleryPin[]
  onPinClick?: (pin: GalleryPin) => void
  onDelete: (pinName: string) => void
  onReorder: (pins: GalleryPin[]) => void
  showTaskName?: boolean
  reorderMode?: boolean
  onEditCaption?: (pin: GalleryPin) => void
  onMovePin?: (pin: GalleryPin) => void
  dragItem: React.MutableRefObject<string | null>
  onDragStart: (pinName: string) => void
  onDragOver: (e: React.DragEvent, targetPinName: string, pins: GalleryPin[], setter: (p: GalleryPin[]) => void) => void
  onDragEnd: (pins: GalleryPin[]) => void
}) {
  const [cols, setCols] = useState(2)
  const [localPins, setLocalPins] = useState(pins)

  useEffect(() => { setLocalPins(pins) }, [pins])
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

  const columns = useMemo(() => {
    const c: GalleryPin[][] = Array.from({ length: cols }, () => [])
    localPins.forEach((pin, idx) => c[idx % cols].push(pin))
    return c
  }, [localPins, cols])

  return (
    <div className="flex gap-2">
      {columns.map((col, ci) => (
        <div key={ci} className="flex-1 space-y-2">
          {col.map(pin => (
            <div key={pin.name}
              draggable={reorderMode}
              onDragStart={() => onDragStart(pin.name)}
              onDragOver={e => onDragOver(e, pin.name, localPins, setLocalPins)}
              onDragEnd={() => onDragEnd(localPins)}
              className={`group relative rounded-xl overflow-hidden bg-[#F9F6EE] dark:bg-[#3D4133]/30 cursor-pointer transition-all ${reorderMode ? 'ring-1 ring-[#7C8363]/30 dark:ring-[#9ECE9A]/30' : ''}`}
              onClick={() => onPinClick?.(pin)}>
              <img src={pin.image_url} alt="" className="w-full object-cover rounded-xl transition-transform group-hover:scale-[1.02]" loading="lazy" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl" />
              {showTaskName && pin.source_title && (
                <div className="absolute bottom-0 left-0 right-0 px-2 py-2 bg-gradient-to-t from-black/60 to-transparent rounded-b-xl">
                  <span className="text-[9px] font-bold text-white truncate block">{pin.source_title}</span>
                </div>
              )}
              {pin.caption && !showTaskName && (
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/50 to-transparent rounded-b-xl">
                  <span className="text-[8px] text-white/80 truncate block">{pin.caption}</span>
                </div>
              )}
              <div className="absolute top-1.5 left-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {reorderMode && <div className="p-1 rounded-md bg-black/40 text-white cursor-grab"><GripVertical className="w-3 h-3" /></div>}
                <button onClick={e => { e.stopPropagation(); onEditCaption?.(pin) }}
                  className="p-1 rounded-md bg-black/40 text-white hover:bg-white/20 cursor-pointer"><Pencil className="w-3 h-3" /></button>
                {onMovePin && (
                  <button onClick={e => { e.stopPropagation(); onMovePin(pin) }}
                    className="p-1 rounded-md bg-black/40 text-white hover:bg-white/20 cursor-pointer" title="انتقال"><ArrowLeftRight className="w-3 h-3" /></button>
                )}
                <button onClick={e => { e.stopPropagation(); onDelete(pin.name) }}
                  className="p-1 rounded-md bg-black/40 text-white hover:bg-red-500/80 cursor-pointer"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
