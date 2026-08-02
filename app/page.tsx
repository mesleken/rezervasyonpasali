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
import ManagementDashboard from '@/components/ManagementDashboard'

export default function HomePage() {
  // Sekme durumu
  const [activeCategory, setActiveCategory] = useState<CategorySlug>('bungalov')

  // Ana görünüm modu ('calendar' | 'finance' | 'management')
  const [viewMode, setViewMode] = useState<'calendar' | 'finance' | 'management'>('calendar')

  // Takvim görünüm aralığı ('week' | 'month') — varsayılan olarak mobil uyumlu 7 Gün (Haftalık)
  const [calendarRangeMode, setCalendarRangeMode] = useState<'week' | 'month'>('week')

  // PIN Kodu Modalı durumu & Hedef mod
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [targetPinTarget, setTargetPinTarget] = useState<'finance' | 'management'>('finance')

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

  // Tarih / Ay / Hafta navigasyonu
  function goDate(offset: number) {
    setCurrentDate(prev => {
      const d = new Date(prev)
      if (calendarRangeMode === 'week') {
        d.setDate(d.getDate() + (offset * 7)) // 7 gün ileri/geri
      } else {
        d.setMonth(d.getMonth() + offset) // 1 ay ileri/geri
      }
      return d
    })
  }

  // Dinamik Tarih Başlığı (Aylık vs 7 Günlük Haftalık)
  const dateLabel = (() => {
    if (calendarRangeMode === 'month') {
      return `${monthNameTR(currentDate.getMonth())} ${currentDate.getFullYear()}`
    } else {
      const d1 = new Date(currentDate)
      const d2 = new Date(currentDate)
      d2.setDate(d2.getDate() + 6)
      const m1 = monthNameTR(d1.getMonth()).slice(0, 3)
      const m2 = monthNameTR(d2.getMonth()).slice(0, 3)
      if (d1.getMonth() === d2.getMonth()) {
        return `${d1.getDate()} - ${d2.getDate()} ${monthNameTR(d1.getMonth())}`
      } else {
        return `${d1.getDate()} ${m1} - ${d2.getDate()} ${m2}`
      }
    }
  })()

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

          {/* Yönetici Butonları (Finans & Yönetim) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Kilitli Finans Raporları Butonu */}
            <button
              onClick={() => {
                if (viewMode === 'finance') {
                  setViewMode('calendar')
                } else {
                  setTargetPinTarget('finance')
                  setPinModalOpen(true)
                }
              }}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all touch-target flex items-center gap-1.5 border shrink-0 ${
                viewMode === 'finance'
                  ? 'bg-[#00b4d8] text-white border-[#00b4d8] shadow-lg shadow-cyan-950/50'
                  : 'bg-gradient-to-r from-amber-500/20 to-cyan-500/20 border-amber-500/30 text-amber-300 hover:border-amber-400'
              }`}
            >
              <span>🔒</span>
              <span>{viewMode === 'finance' ? 'Takvim' : 'Finans'}</span>
            </button>

            {/* Kilitli Tesis Yönetim Butonu */}
            <button
              onClick={() => {
                if (viewMode === 'management') {
                  setViewMode('calendar')
                } else {
                  setTargetPinTarget('management')
                  setPinModalOpen(true)
                }
              }}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl text-xs sm:text-sm font-bold transition-all touch-target flex items-center gap-1.5 border shrink-0 ${
                viewMode === 'management'
                  ? 'bg-[#00b4d8] text-white border-[#00b4d8] shadow-lg shadow-cyan-950/50'
                  : 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 border-emerald-500/30 text-emerald-300 hover:border-emerald-400'
              }`}
            >
              <span>⚙️</span>
              <span>{viewMode === 'management' ? 'Takvim' : 'Yönetim'}</span>
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
        ) : viewMode === 'management' ? (
          <ManagementDashboard
            onBack={() => setViewMode('calendar')}
            onLogout={() => setViewMode('calendar')}
          />
        ) : (
          <>
            {/* Hızlı Müsaitlik Barı */}
            <AvailabilityBar onSelectUnit={handleAvailabilitySelect} />

            {/* Sekme Navigasyonu */}
            <TabNavigation active={activeCategory} onChange={setActiveCategory} occupancyMap={occupancyMap} />

            {/* Takvim Kontrol Barı (Haftalık/Aylık Mod & Tarih Navigasyonu) */}
            <div className="glass-card p-3 flex flex-wrap items-center justify-between gap-3 border border-[#00b4d8]/20">
              {/* Sol Taraf: Haftalık / Aylık Mod Seçici */}
              <div className="flex items-center gap-1 bg-[#07111e] border border-white/10 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setCalendarRangeMode('week')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all touch-target ${
                    calendarRangeMode === 'week'
                      ? 'bg-[#00b4d8] text-white shadow-md shadow-cyan-950/50'
                      : 'text-[#8ba0b5] hover:text-white'
                  }`}
                >
                  📱 Haftalık
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarRangeMode('month')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all touch-target ${
                    calendarRangeMode === 'month'
                      ? 'bg-[#00b4d8] text-white shadow-md shadow-cyan-950/50'
                      : 'text-[#8ba0b5] hover:text-white'
                  }`}
                >
                  🗓️ Aylık
                </button>
              </div>

              {/* Sağ Taraf: Tarih / Hafta Navigasyonu (‹ Tarih › Bugün) */}
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  onClick={() => goDate(-1)}
                  className="btn-ghost w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-base sm:text-lg flex items-center justify-center shrink-0 touch-target font-bold"
                  aria-label={calendarRangeMode === 'week' ? 'Önceki Hafta' : 'Önceki Ay'}
                >‹</button>
                <span className="font-display font-bold text-xs sm:text-sm min-w-[110px] sm:min-w-[150px] text-center text-white truncate px-1">
                  {dateLabel}
                </span>
                <button
                  onClick={() => goDate(1)}
                  className="btn-ghost w-8 h-8 sm:w-9 sm:h-9 rounded-xl text-base sm:text-lg flex items-center justify-center shrink-0 touch-target font-bold"
                  aria-label={calendarRangeMode === 'week' ? 'Sonraki Hafta' : 'Sonraki Ay'}
                >›</button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="btn-ghost px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold shrink-0 touch-target"
                >
                  Bugün
                </button>
              </div>
            </div>

            {/* Teknolojiden Anlamayanlar İçin Kolay Kullanım İpucu Kutusu */}
            <div className="bg-gradient-to-r from-cyan-950/40 via-[#0d1e34] to-teal-950/40 border border-[#00b4d8]/30 rounded-2xl p-3 sm:p-3.5 flex items-start gap-3 shadow-lg">
              <div className="w-8 h-8 rounded-xl bg-[#00b4d8]/20 flex items-center justify-center text-lg shrink-0 mt-0.5">
                💡
              </div>
              <div className="text-xs sm:text-sm text-[#8ba0b5] space-y-1">
                <p className="font-bold text-white flex items-center gap-1.5">
                  Resepsiyon Kolay Kullanım Rehberi
                </p>
                <p className="leading-relaxed">
                  • <strong>Yeni Rezervasyon:</strong> Takvimdeki <span className="text-[#2a9d8f] font-bold">YEŞİL (Müsait)</span> kutucuklara dokunun.<br/>
                  • <strong>Detay / Ödeme / İptal:</strong> <span className="text-red-400 font-bold">KIRMIZI (Kapora alındı)</span>, <span className="text-blue-400 font-bold">MAVİ (Ödeme alındı)</span> veya <span className="text-amber-400 font-bold">TURUNCU (Kapora bekliyor)</span> barlara dokunun.
                </p>
              </div>
            </div>

            {/* FullCalendar Resource Timeline */}
            <CalendarView
              key={`${activeCategory}_${calendarRangeMode}`} // Mod veya Sekme değişince yeniden mount et
              categorySlug={activeCategory}
              currentDate={currentDate}
              rangeMode={calendarRangeMode}
              onDateRangeSelect={handleDateRangeSelect}
              onEventClick={handleEventClick}
            />

            {/* Renk Lejantı */}
            <div className="glass-card p-3 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm border border-white/10">
              <span className="flex items-center gap-1.5 text-[#8ba0b5]">
                <span className="w-3.5 h-3.5 rounded-md bg-[#2a9d8f] shadow-sm"></span>
                <strong className="text-white">Yeşil:</strong> Müsait (Tıkla → Rezerve Et)
              </span>
              <span className="flex items-center gap-1.5 text-[#8ba0b5]">
                <span className="w-3.5 h-3.5 rounded-md bg-[#c0392b] shadow-sm"></span>
                <strong className="text-white">Kırmızı:</strong> Dolu / Aktif
              </span>
              <span className="flex items-center gap-1.5 text-[#8ba0b5]">
                <span className="w-3.5 h-3.5 rounded-md bg-[#e67e22] shadow-sm"></span>
                <strong className="text-white">Turuncu:</strong> Kapora Bekliyor
              </span>
              <span className="flex items-center gap-1.5 text-[#8ba0b5]">
                <span className="w-3.5 h-3.5 rounded-md bg-[#2980b9] shadow-sm"></span>
                <strong className="text-white">Mavi:</strong> Ödeme Tamamlandı
              </span>
              <span className="flex items-center gap-1.5 text-[#8ba0b5]">
                <span className="w-3.5 h-3.5 rounded-md bg-[#8e44ad] shadow-sm"></span>
                <strong className="text-white">Mor:</strong> 🔧 Bakımda
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
        title={targetPinTarget === 'finance' ? 'Finans Paneli Girişi' : 'Tesis Yönetim Girişi'}
        icon={targetPinTarget === 'finance' ? '📊' : '⚙️'}
        onClose={() => setPinModalOpen(false)}
        onSuccess={() => {
          setPinModalOpen(false)
          setViewMode(targetPinTarget)
          showToast(targetPinTarget === 'finance' ? 'Finans paneli açıldı! 🔑' : 'Yönetim paneli açıldı! ⚙️')
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
