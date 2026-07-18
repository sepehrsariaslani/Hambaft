/**
 * DensityToggle — Quick compact/comfortable mode switcher.
 * Used as a standalone icon button in view headers.
 */
import React, { useState } from 'react'
import { AlignJustify, LayoutList } from 'lucide-react'
import { type DensityMode, type ViewConfig, setDensity } from './ViewConfigStore'

interface DensityToggleProps {
  density: DensityMode
  onChange: (density: DensityMode) => void
}

export function DensityToggle({ density, onChange }: DensityToggleProps) {
  return (
    <button
      onClick={() => onChange(density === 'comfortable' ? 'compact' : 'comfortable')}
      className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
        density === 'compact'
          ? 'bg-[#7C8363] text-white border-[#7C8363]'
          : 'bg-white text-[#8D7F72] border-[#E6DFD3] hover:border-[#7C8363]'
      }`}
      title={density === 'comfortable' ? 'حالت فشرده' : 'حالت راحت'}
    >
      {density === 'compact' ? (
        <LayoutList className="w-3.5 h-3.5" />
      ) : (
        <AlignJustify className="w-3.5 h-3.5" />
      )}
      <span>{density === 'compact' ? 'فشرده' : 'راحت'}</span>
    </button>
  )
}
