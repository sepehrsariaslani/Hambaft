import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import type { Block, BlockType, NotePage } from '../types'
import BlockRenderer from './BlockRenderer'
import SlashCommandMenu from './SlashCommandMenu'
import FloatingToolbar from './FloatingToolbar'

interface BlockEditorProps {
  page: NotePage
  onUpdatePage: (patch: Partial<NotePage>) => void
  onUpdateBlock: (blockId: string, patch: Partial<Block>) => void
  onAddBlock: (afterBlockId?: string, type?: BlockType) => Block | undefined
  onDeleteBlock: (blockId: string) => void
  onMoveBlock: (blockId: string, dir: 'up' | 'down') => void
  onReorderBlocks: (blockIds: string[]) => void
}

export default function BlockEditor({
  page, onUpdatePage, onUpdateBlock, onAddBlock, onDeleteBlock, onMoveBlock, onReorderBlocks,
}: BlockEditorProps) {
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const [slashBlockId, setSlashBlockId] = useState<string | null>(null)
  const [slashQuery, setSlashQuery] = useState('')
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [dropTargetBlockId, setDropTargetBlockId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleBlockChange = useCallback((blockId: string, content: Block['content']) => {
    onUpdateBlock(blockId, { content })
  }, [onUpdateBlock])

  const handleBlockKeyDown = useCallback((e: React.KeyboardEvent, blockId: string, blockType: string, index: number) => {
    const el = e.target as HTMLElement
    const text = el.innerText || ''

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const selection = window.getSelection()
      const offset = selection?.getRangeAt(0).startOffset || text.length
      const before = text.slice(0, offset)
      const after = text.slice(offset)

      // Handle markdown shortcuts on enter
      const trimmed = before.trim()
      if (trimmed === '/slash') {
        onUpdateBlock(blockId, { content: [{ text: '' }] })
        setSlashBlockId(blockId)
        setSlashQuery('')
        return
      }

      onUpdateBlock(blockId, { content: [{ text: before }] })
      const newBlock = onAddBlock(blockId)
      if (newBlock && after) {
        setTimeout(() => onUpdateBlock(newBlock.id, { content: [{ text: after }] }), 0)
      }
      if (newBlock) setFocusedBlockId(newBlock.id)
      setSlashBlockId(null)
    } else if (e.key === 'Backspace' && text === '') {
      e.preventDefault()
      if (page.blocks.length > 1) {
        onDeleteBlock(blockId)
        const prevBlock = page.blocks[index - 1]
        if (prevBlock) setFocusedBlockId(prevBlock.id)
      }
    } else if (e.key === 'ArrowUp' && index > 0) {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        const prevEl = document.getElementById(`block-${page.blocks[index - 1].id}`)
        if (prevEl && rect.top <= prevEl.getBoundingClientRect().bottom) {
          e.preventDefault()
          setFocusedBlockId(page.blocks[index - 1].id)
        }
      }
    } else if (e.key === 'ArrowDown' && index < page.blocks.length - 1) {
      const sel = window.getSelection()
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        const nextEl = document.getElementById(`block-${page.blocks[index + 1].id}`)
        if (nextEl && rect.bottom >= nextEl.getBoundingClientRect().top) {
          e.preventDefault()
          setFocusedBlockId(page.blocks[index + 1].id)
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Simple indent simulation: convert bullet to toggle or add margin
      // For now just prevent default to avoid focus loss
    } else if (text.endsWith('/') && !slashBlockId) {
      setSlashBlockId(blockId)
      setSlashQuery('')
    } else if (slashBlockId === blockId) {
      const slashIdx = text.lastIndexOf('/')
      if (slashIdx !== -1) {
        setSlashQuery(text.slice(slashIdx + 1))
      } else {
        setSlashBlockId(null)
      }
    }

    // Markdown shortcuts
    if (e.key === ' ') {
      const mdCheck = text.trim()
      const map: Record<string, BlockType> = {
        '#': 'heading_1',
        '##': 'heading_2',
        '###': 'heading_3',
        '-': 'bullet_list',
        '1.': 'numbered_list',
        '>': 'quote',
        '!>': 'callout',
      }
      if (map[mdCheck]) {
        e.preventDefault()
        onUpdateBlock(blockId, { type: map[mdCheck], content: [{ text: '' }] })
      }
    }
  }, [page.blocks, onUpdateBlock, onAddBlock, onDeleteBlock, slashBlockId])

  const handleSlashSelect = useCallback((type: BlockType) => {
    if (!slashBlockId) return
    const block = page.blocks.find((b) => b.id === slashBlockId)
    if (block) {
      const cleanText = block.content.map((c) => c.text).join('').replace(/\/$/, '').replace(new RegExp(`${slashQuery}$`), '')
      onUpdateBlock(slashBlockId, { type, content: [{ text: cleanText }] })
    }
    setSlashBlockId(null)
    setSlashQuery('')
  }, [slashBlockId, page.blocks, onUpdateBlock, slashQuery])

  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value)
  }

  const handleDragStart = (e: React.DragEvent, blockId: string) => {
    setDraggingBlockId(blockId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', blockId)
  }

  const handleDragOver = (e: React.DragEvent, blockId: string) => {
    e.preventDefault()
    if (draggingBlockId && draggingBlockId !== blockId) {
      setDropTargetBlockId(blockId)
    }
  }

  const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault()
    const sourceBlockId = e.dataTransfer.getData('text/plain') || draggingBlockId
    if (!sourceBlockId || sourceBlockId === targetBlockId) {
      setDraggingBlockId(null)
      setDropTargetBlockId(null)
      return
    }
    const sourceIndex = page.blocks.findIndex(b => b.id === sourceBlockId)
    const targetIndex = page.blocks.findIndex(b => b.id === targetBlockId)
    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggingBlockId(null)
      setDropTargetBlockId(null)
      return
    }
    const newBlocks = [...page.blocks]
    const [removed] = newBlocks.splice(sourceIndex, 1)
    newBlocks.splice(targetIndex, 0, removed)
    onReorderBlocks(newBlocks.map(b => b.id))
    setDraggingBlockId(null)
    setDropTargetBlockId(null)
  }

  const handleDragEnd = () => {
    setDraggingBlockId(null)
    setDropTargetBlockId(null)
  }

  return (
    <div ref={containerRef} className="space-y-1 relative" dir="rtl">
      <FloatingToolbar onFormat={handleFormat} />
      <AnimatePresence initial={false}>
        {page.blocks.map((block, index) => (
          <motion.div
            key={block.id}
            id={`block-${block.id}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="relative"
          >
            {slashBlockId === block.id && (
              <div className="absolute top-full right-8 mt-1 z-50">
                <SlashCommandMenu
                  query={slashQuery}
                  onSelect={handleSlashSelect}
                  onClose={() => { setSlashBlockId(null); setSlashQuery('') }}
                />
              </div>
            )}
            <BlockRenderer
              block={block}
              index={index}
              isFocused={focusedBlockId === block.id}
              onFocus={() => setFocusedBlockId(block.id)}
              onChange={(content) => handleBlockChange(block.id, content)}
              onKeyDown={(e) => handleBlockKeyDown(e, block.id, block.type, index)}
              onAddBelow={() => {
                const nb = onAddBlock(block.id)
                if (nb) setFocusedBlockId(nb.id)
              }}
              onDelete={() => onDeleteBlock(block.id)}
              onTurnInto={(type) => onUpdateBlock(block.id, { type })}
              onMove={(dir) => onMoveBlock(block.id, dir)}
              onToggleCollapse={() => onUpdateBlock(block.id, { collapsed: !block.collapsed })}
              onUpdateBlock={(patch) => onUpdateBlock(block.id, patch)}
              onDragStart={(e) => handleDragStart(e, block.id)}
              onDragOver={(e) => handleDragOver(e, block.id)}
              onDrop={(e) => handleDrop(e, block.id)}
              onDragEnd={handleDragEnd}
              isDragging={draggingBlockId === block.id}
              isDropTarget={dropTargetBlockId === block.id}
            />
          </motion.div>
        ))}
      </AnimatePresence>
      {page.blocks.length === 0 && (
        <button
          onClick={() => {
            const nb = onAddBlock()
            if (nb) setFocusedBlockId(nb.id)
          }}
          className="w-full py-8 bg-[#F9F6EE] dark:bg-[#151713] hover:bg-[#E6DFD3]/30 dark:hover:bg-[#2D3025]/30 border border-dashed border-[#D6CFC3] dark:border-[#2D3025] rounded-2xl text-xs font-bold text-[#8D7F72] flex items-center justify-center gap-1.5 transition-colors"
        >
          <span>+</span>
          <span>افزودن اولین بلوک</span>
        </button>
      )}
    </div>
  )
}
