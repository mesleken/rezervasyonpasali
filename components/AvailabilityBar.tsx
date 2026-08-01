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
  const [results, setResults] = useState<AvailableUnit[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSearch() {
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

  // Kategoriye göre grupla
  const grouped = results ? CATEGORIES.map(cat => ({
    cat,
    units: results.filter((u: any) => {
      const slug = u.category?.slug || u.category_slug
      return slug === cat.slug
    })
  })).filter(g => g.units.length > 0) : []

  return (
    <div className="glass-card p-4 mb-4">
      {/* Başlık */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">🔍</span>
        <span className="font-semibold text-sm text-[#00b4d8] uppercase tracking-wider">
          Hızlı Müsaitlik Sorgulama
        </span>
      </div>

      {/* Tarih Girdileri + Buton */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs text-[#8ba0b5] mb-1">Giriş Tarihi</label>
          <input
            type="date"
            value={checkIn}
            min={todayYMD()}
            onChange={e => {
              setCheckIn(e.target.value)
              setResults(null)
              // Çıkış tarihi giriş tarihinden önce ise düzelt
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
            onChange={e => { setCheckOut(e.target.value); setResults(null) }}
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
            onClick={(e) => {
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
        <div className="mt-3 bg-red-900/30 border border-red-700/40 rounded-lg px-4 py-2 text-red-300 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Sonuçlar */}
      {results !== null && (
        <div className="mt-4 pt-4 border-t border-[rgba(0,180,216,0.12)]">
          {results.length === 0 ? (
            <div className="text-center py-4">
              <span className="text-3xl block mb-2">😔</span>
              <p className="text-[#8ba0b5]">
                {formatDateTR(checkIn)} – {formatDateTR(checkOut)} arasında müsait birim bulunamadı.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-[#8ba0b5] mb-3">
                ✅ <strong className="text-white">{results.length} birim</strong> müsait
                ({formatDateTR(checkIn)} – {formatDateTR(checkOut)})
              </p>
              <div className="flex flex-wrap gap-2">
                {grouped.map(({ cat, units }) =>
                  units.map((u: any) => (
                    <button
                      key={u.id}
                      onClick={() => onSelectUnit({ unit: u, category: u.category || cat }, checkIn, checkOut)}
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
