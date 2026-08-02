'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { CATEGORIES } from '@/types'
import type { CategorySlug, Reservation, Unit, Category, QuickReservationPayload, AvailableUnit } from '@/types'
import { monthNameTR } from '@/lib/dateUtils'

const CalendarView = dynamic(() => import('@/components/CalendarView'), {
  ssr: false,
  loading: () => (
    <div className="glass-card flex items-center justify-center h-64 min-h-[350px]">
      <div className="text-[#00b4d8] animate-pulse font-semibold">📅 Takvim yükleniyor...</div>
    </div>
  )
})

import AvailabilityBar from '@/components/AvailabilityBar'
import TabNavigation from '@/components/TabNavigation'
import QuickReservationModal from '@/components/QuickReservationModal'
import ReservationDetailDrawer from '@/components/ReservationDetailDrawer'
import ConfirmDialog from '@/components/ConfirmDialog'
import PinModal from '@/components/PinModal'
import FinanceDashboard from '@/components/FinanceDashboard'

export default function HomePage() {
  // Sekme durumu
  const [activeCategory, setActiveCategory] = useState<CategorySlug>('bungalov')

  // Ana görünüm modu ('calendar' | 'finance')
  const [viewMode, setViewMode] = useState<'calendar' | 'finance'>('calendar')

  // PIN Kodu Modalı durumu
  const [pinModalOpen, setPinModalOpen] = useState(false)

  // Takvim tarih durumu
  const [currentDate, setCurrentDate] = useState(new Date())

  // Tüm veritabanı birimleri (gerçek id eşleştirmeleri için)
  const [allUnits, setAllUnits] = useState<Unit[]>([])

  // Aylık Kategori Doluluk Oranları (%)
  const [occupancyMap, setOccupancyMap] = useState<Record<string, number>>({})

  useEffect(() => {
    fetch('/api/units')
      .then(res => res.json())
      .then(json => {
        if (json.data) setAllUnits(json.data)
      })
      .catch(console.error)
  }, [])

  // Seçili ay için kategori bazlı doluluk oranı hesapla
  const fetchMonthlyOccupancy = useCallback(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    const daysInMonth = new Date(year, month, 0).getDate()
    
    // Ay sınırları
    const monthStart = new Date(year, month - 1, 1).getTime()
    const monthEnd = new Date(year, month - 1, daysInMonth, 23, 59, 59).getTime()

    fetch(`/api/reservations?year=${year}&month=${month}&t=${Date.now()}`)
      .then(res => res.json())
      .then(json => {
        if (!json.data) return
        const resList: Reservation[] = json.data
        const occMap: Record<string, number> = {}

        CATEGORIES.forEach(cat => {
          const catUnitCount = cat.count
          const totalCatCapacity = catUnitCount * daysInMonth
          let totalBookedNights = 0

          resList.forEach(r => {
            // Birim ve kategori eşlemesi (r.unit yoksa allUnits'den bul)
            const unitObj = r.unit || allUnits.find(u => u.id === r.unit_id)
            const rCatSlug = unitObj?.category?.slug

            if (rCatSlug === cat.slug) {
              const checkInTime = new Date(r.check_in + 'T12:00:00').getTime()
              const checkOutTime = new Date(r.check_out + 'T12:00:00').getTime()

              // Ay sınırlarına kırp
              const effectiveStart = Math.max(checkInTime, monthStart)
              const effectiveEnd = Math.min(checkOutTime, monthEnd + 1000 * 3600 * 12)

              if (effectiveEnd > effectiveStart) {
                const diffNights = Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24))
                totalBookedNights += diffNights
              }
            }
          })

          const rate = totalCatCapacity > 0
            ? Math.min(100, Math.round((totalBookedNights / totalCatCapacity) * 100))
            : 0
          occMap[cat.slug] = rate
        })

        setOccupancyMap(occMap)
      })
      .catch(console.error)
  }, [currentDate, allUnits])

  useEffect(() => {
    fetchMonthlyOccupancy()
  }, [fetchMonthlyOccupancy])

  // Rezervasyon ekleme, silme, güncelleme ve takvim yenileme işlemi
  function refreshCalendar() {
    const fn = (window as Window & { __refreshCalendar?: () => void }).__refreshCalendar
    if (fn) fn()
    fetchMonthlyOccupancy()
  }

  // Rezervasyon modalı
  const [modalOpen, setModalOpen] = useState(false)
  const [modalUnit, setModalUnit] = useState<Unit | null>(null)
  const [modalCategory, setModalCategory] = useState<Category | null>(null)
  const [modalCheckIn, setModalCheckIn] = useState<string | undefined>()
  const [modalCheckOut, setModalCheckOut] = useState<string | undefined>()

  // Detay çekmecesi
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)

  // İptal onay penceresi
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null)

  // Toast bildirimi
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // =============================================
  // YARDIMCI FONKSİYONLAR
  // =============================================

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Müsaitlik barından birim seçilince
  const handleAvailabilitySelect = useCallback((
    available: any,
    checkIn: string,
    checkOut: string
  ) => {
    const unit = available.unit || available
    const category = available.category || CATEGORIES.find(c => c.slug === activeCategory)
    setModalUnit(unit)
    setModalCategory(category)
    setModalCheckIn(checkIn)
    setModalCheckOut(checkOut)
    if (category?.slug) {
      setActiveCategory(category.slug as CategorySlug)
    }
    setModalOpen(true)
  }, [activeCategory])

  // Takvim boş hücresine tıklanınca
  function handleDateRangeSelect(resourceId: number | string, start: string, end: string) {
    const cat = CATEGORIES.find(c => c.slug === activeCategory)!
    // resourceId "bungalov_2" formatında gelir, sayı kısmını çıkar
    const unitNum = typeof resourceId === 'string'
      ? parseInt(resourceId.split('_').pop() || '1')
      : Number(resourceId)

    // Gerçek veritabanı birimini bul (Örn: Çadır 3 için veritabanındaki gerçek id)
    const matchedUnit = allUnits.find(u => {
      const uCatSlug = u.category?.slug
      return u.unit_number === unitNum && (uCatSlug ? uCatSlug === activeCategory : true)
    })

    const realUnitId = matchedUnit ? matchedUnit.id : unitNum

    setModalUnit({
      id: realUnitId,
      category_id: matchedUnit?.category_id || 0,
      unit_number: unitNum,
      label: `${cat.label} ${unitNum}`,
      is_active: true
    })
    setModalCategory({
      id: matchedUnit?.category?.id || 0,
      slug: activeCategory,
      label: cat.label,
      icon: cat.icon,
      sort_order: cat.sort_order || 0
    })
    setModalCheckIn(start)
    setModalCheckOut(end)
    setModalOpen(true)
  }

  // Rezervasyon etkinliğine tıklanınca
  function handleEventClick(reservation: Reservation) {
    setSelectedReservation(reservation)
    setDrawerOpen(true)
  }

  // Kaydet
  async function handleSave(payload: QuickReservationPayload): Promise<{ error?: string }> {
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const json = await res.json()
      if (!res.ok) return { error: json.error }
      showToast('Rezervasyon kaydedildi! 🎉')
      refreshCalendar()
      return {}
    } catch (e) {
      return { error: 'Sunucu bağlantı hatası.' }
    }
  }

  // İptal et — onay penceresini aç
  function handleCancelRequest(id: string) {
    setPendingCancelId(id)
    setDrawerOpen(false)
    setConfirmOpen(true)
  }

  // İptal onayla
  async function handleCancelConfirm() {
    if (!pendingCancelId) return
    setConfirmOpen(false)
    try {
      const res = await fetch(`/api/reservations/${pendingCancelId}`, { method: 'DELETE' })
      const json = await res.json()
      if (res.ok) {
        showToast('Rezervasyon iptal edildi.')
        refreshCalendar()
      } else {
        showToast(json.error || 'İptal işlemi başarısız.', 'error')
      }
    } catch {
      showToast('Sunucu bağlantı hatası.', 'error')
    }
    setPendingCancelId(null)
  }

  // Aktife çevir (pending → active)
  async function handleActivate(id: string, depositAmount?: number) {
    try {
      const payload: Record<string, unknown> = { status: 'active' }
      if (depositAmount !== undefined) {
        payload.deposit = depositAmount
      }
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const json = await res.json()
        showToast(json.error || 'Güncelleme başarısız.', 'error')
        return
      }
      setDrawerOpen(false)
      showToast('Rezervasyon aktife alındı ve kapora kaydedildi! (Kırmızıya dönüştü) 🎉')
      refreshCalendar()
    } catch {
      showToast('Güncelleme hatası.', 'error')
    }
  }

  // Ödemeyi tamamla & Tamamlandı yap (status → completed, deposit → totalAmount)
  async function handleComplete(id: string, totalAmount: number) {
    try {
      const res = await fetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          deposit: totalAmount > 0 ? totalAmount : undefined
        })
      })
      if (!res.ok) {
        const json = await res.json()
        showToast(json.error || 'İşlem başarısız.', 'error')
        return
      }
      setDrawerOpen(false)
      showToast('Ödeme tamamlandı! Rezervasyon arşivlendi (Mavi renge dönüştü) 🎉')
      refreshCalendar()
    } catch {
      showToast('Güncelleme hatası.', 'error')
    }
  }

  // Ay navigasyonu
  function goMonth(offset: number) {
    setCurrentDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + offset)
      return d
    })
  }

  const monthLabel = `${monthNameTR(currentDate.getMonth())} ${currentDate.getFullYear()}`

  return (
    <div className="min-h-dvh flex flex-col overflow-x-hidden w-full max-w-[100vw]">
      {/* ============================================================
          HEADER
      ============================================================ */}
      <header className="sticky top-0 z-30 bg-[rgba(7,17,30,0.92)] backdrop-blur-md
                         border-b border-[rgba(0,180,216,0.12)] px-2.5 sm:px-4 py-2.5 sm:py-3 w-full overflow-x-hidden">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-1.5 sm:gap-4">
          {/* Logo & Başlık */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#00b4d8] to-[#2a9d8f]
                            flex items-center justify-center text-base sm:text-xl shadow-lg shadow-cyan-900/40">
              🏕️
            </div>
            <div>
              <div className="font-display font-bold text-sm sm:text-base leading-tight
                              bg-gradient-to-r from-white to-[#00b4d8] bg-clip-text text-transparent">
                PAŞALI
              </div>
              <div className="text-xs text-[#5c748a] hidden tablet:block">
                Bungalow & Camping & Karavan
              </div>
            </div>
          </div>

          {/* Ay Navigasyonu + Yönetici Finans Butonu */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {viewMode === 'calendar' && (
              <>
                <button
                  onClick={() => goMonth(-1)}
                  className="btn-ghost w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-base sm:text-lg flex items-center justify-center shrink-0 touch-target"
                  aria-label="Önceki Ay"
                >‹</button>
                <span className="font-display font-bold text-xs sm:text-base min-w-[95px] sm:min-w-[150px] text-center text-white truncate px-0.5">
                  {monthLabel}
                </span>
                <button
                  onClick={() => goMonth(1)}
                  className="btn-ghost w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-base sm:text-lg flex items-center justify-center shrink-0 touch-target"
                  aria-label="Sonraki Ay"
                >›</button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="btn-ghost px-2 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold shrink-0 touch-target"
                >
                  Bugün
                </button>
              </>
            )}

            {/* Kilitli Finans Raporları Butonu */}
            <button
              onClick={() => {
                if (viewMode === 'finance') {
                  setViewMode('calendar')
                } else {
                  setPinModalOpen(true)
                }
              }}
              className={`px-2.5 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all touch-target flex items-center gap-1.5 border shrink-0 ${
                viewMode === 'finance'
                  ? 'bg-[#00b4d8] text-white border-[#00b4d8] shadow-lg shadow-cyan-950/50'
                  : 'bg-gradient-to-r from-amber-500/20 to-cyan-500/20 border-amber-500/30 text-amber-300 hover:border-amber-400'
              }`}
            >
              <span>🔒</span>
              <span>{viewMode === 'finance' ? 'Takvim' : 'Finans'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================
          ANA İÇERİK — SADECE DİKEY KAYDIRMA
      ============================================================ */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-2 sm:px-4 py-4 space-y-4 overflow-x-hidden">

        {viewMode === 'finance' ? (
          <FinanceDashboard
            onBack={() => setViewMode('calendar')}
            onLogout={() => setViewMode('calendar')}
          />
        ) : (
          <>
            {/* Hızlı Müsaitlik Barı */}
            <AvailabilityBar onSelectUnit={handleAvailabilitySelect} />

            {/* Sekme Navigasyonu */}
            <TabNavigation active={activeCategory} onChange={setActiveCategory} occupancyMap={occupancyMap} />

            {/* FullCalendar Resource Timeline */}
            <CalendarView
              key={activeCategory} // Sekme değişince yeniden mount et
              categorySlug={activeCategory}
              currentDate={currentDate}
              onDateRangeSelect={handleDateRangeSelect}
              onEventClick={handleEventClick}
            />

            {/* Renk Lejantı */}
            <div className="flex flex-wrap gap-4 text-sm text-[#8ba0b5] px-1">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#2a9d8f]"></span>
                Boş (Tıkla → Rezervasyon)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#c0392b]"></span>
                Dolu / Aktif
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#e67e22]"></span>
                Kapora Bekleniyor
              </span>
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#2980b9]"></span>
                Ödeme Tamamlandı / Arşivlendi
              </span>
            </div>
          </>
        )}
      </main>

      {/* ============================================================
          MODALLER VE ÇEKMECELER
      ============================================================ */}

      {/* Hızlı Rezervasyon Modalı */}
      <QuickReservationModal
        isOpen={modalOpen}
        unit={modalUnit}
        category={modalCategory}
        defaultCheckIn={modalCheckIn}
        defaultCheckOut={modalCheckOut}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />

      {/* Detay Çekmecesi */}
      <ReservationDetailDrawer
        isOpen={drawerOpen}
        reservation={selectedReservation}
        onClose={() => setDrawerOpen(false)}
        onCancel={handleCancelRequest}
        onActivate={handleActivate}
        onComplete={handleComplete}
      />

      {/* İptal Onay Penceresi */}
      <ConfirmDialog
        isOpen={confirmOpen}
        message={`"${selectedReservation?.guest_name}" adlı misafirin rezervasyonu iptal edilsin mi?`}
        confirmLabel="Evet, İptal Et"
        confirmVariant="danger"
        onConfirm={handleCancelConfirm}
        onCancel={() => { setConfirmOpen(false); setPendingCancelId(null) }}
      />

      {/* PIN Kodu Doğrulama Modalı */}
      <PinModal
        isOpen={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        onSuccess={() => {
          setPinModalOpen(false)
          setViewMode('finance')
          showToast('Finans modülü başarıyla açıldı! 🔑')
        }}
      />

      {/* Toast Bildirimi */}
      {toast && (
        <div className={`fixed bottom-6 right-4 z-[100] px-5 py-3.5 rounded-xl shadow-xl
                        border font-semibold text-sm max-w-xs transition-all
                        ${toast.type === 'success'
                          ? 'bg-[#0d1e34] border-[#2a9d8f] text-white'
                          : 'bg-[#0d1e34] border-red-600 text-red-300'}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}
    </div>
  )
}
