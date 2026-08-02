'use client'

import { CATEGORIES } from '@/types'
import type { CategorySlug } from '@/types'

interface Props {
  active: CategorySlug
  onChange: (slug: CategorySlug) => void
  occupancyMap?: Record<string, number>
}

export default function TabNavigation({ active, onChange, occupancyMap }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
      {CATEGORIES.map(cat => {
        const isActive = active === cat.slug
        const occ = occupancyMap ? occupancyMap[cat.slug] : undefined

        return (
          <button
            type="button"
            key={cat.slug}
            onClick={(e) => {
              e.preventDefault()
              onChange(cat.slug)
            }}
            className={`
              flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-xl
              border transition-all duration-200 font-semibold text-sm whitespace-nowrap
              min-h-[48px] cursor-pointer select-none
              ${isActive
                ? 'tab-active text-white border-[#00b4d8]'
                : 'bg-[#0d1e34]/75 border-[rgba(0,180,216,0.12)] text-[#8ba0b5] hover:border-[rgba(0,180,216,0.3)] hover:text-white'
              }
            `}
          >
            <span className="text-xl">{cat.icon}</span>
            <div className="text-left">
              <div>{cat.label}</div>
              <div className="flex items-center gap-1.5 text-xs font-normal">
                <span className={isActive ? 'text-[#00b4d8]' : 'text-[#5c748a]'}>
                  {cat.count} adet
                </span>
                {occ !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded text-[11px] font-bold ${
                    isActive
                      ? 'bg-[#00b4d8]/25 text-white border border-[#00b4d8]/40'
                      : 'bg-white/10 text-[#00b4d8]'
                  }`}>
                    %{occ} doluluk
                  </span>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
