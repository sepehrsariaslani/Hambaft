import { useState, useCallback, useEffect } from 'react'
import type { Block, BlockType, NotePage } from '../types'
import BlockEditor from './BlockEditor'
import { FileText, Save } from 'lucide-react'

function generateId() {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(0, 4)
}

function emptyBlock(type: BlockType = 'paragraph'): Block {
  return { id: generateId(), type, content: [{ text: '' }] }
}

function createDefaultPage(title = 'بدون عنوان'): NotePage {
  return {
    id: generateId(),
    title,
    blocks: [emptyBlock('heading_1'), emptyBlock('paragraph')],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

interface EntityNoteEditorProps {
  entityId: string
  entityType: 'task' | 'goal' | 'project'
  title?: string
  initialBlocks?: Block[]
  onSave?: (blocks: Block[]) => void
}

export default function EntityNoteEditor({
  entityId,
  entityType,
  title = 'یادداشت‌ها',
  initialBlocks,
  onSave,
}: EntityNoteEditorProps) {
  const [page, setPage] = useState<NotePage>(() => {
    if (initialBlocks && initialBlocks.length > 0) {
      return {
        id: `${entityType}-${entityId}`,
        title,
        blocks: initialBlocks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }
    const p = createDefaultPage(title)
    p.id = `${entityType}-${entityId}`
    return p
  })

  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (initialBlocks && initialBlocks.length > 0) {
      setPage(prev => ({
        ...prev,
        blocks: initialBlocks,
        updatedAt: new Date().toISOString(),
      }))
    }
  }, [entityId, entityType])

  const updatePage = useCallback((patch: Partial<NotePage>) => {
    setPage(prev => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }))
  }, [])

  const updateBlock = useCallback((blockId: string, patch: Partial<Block>) => {
    setPage(prev => ({
      ...prev,
      blocks: prev.blocks.map(b => (b.id === blockId ? { ...b, ...patch } : b)),
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const addBlock = useCallback((afterBlockId?: string, type?: BlockType) => {
    const newBlock = emptyBlock(type || 'paragraph')
    setPage(prev => {
      const idx = prev.blocks.findIndex(b => b.id === afterBlockId)
      const newBlocks = [...prev.blocks]
      if (idx !== -1) {
        newBlocks.splice(idx + 1, 0, newBlock)
      } else {
        newBlocks.push(newBlock)
      }
      return { ...prev, blocks: newBlocks, updatedAt: new Date().toISOString() }
    })
    return newBlock
  }, [])

  const deleteBlock = useCallback((blockId: string) => {
    setPage(prev => {
      const newBlocks = prev.blocks.filter(b => b.id !== blockId)
      if (newBlocks.length === 0) newBlocks.push(emptyBlock())
      return { ...prev, blocks: newBlocks, updatedAt: new Date().toISOString() }
    })
  }, [])

  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    setPage(prev => {
      const idx = prev.blocks.findIndex(b => b.id === blockId)
      if (idx === -1) return prev
      if (direction === 'up' && idx === 0) return prev
      if (direction === 'down' && idx === prev.blocks.length - 1) return prev
      const newBlocks = [...prev.blocks]
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1
      const temp = newBlocks[idx]
      newBlocks[idx] = newBlocks[targetIdx]
      newBlocks[targetIdx] = temp
      return { ...prev, blocks: newBlocks, updatedAt: new Date().toISOString() }
    })
  }, [])

  const reorderBlocks = useCallback((blockIds: string[]) => {
    setPage(prev => {
      const map = new Map(prev.blocks.map(b => [b.id, b]))
      const newBlocks = blockIds.map(id => map.get(id)!).filter(Boolean)
      return { ...prev, blocks: newBlocks, updatedAt: new Date().toISOString() }
    })
  }, [])

  const handleSave = useCallback(() => {
    onSave?.(page.blocks)
    setSavedAt(new Date().toLocaleTimeString('fa-IR'))
    setTimeout(() => setSavedAt(null), 2000)
  }, [onSave, page.blocks])

  return (
    <div className="bg-[#FDFBF7] dark:bg-[#1C1D17] rounded-3xl border border-[#E6DFD3] dark:border-[#3D4133]/50 p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-[#E6DFD3]/40">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#7C8363]" />
          <h3 className="text-xs font-black text-[#2D3025] dark:text-[#E8ECE0]">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {savedAt && (
            <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg">
              ذخیره شد {savedAt}
            </span>
          )}
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#7C8363] hover:bg-[#5A5A40] text-white text-[10px] font-bold rounded-xl transition-all cursor-pointer"
          >
            <Save className="w-3 h-3" />
            <span>ذخیره یادداشت</span>
          </button>
        </div>
      </div>
      <div className="min-h-[200px]">
        <BlockEditor
          page={page}
          onUpdatePage={updatePage}
          onUpdateBlock={updateBlock}
          onAddBlock={addBlock}
          onDeleteBlock={deleteBlock}
          onMoveBlock={moveBlock}
          onReorderBlocks={reorderBlocks}
        />
      </div>
    </div>
  )
}
