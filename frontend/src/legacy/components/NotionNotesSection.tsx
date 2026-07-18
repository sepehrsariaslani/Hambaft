import React, { useEffect, useRef, useState } from 'react';
import { 
  FileText, 
  Heading1, 
  Heading2, 
  CheckSquare, 
  List, 
  Quote, 
  Code, 
  ChevronUp, 
  ChevronDown, 
  Trash2, 
  Plus, 
  PlusCircle, 
  BookOpen, 
  ArrowRight,
  Sparkles,
  Search,
  Check,
  Edit2,
  FilePlus2,
  X,
  FileCode,
  Calendar,
  Layers,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface NotionBlock {
  id: string;
  type: 'text' | 'h1' | 'h2' | 'todo' | 'bullet' | 'quote' | 'code';
  content: string;
  completed?: boolean;
}

export interface NotionPage {
  id: string;
  title: string;
  blocks: NotionBlock[];
  parentId?: string; // To support nesting pages inside pages
  createdAt: string;
}

interface NotionNotesSectionProps {
  initialPages?: NotionPage[];
  onPagesChange?: (pages: NotionPage[]) => void;
}

const FALLBACK_PAGES: NotionPage[] = [
  {
    id: 'blank-page',
    title: 'یادداشت جدید',
    createdAt: '2026-07-04',
    blocks: [
      { id: 'blank-title', type: 'h1', content: 'عنوان یادداشت' },
      { id: 'blank-body', type: 'text', content: '' },
    ],
  },
];

export default function NotionNotesSection({ initialPages = FALLBACK_PAGES, onPagesChange }: NotionNotesSectionProps) {
  const [pages, setPages] = useState<NotionPage[]>(() => (initialPages.length ? initialPages : FALLBACK_PAGES));

  const [activePageId, setActivePageId] = useState<string>((initialPages[0] || FALLBACK_PAGES[0]).id);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPageTitleId, setEditingPageTitleId] = useState<string | null>(null);
  const [tempPageTitle, setTempPageTitle] = useState('');

  // Notion Layout state: 'list' (dashboard board) or 'editor' (immersive block editor)
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);
  const [activeSlashBlockId, setActiveSlashBlockId] = useState<string | null>(null);
  const [activeTypeMenuBlockId, setActiveTypeMenuBlockId] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (initialPages.length) {
      setPages(initialPages);
      setActivePageId((current) => current || initialPages[0].id);
    }
  }, [initialPages]);

  useEffect(() => {
    if (!onPagesChange) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      onPagesChange(pages);
    }, 350);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [pages, onPagesChange]);

  // Autofocus block input hook
  useEffect(() => {
    if (focusedBlockId && viewMode === 'editor') {
      const element = document.getElementById(`input-${focusedBlockId}`);
      if (element) {
        element.focus();
        if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
          const len = element.value.length;
          element.setSelectionRange(len, len);
        }
      }
    }
  }, [focusedBlockId, viewMode]);

  const activePage = pages.find(p => p.id === activePageId) || pages[0];

  // Helper to generate IDs
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Add a new note page
  const handleCreatePage = (parentId?: string) => {
    const newPageId = generateId();
    const newPage: NotionPage = {
      id: newPageId,
      title: parentId ? 'صفحه فرعی جدید' : 'یادداشت جدید من',
      parentId,
      createdAt: new Date().toISOString().split('T')[0],
      blocks: [
        {
          id: generateId(),
          type: 'h1',
          content: parentId ? 'عنوان صفحه فرعی جدید' : 'عنوان یادداشت جدید'
        },
        {
          id: generateId(),
          type: 'text',
          content: ''
        }
      ]
    };

    setPages(prev => [...prev, newPage]);
    setActivePageId(newPageId);
    setViewMode('editor');
  };

  // Delete a page recursively
  const handleDeletePage = (pageId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pages.length <= 1) {
      alert('باید حداقل یک صفحه یادداشت داشته باشید.');
      return;
    }
    
    const getPageAndSubPageIds = (id: string): string[] => {
      let ids = [id];
      const subs = pages.filter(p => p.parentId === id);
      subs.forEach(sub => {
        ids = [...ids, ...getPageAndSubPageIds(sub.id)];
      });
      return ids;
    };

    const toDeleteIds = getPageAndSubPageIds(pageId);
    
    if (confirm('آیا از حذف این یادداشت و تمام زیرمجموعه‌های آن مطمئن هستید؟')) {
      const updatedPages = pages.filter(p => !toDeleteIds.includes(p.id));
      setPages(updatedPages);
      if (toDeleteIds.includes(activePageId)) {
        setActivePageId(updatedPages[0].id);
      }
    }
  };

  // Block level actions
  const handleUpdateBlockContent = (blockId: string, content: string) => {
    setPages(prev => prev.map(p => {
      if (p.id !== activePageId) return p;
      return {
        ...p,
        blocks: p.blocks.map(b => b.id === blockId ? { ...b, content } : b)
      };
    }));
  };

  const handleInputChange = (blockId: string, value: string) => {
    handleUpdateBlockContent(blockId, value);
    
    if (value.endsWith('/')) {
      setActiveSlashBlockId(blockId);
    } else if (!value.includes('/')) {
      setActiveSlashBlockId(null);
    }
  };

  const handleUpdateBlockType = (blockId: string, type: NotionBlock['type']) => {
    setPages(prev => prev.map(p => {
      if (p.id !== activePageId) return p;
      return {
        ...p,
        blocks: p.blocks.map(b => b.id === blockId ? { ...b, type } : b)
      };
    }));
  };

  const handleToggleTodoBlock = (blockId: string) => {
    setPages(prev => prev.map(p => {
      if (p.id !== activePageId) return p;
      return {
        ...p,
        blocks: p.blocks.map(b => b.id === blockId ? { ...b, completed: !b.completed } : b)
      };
    }));
  };

  const handleAddBlock = (afterBlockId?: string) => {
    const newBlockId = generateId();
    const newBlock: NotionBlock = {
      id: newBlockId,
      type: 'text',
      content: ''
    };

    setPages(prev => prev.map(p => {
      if (p.id !== activePageId) return p;
      const idx = p.blocks.findIndex(b => b.id === afterBlockId);
      const updatedBlocks = [...p.blocks];
      if (idx !== -1) {
        updatedBlocks.splice(idx + 1, 0, newBlock);
      } else {
        updatedBlocks.push(newBlock);
      }
      return { ...p, blocks: updatedBlocks };
    }));

    setFocusedBlockId(newBlockId);
    setActiveSlashBlockId(null);
  };

  const handleDeleteBlock = (blockId: string) => {
    setPages(prev => prev.map(p => {
      if (p.id !== activePageId) return p;
      if (p.blocks.length <= 1) return p; // Keep at least one block
      return {
        ...p,
        blocks: p.blocks.filter(b => b.id !== blockId)
      };
    }));
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    setPages(prev => prev.map(p => {
      if (p.id !== activePageId) return p;
      const idx = p.blocks.findIndex(b => b.id === blockId);
      if (idx === -1) return p;
      if (direction === 'up' && idx === 0) return p;
      if (direction === 'down' && idx === p.blocks.length - 1) return p;

      const updatedBlocks = [...p.blocks];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      const temp = updatedBlocks[idx];
      updatedBlocks[idx] = updatedBlocks[targetIdx];
      updatedBlocks[targetIdx] = temp;

      return { ...p, blocks: updatedBlocks };
    }));
  };

  const handleRenamePageTitle = (pageId: string, newTitle: string) => {
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, title: newTitle.trim() || 'صفحه بدون عنوان' } : p));
  };

  // Handle Notion-style key interactions (Enter to split line at cursor, Backspace to merge)
  const handleKeyDown = (e: React.KeyboardEvent, blockId: string, blockType: string, index: number, content: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const textarea = e.target as HTMLTextAreaElement | HTMLInputElement;
      const cursorPos = textarea.selectionStart || 0;
      const beforeText = content.substring(0, cursorPos);
      const afterText = content.substring(cursorPos);
      
      // Update current block content to beforeText
      handleUpdateBlockContent(blockId, beforeText);
      
      // Create new block with afterText
      const newBlockId = generateId();
      const newBlock: NotionBlock = {
        id: newBlockId,
        type: 'text',
        content: afterText
      };
      
      setPages(prev => prev.map(p => {
        if (p.id !== activePageId) return p;
        const updatedBlocks = [...p.blocks];
        const idx = updatedBlocks.findIndex(b => b.id === blockId);
        if (idx !== -1) {
          updatedBlocks.splice(idx + 1, 0, newBlock);
        } else {
          updatedBlocks.push(newBlock);
        }
        return { ...p, blocks: updatedBlocks };
      }));
      
      setFocusedBlockId(newBlockId);
      setActiveSlashBlockId(null);
    } else if (e.key === 'Backspace' && content === '') {
      e.preventDefault();
      if (index > 0) {
        const prevBlock = activePage.blocks[index - 1];
        handleDeleteBlock(blockId);
        setFocusedBlockId(prevBlock.id);
      }
    } else if (e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      setFocusedBlockId(activePage.blocks[index - 1].id);
    } else if (e.key === 'ArrowDown' && index < activePage.blocks.length - 1) {
      e.preventDefault();
      setFocusedBlockId(activePage.blocks[index + 1].id);
    } else if (e.key === 'Escape') {
      setActiveSlashBlockId(null);
      setActiveTypeMenuBlockId(null);
    }
  };

  // Text summary snippet for card preview
  const getTextSummary = (page: NotionPage) => {
    const textBlocks = page.blocks.filter(b => b.type === 'text' || b.type === 'quote' || b.type === 'h1' || b.type === 'h2');
    if (textBlocks.length === 0) return 'یادداشت خالی...';
    const combined = textBlocks.map(b => b.content).filter(Boolean).join(' ');
    if (!combined) return 'یادداشت خالی...';
    return combined.length > 70 ? combined.substring(0, 70) + '...' : combined;
  };

  // Get pages filtered by search query
  const filteredPages = pages.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.blocks.some(b => b.content.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <div className="w-full max-w-5xl mx-auto pb-10 transition-colors" dir="rtl">
      <AnimatePresence mode="wait">
        
        {/* VIEW 1: BEAUTIFUL DASHBOARD BOARD GRID (Transforms entirely on click) */}
        {viewMode === 'list' && (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Header section with Create buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[#E8ECE0] dark:bg-[#1E2218] text-[#7C8363] dark:text-[#9ECE9A] rounded-2xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <h1 className="text-base md:text-lg font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant">دفترچه یادداشت و مستندات</h1>
                  <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold mt-0.5">افکار، مستندات و پروژه‌های خود را مشابه Notion بلوک‌بندی کنید.</p>
                </div>
              </div>

              <button
                onClick={() => handleCreatePage()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-[#7C8363] hover:bg-[#5A5D45] dark:bg-[#9ECE9A] dark:hover:bg-[#86B382] text-white dark:text-[#1B1D16] text-xs font-black rounded-2xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>یادداشت جدید</span>
              </button>
            </div>

            {/* Search and Filters bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="جستجو در تمام یادداشت‌ها و بلوک‌ها..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs px-4 py-3 pl-10 border border-[#E6DFD3] dark:border-[#2D3025] rounded-2xl bg-[#FDFBF7] dark:bg-[#1B1D16] text-[#2D3025] dark:text-[#E8ECE0] focus:outline-none focus:border-[#7C8363] dark:focus:border-[#9ECE9A] transition-colors shadow-xs placeholder-[#8D7F72]"
              />
              <Search className="w-4 h-4 text-[#7C8363] dark:text-[#9ECE9A] absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Grid of Pages / Notes */}
            {filteredPages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPages.map((page) => {
                  const subPagesCount = pages.filter(p => p.parentId === page.id).length;
                  const blocksCount = page.blocks.length;

                  return (
                    <div
                      key={page.id}
                      onClick={() => {
                        setActivePageId(page.id);
                        setViewMode('editor');
                      }}
                      className="group bg-[#FDFBF7] dark:bg-[#1B1D16] p-5 rounded-3xl border border-[#EBE3C8] dark:border-[#2D3025] hover:border-[#7C8363] dark:hover:border-[#9ECE9A] transition-all cursor-pointer shadow-xs flex flex-col justify-between gap-4 relative min-h-[170px]"
                    >
                      <div className="space-y-2">
                        {/* Top bar on Card */}
                        <div className="flex justify-between items-start">
                          <div className="p-2 bg-[#F9F6EE] dark:bg-[#151713] text-[#7C8363] dark:text-[#9ECE9A] rounded-xl border border-[#E6DFD3]/60 dark:border-[#2D3025] group-hover:bg-[#E8ECE0] dark:group-hover:bg-[#1E2218] transition-colors">
                            <FileText className="w-4 h-4" />
                          </div>
                          
                          {/* Trash action */}
                          <button
                            onClick={(e) => handleDeletePage(page.id, e)}
                            className="p-1.5 rounded-lg bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[#8D7F72] hover:text-rose-600 transition-colors cursor-pointer"
                            title="حذف یادداشت"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Title and Snippet */}
                        <div className="text-right">
                          <h3 className="font-extrabold text-sm text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant leading-snug group-hover:text-[#7C8363] dark:group-hover:text-[#9ECE9A] transition-colors">
                            {page.title}
                          </h3>
                          <p className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] leading-relaxed mt-1.5 font-medium line-clamp-3">
                            {getTextSummary(page)}
                          </p>
                        </div>
                      </div>

                      {/* Card Footer info */}
                      <div className="flex justify-between items-center border-t border-[#E6DFD3]/40 dark:border-[#2D3025]/40 pt-3 text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-bold">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 opacity-60" />
                          <span>{page.createdAt}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="bg-[#E8ECE0] dark:bg-[#1D2218] text-[#7C8363] dark:text-[#9ECE9A] px-2 py-0.5 rounded-md font-extrabold">
                            {blocksCount} بلوک
                          </span>
                          {subPagesCount > 0 && (
                            <span className="bg-[#F4E9E4] dark:bg-[#2B201D] text-[#9B6B61] dark:text-[#C59B93] px-2 py-0.5 rounded-md font-extrabold flex items-center gap-0.5">
                              <span>{subPagesCount}</span>
                              <span>صفحه فرعی</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-10 rounded-3xl border border-dashed border-[#E6DFD3] dark:border-[#2D3025] text-center text-[#8D7F72] dark:text-[#9D978B] text-xs font-bold">
                هیچ یادداشتی منطبق با جستجوی شما پیدا نشد.
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW 2: IMMERSIVE FULL SCREEN BLOCK EDITOR (Replaces List Entirely on click) */}
        {viewMode === 'editor' && (
          <motion.div
            key="editor-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.2 }}
            className="bg-[#FDFBF7] dark:bg-[#1B1D16] p-6 md:p-8 rounded-3xl border border-[#E6DFD3] dark:border-[#2D3025] shadow-xs space-y-6 min-h-[550px] transition-colors"
          >
            {/* Top Bar Navigation */}
            <div className="flex justify-between items-center border-b border-[#E6DFD3]/50 dark:border-[#2D3025]/50 pb-4 gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-[#7C8363] dark:text-[#9ECE9A] bg-[#E8ECE0]/50 hover:bg-[#E8ECE0] dark:bg-[#1D2218] dark:hover:bg-[#252C1F] border border-[#DDE2D5] dark:border-[#2D3025] rounded-xl transition-all cursor-pointer"
              >
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                <span>برگشت به تمام یادداشت‌ها</span>
              </button>

              <div className="text-[10px] text-[#8D7F72] dark:text-[#9D978B] font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>تاریخ ایجاد: {activePage?.createdAt}</span>
              </div>
            </div>

            {/* Editable Large Page Title */}
            <div className="py-2">
              {editingPageTitleId === activePage?.id ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={tempPageTitle}
                    onChange={(e) => setTempPageTitle(e.target.value)}
                    onBlur={() => {
                      handleRenamePageTitle(activePage.id, tempPageTitle);
                      setEditingPageTitleId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRenamePageTitle(activePage.id, tempPageTitle);
                        setEditingPageTitleId(null);
                      }
                    }}
                    className="text-lg md:text-xl font-black text-[#2D3025] dark:text-[#E8ECE0] px-4 py-2 border border-[#7C8363] dark:border-[#9ECE9A] rounded-xl bg-white dark:bg-[#151713] focus:outline-none w-full shadow-inner"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      handleRenamePageTitle(activePage.id, tempPageTitle);
                      setEditingPageTitleId(null);
                    }}
                    className="px-4 py-2.5 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#1B1D16] rounded-xl text-xs font-black shrink-0 transition-colors"
                  >
                    تأیید
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group/title justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl md:text-2xl font-black text-[#2D3025] dark:text-[#E8ECE0] font-serif-elegant leading-none">
                      {activePage?.title || 'یادداشت بدون عنوان'}
                    </h2>
                    <button
                      onClick={() => {
                        setEditingPageTitleId(activePage.id);
                        setTempPageTitle(activePage.title);
                      }}
                      className="p-1.5 opacity-0 group-hover/title:opacity-100 text-[#8D7F72] dark:text-[#9D978B] hover:text-[#2D3025] dark:hover:text-[#E8ECE0] transition-opacity cursor-pointer"
                      title="ویرایش عنوان"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Add Subpage Button */}
                  <button
                    onClick={() => handleCreatePage(activePage.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-transparent hover:bg-[#E8ECE0]/50 dark:hover:bg-[#1D2218] text-[#7C8363] dark:text-[#9ECE9A] text-[10px] font-extrabold rounded-xl border border-[#DDE2D5] dark:border-[#2D3025] transition-all cursor-pointer"
                  >
                    <FilePlus2 className="w-3.5 h-3.5" />
                    <span>ایجاد زیر صفحه جدید</span>
                  </button>
                </div>
              )}
            </div>

            {/* Subpages / Nested hierarchy display inside the active page */}
            {pages.filter(p => p.parentId === activePage?.id).length > 0 && (
              <div className="bg-[#E8ECE0]/30 dark:bg-[#1E2218]/30 p-4 rounded-2xl border border-[#DDE2D5]/60 dark:border-[#2D3025]/50 space-y-2">
                <span className="text-[10px] text-[#7C8363] dark:text-[#9ECE9A] font-black block">📂 زیرصفحه‌های فرعی متصل:</span>
                <div className="flex flex-wrap gap-2">
                  {pages.filter(p => p.parentId === activePage?.id).map(sub => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setActivePageId(sub.id);
                        setEditingPageTitleId(null);
                      }}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-[#151713] hover:bg-[#F9F6EE] dark:hover:bg-[#1B1D16] border border-[#D6CFC3] dark:border-[#2D3025] rounded-xl text-[11px] font-bold text-[#3D3D3D] dark:text-[#D6CFC3] transition-all cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#8D7F72]" />
                      <span>{sub.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dynamic Blocks Container */}
            <div className="space-y-4 pt-4 border-t border-[#E6DFD3]/40 dark:border-[#2D3025]/40">
              <AnimatePresence initial={false}>
                {activePage?.blocks.map((block, index) => {
                  return (
                    <motion.div
                      key={block.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-start gap-2 group relative text-right"
                    >
                      {/* Left Controls Bar (Shows on Hover) */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity absolute right-full top-1/2 -translate-y-1/2 mr-2 z-20">
                        <button
                          onClick={() => handleMoveBlock(block.id, 'up')}
                          disabled={index === 0}
                          className="p-1 rounded hover:bg-[#E6DFD3] dark:hover:bg-[#2D3025] text-[#8D7F72] disabled:opacity-20 transition-colors cursor-pointer"
                          title="حرکت به بالا"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveBlock(block.id, 'down')}
                          disabled={index === activePage.blocks.length - 1}
                          className="p-1 rounded hover:bg-[#E6DFD3] dark:hover:bg-[#2D3025] text-[#8D7F72] disabled:opacity-20 transition-colors cursor-pointer"
                          title="حرکت به پایین"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBlock(block.id)}
                          className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors cursor-pointer"
                          title="حذف بلوک"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Type Switcher Dropdown Toggle */}
                      <div className="relative shrink-0 mt-1 z-30">
                        <button
                          onClick={() => {
                            setActiveTypeMenuBlockId(activeTypeMenuBlockId === block.id ? null : block.id);
                            setActiveSlashBlockId(null);
                          }}
                          className="w-7 h-7 bg-[#F9F6EE] dark:bg-[#151713] hover:bg-[#E6DFD3] dark:hover:bg-[#2D3025] rounded-lg border border-[#D6CFC3] dark:border-[#2D3025] flex items-center justify-center text-[#8D7F72] dark:text-[#9D978B] transition-colors cursor-pointer"
                          title="تغییر نوع بلوک"
                        >
                          {block.type === 'text' && <FileText className="w-3.5 h-3.5" />}
                          {block.type === 'h1' && <Heading1 className="w-3.5 h-3.5 text-[#E26645]" />}
                          {block.type === 'h2' && <Heading2 className="w-3.5 h-3.5 text-[#7C8363] dark:text-[#9ECE9A]" />}
                          {block.type === 'todo' && <CheckSquare className="w-3.5 h-3.5 text-[#E26645]" />}
                          {block.type === 'bullet' && <List className="w-3.5 h-3.5" />}
                          {block.type === 'quote' && <Quote className="w-3.5 h-3.5 text-[#9B6B61]" />}
                          {block.type === 'code' && <Code className="w-3.5 h-3.5 text-[#8D7F72]" />}
                        </button>

                        {/* Dropdown Menu block type selections */}
                        {activeTypeMenuBlockId === block.id && (
                          <div className="absolute top-full right-0 mt-1 bg-white dark:bg-[#151713] border border-[#E6DFD3] dark:border-[#2D3025] rounded-xl shadow-lg p-1.5 w-44 z-50 flex flex-col gap-0.5">
                            <span className="text-[9px] text-[#8D7F72] dark:text-[#9D978B] font-black px-2 py-1 block border-b border-[#E6DFD3]/50 dark:border-[#2D3025]/50">تغییر نوع بلوک به:</span>
                            {[
                              { type: 'text', label: 'متن معمولی', icon: <FileText className="w-3.5 h-3.5" /> },
                              { type: 'h1', label: 'تیتر بزرگ (H1)', icon: <Heading1 className="w-3.5 h-3.5 text-[#E26645]" /> },
                              { type: 'h2', label: 'تیتر متوسط (H2)', icon: <Heading2 className="w-3.5 h-3.5 text-[#7C8363] dark:text-[#9ECE9A]" /> },
                              { type: 'todo', label: 'لیست کار انجام دادنی', icon: <CheckSquare className="w-3.5 h-3.5 text-[#E26645]" /> },
                              { type: 'bullet', label: 'مورد لیست نشانه‌دار', icon: <List className="w-3.5 h-3.5" /> },
                              { type: 'quote', label: 'نقل قول برجسته', icon: <Quote className="w-3.5 h-3.5 text-[#9B6B61]" /> },
                              { type: 'code', label: 'بلوک کد فنی', icon: <Code className="w-3.5 h-3.5 text-[#8D7F72]" /> }
                            ].map((opt) => (
                              <button
                                key={opt.type}
                                onClick={() => {
                                  handleUpdateBlockType(block.id, opt.type as any);
                                  setActiveTypeMenuBlockId(null);
                                  setFocusedBlockId(block.id);
                                }}
                                className={`flex items-center gap-2 px-2 py-1.5 text-[11px] font-bold rounded-lg text-right w-full cursor-pointer transition-colors ${
                                  block.type === opt.type 
                                    ? 'bg-[#7C8363] text-white' 
                                    : 'hover:bg-[#E8ECE0]/50 dark:hover:bg-[#1E2218] text-[#3D3D3D] dark:text-[#D6CFC3]'
                                }`}
                              >
                                <span className={block.type === opt.type ? 'text-white' : 'text-[#8D7F72] dark:text-[#9D978B]'}>{opt.icon}</span>
                                <span>{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Content editor for block */}
                      <div className="flex-1 min-w-0 relative">
                        {block.type === 'h1' && (
                          <input
                            id={`input-${block.id}`}
                            type="text"
                            value={block.content}
                            onChange={(e) => handleInputChange(block.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, block.id, block.type, index, block.content)}
                            placeholder="تیتر بزرگ اصلی..."
                            className="w-full text-base md:text-lg font-black text-[#2D3025] dark:text-[#E8ECE0] bg-transparent border-b border-transparent focus:border-[#7C8363]/40 focus:outline-none py-1"
                          />
                        )}

                        {block.type === 'h2' && (
                          <input
                            id={`input-${block.id}`}
                            type="text"
                            value={block.content}
                            onChange={(e) => handleInputChange(block.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, block.id, block.type, index, block.content)}
                            placeholder="تیتر فرعی متوسط..."
                            className="w-full text-sm md:text-base font-extrabold text-[#2D3025] dark:text-[#E8ECE0] bg-transparent border-b border-transparent focus:border-[#7C8363]/40 focus:outline-none py-0.5"
                          />
                        )}

                        {block.type === 'text' && (
                          <textarea
                            id={`input-${block.id}`}
                            rows={1}
                            value={block.content}
                            onChange={(e) => handleInputChange(block.id, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, block.id, block.type, index, block.content)}
                            placeholder="متن خود را بنویسید یا دکمه / را برای کامپوننت بزنید..."
                            className="w-full text-xs text-[#3D3D3D] dark:text-[#D6CFC3] bg-transparent border-b border-transparent focus:border-[#7C8363]/40 focus:outline-none resize-none leading-relaxed py-1 block"
                            style={{ height: 'auto' }}
                            onInput={(e) => {
                              const target = e.target as HTMLTextAreaElement;
                              target.style.height = 'auto';
                              target.style.height = `${target.scrollHeight}px`;
                            }}
                          />
                        )}

                        {block.type === 'todo' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleTodoBlock(block.id)}
                              className={`w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                block.completed 
                                  ? 'bg-[#7C8363] border-[#7C8363] text-white' 
                                  : 'bg-white dark:bg-[#151713] border-[#D6CFC3] dark:border-[#2D3025]'
                              }`}
                            >
                              {block.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                            <input
                              id={`input-${block.id}`}
                              type="text"
                              value={block.content}
                              onChange={(e) => handleInputChange(block.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, block.id, block.type, index, block.content)}
                              placeholder="مورد لیست کاری..."
                              className={`w-full text-xs text-[#3D3D3D] dark:text-[#D6CFC3] bg-transparent border-b border-transparent focus:border-[#7C8363]/40 focus:outline-none py-0.5 ${
                                block.completed ? 'line-through text-[#8D7F72] dark:text-[#9D978B]/50' : ''
                              }`}
                            />
                          </div>
                        )}

                        {block.type === 'bullet' && (
                          <div className="flex items-start gap-2">
                            <span className="text-[#7C8363] dark:text-[#9ECE9A] font-bold mt-1 shrink-0 select-none">•</span>
                            <input
                              id={`input-${block.id}`}
                              type="text"
                              value={block.content}
                              onChange={(e) => handleInputChange(block.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, block.id, block.type, index, block.content)}
                              placeholder="مورد لیست..."
                              className="w-full text-xs text-[#3D3D3D] dark:text-[#D6CFC3] bg-transparent border-b border-transparent focus:border-[#7C8363]/40 focus:outline-none py-0.5"
                            />
                          </div>
                        )}

                        {block.type === 'quote' && (
                          <div className="border-r-4 border-[#E26645] pr-3 py-1 bg-[#F9F6EE]/60 dark:bg-[#1A1815] rounded-l-xl">
                            <textarea
                              id={`input-${block.id}`}
                              rows={1}
                              value={block.content}
                              onChange={(e) => handleInputChange(block.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, block.id, block.type, index, block.content)}
                              placeholder="جمله برگزیده..."
                              className="w-full text-xs text-[#5A5A40] dark:text-[#B6B690] italic bg-transparent focus:outline-none resize-none leading-relaxed block"
                              style={{ height: 'auto' }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${target.scrollHeight}px`;
                              }}
                            />
                          </div>
                        )}

                        {block.type === 'code' && (
                          <div className="bg-[#2D3025] dark:bg-[#151713] p-3 rounded-xl font-mono text-[10px] text-[#DDE2D5] dark:text-[#9ECE9A]">
                            <textarea
                              id={`input-${block.id}`}
                              rows={2}
                              value={block.content}
                              onChange={(e) => handleInputChange(block.id, e.target.value)}
                              onKeyDown={(e) => handleKeyDown(e, block.id, block.type, index, block.content)}
                              placeholder="// کد برنامه نویسی یا مکتوبات مهندسی..."
                              className="w-full bg-transparent focus:outline-none resize-none leading-relaxed font-mono block"
                              style={{ height: 'auto' }}
                              onInput={(e) => {
                                const target = e.target as HTMLTextAreaElement;
                                target.style.height = 'auto';
                                target.style.height = `${target.scrollHeight}px`;
                              }}
                            />
                          </div>
                        )}

                        {/* Floating Slash Commands list popup */}
                        {activeSlashBlockId === block.id && (
                          <div className="absolute top-full right-4 mt-1 bg-white dark:bg-[#151713] border border-[#E6DFD3] dark:border-[#2D3025] rounded-2xl shadow-xl p-1.5 w-52 z-50 flex flex-col gap-0.5">
                            <div className="px-2 py-1.5 border-b border-[#E6DFD3]/50 dark:border-[#2D3025]/50 flex justify-between items-center mb-1">
                              <span className="text-[9px] text-[#7C8363] dark:text-[#9ECE9A] font-black">⌨ افزودن کامپوننت پویا (Slash)</span>
                              <button onClick={() => setActiveSlashBlockId(null)} className="text-[#8D7F72] hover:text-[#8D7F72] dark:hover:text-[#D6CFC3]">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            {[
                              { type: 'text', label: 'متن معمولی (Paragraph)', icon: <FileText className="w-3.5 h-3.5" /> },
                              { type: 'h1', label: 'تیتر بزرگ (Heading 1)', icon: <Heading1 className="w-3.5 h-3.5 text-[#E26645]" /> },
                              { type: 'h2', label: 'تیتر متوسط (Heading 2)', icon: <Heading2 className="w-3.5 h-3.5 text-[#7C8363]" /> },
                              { type: 'todo', label: 'لیست کار انجام دادنی (Todo)', icon: <CheckSquare className="w-3.5 h-3.5 text-[#E26645]" /> },
                              { type: 'bullet', label: 'مورد لیست نشانه‌دار (Bullet)', icon: <List className="w-3.5 h-3.5" /> },
                              { type: 'quote', label: 'نقل قول برگزیده (Quote)', icon: <Quote className="w-3.5 h-3.5 text-[#9B6B61]" /> },
                              { type: 'code', label: 'بلوک کد فنی (Code block)', icon: <Code className="w-3.5 h-3.5 text-[#8D7F72]" /> }
                            ].map((opt) => (
                              <button
                                key={opt.type}
                                onClick={() => {
                                  handleUpdateBlockType(block.id, opt.type as any);
                                  const cleanContent = block.content.replace('/', '');
                                  handleUpdateBlockContent(block.id, cleanContent);
                                  setActiveSlashBlockId(null);
                                  setFocusedBlockId(block.id);
                                }}
                                className="flex items-center gap-2.5 px-2.5 py-1.5 text-[11px] font-bold text-[#3D3D3D] dark:text-[#D6CFC3] rounded-lg hover:bg-[#E8ECE0]/50 dark:hover:bg-[#1E2218] text-right w-full cursor-pointer transition-colors"
                              >
                                <span className="text-[#8D7F72] dark:text-[#9D978B]">{opt.icon}</span>
                                <span>{opt.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Append block button on hover */}
                      <button
                        onClick={() => handleAddBlock(block.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-[#E6DFD3] dark:hover:bg-[#2D3025] text-[#7C8363] dark:text-[#9ECE9A] transition-opacity shrink-0 self-center cursor-pointer"
                        title="افزودن بلوک جدید بعد از این"
                      >
                        <Plus className="w-4 h-4 stroke-[2]" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Empty page block fallback */}
              {activePage?.blocks.length === 0 && (
                <button
                  onClick={() => handleAddBlock()}
                  className="w-full py-6 bg-[#F9F6EE] dark:bg-[#151713] hover:bg-[#E6DFD3]/40 dark:hover:bg-[#2D3025]/40 border border-dashed border-[#D6CFC3] dark:border-[#2D3025] rounded-2xl text-xs font-bold text-[#8D7F72] dark:text-[#9D978B] flex items-center justify-center gap-1.5 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>افزودن اولین بخش مستندات</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
