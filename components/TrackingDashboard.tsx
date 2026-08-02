'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Reservation, Unit, CleaningStatus, CategorySlug } from '@/types'
import { CATEGORIES } from '@/types'
import { formatDateTR } from '@/lib/dateUtils'

interface Props {
  onBack: () => void
  onLogout: () => void
}

interface TrackingData {
  todayDate: string
  totalInHouseGuests: number
  todayCheckInsCount: number
  todayCheckOutsCount: number
  turnoverCount: number
  todayCheckIns: Reservation[]
  todayCheckOuts: Reservation[]
  turnoverUnitIds: number[]
  units: Unit[]
}

export default function TrackingDashboard({ onBack, onLogout }: Props) {
  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [localCleaningMap, setLocalCleaningMap] = useState<Record<number, CleaningStatus>>({})
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | 'all'>('all')

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tracking?t=${Date.now()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Veri yüklenemedi.')
      setData(json)

      // localStorage'dan kaydedilmiş temizlik durumlarını al
      let savedMap: Record<number, CleaningStatus> = {}
      try {
        const stored = localStorage.getItem('pasali_cleaning_map')
        if (stored) savedMap = JSON.parse(stored)
      } catch (e) {
        console.error('localStorage okuma hatası:', e)
      }

      const checkOutUnitIds = new Set((json.todayCheckOuts || []).map((r: Reservation) => r.unit_id))

      const map: Record<number, CleaningStatus> = { ...savedMap }
      json.units.forEach((u: Unit) => {
        // Eğer kullanıcı elle değişiklik yapmadıysa ve o gün çıkış varsa OTOMATİK olarak KIRLİ işaretle
        if (map[u.id] === undefined) {
          if (checkOutUnitIds.has(u.id)) {
            map[u.id] = 'dirty'
          } else {
            map[u.id] = u.cleaning_status || 'clean'
          }
        }
      })
      setLocalCleaningMap(map)
      try {
        localStorage.setItem('pasali_cleaning_map', JSON.stringify(map))
      } catch (e) {}
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Bağlantı hatası'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Temizlik durumunu güncelle
  async function updateCleaningStatus(unitId: number, status: CleaningStatus) {
    setLocalCleaningMap(prev => {
      const updated = { ...prev, [unitId]: status }
      try {
        localStorage.setItem('pasali_cleaning_map', JSON.stringify(updated))
      } catch (e) {}
      return updated
    })

    try {
      await fetch('/api/units/cleaning', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId, cleaningStatus: status })
      })
    } catch (e) {
      console.error('Temizlik durumu veritabanına aktarılamadı:', e)
    }
  }

  const todayDisplay = formatDateTR(new Date().toISOString().split('T')[0])

  // Henüz temizlenmemiş (kirli veya temizlenmekte olan) Acele Temizlik birimleri
  const pendingTurnoverUnitIds = data
    ? data.turnoverUnitIds.filter(unitId => (localCleaningMap[unitId] || 'dirty') !== 'clean')
    : []

  return (
    <div className="space-y-5 pb-12 w-full max-w-full overflow-x-hidden">
      {/* Üst Başlık & Kontrol Butonları */}
      <div className="glass-card p-4 flex flex-wrap items-center justify-between gap-3 border border-emerald-500/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-xl shadow-lg shadow-emerald-950/50">
            📋
          </div>
          <div>
            <h1 className="font-display font-bold text-lg sm:text-xl text-white flex items-center gap-2">
              Günlük Takip & Operasyon Paneli
            </h1>
            <p className="text-xs text-[#8ba0b5]">
              🗓️ Bugüne Özel Veriler ({todayDisplay})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="btn-ghost px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
          >
            <span>🔄</span> Yenile
          </button>
          <button
            onClick={onBack}
            className="btn-primary px-3.5 py-1.5 rounded-xl text-xs font-bold"
          >
            📅 Takvime Dön
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-card p-12 text-center text-[#00b4d8] font-semibold animate-pulse">
          📋 Günlük operasyon verileri yükleniyor...
        </div>
      ) : error ? (
        <div className="glass-card p-6 text-center text-red-400 font-semibold">
          ❌ {error}
        </div>
      ) : data ? (
        <>
          {/* ============================================================
              1. GÜNLÜK İSTATİSTİK KARTLARI
          ============================================================ */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Kart 1: Kamp İçi Toplam Misafir */}
            <div className="glass-card p-4 border-l-4 border-l-cyan-400 border border-white/10 relative overflow-hidden">
              <div className="text-xs text-[#8ba0b5] font-semibold">⛺ Kamp İçi Misafir</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {data.totalInHouseGuests} <span className="text-xs font-normal text-cyan-300">Kişi</span>
              </div>
              <div className="text-[11px] text-cyan-400/80 mt-1">Şu an konaklayan toplam nüfus</div>
            </div>

            {/* Kart 2: Bugün Gelecekler (Check-in) */}
            <div className="glass-card p-4 border-l-4 border-l-emerald-400 border border-white/10 relative overflow-hidden">
              <div className="text-xs text-[#8ba0b5] font-semibold">📥 Bugün Gelecekler</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {data.todayCheckInsCount} <span className="text-xs font-normal text-emerald-300">Oda</span>
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-1">Giriş yapacak rezervasyonlar</div>
            </div>

            {/* Kart 3: Bugün Çıkacaklar (Check-out) */}
            <div className="glass-card p-4 border-l-4 border-l-amber-400 border border-white/10 relative overflow-hidden">
              <div className="text-xs text-[#8ba0b5] font-semibold">📤 Bugün Çıkacaklar</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {data.todayCheckOutsCount} <span className="text-xs font-normal text-amber-300">Oda</span>
              </div>
              <div className="text-[11px] text-amber-400/80 mt-1">Ayrılacak rezervasyonlar</div>
            </div>

            {/* Kart 4: Acele Temizlik (Back-to-Back Turnover) */}
            <div className={`glass-card p-4 border-l-4 border border-white/10 relative overflow-hidden ${
              pendingTurnoverUnitIds.length > 0 ? 'border-l-red-500 bg-red-950/20' : 'border-l-emerald-400 bg-emerald-950/20'
            }`}>
              <div className="text-xs text-[#8ba0b5] font-semibold">⚠️ Acele Temizlik Bekleyen</div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                {pendingTurnoverUnitIds.length} <span className="text-xs font-normal text-red-300">Oda</span>
              </div>
              <div className="text-[11px] text-red-400/90 mt-1">
                {pendingTurnoverUnitIds.length > 0 ? 'Öncelikli temizlenmesi gereken oda' : 'Tüm devir odaları temizlendi! ✨'}
              </div>
            </div>
          </div>

          {/* ============================================================
              2. KRİTİK ACELE TEMİZLİK (BACK-TO-BACK) UYARI ALANI
          ============================================================ */}
          {pendingTurnoverUnitIds.length > 0 ? (
            <div className="bg-gradient-to-r from-red-950/60 via-[#0d1e34] to-red-950/60 border border-red-500/40 rounded-2xl p-4 shadow-xl space-y-2">
              <div className="flex items-center gap-2 text-red-400 font-bold text-sm sm:text-base">
                <span>🚨</span>
                <span>DİKKAT: Temizlik Bekleyen Acele Birimler ({pendingTurnoverUnitIds.length})</span>
              </div>
              <p className="text-xs text-[#8ba0b5] leading-relaxed">
                Aşağıdaki birimlerden bugün müşteri ayrılacak ve <strong>aynı gün yeni müşteri giriş yapacaktır</strong>. Temizlendiğinde butonuna basarak uyarıyı kaldırabilirsiniz:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {pendingTurnoverUnitIds.map(unitId => {
                  const unitObj = data.units.find(u => u.id === unitId)
                  const unitLabel = unitObj ? `${unitObj.category?.label || ''} ${unitObj.unit_number}` : `Birim #${unitId}`

                  return (
                    <div key={unitId} className="bg-red-900/40 border border-red-500/50 rounded-xl px-3 py-2 flex items-center gap-3">
                      <span className="font-bold text-white text-xs">{unitLabel}</span>
                      <button
                        type="button"
                        onClick={() => updateCleaningStatus(unitId, 'clean')}
                        className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs px-2.5 py-1 rounded-lg transition-all active:scale-95 shadow"
                      >
                        ✨ Temizlendi Yap
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : data.turnoverCount > 0 ? (
            <div className="bg-gradient-to-r from-emerald-950/60 via-[#0d1e34] to-emerald-950/60 border border-emerald-500/40 rounded-2xl p-3.5 shadow-lg flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div className="text-xs sm:text-sm">
                <span className="font-bold text-emerald-400">Harika! Bugüne ait tüm acele devir odaları temizlendi!</span>
                <span className="block text-[#8ba0b5]">Tüm müşteriler temiz odalara giriş yapabilir.</span>
              </div>
            </div>
          ) : null}

          {/* ============================================================
              3. BUGÜNÜN HAREKET LİSTELERİ (ÇIKIŞ & GİRİŞ)
          ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sol Kolon: Bugün Çıkış Yapacaklar (Check-out) */}
            <div className="glass-card p-4 border border-amber-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h2 className="font-bold text-sm sm:text-base text-amber-300 flex items-center gap-2">
                  <span>📤</span>
                  <span>Bugün Çıkış Yapacak Müşteriler ({data.todayCheckOuts.length})</span>
                </h2>
              </div>

              {data.todayCheckOuts.length === 0 ? (
                <div className="text-center py-6 text-[#8ba0b5] text-xs">
                  Ayrılacak müşteri bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {data.todayCheckOuts.map(res => {
                    const unitLabel = res.unit ? `${res.unit.category?.label || ''} ${res.unit.unit_number}` : `Birim #${res.unit_id}`
                    const isTurnover = data.turnoverUnitIds.includes(res.unit_id)

                    return (
                      <div key={res.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-white/10 transition-all">
                        <div>
                          <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                            <span>{res.guest_name}</span>
                            {isTurnover && (
                              <span className="bg-red-500/30 text-red-300 border border-red-500/40 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                Yerine Gelen Var!
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#8ba0b5] mt-0.5">
                            🏠 {unitLabel} {res.phone ? `· 📞 ${res.phone}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg font-semibold block">
                            Çıkış Bugün
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Sağ Kolon: Bugün Giriş Yapacaklar (Check-in) */}
            <div className="glass-card p-4 border border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h2 className="font-bold text-sm sm:text-base text-emerald-300 flex items-center gap-2">
                  <span>📥</span>
                  <span>Bugün Giriş Yapacak Müşteriler ({data.todayCheckIns.length})</span>
                </h2>
              </div>

              {data.todayCheckIns.length === 0 ? (
                <div className="text-center py-6 text-[#8ba0b5] text-xs">
                  Bugün giriş yapacak müşteri bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {data.todayCheckIns.map(res => {
                    const unitLabel = res.unit ? `${res.unit.category?.label || ''} ${res.unit.unit_number}` : `Birim #${res.unit_id}`
                    const guestCountStr = res.guest_count ? `${res.guest_count} Kişi` : '2 Kişi'

                    return (
                      <div key={res.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between gap-3 hover:bg-white/10 transition-all">
                        <div>
                          <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                            <span>{res.guest_name}</span>
                            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] px-1.5 py-0.5 rounded font-semibold">
                              👥 {guestCountStr}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#8ba0b5] mt-0.5">
                            🏠 {unitLabel} {res.phone ? `· 📞 ${res.phone}` : ''}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-1 rounded-lg font-semibold block">
                            Giriş Bugün
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================
              4. BİRİMLERİN ANLIK TEMİZLİK KONTROL MATRİSİ
          ============================================================ */}
          <div className="glass-card p-4 space-y-4 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <h2 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <span>🧹</span>
                <span>Tesis Birimleri Temizlik ve Oda Durumları</span>
              </h2>

              {/* Kategori Filtresi */}
              <div className="flex items-center gap-1 bg-[#07111e] p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === 'all' ? 'bg-[#00b4d8] text-white' : 'text-[#8ba0b5] hover:text-white'
                  }`}
                >
                  Tümü
                </button>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.slug}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat.slug ? 'bg-[#00b4d8] text-white' : 'text-[#8ba0b5] hover:text-white'
                    }`}
                  >
                    {cat.icon} {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Birim Izgarası (Grid) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {data.units
                .filter(u => selectedCategory === 'all' || u.category?.slug === selectedCategory)
                .map(unit => {
                  const status = localCleaningMap[unit.id] || 'clean'
                  const isTurnover = data.turnoverUnitIds.includes(unit.id)
                  const hasCheckoutToday = data.todayCheckOuts.some(r => r.unit_id === unit.id)
                  const unitLabel = `${unit.category?.label || ''} ${unit.unit_number}`

                  return (
                    <div
                      key={unit.id}
                      className={`p-3 rounded-xl border transition-all space-y-2.5 flex flex-col justify-between ${
                        isTurnover
                          ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-950/40'
                          : status === 'dirty'
                          ? 'bg-red-950/30 border-red-500/60'
                          : status === 'in_progress'
                          ? 'bg-amber-950/30 border-amber-500/60'
                          : 'bg-emerald-950/20 border-emerald-500/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-bold text-white text-xs sm:text-sm truncate">
                            {unit.category?.icon} {unitLabel}
                          </span>
                          {isTurnover && (
                            <span className="text-[10px] bg-red-600 text-white font-extrabold px-1 rounded shrink-0">
                              ⚠️ ACELE
                            </span>
                          )}
                        </div>

                        {/* Durum Etiketi */}
                        <div className="text-[11px] font-bold">
                          {status === 'dirty' ? (
                            <span className="text-red-400 flex items-center gap-1">
                              🔴 KIRLI {hasCheckoutToday ? '(Çıkış Var)' : ''}
                            </span>
                          ) : status === 'in_progress' ? (
                            <span className="text-amber-300 flex items-center gap-1">
                              🧼 TEMİZLENİYOR
                            </span>
                          ) : (
                            <span className="text-emerald-400 flex items-center gap-1">
                              ✨ TEMİZ / HAZIR
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Hızlı Aksiyon Butonu */}
                      {status === 'dirty' || status === 'in_progress' ? (
                        <button
                          type="button"
                          onClick={() => updateCleaningStatus(unit.id, 'clean')}
                          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs py-2 px-2 rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 touch-target"
                        >
                          <span>✨</span>
                          <span>Temizlendi</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateCleaningStatus(unit.id, 'dirty')}
                          className="w-full bg-red-900/40 hover:bg-red-900/60 text-red-300 border border-red-500/30 font-semibold text-xs py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1"
                        >
                          <span>🔴</span>
                          <span>Kirli İşaretle</span>
                        </button>
                      )}
                    </div>
                  )
                })}
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
