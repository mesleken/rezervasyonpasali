'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { CATEGORIES } from '@/types'
import type { CategorySlug, Reservation, Unit, Category, QuickReservationPayload, AvailableUnit } from '@/types'
import { monthNameTR } from '@/lib/dateUtils'

import CalendarView from '@/components/CalendarView'

import AvailabilityBar from '@/components/AvailabilityBar'
import TabNavigation from '@/components/TabNavigation'
import QuickReservationModal from '@/components/QuickReservationModal'
import ReservationDetailDrawer from '@/components/ReservationDetailDrawer'
import ConfirmDialog from '@/components/ConfirmDialog'

export default function HomePage() {
  // Sekme durumu
  const [activeCategory, setActiveCategory] = useState<CategorySlug>('bungalov')

  // Takvim tarih durumu
  const [currentDate, setCurrentDate] = useState(new Date())

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

  function refreshCalendar() {
    const fn = (window as Window & { __refreshCalendar?: () => void }).__refreshCalendar
    if (fn) fn()
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
      : resourceId

    setModalUnit({
      id: unitNum,  // gerçek id Supabase'den gelecek, şimdilik unit_number kullanılıyor
      category_id: 0,
      unit_number: unitNum,
      label: `${cat.label} ${unitNum}`,
      is_active: true
    })
    setModalCategory({
      id: 0,
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
    <div className="min-h-dvh flex flex-col">
      {/* ============================================================
          HEADER
      ============================================================ */}
      <header className="sticky top-0 z-30 bg-[rgba(7,17,30,0.92)] backdrop-blur-md
                         border-b border-[rgba(0,180,216,0.12)] px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00b4d8] to-[#2a9d8f]
                            flex items-center justify-center text-xl shadow-lg shadow-cyan-900/40">
              🏕️
            </div>
            <div>
              <div className="font-display font-bold text-base leading-tight
                              bg-gradient-to-r from-white to-[#00b4d8] bg-clip-text text-transparent">
                PAŞALI
              </div>
              <div className="text-xs text-[#5c748a] hidden tablet:block">
                Bungalow & Camping & Karavan
              </div>
            </div>
          </div>

          {/* Ay Navigasyonu */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => goMonth(-1)}
              className="btn-ghost w-10 h-10 rounded-xl text-lg touch-target"
            >‹</button>
            <span className="font-display font-bold text-base min-w-[160px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={() => goMonth(1)}
              className="btn-ghost w-10 h-10 rounded-xl text-lg touch-target"
            >›</button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="btn-ghost px-3 h-10 rounded-xl text-sm touch-target"
            >
              Bugün
            </button>
          </div>
        </div>
      </header>

      {/* ============================================================
          ANA İÇERİK
      ============================================================ */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-4 py-4 space-y-4">

        {/* Hızlı Müsaitlik Barı */}
        <AvailabilityBar onSelectUnit={handleAvailabilitySelect} />

        {/* Sekme Navigasyonu */}
        <TabNavigation active={activeCategory} onChange={setActiveCategory} />

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
