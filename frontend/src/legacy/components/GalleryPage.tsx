/**
 * GalleryPage — hierarchical Pinterest-style gallery for Hambaft.
 *
 * Information architecture:
 * Goal => Board
 * Project => Section
 * Task / direct uploads => Pins
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  Download,
  FolderKanban,
  FolderOpen,
  GripVertical,
  Image as ImageIcon,
  Layers3,
  Move,
  Pencil,
  Pin,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
  ArrowUpRight,
} from 'lucide-react'
import {
  deleteGalleryPin,
  deleteGalleryPinWithFile,
  getGalleryBoards,
  migratePinOrderToDomain,
  moveGalleryPin,
  reorderGalleryPins,
  reorderGallerySections,
  syncGalleryFromExistingFiles,
  updateGalleryPinMeta,
  uploadGalleryImage,
  type GalleryBoard,
  type GalleryPin,
  type GallerySection,
} from '../../app/hambaft-api'

const GALLERY_FOCUS_KEY = 'hambaft-gallery-focus'

type GalleryMode = 'overview' | 'board' | 'section'

type UploadTarget = {
  doctype: string
  docname: string
  label: string
  boardId: string
  sectionId: string
}

type MovePinState = {
  pinName: string
  currentBoard: string
  currentSection: string | null
  pinImageUrl?: string
}

interface GalleryPageProps {
  onBack?: () => void
  onNavigate?: (tab: string, id?: string) => void
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase()
}

function collectBoardPins(board: GalleryBoard): GalleryPin[] {
  return [...board.board_pins, ...board.sections.flatMap((section) => section.pins)]
}

function matchesPinQuery(pin: GalleryPin, query: string) {
  if (!query) return true
  const haystacks = [pin.caption, pin.source_title, pin.image_name, pin.source_type]
  return haystacks.some((value) => String(value || '').toLowerCase().includes(query))
}

function matchesSectionQuery(section: GallerySection, query: string) {
  if (!query) return true
  if (String(section.title || '').toLowerCase().includes(query)) return true
  return section.pins.some((pin) => matchesPinQuery(pin, query))
}

function matchesBoardQuery(board: GalleryBoard, query: string) {
  if (!query) return true
  if (String(board.board_title || '').toLowerCase().includes(query)) return true
  if (board.sections.some((section) => matchesSectionQuery(section, query))) return true
  return board.board_pins.some((pin) => matchesPinQuery(pin, query))
}

function readFocusedGalleryLocation() {
  try {
    const raw = window.sessionStorage.getItem(GALLERY_FOCUS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as { boardId?: string; sectionId?: string }
  } catch {
    return null
  }
}

function clearFocusedGalleryLocation() {
  try {
    window.sessionStorage.removeItem(GALLERY_FOCUS_KEY)
  } catch {
    // no-op
  }
}

export default function GalleryPage({ onBack, onNavigate }: GalleryPageProps) {
  const [boards, setBoards] = useState<GalleryBoard[]>([])
  const [orphanPins, setOrphanPins] = useState<GalleryPin[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [reorderMode, setReorderMode] = useState(false)
  const [galleryNotReady, setGalleryNotReady] = useState(false)
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxPin, setLightboxPin] = useState<GalleryPin | null>(null)
  const [editingPin, setEditingPin] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')
  const [movePinModal, setMovePinModal] = useState<MovePinState | null>(null)
  const [moveTargetBoard, setMoveTargetBoard] = useState('')
  const [moveTargetSection, setMoveTargetSection] = useState('')
  const [movingPin, setMovingPin] = useState(false)
  const [deletePinModal, setDeletePinModal] = useState<{ pinName: string; pinTitle: string } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragItem = useRef<string | null>(null)
  const sectionDragItem = useRef<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getGalleryBoards()
      const data = response?.data
      if (data?.gallery_not_ready) {
        setGalleryNotReady(true)
        setBoards([])
        setOrphanPins([])
      } else {
        setGalleryNotReady(false)
        setBoards(data?.boards || [])
        setOrphanPins(data?.orphan_pins || [])
      }
    } catch {
      setBoards([])
      setOrphanPins([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (!boards.length) return
    const focused = readFocusedGalleryLocation()
    if (focused?.boardId && boards.some((board) => board.board_id === focused.boardId)) {
      setActiveBoardId(focused.boardId)
      const board = boards.find((item) => item.board_id === focused.boardId)
      if (focused.sectionId && board?.sections.some((section) => section.name === focused.sectionId)) {
        setActiveSectionId(focused.sectionId)
      } else {
        setActiveSectionId(null)
      }
      clearFocusedGalleryLocation()
    }
  }, [boards])

  useEffect(() => {
    if (activeBoardId && !boards.some((board) => board.board_id === activeBoardId)) {
      setActiveBoardId(null)
      setActiveSectionId(null)
    }
  }, [boards, activeBoardId])

  const currentBoard = useMemo(
    () => boards.find((board) => board.board_id === activeBoardId) || null,
    [boards, activeBoardId],
  )

  const currentSection = useMemo(
    () => currentBoard?.sections.find((section) => section.name === activeSectionId) || null,
    [currentBoard, activeSectionId],
  )

  const mode: GalleryMode = currentSection ? 'section' : currentBoard ? 'board' : 'overview'
  const query = normalizeQuery(search)

  const filteredBoards = useMemo(
    () => boards.filter((board) => matchesBoardQuery(board, query)),
    [boards, query],
  )

  const visibleBoardPins = useMemo(
    () => (currentBoard ? currentBoard.board_pins.filter((pin) => matchesPinQuery(pin, query)) : []),
    [currentBoard, query],
  )

  const visibleSections = useMemo(
    () => (currentBoard ? currentBoard.sections.filter((section) => matchesSectionQuery(section, query)) : []),
    [currentBoard, query],
  )

  const visibleSectionPins = useMemo(
    () => (currentSection ? currentSection.pins.filter((pin) => matchesPinQuery(pin, query)) : []),
    [currentSection, query],
  )

  const totalImages = useMemo(() => {
    return orphanPins.length + boards.reduce((sum, board) => sum + collectBoardPins(board).length, 0)
  }, [boards, orphanPins])

  const totalSections = useMemo(
    () => boards.reduce((sum, board) => sum + board.sections.length, 0),
    [boards],
  )

  const openUploadPicker = (target: UploadTarget) => {
    setUploadTarget(target)
    setTimeout(() => fileInputRef.current?.click(), 60)
  }

  const closeUploadTarget = () => {
    setUploadTarget(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !uploadTarget) return
    setUploading(true)
    try {
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      await uploadGalleryImage(
        dataUrl,
        file.name,
        uploadTarget.doctype,
        uploadTarget.docname,
        uploadTarget.boardId,
        uploadTarget.sectionId,
      )
      await fetchData()
    } catch (error) {
      console.error('[hambaft] gallery upload failed', error)
    } finally {
      setUploading(false)
      closeUploadTarget()
    }
  }

  const handleDeletePin = async (pinName: string, deleteFile = false) => {
    try {
      if (deleteFile) {
        await deleteGalleryPinWithFile(pinName, true)
      } else {
        await deleteGalleryPin(pinName)
      }
      await fetchData()
    } catch (error) {
      console.error('[hambaft] gallery delete failed', error)
    } finally {
      setDeletePinModal(null)
    }
  }

  const handleSaveCaption = async (pinName: string) => {
    try {
      await updateGalleryPinMeta(pinName, editCaption)
      await fetchData()
    } catch (error) {
      console.error('[hambaft] caption update failed', error)
    } finally {
      setEditingPin(null)
      setEditCaption('')
    }
  }

  const handleSyncGallery = async () => {
    try {
      await migratePinOrderToDomain()
      await syncGalleryFromExistingFiles()
      await fetchData()
    } catch {
      try {
        await syncGalleryFromExistingFiles()
        await fetchData()
      } catch (error) {
        console.error('[hambaft] gallery sync failed', error)
      }
    }
  }

  const handleReorderPins = async (pins: GalleryPin[]) => {
    const items = pins.map((pin, index) => ({ pin_name: pin.name, sort_order: index }))
    try {
      await reorderGalleryPins(items)
    } catch (error) {
      console.error('[hambaft] pin reorder failed', error)
    }
  }

  const handleSectionReorder = async (boardId: string, sections: GallerySection[]) => {
    try {
      await reorderGallerySections(boardId, sections.map((section) => section.name))
    } catch (error) {
      console.error('[hambaft] section reorder failed', error)
    }
  }

  const findPinLocation = useCallback((pinName: string) => {
    for (const board of boards) {
      if (board.board_pins.some((pin) => pin.name === pinName)) {
        return { boardId: board.board_id, sectionId: null as string | null }
      }
      for (const section of board.sections) {
        if (section.pins.some((pin) => pin.name === pinName)) {
          return { boardId: board.board_id, sectionId: section.name }
        }
      }
    }
    return { boardId: '', sectionId: null as string | null }
  }, [boards])

  const openMoveModal = (pin: GalleryPin) => {
    const location = findPinLocation(pin.name)
    setMovePinModal({
      pinName: pin.name,
      currentBoard: location.boardId,
      currentSection: location.sectionId,
      pinImageUrl: pin.image_url,
    })
    setMoveTargetBoard(location.boardId)
    setMoveTargetSection(location.sectionId || '')
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
    } catch (error) {
      console.error('[hambaft] move pin failed', error)
    } finally {
      setMovingPin(false)
    }
  }

  const handleDragStart = (pinName: string) => {
    dragItem.current = pinName
  }

  const handleDragOver = (
    event: React.DragEvent,
    targetPinName: string,
    pins: GalleryPin[],
    setter: (nextPins: GalleryPin[]) => void,
  ) => {
    event.preventDefault()
    if (!dragItem.current || dragItem.current === targetPinName) return
    const fromIndex = pins.findIndex((pin) => pin.name === dragItem.current)
    const toIndex = pins.findIndex((pin) => pin.name === targetPinName)
    if (fromIndex === -1 || toIndex === -1) return
    const nextPins = [...pins]
    const [movedPin] = nextPins.splice(fromIndex, 1)
    nextPins.splice(toIndex, 0, movedPin)
    setter(nextPins)
  }

  const handleOpenPinSource = (pin: GalleryPin) => {
    if (pin.source_type === 'Task' && pin.source_name) {
      onNavigate?.('task-detail', pin.source_name)
      return
    }
    if (pin.source_type === 'Goal' && pin.source_name) {
      onNavigate?.('goals', pin.source_name)
      return
    }
    const location = findPinLocation(pin.name)
    if (location.boardId) {
      setActiveBoardId(location.boardId)
      setActiveSectionId(location.sectionId)
    }
  }

  const renderEmptyState = () => {
    if (galleryNotReady) {
      return (
        <div className="flex flex-col items-center gap-4 rounded-[28px] border border-orange-200/70 bg-white/80 px-6 py-12 text-center shadow-[0_20px_70px_rgba(169,121,72,0.08)] dark:border-orange-500/20 dark:bg-[#1B1D16]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10">
            <AlertCircle className="h-7 w-7 text-orange-500" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-black text-[#2D3025] dark:text-[#E8ECE0]">گالری هنوز آماده نیست</p>
            <p className="text-[11px] text-[#8D7F72] dark:text-[#9D978B]">
              جدول‌های گالری هنوز روی سایت ساخته نشده‌اند.
            </p>
          </div>
          <code className="rounded-2xl bg-[#F9F6EE] px-4 py-3 text-[10px] font-bold text-[#7C8363] dark:bg-[#3D4133]/40 dark:text-[#9ECE9A]">
            bench --site hambaft.ir migrate
          </code>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center gap-4 rounded-[28px] border border-[#E6DFD3]/70 bg-white/80 px-6 py-14 text-center shadow-[0_20px_70px_rgba(169,121,72,0.08)] dark:border-[#3D4133]/60 dark:bg-[#1B1D16]">
        <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10">
          <ImageIcon className="h-8 w-8 text-[#7C8363] dark:text-[#9ECE9A]" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-black text-[#2D3025] dark:text-[#E8ECE0]">هنوز تصویری اینجا ننشسته</p>
          <p className="text-[11px] text-[#8D7F72] dark:text-[#9D978B]">
            به محض اینکه داخل تسک‌ها یا پروژه‌ها تصویر بگذاری، اینجا به شکل بوردی می‌بینی‌شان.
          </p>
        </div>
        <button
          onClick={handleSyncGallery}
          className="inline-flex items-center gap-2 rounded-full bg-[#121411] px-4 py-2 text-[11px] font-bold text-white transition-opacity hover:opacity-90 dark:bg-[#9ECE9A] dark:text-[#121411]"
        >
          <Sparkles className="h-3.5 w-3.5" />
          بازسازی گالری
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fdf9f2_0%,#f4ecdf_42%,#f7f2e9_100%)] pb-10 dark:bg-[linear-gradient(180deg,#121411_0%,#191B16_100%)]" dir="rtl">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

      <div className="sticky top-0 z-30 border-b border-[#E6DFD3]/50 bg-[#FBF7F0]/88 backdrop-blur-xl dark:border-[#3D4133]/60 dark:bg-[#171914]/88">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-3 px-4 py-3 lg:px-6">
          <button
            onClick={() => {
              if (mode === 'section') {
                setActiveSectionId(null)
                return
              }
              if (mode === 'board') {
                setActiveBoardId(null)
                setActiveSectionId(null)
                return
              }
              onBack?.()
            }}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#E6DFD3]/70 bg-white/80 text-[#8D7F72] transition-colors hover:border-[#7C8363]/30 hover:text-[#7C8363] dark:border-[#3D4133]/60 dark:bg-[#1B1D16] dark:text-[#9D978B] dark:hover:border-[#9ECE9A]/30 dark:hover:text-[#9ECE9A]"
          >
            <ArrowRight className="h-4 w-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#9D978B] dark:text-[#8D7F72]">
              <span>گالری</span>
              {mode !== 'overview' && <ChevronLeft className="h-3 w-3" />}
              {currentBoard && <span className="truncate">{currentBoard.board_title}</span>}
              {mode === 'section' && (
                <>
                  <ChevronLeft className="h-3 w-3" />
                  <span className="truncate">{currentSection?.title}</span>
                </>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <h1 className="text-[18px] font-black text-[#2D3025] dark:text-[#E8ECE0]">
                {mode === 'overview' ? 'بوردهای تصویری' : mode === 'board' ? 'ساختار هدف' : 'پروژه تصویری'}
              </h1>
              <span className="rounded-full bg-[#7C8363]/10 px-2 py-0.5 text-[9px] font-black text-[#7C8363] dark:bg-[#9ECE9A]/10 dark:text-[#9ECE9A]">
                {mode === 'overview'
                  ? `${filteredBoards.length} هدف`
                  : mode === 'board'
                    ? `${visibleSections.length} پروژه`
                    : `${visibleSectionPins.length} تصویر`}
              </span>
            </div>
          </div>

          <div className="mr-auto hidden items-center gap-2 md:flex">
            <div className="flex items-center gap-2 rounded-2xl border border-[#E6DFD3]/70 bg-white/80 px-3 py-2 dark:border-[#3D4133]/60 dark:bg-[#1B1D16]">
              <Search className="h-4 w-4 text-[#8D7F72] dark:text-[#9D978B]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={mode === 'overview' ? 'جستجو بین هدف‌ها و پروژه‌ها...' : 'جستجو در تصاویر و پروژه‌ها...'}
                className="w-[240px] bg-transparent text-[11px] font-semibold text-[#2D3025] outline-none placeholder:text-[#C1B8AA] dark:text-[#E8ECE0] dark:placeholder:text-[#6B6D63]"
              />
            </div>
          </div>

          <button
            onClick={() => setReorderMode((value) => !value)}
            className={`hidden h-10 w-10 items-center justify-center rounded-2xl border transition-colors md:flex ${
              reorderMode
                ? 'border-[#7C8363]/20 bg-[#7C8363]/10 text-[#7C8363] dark:border-[#9ECE9A]/20 dark:bg-[#9ECE9A]/10 dark:text-[#9ECE9A]'
                : 'border-[#E6DFD3]/70 bg-white/80 text-[#8D7F72] hover:border-[#7C8363]/20 hover:text-[#7C8363] dark:border-[#3D4133]/60 dark:bg-[#1B1D16] dark:text-[#9D978B] dark:hover:border-[#9ECE9A]/20 dark:hover:text-[#9ECE9A]'
            }`}
            title="مرتب‌سازی"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>

        <div className="mx-auto w-full max-w-[1440px] px-4 pb-3 md:hidden lg:px-6">
          <div className="flex items-center gap-2 rounded-2xl border border-[#E6DFD3]/70 bg-white/80 px-3 py-2 dark:border-[#3D4133]/60 dark:bg-[#1B1D16]">
            <Search className="h-4 w-4 text-[#8D7F72] dark:text-[#9D978B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جستجو..."
              className="w-full bg-transparent text-[11px] font-semibold text-[#2D3025] outline-none placeholder:text-[#C1B8AA] dark:text-[#E8ECE0] dark:placeholder:text-[#6B6D63]"
            />
            <button
              onClick={() => setReorderMode((value) => !value)}
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                reorderMode
                  ? 'bg-[#7C8363]/10 text-[#7C8363] dark:bg-[#9ECE9A]/10 dark:text-[#9ECE9A]'
                  : 'text-[#8D7F72] dark:text-[#9D978B]'
              }`}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1440px] px-4 pt-5 lg:px-6">
        {loading ? (
          <div className="flex min-h-[45vh] flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-[#7C8363]/20 border-t-[#7C8363] animate-spin dark:border-[#9ECE9A]/20 dark:border-t-[#9ECE9A]" />
            <span className="text-[11px] font-bold text-[#8D7F72] dark:text-[#9D978B]">در حال ساختن نمای گالری...</span>
          </div>
        ) : mode === 'overview' ? (
          <>
            <GalleryOverviewHero
              boardsCount={filteredBoards.length}
              totalImages={totalImages}
              totalSections={totalSections}
              orphanCount={orphanPins.length}
              onSync={handleSyncGallery}
            />

            {filteredBoards.length === 0 && orphanPins.length === 0 ? (
              <div className="mt-6">{renderEmptyState()}</div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredBoards.map((board) => (
                  <BoardCard
                    key={board.board_id}
                    board={board}
                    onOpenBoard={() => {
                      setActiveBoardId(board.board_id)
                      setActiveSectionId(null)
                    }}
                    onUpload={() =>
                      openUploadPicker({
                        doctype: 'Goal',
                        docname: board.goal_id || '',
                        label: board.board_title,
                        boardId: board.board_id,
                        sectionId: '',
                      })
                    }
                    onOpenGoal={() => board.goal_id && onNavigate?.('goals', board.goal_id)}
                  />
                ))}
              </div>
            )}

            {orphanPins.length > 0 && (
              <div className="mt-8 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-black text-[#2D3025] dark:text-[#E8ECE0]">تصاویر بدون بورد</p>
                    <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B]">مواردی که هنوز به هدف یا پروژه‌ای وصل نشده‌اند.</p>
                  </div>
                  <span className="rounded-full bg-[#121411] px-2.5 py-1 text-[9px] font-black text-white dark:bg-[#9ECE9A] dark:text-[#121411]">
                    {orphanPins.length}
                  </span>
                </div>
                <PinMasonry
                  pins={orphanPins}
                  reorderMode={reorderMode}
                  showSourceBadge
                  onPinClick={setLightboxPin}
                  onDelete={(pin) => setDeletePinModal({ pinName: pin.name, pinTitle: pin.caption || pin.source_title || pin.image_name })}
                  onEditCaption={(pin) => {
                    setEditingPin(pin.name)
                    setEditCaption(pin.caption || '')
                  }}
                  onMovePin={openMoveModal}
                  onOpenSource={handleOpenPinSource}
                  dragItem={dragItem}
                  onDragStart={handleDragStart}
                  onDragOver={(event, targetPinName, pins, setter) => handleDragOver(event, targetPinName, pins, setOrphanPins)}
                  onDragEnd={(pins) => handleReorderPins(pins)}
                />
              </div>
            )}
          </>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
            <GallerySidebar
              board={currentBoard}
              visibleSections={visibleSections}
              activeSectionId={activeSectionId}
              totalImages={currentBoard ? collectBoardPins(currentBoard).length : 0}
              onOpenOverview={() => {
                setActiveBoardId(null)
                setActiveSectionId(null)
              }}
              onSelectSection={(sectionId) => setActiveSectionId(sectionId)}
              onUploadBoard={() =>
                currentBoard &&
                openUploadPicker({
                  doctype: 'Goal',
                  docname: currentBoard.goal_id || '',
                  label: currentBoard.board_title,
                  boardId: currentBoard.board_id,
                  sectionId: '',
                })
              }
            />

            <div className="space-y-4">
              {currentBoard && (
                <BoardHero
                  board={currentBoard}
                  mode={mode}
                  currentSection={currentSection}
                  onUploadBoard={() =>
                    openUploadPicker({
                      doctype: 'Goal',
                      docname: currentBoard.goal_id || '',
                      label: currentBoard.board_title,
                      boardId: currentBoard.board_id,
                      sectionId: '',
                    })
                  }
                  onUploadSection={() =>
                    currentSection &&
                    openUploadPicker({
                      doctype: 'Hambaft Project',
                      docname: currentSection.project || '',
                      label: currentSection.title,
                      boardId: currentBoard.board_id,
                      sectionId: currentSection.name,
                    })
                  }
                  onOpenGoal={() => currentBoard.goal_id && onNavigate?.('goals', currentBoard.goal_id)}
                />
              )}

              {mode === 'board' && currentBoard && (
                <>
                  {visibleBoardPins.length > 0 && (
                    <GallerySurface
                      title="تصاویر سطح هدف"
                      subtitle="تصاویر مستقیمی که روی خود هدف نشسته‌اند."
                    >
                      <PinMasonry
                        pins={visibleBoardPins}
                        reorderMode={reorderMode}
                        showSourceBadge
                        onPinClick={setLightboxPin}
                        onDelete={(pin) => setDeletePinModal({ pinName: pin.name, pinTitle: pin.caption || pin.source_title || pin.image_name })}
                        onEditCaption={(pin) => {
                          setEditingPin(pin.name)
                          setEditCaption(pin.caption || '')
                        }}
                        onMovePin={openMoveModal}
                        onOpenSource={handleOpenPinSource}
                        dragItem={dragItem}
                        onDragStart={handleDragStart}
                        onDragOver={(event, targetPinName, pins, setter) => {
                          handleDragOver(event, targetPinName, pins, (nextPins) => {
                            setBoards((prev) => prev.map((board) => (
                              board.board_id === currentBoard.board_id
                                ? { ...board, board_pins: nextPins }
                                : board
                            )))
                          })
                        }}
                        onDragEnd={(pins) => handleReorderPins(pins)}
                      />
                    </GallerySurface>
                  )}

                  <div className="grid gap-4">
                    {visibleSections.length === 0 ? (
                      <GallerySurface title="پروژه‌ای پیدا نشد" subtitle="این هدف هنوز پروژه‌ی تصویری قابل نمایش ندارد." />
                    ) : (
                      visibleSections.map((section, index) => (
                        <SectionPreviewCard
                          key={section.name}
                          section={section}
                          board={currentBoard}
                          reorderMode={reorderMode}
                          index={index}
                          onOpen={() => setActiveSectionId(section.name)}
                          onUpload={() =>
                            openUploadPicker({
                              doctype: 'Hambaft Project',
                              docname: section.project || '',
                              label: section.title,
                              boardId: currentBoard.board_id,
                              sectionId: section.name,
                            })
                          }
                          onReorderSections={(nextSections) => {
                            setBoards((prev) => prev.map((board) => (
                              board.board_id === currentBoard.board_id
                                ? { ...board, sections: nextSections }
                                : board
                            )))
                          }}
                          sections={currentBoard.sections}
                          sectionDragItem={sectionDragItem}
                          onSectionReorderEnd={(sections) => handleSectionReorder(currentBoard.board_id, sections)}
                        />
                      ))
                    )}
                  </div>
                </>
              )}

              {mode === 'section' && currentBoard && currentSection && (
                <GallerySurface
                  title={`تصاویر ${currentSection.title}`}
                  subtitle="همه‌ی تصویرهایی که از تسک‌های این پروژه وارد گالری شده‌اند."
                >
                  {visibleSectionPins.length === 0 ? (
                    <div className="rounded-[22px] border border-dashed border-[#E6DFD3] px-5 py-10 text-center dark:border-[#3D4133]">
                      <p className="text-[12px] font-bold text-[#2D3025] dark:text-[#E8ECE0]">هنوز تصویری برای این پروژه نداریم</p>
                      <p className="mt-1 text-[10px] text-[#8D7F72] dark:text-[#9D978B]">
                        از جزئیات تسک یا از همین‌جا برای پروژه تصویر آپلود کن.
                      </p>
                    </div>
                  ) : (
                    <PinMasonry
                      pins={visibleSectionPins}
                      reorderMode={reorderMode}
                      showSourceBadge
                      onPinClick={setLightboxPin}
                      onDelete={(pin) => setDeletePinModal({ pinName: pin.name, pinTitle: pin.caption || pin.source_title || pin.image_name })}
                      onEditCaption={(pin) => {
                        setEditingPin(pin.name)
                        setEditCaption(pin.caption || '')
                      }}
                      onMovePin={openMoveModal}
                      onOpenSource={handleOpenPinSource}
                      dragItem={dragItem}
                      onDragStart={handleDragStart}
                      onDragOver={(event, targetPinName, pins, setter) => {
                        handleDragOver(event, targetPinName, pins, (nextPins) => {
                          setBoards((prev) => prev.map((board) => (
                            board.board_id === currentBoard.board_id
                              ? {
                                  ...board,
                                  sections: board.sections.map((section) => (
                                    section.name === currentSection.name ? { ...section, pins: nextPins } : section
                                  )),
                                }
                              : board
                          )))
                        })
                      }}
                      onDragEnd={(pins) => handleReorderPins(pins)}
                    />
                  )}
                </GallerySurface>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {uploadTarget && (
          <OverlayModal onClose={closeUploadTarget}>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[22px] bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10">
                <Upload className="h-6 w-6 text-[#7C8363] dark:text-[#9ECE9A]" />
              </div>
              <h3 className="text-[16px] font-black text-[#2D3025] dark:text-[#E8ECE0]">افزودن تصویر</h3>
              <p className="mt-1 text-[11px] text-[#8D7F72] dark:text-[#9D978B]">{uploadTarget.label}</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#121411] px-5 py-2.5 text-[11px] font-black text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-[#9ECE9A] dark:text-[#121411]"
              >
                <Plus className="h-3.5 w-3.5" />
                {uploading ? 'در حال آپلود...' : 'انتخاب تصویر'}
              </button>
            </div>
          </OverlayModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingPin && (
          <OverlayModal onClose={() => setEditingPin(null)}>
            <h3 className="text-[15px] font-black text-[#2D3025] dark:text-[#E8ECE0]">ویرایش عنوان تصویر</h3>
            <input
              value={editCaption}
              onChange={(event) => setEditCaption(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-[#E6DFD3] bg-[#F9F6EE] px-3 py-3 text-[11px] font-semibold text-[#2D3025] outline-none dark:border-[#3D4133] dark:bg-[#3D4133]/30 dark:text-[#E8ECE0]"
              placeholder="عنوان یا توضیح کوتاه..."
              autoFocus
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setEditingPin(null)} className="px-3 py-1.5 text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]">
                انصراف
              </button>
              <button
                onClick={() => handleSaveCaption(editingPin)}
                className="rounded-full bg-[#121411] px-4 py-2 text-[10px] font-black text-white dark:bg-[#9ECE9A] dark:text-[#121411]"
              >
                ذخیره
              </button>
            </div>
          </OverlayModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {movePinModal && (
          <OverlayModal
            onClose={() => {
              setMovePinModal(null)
              setMoveTargetBoard('')
              setMoveTargetSection('')
            }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10">
                <Move className="h-4 w-4 text-[#7C8363] dark:text-[#9ECE9A]" />
              </div>
              <div>
                <h3 className="text-[15px] font-black text-[#2D3025] dark:text-[#E8ECE0]">انتقال تصویر</h3>
                <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B]">بورد یا پروژه‌ی جدید را انتخاب کن.</p>
              </div>
            </div>

            {movePinModal.pinImageUrl && (
              <div className="mt-4 flex justify-center">
                <img src={movePinModal.pinImageUrl} alt="" className="h-20 w-20 rounded-[22px] object-cover shadow-sm" />
              </div>
            )}

            <div className="mt-4 max-h-[55vh] space-y-2 overflow-y-auto">
              {boards.map((board) => {
                const selectedBoard = moveTargetBoard === board.board_id
                const currentBoardSelected = movePinModal.currentBoard === board.board_id
                return (
                  <div key={board.board_id} className="space-y-1">
                    <button
                      onClick={() => {
                        setMoveTargetBoard(board.board_id)
                        if (!board.sections.find((section) => section.name === moveTargetSection)) {
                          setMoveTargetSection('')
                        }
                      }}
                      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-right transition-all ${
                        selectedBoard
                          ? 'bg-[#7C8363]/10 ring-1 ring-[#7C8363]/20 dark:bg-[#9ECE9A]/10 dark:ring-[#9ECE9A]/20'
                          : 'bg-[#F9F6EE]/80 hover:bg-[#F4EBDD] dark:bg-[#151713] dark:hover:bg-[#23261F]'
                      }`}
                    >
                      {board.cover_url ? (
                        <img src={board.cover_url} alt="" className="h-11 w-11 rounded-[18px] object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-[18px] bg-[#7C8363]/10 dark:bg-[#9ECE9A]/10">
                          <Target className="h-5 w-5 text-[#7C8363] dark:text-[#9ECE9A]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-black text-[#2D3025] dark:text-[#E8ECE0]">{board.board_title}</p>
                        <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B]">{board.pin_count} تصویر</p>
                      </div>
                      {currentBoardSelected && (
                        <span className="rounded-full bg-[#121411] px-2 py-0.5 text-[8px] font-black text-white dark:bg-[#9ECE9A] dark:text-[#121411]">
                          فعلی
                        </span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-[#8D7F72] transition-transform dark:text-[#9D978B] ${selectedBoard ? '' : '-rotate-90'}`} />
                    </button>

                    {selectedBoard && (
                      <div className="mr-6 space-y-1">
                        <button
                          onClick={() => setMoveTargetSection('')}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right transition-all ${
                            moveTargetSection === ''
                              ? 'bg-[#7C8363]/10 text-[#7C8363] dark:bg-[#9ECE9A]/10 dark:text-[#9ECE9A]'
                              : 'text-[#8D7F72] hover:bg-[#F9F6EE] dark:text-[#9D978B] dark:hover:bg-[#23261F]'
                          }`}
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-bold">روی خود هدف</span>
                        </button>
                        {board.sections.map((section) => {
                          const currentSectionSelected = currentBoardSelected && movePinModal.currentSection === section.name
                          return (
                            <button
                              key={section.name}
                              onClick={() => setMoveTargetSection(section.name)}
                              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right transition-all ${
                                moveTargetSection === section.name
                                  ? 'bg-[#7C8363]/10 text-[#7C8363] dark:bg-[#9ECE9A]/10 dark:text-[#9ECE9A]'
                                  : 'text-[#8D7F72] hover:bg-[#F9F6EE] dark:text-[#9D978B] dark:hover:bg-[#23261F]'
                              }`}
                            >
                              <FolderKanban className="h-3.5 w-3.5" />
                              <span className="flex-1 truncate text-[10px] font-bold">{section.title}</span>
                              {currentSectionSelected && <Check className="h-3.5 w-3.5" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setMovePinModal(null)
                  setMoveTargetBoard('')
                  setMoveTargetSection('')
                }}
                className="px-3 py-1.5 text-[10px] font-bold text-[#8D7F72] dark:text-[#9D978B]"
              >
                انصراف
              </button>
              <button
                onClick={handleMovePin}
                disabled={
                  movingPin ||
                  !moveTargetBoard ||
                  (moveTargetBoard === movePinModal.currentBoard &&
                    (moveTargetSection || '') === (movePinModal.currentSection || ''))
                }
                className="rounded-full bg-[#121411] px-4 py-2 text-[10px] font-black text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-[#9ECE9A] dark:text-[#121411]"
              >
                {movingPin ? 'در حال انتقال...' : 'انتقال'}
              </button>
            </div>
          </OverlayModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletePinModal && (
          <OverlayModal onClose={() => setDeletePinModal(null)}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10">
                <Trash2 className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <h3 className="text-[15px] font-black text-[#2D3025] dark:text-[#E8ECE0]">حذف تصویر</h3>
                <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B]">تصمیم بگیر فقط از گالری حذف شود یا از فایل‌ها هم پاک شود.</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => handleDeletePin(deletePinModal.pinName, false)}
                className="w-full rounded-2xl border border-[#E6DFD3] bg-[#F9F6EE] px-4 py-3 text-right transition-colors hover:bg-[#F4EBDD] dark:border-[#3D4133] dark:bg-[#23261F] dark:hover:bg-[#2A2D25]"
              >
                <span className="block text-[11px] font-black text-[#2D3025] dark:text-[#E8ECE0]">فقط از گالری حذف شود</span>
                <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B]">فایل اصلی در تسک یا پروژه باقی می‌ماند.</span>
              </button>
              <button
                onClick={() => handleDeletePin(deletePinModal.pinName, true)}
                className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-right transition-colors hover:bg-red-100 dark:border-red-500/20 dark:bg-red-900/10 dark:hover:bg-red-900/20"
              >
                <span className="block text-[11px] font-black text-red-600 dark:text-red-300">از گالری و فایل‌ها حذف شود</span>
                <span className="text-[9px] text-red-400">این عمل قابل بازگشت نیست.</span>
              </button>
            </div>
          </OverlayModal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightboxPin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/92 p-4"
            onClick={() => setLightboxPin(null)}
          >
            <div className="flex h-full w-full items-center justify-center">
              <motion.div
                initial={{ scale: 0.95, y: 18 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 18 }}
                className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#121411]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="flex min-h-[320px] items-center justify-center bg-black/30 p-4">
                    <img src={lightboxPin.image_url} alt="" className="max-h-[72vh] max-w-full rounded-[24px] object-contain" />
                  </div>
                  <div className="flex flex-col gap-5 border-t border-white/10 p-5 text-white lg:border-r lg:border-t-0">
                    <div className="space-y-2">
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-black text-white/80">
                        {lightboxPin.source_type === 'Task'
                          ? 'تصویر تسک'
                          : lightboxPin.source_type === 'Hambaft Project'
                            ? 'تصویر پروژه'
                            : lightboxPin.source_type === 'Goal'
                              ? 'تصویر هدف'
                              : 'تصویر'}
                      </span>
                      <h3 className="text-[20px] font-black leading-8">{lightboxPin.caption || lightboxPin.source_title || lightboxPin.image_name}</h3>
                      <p className="text-[11px] leading-5 text-white/60">
                        از همین‌جا می‌توانی تصویر را دانلود کنی، جای آن را در گالری عوض کنی یا به منبع اصلی آن برگردی.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <GlassInfo label="منبع">{lightboxPin.source_title || 'بدون عنوان'}</GlassInfo>
                      <GlassInfo label="فایل">{lightboxPin.image_name}</GlassInfo>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={lightboxPin.image_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-black text-[#121411]"
                      >
                        <Download className="h-3.5 w-3.5" />
                        دانلود
                      </a>
                      <button
                        onClick={() => openMoveModal(lightboxPin)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[11px] font-black text-white/90"
                      >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        انتقال
                      </button>
                      <button
                        onClick={() => handleOpenPinSource(lightboxPin)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-[11px] font-black text-white/90"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        رفتن به منبع
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setLightboxPin(null)}
                  className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white transition-colors hover:bg-white/15"
                >
                  <X className="h-5 w-5" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GalleryOverviewHero({
  boardsCount,
  totalImages,
  totalSections,
  orphanCount,
  onSync,
}: {
  boardsCount: number
  totalImages: number
  totalSections: number
  orphanCount: number
  onSync: () => void
}) {
  return (
    <div className="overflow-hidden rounded-[34px] border border-[#E6DFD3]/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.92),rgba(249,241,216,0.82),rgba(244,233,228,0.86))] px-5 py-5 shadow-[0_30px_90px_rgba(176,134,92,0.12)] dark:border-[#3D4133]/60 dark:bg-[linear-gradient(135deg,rgba(27,29,22,0.95),rgba(35,38,31,0.92),rgba(26,28,24,0.96))] lg:px-7 lg:py-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#121411] px-3 py-1.5 text-[10px] font-black text-white dark:bg-[#9ECE9A] dark:text-[#121411]">
            <Sparkles className="h-3.5 w-3.5" />
            ساختار تصویری هم‌بافت
          </div>
          <div>
            <h2 className="text-[22px] font-black leading-9 text-[#2D3025] dark:text-[#E8ECE0] lg:text-[28px]">
              اول هدف‌ها را ببین، بعد وارد پروژه‌ها شو، بعد روی تصویرهای تسک‌ها فرود بیا.
            </h2>
            <p className="mt-2 max-w-2xl text-[11px] leading-6 text-[#7E7164] dark:text-[#A9A397]">
              اینجا گالری دیگر یک لیست ساده نیست؛ هر هدف مثل یک بورد عمل می‌کند، پروژه‌ها سکشن هستند، و هر تصویری که در تسک‌ها می‌گذاری مثل یک pin در همان ساختار می‌نشیند.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatPill label="هدف‌ها" value={boardsCount} icon={<Target className="h-4 w-4" />} tone="orange" />
          <StatPill label="پروژه‌ها" value={totalSections} icon={<FolderKanban className="h-4 w-4" />} tone="green" />
          <StatPill label="تصویرها" value={totalImages} icon={<ImageIcon className="h-4 w-4" />} tone="pink" />
          <button
            onClick={onSync}
            className="flex flex-col items-start justify-between rounded-[26px] border border-[#121411]/8 bg-[#121411] px-4 py-4 text-white transition-opacity hover:opacity-92 dark:border-[#9ECE9A]/10 dark:bg-[#9ECE9A] dark:text-[#121411]"
          >
            <Sparkles className="h-4 w-4" />
            <div className="text-right">
              <div className="text-[10px] font-black">{orphanCount ? `${orphanCount} مورد بدون ساختار` : 'بازسازی گالری'}</div>
              <div className="mt-1 text-[9px] text-white/65 dark:text-[#121411]/70">Sync و مرتب‌سازی مجدد</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

function StatPill({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: 'orange' | 'green' | 'pink'
}) {
  const toneClass =
    tone === 'orange'
      ? 'bg-[#FFF3DE] text-[#A86F42] dark:bg-[#2B2418] dark:text-[#FFD49D]'
      : tone === 'green'
        ? 'bg-[#EDF6E6] text-[#648149] dark:bg-[#1D2419] dark:text-[#B7D998]'
        : 'bg-[#FCEAF0] text-[#B86A8B] dark:bg-[#2A1F24] dark:text-[#F4B5CA]'

  return (
    <div className={`rounded-[26px] px-4 py-4 ${toneClass}`}>
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/65 dark:bg-white/6">
        {icon}
      </div>
      <div className="text-right">
        <div className="text-[18px] font-black">{value.toLocaleString('fa-IR')}</div>
        <div className="text-[9px] font-bold">{label}</div>
      </div>
    </div>
  )
}

function BoardCard({
  board,
  onOpenBoard,
  onUpload,
  onOpenGoal,
}: {
  board: GalleryBoard
  onOpenBoard: () => void
  onUpload: () => void
  onOpenGoal?: () => void
}) {
  const previewPins = collectBoardPins(board).slice(0, 4)

  return (
    <motion.button
      layout
      whileHover={{ y: -3 }}
      onClick={onOpenBoard}
      className="group relative overflow-hidden rounded-[32px] border border-[#E6DFD3]/70 bg-white/90 p-4 text-right shadow-[0_20px_70px_rgba(176,134,92,0.10)] transition-all hover:border-[#7C8363]/20 dark:border-[#3D4133]/60 dark:bg-[#1B1D16] dark:hover:border-[#9ECE9A]/20"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#121411] px-2 py-0.5 text-[8px] font-black text-white dark:bg-[#9ECE9A] dark:text-[#121411]">
              بورد هدف
            </span>
            <span className="text-[8px] font-bold text-[#9D978B]">{board.sections.length.toLocaleString('fa-IR')} پروژه</span>
          </div>
          <h3 className="mt-2 truncate text-[18px] font-black text-[#2D3025] dark:text-[#E8ECE0]">{board.board_title}</h3>
          <p className="mt-1 text-[10px] text-[#8D7F72] dark:text-[#9D978B]">
            {board.pin_count.toLocaleString('fa-IR')} تصویر در این هدف نشسته است.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(event) => {
              event.stopPropagation()
              onUpload()
            }}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F9F6EE] text-[#8D7F72] transition-colors hover:bg-[#7C8363]/10 hover:text-[#7C8363] dark:bg-[#23261F] dark:text-[#9D978B] dark:hover:bg-[#9ECE9A]/10 dark:hover:text-[#9ECE9A]"
          >
            <Plus className="h-4 w-4" />
          </button>
          {onOpenGoal && (
            <button
              onClick={(event) => {
                event.stopPropagation()
                onOpenGoal()
              }}
              className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F9F6EE] text-[#8D7F72] transition-colors hover:bg-[#7C8363]/10 hover:text-[#7C8363] dark:bg-[#23261F] dark:text-[#9D978B] dark:hover:bg-[#9ECE9A]/10 dark:hover:text-[#9ECE9A]"
            >
              <ArrowUpRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <BoardPreviewMosaic pins={previewPins} title={board.board_title} />

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[9px] text-[#8D7F72] dark:text-[#9D978B]">
          <Layers3 className="h-3.5 w-3.5" />
          <span>{board.sections.length.toLocaleString('fa-IR')} سکشن</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-black text-[#2D3025] transition-transform group-hover:-translate-x-0.5 dark:text-[#E8ECE0]">
          ورود به بورد
          <ChevronLeft className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.button>
  )
}

function BoardPreviewMosaic({ pins, title }: { pins: GalleryPin[]; title: string }) {
  if (pins.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center rounded-[28px] bg-[linear-gradient(135deg,#f7efe2,#fbf8f2)] dark:bg-[linear-gradient(135deg,#20231D,#151713)]">
        <div className="flex flex-col items-center gap-2 text-[#C9C0B2] dark:text-[#5E6157]">
          <ImageIcon className="h-8 w-8" />
          <span className="text-[10px] font-bold">هنوز تصویری برای {title} ثبت نشده</span>
        </div>
      </div>
    )
  }

  const preview = pins.slice(0, 4)

  return (
    <div className="grid h-[220px] grid-cols-2 gap-2 overflow-hidden rounded-[28px] bg-[#F9F6EE] p-2 dark:bg-[#151713]">
      {preview.map((pin, index) => (
        <div
          key={pin.name}
          className={`overflow-hidden rounded-[20px] ${index === 0 && preview.length > 2 ? 'row-span-2' : ''}`}
        >
          <img src={pin.image_url} alt="" className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  )
}

function GallerySidebar({
  board,
  visibleSections,
  activeSectionId,
  totalImages,
  onOpenOverview,
  onSelectSection,
  onUploadBoard,
}: {
  board: GalleryBoard | null
  visibleSections: GallerySection[]
  activeSectionId: string | null
  totalImages: number
  onOpenOverview: () => void
  onSelectSection: (sectionId: string | null) => void
  onUploadBoard: () => void
}) {
  if (!board) return null

  return (
    <aside className="space-y-4 xl:sticky xl:top-[104px] xl:h-fit">
      <div className="overflow-hidden rounded-[30px] border border-[#E6DFD3]/70 bg-white/90 p-4 shadow-[0_20px_70px_rgba(176,134,92,0.10)] dark:border-[#3D4133]/60 dark:bg-[#1B1D16]">
        <div className="flex items-center justify-between">
          <button
            onClick={onOpenOverview}
            className="inline-flex items-center gap-1 rounded-full bg-[#F9F6EE] px-3 py-1.5 text-[9px] font-black text-[#8D7F72] transition-colors hover:bg-[#7C8363]/10 hover:text-[#7C8363] dark:bg-[#23261F] dark:text-[#9D978B] dark:hover:bg-[#9ECE9A]/10 dark:hover:text-[#9ECE9A]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            همه هدف‌ها
          </button>
          <button
            onClick={onUploadBoard}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#121411] text-white transition-opacity hover:opacity-90 dark:bg-[#9ECE9A] dark:text-[#121411]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-[18px] font-black text-[#2D3025] dark:text-[#E8ECE0]">{board.board_title}</p>
          <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B]">این هدف الان {totalImages.toLocaleString('fa-IR')} تصویر در گالری دارد.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <MiniMetric label="پروژه" value={board.sections.length} />
          <MiniMetric label="تصویر" value={totalImages} />
        </div>
      </div>

      <div className="overflow-hidden rounded-[30px] border border-[#E6DFD3]/70 bg-white/90 p-4 shadow-[0_20px_70px_rgba(176,134,92,0.10)] dark:border-[#3D4133]/60 dark:bg-[#1B1D16]">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-black text-[#2D3025] dark:text-[#E8ECE0]">پروژه‌ها</p>
            <p className="text-[9px] text-[#8D7F72] dark:text-[#9D978B]">سکشن‌های این بورد</p>
          </div>
          <span className="rounded-full bg-[#7C8363]/10 px-2 py-0.5 text-[8px] font-black text-[#7C8363] dark:bg-[#9ECE9A]/10 dark:text-[#9ECE9A]">
            {visibleSections.length}
          </span>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onSelectSection(null)}
            className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-right transition-all ${
              !activeSectionId
                ? 'bg-[#121411] text-white dark:bg-[#9ECE9A] dark:text-[#121411]'
                : 'bg-[#F9F6EE] text-[#2D3025] hover:bg-[#F2E8D8] dark:bg-[#23261F] dark:text-[#E8ECE0] dark:hover:bg-[#2A2D25]'
            }`}
          >
            <span className="inline-flex items-center gap-2 text-[10px] font-black">
              <Target className="h-3.5 w-3.5" />
              همه پروژه‌ها
            </span>
            <span className="text-[8px] font-bold">{board.sections.length} مورد</span>
          </button>

          {visibleSections.map((section) => (
            <button
              key={section.name}
              onClick={() => onSelectSection(section.name)}
              className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-right transition-all ${
                activeSectionId === section.name
                  ? 'bg-[#7C8363]/12 text-[#7C8363] ring-1 ring-[#7C8363]/15 dark:bg-[#9ECE9A]/12 dark:text-[#9ECE9A] dark:ring-[#9ECE9A]/15'
                  : 'bg-[#F9F6EE] text-[#2D3025] hover:bg-[#F2E8D8] dark:bg-[#23261F] dark:text-[#E8ECE0] dark:hover:bg-[#2A2D25]'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-[10px] font-black">{section.title}</span>
              </span>
              <span className="text-[8px] font-bold">{section.pins.length}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[22px] bg-[#F9F6EE] px-3 py-3 dark:bg-[#23261F]">
      <div className="text-[15px] font-black text-[#2D3025] dark:text-[#E8ECE0]">{value.toLocaleString('fa-IR')}</div>
      <div className="text-[8px] font-bold text-[#8D7F72] dark:text-[#9D978B]">{label}</div>
    </div>
  )
}

function BoardHero({
  board,
  mode,
  currentSection,
  onUploadBoard,
  onUploadSection,
  onOpenGoal,
}: {
  board: GalleryBoard
  mode: GalleryMode
  currentSection: GallerySection | null
  onUploadBoard: () => void
  onUploadSection: () => void
  onOpenGoal?: () => void
}) {
  const totalPins = collectBoardPins(board)
  const accent = mode === 'section'
    ? 'bg-[linear-gradient(135deg,#FFDCD5,#FFC2A9,#FF9F7A)]'
    : 'bg-[linear-gradient(135deg,#FFF0CE,#FDDC97,#F5C46F)]'

  return (
    <div className={`overflow-hidden rounded-[34px] border border-[#E6DFD3]/80 px-5 py-5 shadow-[0_30px_90px_rgba(176,134,92,0.12)] dark:border-[#3D4133]/60 dark:bg-[#1B1D16] ${accent}`}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-black/90 px-3 py-1.5 text-[9px] font-black text-white">
            {mode === 'section' ? 'پروژه فعال' : 'بورد هدف'}
          </span>
          <div>
            <h2 className="text-[24px] font-black leading-9 text-[#121411]">
              {mode === 'section' ? currentSection?.title : board.board_title}
            </h2>
            <p className="mt-2 max-w-2xl text-[11px] leading-6 text-[#3E322A]">
              {mode === 'section'
                ? `تمام تصویرهایی که از تسک‌های پروژه «${currentSection?.title}» آمده‌اند اینجا به شکل masonry دیده می‌شوند.`
                : `پروژه‌های زیر این هدف مثل سکشن‌های یک بورد premium چیده شده‌اند؛ وارد هرکدام شوی، فقط همان فضای تصویری را می‌بینی.`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={mode === 'section' ? onUploadSection : onUploadBoard}
              className="inline-flex items-center gap-2 rounded-full bg-[#121411] px-4 py-2 text-[10px] font-black text-white transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              {mode === 'section' ? 'افزودن تصویر به پروژه' : 'افزودن تصویر به هدف'}
            </button>
            {onOpenGoal && (
              <button
                onClick={onOpenGoal}
                className="inline-flex items-center gap-2 rounded-full border border-[#121411]/10 bg-white/70 px-4 py-2 text-[10px] font-black text-[#121411]"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                باز کردن خود هدف
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 self-end">
          <MetricCard label="پروژه‌ها" value={board.sections.length} />
          <MetricCard label="تصویرها" value={totalPins.length} />
          <MetricCard label="سطح هدف" value={board.board_pins.length} />
          <MetricCard label="پروژه فعال" value={currentSection ? currentSection.pins.length : board.sections.length} />
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] bg-white/76 px-3 py-3 backdrop-blur-sm">
      <div className="text-[18px] font-black text-[#121411]">{value.toLocaleString('fa-IR')}</div>
      <div className="text-[8px] font-bold text-[#6B5142]">{label}</div>
    </div>
  )
}

function GallerySurface({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children?: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-[#E6DFD3]/70 bg-white/90 p-4 shadow-[0_20px_70px_rgba(176,134,92,0.10)] dark:border-[#3D4133]/60 dark:bg-[#1B1D16]">
      <div className="mb-4">
        <p className="text-[16px] font-black text-[#2D3025] dark:text-[#E8ECE0]">{title}</p>
        <p className="mt-1 text-[10px] text-[#8D7F72] dark:text-[#9D978B]">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

function SectionPreviewCard({
  section,
  board,
  reorderMode,
  index,
  onOpen,
  onUpload,
  onReorderSections,
  sections,
  sectionDragItem,
  onSectionReorderEnd,
}: {
  section: GallerySection
  board: GalleryBoard
  reorderMode: boolean
  index: number
  onOpen: () => void
  onUpload: () => void
  onReorderSections: (sections: GallerySection[]) => void
  sections: GallerySection[]
  sectionDragItem: React.MutableRefObject<string | null>
  onSectionReorderEnd: (sections: GallerySection[]) => void
}) {
  const previewPins = section.pins.slice(0, 6)

  return (
    <motion.div
      layout
      draggable={reorderMode}
      onDragStart={() => {
        sectionDragItem.current = section.name
      }}
      onDragOver={(event) => {
        event.preventDefault()
        if (!sectionDragItem.current || sectionDragItem.current === section.name) return
        const fromIndex = sections.findIndex((item) => item.name === sectionDragItem.current)
        const toIndex = index
        if (fromIndex === -1) return
        const nextSections = [...sections]
        const [movedSection] = nextSections.splice(fromIndex, 1)
        nextSections.splice(toIndex, 0, movedSection)
        onReorderSections(nextSections)
      }}
      onDragEnd={() => {
        sectionDragItem.current = null
        onSectionReorderEnd(sections)
      }}
      className={`overflow-hidden rounded-[30px] border border-[#E6DFD3]/70 bg-white/90 p-4 shadow-[0_20px_70px_rgba(176,134,92,0.10)] transition-all dark:border-[#3D4133]/60 dark:bg-[#1B1D16] ${
        reorderMode ? 'cursor-grab' : ''
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#FCEAF0] px-2 py-0.5 text-[8px] font-black text-[#B86A8B] dark:bg-[#2A1F24] dark:text-[#F4B5CA]">
              پروژه
            </span>
            <span className="text-[8px] font-bold text-[#9D978B]">
              {section.pins.length.toLocaleString('fa-IR')} تصویر
            </span>
          </div>
          <h3 className="mt-2 truncate text-[16px] font-black text-[#2D3025] dark:text-[#E8ECE0]">{section.title}</h3>
          <p className="mt-1 text-[10px] text-[#8D7F72] dark:text-[#9D978B]">
            تصویرهای همین پروژه را یک‌جا با نام تسک‌ها ببین.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onUpload}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F9F6EE] text-[#8D7F72] transition-colors hover:bg-[#7C8363]/10 hover:text-[#7C8363] dark:bg-[#23261F] dark:text-[#9D978B] dark:hover:bg-[#9ECE9A]/10 dark:hover:text-[#9ECE9A]"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={onOpen}
            className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#121411] text-white transition-opacity hover:opacity-90 dark:bg-[#9ECE9A] dark:text-[#121411]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>

      {previewPins.length > 0 ? (
        <div className="columns-2 gap-2 md:columns-3">
          {previewPins.map((pin) => (
            <div key={pin.name} className="mb-2 break-inside-avoid overflow-hidden rounded-[20px]">
              <img src={pin.image_url} alt="" className="h-auto w-full object-cover" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-[160px] items-center justify-center rounded-[24px] border border-dashed border-[#E6DFD3] bg-[#F9F6EE] text-[10px] font-bold text-[#B5AA9B] dark:border-[#3D4133] dark:bg-[#23261F] dark:text-[#66695F]">
          هنوز تصویری در این پروژه نیست
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[9px] font-bold text-[#8D7F72] dark:text-[#9D978B]">{board.board_title}</span>
        <button
          onClick={onOpen}
          className="inline-flex items-center gap-1 text-[10px] font-black text-[#2D3025] dark:text-[#E8ECE0]"
        >
          ورود به سکشن
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

function OverlayModal({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 18 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 18 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-[30px] border border-[#E6DFD3]/80 bg-white p-5 shadow-[0_30px_90px_rgba(0,0,0,0.15)] dark:border-[#3D4133]/60 dark:bg-[#1B1D16]"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function GlassInfo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/6 px-3 py-3">
      <div className="text-[9px] font-black text-white/45">{label}</div>
      <div className="mt-1 text-[11px] font-bold text-white/90">{children}</div>
    </div>
  )
}

function PinMasonry({
  pins,
  reorderMode,
  showSourceBadge,
  onPinClick,
  onDelete,
  onEditCaption,
  onMovePin,
  onOpenSource,
  dragItem,
  onDragStart,
  onDragOver,
  onDragEnd,
}: {
  pins: GalleryPin[]
  reorderMode?: boolean
  showSourceBadge?: boolean
  onPinClick?: (pin: GalleryPin) => void
  onDelete: (pin: GalleryPin) => void
  onEditCaption: (pin: GalleryPin) => void
  onMovePin: (pin: GalleryPin) => void
  onOpenSource?: (pin: GalleryPin) => void
  dragItem: React.MutableRefObject<string | null>
  onDragStart: (pinName: string) => void
  onDragOver: (event: React.DragEvent, targetPinName: string, pins: GalleryPin[], setter: (nextPins: GalleryPin[]) => void) => void
  onDragEnd: (pins: GalleryPin[]) => void
}) {
  const [columns, setColumns] = useState(2)
  const [localPins, setLocalPins] = useState(pins)

  useEffect(() => {
    setLocalPins(pins)
  }, [pins])

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth
      if (width >= 1440) setColumns(5)
      else if (width >= 1180) setColumns(4)
      else if (width >= 768) setColumns(3)
      else setColumns(2)
    }
    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [])

  const pinColumns = useMemo(() => {
    const result: GalleryPin[][] = Array.from({ length: columns }, () => [])
    localPins.forEach((pin, index) => {
      result[index % columns].push(pin)
    })
    return result
  }, [columns, localPins])

  const getSourceLabel = (pin: GalleryPin) => {
    if (pin.source_type === 'Task') return 'تسک'
    if (pin.source_type === 'Hambaft Project') return 'پروژه'
    if (pin.source_type === 'Goal') return 'هدف'
    return 'گالری'
  }

  return (
    <div className="flex gap-3">
      {pinColumns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex-1 space-y-3">
          {column.map((pin) => (
            <div
              key={pin.name}
              draggable={reorderMode}
              onDragStart={() => onDragStart(pin.name)}
              onDragOver={(event) => onDragOver(event, pin.name, localPins, setLocalPins)}
              onDragEnd={() => {
                dragItem.current = null
                onDragEnd(localPins)
              }}
              className={`group relative overflow-hidden rounded-[24px] bg-[#F9F6EE] shadow-sm transition-all dark:bg-[#23261F] ${
                reorderMode ? 'ring-1 ring-[#7C8363]/20 dark:ring-[#9ECE9A]/20' : ''
              }`}
            >
              <button
                onClick={() => !reorderMode && onPinClick?.(pin)}
                className="block w-full text-right"
              >
                <img src={pin.image_url} alt="" className="h-auto w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/62 via-black/0 to-transparent opacity-75" />
                <div className="absolute inset-x-0 bottom-0 px-3 pb-3">
                  <p className="truncate text-[11px] font-black text-white">
                    {pin.caption || pin.source_title || pin.image_name}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[8px] text-white/70">
                    {showSourceBadge && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 font-black">
                        <Pin className="h-2.5 w-2.5" />
                        {getSourceLabel(pin)}
                      </span>
                    )}
                    {pin.source_title && (
                      <span className="truncate">{pin.source_title}</span>
                    )}
                  </div>
                </div>
              </button>

              <div className="absolute left-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {reorderMode && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-black/45 text-white">
                    <GripVertical className="h-3.5 w-3.5" />
                  </div>
                )}
                <button
                  onClick={() => onEditCaption(pin)}
                  className="flex h-8 w-8 items-center justify-center rounded-2xl bg-black/45 text-white transition-colors hover:bg-black/60"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onMovePin(pin)}
                  className="flex h-8 w-8 items-center justify-center rounded-2xl bg-black/45 text-white transition-colors hover:bg-black/60"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </button>
                {onOpenSource && (
                  <button
                    onClick={() => onOpenSource(pin)}
                    className="flex h-8 w-8 items-center justify-center rounded-2xl bg-black/45 text-white transition-colors hover:bg-black/60"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(pin)}
                  className="flex h-8 w-8 items-center justify-center rounded-2xl bg-black/45 text-white transition-colors hover:bg-red-500/90"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
