import { useState, useCallback, useRef, useEffect } from 'react'
import type { Block, BlockType, NotePage } from './types'
import { call } from '../app/frappe'

let GLOBAL_PAGES: NotePage[] = []
let LISTENERS: (() => void)[] = []
let INITIALIZED = false

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

/* ─── API wrappers ─────────────────────────────────────────────────────── */

async function apiGetPages(): Promise<NotePage[]> {
  try {
    const res = await call<{ data?: { pages?: any[] } }>('hambaft.hambaft.api.get_note_pages', { limit: 200 })
    const rows = res?.data?.pages || []
    return rows.map((row: any) => ({
      id: row.name,
      title: row.title || 'بدون عنوان',
      icon: row.icon,
      cover: row.cover,
      parentId: row.parent_page || undefined,
      isFavorite: !!row.is_favorite,
      isArchived: !!row.is_archived,
      isTrashed: !!row.is_trashed,
      blocks: Array.isArray(row.blocks) ? row.blocks : [],
      createdAt: row.creation || new Date().toISOString(),
      updatedAt: row.modified || new Date().toISOString(),
    }))
  } catch (e) {
    console.error('Failed to load note pages:', e)
    return []
  }
}

async function apiCreatePage(page: NotePage): Promise<NotePage | null> {
  try {
    const res = await call<{ data?: { page?: any } }>('hambaft.hambaft.api.create_note_page', {
      data: {
        title: page.title,
        icon: page.icon,
        cover: page.cover,
        parentId: page.parentId,
        isFavorite: page.isFavorite,
        isArchived: page.isArchived,
        isTrashed: page.isTrashed,
        blocks: page.blocks,
      },
    })
    const created = res?.data?.page
    if (!created) return null
    return {
      id: created.name,
      title: created.title,
      icon: created.icon,
      cover: created.cover,
      parentId: created.parent_page || undefined,
      isFavorite: !!created.is_favorite,
      isArchived: !!created.is_archived,
      isTrashed: !!created.is_trashed,
      blocks: Array.isArray(created.blocks) ? created.blocks : page.blocks,
      createdAt: created.creation,
      updatedAt: created.modified,
    }
  } catch (e) {
    console.error('Failed to create note page:', e)
    return null
  }
}

async function apiUpdatePage(pageId: string, patch: Partial<NotePage>): Promise<boolean> {
  try {
    await call('hambaft.hambaft.api.update_note_page', {
      name: pageId,
      data: {
        title: patch.title,
        icon: patch.icon,
        cover: patch.cover,
        parentId: patch.parentId,
        isFavorite: patch.isFavorite,
        isArchived: patch.isArchived,
        isTrashed: patch.isTrashed,
        blocks: patch.blocks,
      },
    })
    return true
  } catch (e) {
    console.error('Failed to update note page:', e)
    return false
  }
}

async function apiDeletePage(pageId: string): Promise<boolean> {
  try {
    await call('hambaft.hambaft.api.delete_note_page', { name: pageId })
    return true
  } catch (e) {
    console.error('Failed to delete note page:', e)
    return false
  }
}

/* ─── Store hook ───────────────────────────────────────────────────────── */

export function useNotesStore() {
  const [, forceUpdate] = useState(0)
  const savingRef = useRef<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const saveTimerRef = useRef<any>(null)
  const initRef = useRef(false)

  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1)
    LISTENERS.push(listener)

    // Lazy-load from backend once
    if (!INITIALIZED && !initRef.current) {
      initRef.current = true
      apiGetPages().then((pages) => {
        if (pages.length > 0) {
          GLOBAL_PAGES = pages
        } else {
          // Seed with defaults if nothing on server
          initMockPages()
          // Persist defaults
          GLOBAL_PAGES.forEach((p) => apiCreatePage(p))
        }
        INITIALIZED = true
        notify()
      })
    }

    return () => {
      LISTENERS = LISTENERS.filter((l) => l !== listener)
    }
  }, [])

  const getPages = useCallback(() => GLOBAL_PAGES, [])

  const addPage = useCallback(async (parentId?: string) => {
    const page = createDefaultPage(parentId ? 'صفحه فرعی جدید' : 'یادداشت جدید')
    if (parentId) page.parentId = parentId

    const created = await apiCreatePage(page)
    if (created) {
      GLOBAL_PAGES = [created, ...GLOBAL_PAGES]
    } else {
      GLOBAL_PAGES = [page, ...GLOBAL_PAGES]
    }
    savingRef.current = 'saved'
    notify()
    return created || page
  }, [])

  const updatePage = useCallback(async (pageId: string, patch: Partial<NotePage>) => {
    const page = GLOBAL_PAGES.find((p) => p.id === pageId)
    if (!page) return

    const updated = { ...page, ...patch, updatedAt: new Date().toISOString() }
    GLOBAL_PAGES = GLOBAL_PAGES.map((p) => (p.id === pageId ? updated : p))
    savingRef.current = 'saving'
    notify()

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const ok = await apiUpdatePage(pageId, patch)
      savingRef.current = ok ? 'saved' : 'error'
      notify()
    }, 600)
  }, [])

  const deletePage = useCallback(async (pageId: string) => {
    const idsToDelete = new Set<string>()
    const collect = (id: string) => {
      idsToDelete.add(id)
      GLOBAL_PAGES.filter((p) => p.parentId === id).forEach((p) => collect(p.id))
    }
    collect(pageId)

    // Delete from backend first
    for (const id of idsToDelete) {
      await apiDeletePage(id)
    }

    GLOBAL_PAGES = GLOBAL_PAGES.filter((p) => !idsToDelete.has(p.id))
    notify()
  }, [])

  const duplicatePage = useCallback(async (pageId: string) => {
    const page = GLOBAL_PAGES.find((p) => p.id === pageId)
    if (!page) return
    const clone: NotePage = {
      ...page,
      id: generateId(),
      title: page.title + ' (کپی)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    const created = await apiCreatePage(clone)
    if (created) {
      GLOBAL_PAGES = [created, ...GLOBAL_PAGES]
    } else {
      GLOBAL_PAGES = [clone, ...GLOBAL_PAGES]
    }
    notify()
    return created || clone
  }, [])

  const movePage = useCallback(async (pageId: string, newParentId?: string) => {
    GLOBAL_PAGES = GLOBAL_PAGES.map((p) => (p.id === pageId ? { ...p, parentId: newParentId } : p))
    notify()
    await apiUpdatePage(pageId, { parentId: newParentId })
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
