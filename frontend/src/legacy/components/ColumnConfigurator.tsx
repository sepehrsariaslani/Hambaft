/**
 * ColumnConfigurator — Notion-like column visibility toggle panel.
 * Shows all available columns with toggle switches.
 * Saves changes to ViewConfigStore.
 */
import React, { useState } from 'react'
import { Settings, Columns, Check, Eye, EyeOff, Save, Trash2, Plus, X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import {
  TASK_COLUMNS,
  type ColumnId,
  type ViewConfig,
  type SavedView,
  type DensityMode,
  DENSITY_CONFIG,
  toggleColumn,
  isColumnVisible,
  setDensity,
  saveView,
  deleteSavedView,
  getSavedViews,
} from './ViewConfigStore'

interface ColumnConfiguratorProps {
  config: ViewConfig
  onConfigChange: (config: ViewConfig) => void
}

export function ColumnConfigurator({ config, onConfigChange }: ColumnConfiguratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)
  const [savedViews, setSavedViews] = useState<SavedView[]>(getSavedViews())

  const handleToggle = (colId: ColumnId) => {
    const updated = toggleColumn(config, colId)
    onConfigChange(updated)
  }

  const handleDensityChange = (density: DensityMode) => {
    const updated = setDensity(config, density)
    onConfigChange(updated)
  }

  const handleSaveView = () => {
    if (!saveName.trim()) return
    const saved: SavedView = {
      id: `sv-${Date.now()}`,
      name: saveName.trim(),
      createdAt: new Date().toISOString(),
      config: { ...config },
    }
    saveView(saved)
    setSavedViews(getSavedViews())
    setSaveName('')
    setShowSaveInput(false)
  }

  const handleLoadView = (saved: SavedView) => {
    onConfigChange({ ...saved.config, id: config.id, label: config.label })
    setIsOpen(false)
  }

  const handleDeleteView = (id: string) => {
    deleteSavedView(id)
    setSavedViews(getSavedViews())
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
          isOpen
            ? 'bg-[#7C8363] text-white border-[#7C8363]'
            : 'bg-white text-[#8D7F72] border-[#E6DFD3] hover:border-[#7C8363] hover:text-[#7C8363]'
        }`}
        title="تنظیمات نمایش"
      >
        <Columns className="w-3.5 h-3.5" />
        <span>ستون‌ها</span>
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 top-full mt-2 z-50 w-72 bg-white rounded-2xl border border-[#E6DFD3] shadow-lg overflow-hidden"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E6DFD3]/60 bg-[#FDFBF7]">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-[#7C8363]" />
                  <span className="text-xs font-black text-[#2D3025]">تنظیمات نمایش</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="p-1 text-[#8D7F72] hover:text-[#2D3025]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Density section */}
              <div className="px-4 py-3 border-b border-[#E6DFD3]/40">
                <span className="text-[10px] font-bold text-[#8D7F72] block mb-2">تراکم نمایش</span>
                <div className="flex gap-2">
                  {(['comfortable', 'compact'] as DensityMode[]).map(d => (
                    <button
                      key={d}
                      onClick={() => handleDensityChange(d)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-bold border transition-all ${
                        config.density === d
                          ? 'bg-[#7C8363] text-white border-[#7C8363]'
                          : 'bg-white text-[#8D7F72] border-[#E6DFD3] hover:border-[#7C8363]'
                      }`}
                    >
                      {d === 'comfortable' ? 'راحت' : 'فشرده'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column toggles */}
              <div className="px-4 py-3 border-b border-[#E6DFD3]/40 max-h-[260px] overflow-y-auto">
                <span className="text-[10px] font-bold text-[#8D7F72] block mb-2">ستون‌های قابل نمایش</span>
                <div className="space-y-1">
                  {TASK_COLUMNS.map(col => {
                    const visible = isColumnVisible(config, col.id)
                    const isTitle = col.id === 'title'
                    return (
                      <button
                        key={col.id}
                        onClick={() => handleToggle(col.id)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[11px] transition-all ${
                          visible ? 'bg-[#E8ECE0]/50 text-[#2D3025]' : 'text-[#9D978B] hover:bg-[#F9F6EE]'
                        }`}
                      >
                        <span className="font-semibold">{col.label}</span>
                        {isTitle ? (
                          <span className="text-[9px] text-[#7C8363]">همیشه فعال</span>
                        ) : visible ? (
                          <Eye className="w-3.5 h-3.5 text-[#7C8363]" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-[#D6CFC3]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Saved views */}
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-[#8D7F72]">نمای ذخیره‌شده</span>
                  <button
                    onClick={() => setShowSaveInput(!showSaveInput)}
                    className="flex items-center gap-1 text-[9px] font-bold text-[#7C8363] hover:text-[#5A5A40]"
                  >
                    <Plus className="w-3 h-3" />
                    ذخیره نمای فعلی
                  </button>
                </div>

                {/* Save input */}
                <AnimatePresence>
                  {showSaveInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-2 mb-2"
                    >
                      <input
                        type="text"
                        value={saveName}
                        onChange={e => setSaveName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveView()}
                        placeholder="نام نما..."
                        className="flex-1 px-2.5 py-1.5 text-[10px] border border-[#E6DFD3] rounded-lg focus:outline-none focus:border-[#7C8363]"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveView}
                        className="px-2 py-1.5 bg-[#7C8363] text-white rounded-lg text-[10px] font-bold"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Saved views list */}
                {savedViews.length > 0 ? (
                  <div className="space-y-1 max-h-[120px] overflow-y-auto">
                    {savedViews.map(sv => (
                      <div
                        key={sv.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-[#F9F6EE] group"
                      >
                        <button
                          onClick={() => handleLoadView(sv)}
                          className="text-[10px] font-semibold text-[#2D3025] hover:text-[#7C8363] truncate flex-1 text-right"
                        >
                          {sv.name}
                        </button>
                        <button
                          onClick={() => handleDeleteView(sv.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#D6CFC3] hover:text-red-500 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[9px] text-[#D6CFC3] text-center py-2">هنوز نمای ذخیره‌شده‌ای ندارید</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
