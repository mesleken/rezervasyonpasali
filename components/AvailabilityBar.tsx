'use client'

import { useState } from 'react'
import { todayYMD, tomorrowYMD, formatDateTR, formatDateWithDayTR } from '@/lib/dateUtils'
import { CATEGORIES } from '@/types'
import type { AvailableUnit, CategorySlug } from '@/types'

interface Props {
  onSelectUnit: (unit: AvailableUnit, checkIn: string, checkOut: string) => void
}

export default function AvailabilityBar({ onSelectUnit }: Props) {
  const [checkIn, setCheckIn] = useState(todayYMD())
  const [checkOut, setCheckOut] = useState(tomorrowYMD())
  const [selectedCategories, setSelectedCategories] = useState<CategorySlug[]>(
    CATEGORIES.map(c => c.slug)
  )
  const [results, setResults] = useState<AvailableUnit[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isAllSelected = selectedCategories.length === CATEGORIES.length

  function toggleCategory(slug: CategorySlug) {
    if (selectedCategories.includes(slug)) {
      setSelectedCategories(selectedCategories.filter(s => s !== slug))
    } else {
      setSelectedCategories([...selectedCategories, slug])
    }
  }

  function toggleAll() {
    if (isAllSelected) {
      setSelectedCategories([])
    } else {
      setSelectedCategories(CATEGORIES.map(c => c.slug))
    }
  }

  async function handleSearch() {
    if (selectedCategories.length === 0) {
      setError('Lütfen arama yapmak için en az bir konaklama türü seçin.')
      return
    }
    if (!checkIn || !checkOut || checkOut <= checkIn) {
      setError('Lütfen geçerli bir tarih aralığı seçin.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/availability?checkIn=${checkIn}&checkOut=${checkOut}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResults(json.data || [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Bilinmeyen hata'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Seçili kategorilere göre sonuçları filtrele
  const filteredResults = results
    ? results.filter((u: any) => {
        const slug = u.category?.slug || u.category_slug
        return selectedCategories.includes(slug)
      })
    : null

  // Kategoriye göre grupla
  const grouped = filteredResults
    ? CATEGORIES.map(cat => ({
        cat,
        units: filteredResults.filter((u: any) => {
          const slug = u.category?.slug || u.category_slug
          return slug === cat.slug
        })
      })).filter(g => g.units.length > 0)
    : []

  return (
    <div className="glass-card p-4 mb-4 space-y-4">
      {/* Başlık */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <span className="font-semibold text-sm text-[#00b4d8] uppercase tracking-wider">
            Hızlı Müsaitlik Sorgulama
          </span>
        </div>
        <span className="text-xs text-[#8ba0b5]">
          {selectedCategories.length} / {CATEGORIES.length} konaklama türü seçili
        </span>
      </div>

      {/* Kategori Filtreleme Çipleri (Çoklu Seçim + Tümünü Seç) */}
      <div>
        <label className="block text-xs font-semibold text-[#8ba0b5] mb-2 uppercase tracking-wider">
          Aramak İstediğiniz Birimleri Seçin:
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {/* Tümünü Seç / Tümünü Kaldır Butonu */}
          <button
            type="button"
            onClick={toggleAll}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer border flex items-center gap-1.5 touch-target ${
              isAllSelected
                ? 'bg-[#00b4d8]/20 border-[#00b4d8] text-[#00b4d8] shadow-sm shadow-[#00b4d8]/20'
                : 'bg-[#1e293b] border-[#334155] text-[#94a3b8] hover:border-[#00b4d8]/50 hover:text-white'
            }`}
          >
            <span>{isAllSelected ? '✅' : '☑️'}</span>
            <span>{isAllSelected ? 'Tümünü Seçili' : 'Tümünü Seç'}</span>
          </button>

          <div className="h-5 w-[1px] bg-white/10 mx-0.5 hidden sm:block" />

          {/* Kategori Butonları */}
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategories.includes(cat.slug)
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => toggleCategory(cat.slug)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer border flex items-center gap-1.5 touch-target ${
                  isSelected
                    ? 'bg-[#00b4d8]/20 border-[#00b4d8] text-white font-semibold shadow-sm shadow-[#00b4d8]/20 scale-102'
                    : 'bg-[#1a2634] border-[#2a3b50] text-[#8ba0b5] opacity-60 hover:opacity-100 hover:border-[#00b4d8]/40 hover:text-white'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tarih Girdileri + Buton */}
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-white/5">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-[#8ba0b5] mb-1">Giriş Tarihi</label>
          <input
            type="date"
            value={checkIn}
            min={todayYMD()}
            onChange={e => {
              setCheckIn(e.target.value)
              setResults(null)
              if (e.target.value >= checkOut) {
                const nextDay = new Date(e.target.value)
                nextDay.setDate(nextDay.getDate() + 1)
                setCheckOut(nextDay.toISOString().split('T')[0])
              }
            }}
            className="form-input"
          />
          {checkIn && (
            <div className="text-[11px] text-[#00b4d8] font-medium mt-1">
              🗓️ {formatDateWithDayTR(checkIn)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-[#8ba0b5] mb-1">Çıkış Tarihi</label>
          <input
            type="date"
            value={checkOut}
            min={checkIn || todayYMD()}
            onChange={e => {
              setCheckOut(e.target.value)
              setResults(null)
            }}
            className="form-input"
          />
          {checkOut && (
            <div className="text-[11px] text-[#00b4d8] font-medium mt-1">
              🗓️ {formatDateWithDayTR(checkOut)}
            </div>
          )}
        </div>

        <div className="pt-5">
          <button
            type="button"
            onClick={e => {
              e.preventDefault()
              handleSearch()
            }}
            disabled={loading}
            className="btn-primary px-5 py-3.5 text-sm whitespace-nowrap touch-target cursor-pointer select-none"
          >
            {loading ? '⏳ Aranıyor...' : '🔍 Boş Birimleri Bul'}
          </button>
        </div>
      </div>

      {/* Hata mesajı */}
      {error && (
        <div className="mt-3 bg-red-900/30 border border-red-700/40 rounded-lg px-4 py-2 text-red-300 text-sm flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:text-white ml-2 underline"
          >
            Kapat
          </button>
        </div>
      )}

      {/* Sonuçlar */}
      {filteredResults !== null && (
        <div className="pt-4 border-t border-[rgba(0,180,216,0.12)] space-y-3">
          {/* Üst Bilgi + Gizle/Temizle Butonu */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            {filteredResults.length === 0 ? (
              <p className="text-sm text-[#8ba0b5]">
                😔 Seçili tarihler ve kategorilerde müsait birim bulunamadı.
              </p>
            ) : (
              <p className="text-sm text-[#8ba0b5]">
                ✅ <strong className="text-white">{filteredResults.length} birim</strong> müsait
                ({formatDateTR(checkIn)} – {formatDateTR(checkOut)})
              </p>
            )}

            {/* Sonuçları Gizle / Temizle Butonu */}
            <button
              type="button"
              onClick={() => setResults(null)}
              className="text-xs bg-white/5 hover:bg-red-500/20 border border-white/10 text-[#8ba0b5] hover:text-red-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer touch-target shrink-0 font-medium"
            >
              <span>✕</span>
              <span>Sonuçları Gizle</span>
            </button>
          </div>

          {/* Müsait Birim Butonları */}
          {filteredResults.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {grouped.map(({ cat, units }) =>
                units.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() =>
                      onSelectUnit(
                        { unit: u, category: u.category || cat },
                        checkIn,
                        checkOut
                      )
                    }
                    className="flex items-center gap-2 bg-[rgba(42,157,143,0.15)] border border-[rgba(42,157,143,0.4)]
                               text-white rounded-xl px-4 py-2.5 text-sm font-semibold
                               hover:bg-[rgba(42,157,143,0.3)] transition-all duration-200
                               active:scale-95 touch-target"
                  >
                    <span>{cat.icon}</span>
                    <span>{u.label}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
