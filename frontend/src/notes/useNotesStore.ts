import { useState, useCallback, useRef, useEffect } from 'react'
import type { Block, BlockType, NotePage } from './types'

let GLOBAL_PAGES: NotePage[] = []
let LISTENERS: (() => void)[] = []

function notify() {
  LISTENERS.forEach((fn) => fn())
}

function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(0, 4)
}

function emptyBlock(type: BlockType = 'paragraph'): Block {
  return { id: generateId(), type, content: [{ text: '' }] }
}

export function createDefaultPage(title = 'بدون عنوان'): NotePage {
  return {
    id: generateId(),
    title,
    blocks: [emptyBlock('heading_1'), emptyBlock('paragraph')],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function useNotesStore() {
  const [, forceUpdate] = useState(0)
  const savingRef = useRef<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<any>(null)

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1)
    LISTENERS.push(listener)
    return () => {
      LISTENERS = LISTENERS.filter((l) => l !== listener)
    }
  }, [])

  const getPages = useCallback(() => GLOBAL_PAGES, [])

  const addPage = useCallback((parentId?: string) => {
    const page = createDefaultPage(parentId ? 'صفحه فرعی جدید' : 'یادداشت جدید')
    if (parentId) page.parentId = parentId
    GLOBAL_PAGES = [page, ...GLOBAL_PAGES]
    savingRef.current = 'saved'
    notify()
    return page
  }, [])

  const updatePage = useCallback((pageId: string, patch: Partial<NotePage>) => {
    GLOBAL_PAGES = GLOBAL_PAGES.map((p) => (p.id === pageId ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p))
    savingRef.current = 'saving'
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      savingRef.current = 'saved'
      notify()
    }, 800)
    notify()
  }, [])

  const deletePage = useCallback((pageId: string) => {
    const idsToDelete = new Set<string>()
    const collect = (id: string) => {
      idsToDelete.add(id)
      GLOBAL_PAGES.filter((p) => p.parentId === id).forEach((p) => collect(p.id))
    }
    collect(pageId)
    GLOBAL_PAGES = GLOBAL_PAGES.filter((p) => !idsToDelete.has(p.id))
    notify()
  }, [])

  const duplicatePage = useCallback((pageId: string) => {
    const page = GLOBAL_PAGES.find((p) => p.id === pageId)
    if (!page) return
    const clone: NotePage = {
      ...page,
      id: generateId(),
      title: page.title + ' (کپی)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    GLOBAL_PAGES = [clone, ...GLOBAL_PAGES]
    notify()
    return clone
  }, [])

  const movePage = useCallback((pageId: string, newParentId?: string) => {
    GLOBAL_PAGES = GLOBAL_PAGES.map((p) => (p.id === pageId ? { ...p, parentId: newParentId } : p))
    notify()
  }, [])

  const addBlock = useCallback((pageId: string, afterBlockId?: string, type?: BlockType) => {
    const page = GLOBAL_PAGES.find((p) => p.id === pageId)
    if (!page) return
    const newBlock = emptyBlock(type || 'paragraph')
    const idx = page.blocks.findIndex((b) => b.id === afterBlockId)
    const newBlocks = [...page.blocks]
    if (idx !== -1) {
      newBlocks.splice(idx + 1, 0, newBlock)
    } else {
      newBlocks.push(newBlock)
    }
    updatePage(pageId, { blocks: newBlocks })
    return newBlock
  }, [updatePage])

  const updateBlock = useCallback((pageId: string, blockId: string, patch: Partial<Block>) => {
    const page = GLOBAL_PAGES.find((p) => p.id === pageId)
    if (!page) return
    const newBlocks = page.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b))
    updatePage(pageId, { blocks: newBlocks })
  }, [updatePage])

  const deleteBlock = useCallback((pageId: string, blockId: string) => {
    const page = GLOBAL_PAGES.find((p) => p.id === pageId)
    if (!page) return
    const newBlocks = page.blocks.filter((b) => b.id !== blockId)
    if (newBlocks.length === 0) newBlocks.push(emptyBlock())
    updatePage(pageId, { blocks: newBlocks })
  }, [updatePage])

  const moveBlock = useCallback((pageId: string, blockId: string, direction: 'up' | 'down') => {
    const page = GLOBAL_PAGES.find((p) => p.id === pageId)
    if (!page) return
    const idx = page.blocks.findIndex((b) => b.id === blockId)
    if (idx === -1) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === page.blocks.length - 1) return
    const newBlocks = [...page.blocks]
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    const temp = newBlocks[idx]
    newBlocks[idx] = newBlocks[targetIdx]
    newBlocks[targetIdx] = temp
    updatePage(pageId, { blocks: newBlocks })
  }, [updatePage])

  const reorderBlocks = useCallback((pageId: string, blockIds: string[]) => {
    const page = GLOBAL_PAGES.find((p) => p.id === pageId)
    if (!page) return
    const map = new Map(page.blocks.map((b) => [b.id, b]))
    const newBlocks = blockIds.map((id) => map.get(id)!).filter(Boolean)
    updatePage(pageId, { blocks: newBlocks })
  }, [updatePage])

  const getSavingState = useCallback(() => savingRef.current, [])

  return {
    pages: GLOBAL_PAGES,
    getPages,
    addPage,
    updatePage,
    deletePage,
    duplicatePage,
    movePage,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    reorderBlocks,
    getSavingState,
  }
}

export function initMockPages() {
  if (GLOBAL_PAGES.length > 0) return
  const p1 = createDefaultPage('ژورنال روزانه')
  p1.blocks = [
    { id: generateId(), type: 'heading_1', content: [{ text: 'ژورنال روزانه من' }] },
    { id: generateId(), type: 'paragraph', content: [{ text: 'امروز روز خوبی بود. کارهای زیادی انجام دادم و حس مثبتی دارم.' }] },
    { id: generateId(), type: 'todo', content: [{ text: 'ورزش صبحگاهی' }], props: { checked: true } },
    { id: generateId(), type: 'todo', content: [{ text: 'مطالعه ۳۰ دقیقه‌ای' }], props: { checked: false } },
    { id: generateId(), type: 'callout', content: [{ text: 'یادآوری: فردا جلسه مهم با تیم داریم!' }], props: { icon: '💡' } },
  ]
  const p2 = createDefaultPage('برنامه هفتگی')
  p2.blocks = [
    { id: generateId(), type: 'heading_2', content: [{ text: 'اهداف این هفته' }] },
    { id: generateId(), type: 'bullet_list', content: [{ text: 'تکمیل پروژه همبافت' }] },
    { id: generateId(), type: 'bullet_list', content: [{ text: 'رفتن به باشگاه ۳ بار' }] },
    { id: generateId(), type: 'bullet_list', content: [{ text: 'خواندن ۵۰ صفحه کتاب' }] },
  ]
  const p3 = createDefaultPage('ایده‌های محتوا')
  p3.parentId = p1.id
  p3.blocks = [
    { id: generateId(), type: 'heading_3', content: [{ text: 'پست اینستاگرام' }] },
    { id: generateId(), type: 'paragraph', content: [{ text: 'ایده اول: معرفی اپلیکیشن همبافت و ویژگی‌های جدید' }] },
  ]
  GLOBAL_PAGES = [p1, p2, p3]
}
