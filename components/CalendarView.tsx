'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import type { CalendarResource, CalendarEvent, Reservation, ReservationStatus } from '@/types'
import { CATEGORIES, STATUS_COLORS } from '@/types'
import type { CategorySlug } from '@/types'

interface Props {
  categorySlug: CategorySlug
  currentDate: Date
  rangeMode?: 'week' | 'month'
  isPublicView?: boolean
  onDateRangeSelect: (unitId: number, start: string, end: string) => void
  onEventClick: (reservation: Reservation) => void
}

export default function CalendarView({
  categorySlug, currentDate, rangeMode = 'month', isPublicView = false, onDateRangeSelect, onEventClick
}: Props) {
  const calendarRef = useRef<FullCalendar>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [resources, setResources] = useState<CalendarResource[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const categoryConfig = CATEGORIES.find(c => c.slug === categorySlug)!

  // Kaynakları (birimleri) oluştur — değişmez, kategori sabittir
  useEffect(() => {
    const res: CalendarResource[] = []
    for (let i = 1; i <= categoryConfig.count; i++) {
      res.push({
        id: `${categorySlug}_${i}`,
        title: `${categoryConfig.label} ${i}`,
        unitId: i,
        categorySlug,
      })
    }
    setResources(res)
  }, [categorySlug, categoryConfig])

  // Rezervasyonları API'den yükle (Kamusal vs Yönetim Modu)
  const loadReservations = useCallback(async () => {
    setLoading(true)
    const y = currentDate.getFullYear()
    const m = currentDate.getMonth() + 1
    try {
      const endpoint = isPublicView
        ? `/api/public/calendar?categorySlug=${categorySlug}&year=${y}&month=${m}&t=${Date.now()}`
        : `/api/reservations?categorySlug=${categorySlug}&year=${y}&month=${m}&t=${Date.now()}`

      const res = await fetch(endpoint)
      const text = await res.text()
      if (!text) {
        setEvents([])
        return
      }
      const json = JSON.parse(text)
      if (!res.ok) throw new Error(json.error || 'İstek başarısız')

      // Dolu rezervasyonlar & Bakım modları
      const busyEvts: CalendarEvent[] = (json.data || []).map((r: any) => {
        const isMaintenance = r.status === 'maintenance' || r.guest_name?.toUpperCase().includes('BAKIM')
        const colors = isMaintenance
          ? { bg: '#8e44ad', border: '#9b59b6', text: '#ffffff' }
          : (STATUS_COLORS[r.status as ReservationStatus] || STATUS_COLORS.active)

        const title = isPublicView
          ? (isMaintenance ? '🔧 BAKIMDA' : '⛔ DOLU')
          : (isMaintenance ? '🔧 BAKIMDA' : r.guest_name + (r.phone ? ` · ${r.phone}` : ''))

        return {
          id: String(r.id),
          resourceId: `${categorySlug}_${r.unit?.unit_number || r.unit_number}`,
          title,
          start: `${r.check_in}T12:00:00`,
          end: `${r.check_out}T00:00:00`,
          backgroundColor: isPublicView ? (isMaintenance ? '#8e44ad' : '#c0392b') : colors.bg,
          borderColor: isPublicView ? (isMaintenance ? '#9b59b6' : '#e74c3c') : colors.border,
          extendedProps: {
            reservation: isPublicView ? undefined : (r as Reservation),
            status: isMaintenance ? 'maintenance' : r.status,
            isPublicView
          },
        }
      })

      // Boş aralıklar için Yeşil Paralelkenar Barlar (Boş/Müsait)
      const freeEvts: CalendarEvent[] = []
      const daysInMonth = new Date(y, m, 0).getDate()
      const mStr = String(m).padStart(2, '0')
      const monthStart = `${y}-${mStr}-01`
      const monthEnd = `${y}-${mStr}-${String(daysInMonth).padStart(2, '0')}`

      for (let unitNum = 1; unitNum <= categoryConfig.count; unitNum++) {
        const unitBusy = (json.data || [])
          .filter((r: any) => Number(r.unit?.unit_number || r.unit_number) === unitNum)
          .sort((a: any, b: any) => a.check_in.localeCompare(b.check_in))

        let currStart = monthStart
        for (const r of unitBusy) {
          if (r.check_in > currStart) {
            freeEvts.push({
              id: `free_${unitNum}_${currStart}`,
              resourceId: `${categorySlug}_${unitNum}`,
              title: 'Müsait',
              start: `${currStart}T12:00:00`,
              end: `${r.check_in}T00:00:00`,
              backgroundColor: '#2a9d8f', // Yeşil renk
              borderColor: '#264653',
              extendedProps: {
                status: 'active' as ReservationStatus,
                isFreeSlot: true,
                unitNum,
                checkIn: currStart,
                checkOut: r.check_in
              }
            })
          }
          if (r.check_out > currStart) {
            currStart = r.check_out
          }
        }
        if (currStart < monthEnd) {
          freeEvts.push({
            id: `free_${unitNum}_${currStart}`,
            resourceId: `${categorySlug}_${unitNum}`,
            title: 'Müsait',
            start: `${currStart}T12:00:00`,
            end: `${monthEnd}T23:59:59`,
            backgroundColor: '#2a9d8f', // Yeşil renk
            borderColor: '#264653',
            extendedProps: {
              status: 'active' as ReservationStatus,
              isFreeSlot: true,
              unitNum,
              checkIn: currStart,
              checkOut: monthEnd
            }
          })
        }
      }

      setEvents([...busyEvts, ...freeEvts])
    } catch (e) {
      console.error('Rezervasyonlar yüklenemedi:', e)
    } finally {
      setLoading(false)
    }
  }, [categorySlug, currentDate])

  useEffect(() => {
    loadReservations()
  }, [loadReservations])

  // Takvimi dışarıdan navigate et
  useEffect(() => {
    if (calendarRef.current) {
      try {
        const api = calendarRef.current.getApi()
        api.gotoDate(currentDate)
        const targetView = rangeMode === 'week' ? 'resourceTimelineSevenDays' : 'resourceTimelineMonth'
        if (api.view.type !== targetView) {
          api.changeView(targetView, currentDate)
        }
      } catch (e) {
        // Ignored if API not ready yet
      }
    }
  }, [currentDate, rangeMode])

  // Dışarıdan yenileme için global callback
  useEffect(() => {
    (window as Window & { __refreshCalendar?: () => void }).__refreshCalendar = loadReservations
    return () => {
      delete (window as Window & { __refreshCalendar?: () => void }).__refreshCalendar
    }
  }, [loadReservations])

  // JS Kaydırma Senkronizasyonu — Sadece Masaüstü için (Mobilde CSS ile çözülüyor)
  useEffect(() => {
    if (!isMounted) return
    // Mobilde CSS overflow:hidden ile iç scrollerlar devre dışı — JS sync gerekmez
    if (typeof window !== 'undefined' && window.innerWidth < 768) return

    let cleanup: (() => void) | null = null

    const syncScrollers = () => {
      const el = containerRef.current
      if (!el) return

      // FullCalendar’ın timeline header ve body scroller’larını bul
      // FC yapısı: .fc-scrollgrid-section-header .fc-scroller ve .fc-scrollgrid-section-body .fc-scroller
      const headerRow = el.querySelector<HTMLElement>('.fc-scrollgrid-section-header .fc-scroller, .fc-scrollgrid-section.fc-scrollgrid-section-header .fc-scroller')
      const bodyRow = el.querySelector<HTMLElement>('.fc-scrollgrid-section-body .fc-scroller-harness .fc-scroller, .fc-scrollgrid-section:not(.fc-scrollgrid-section-header) .fc-scroller')

      const h = headerRow
      const b = bodyRow
      if (!h || !b) return

      let syncing = false
      const onH = () => { if (!syncing) { syncing = true; b.scrollLeft = h.scrollLeft; syncing = false } }
      const onB = () => { if (!syncing) { syncing = true; h.scrollLeft = b.scrollLeft; syncing = false } }

      h.addEventListener('scroll', onH, { passive: true })
      b.addEventListener('scroll', onB, { passive: true })
      cleanup = () => { h.removeEventListener('scroll', onH); b.removeEventListener('scroll', onB) }
    }

    const timer = setTimeout(syncScrollers, 400)
    return () => { clearTimeout(timer); cleanup?.() }
  }, [isMounted, rangeMode, resources])

  if (!isMounted) {
    return (
      <div className="glass-card flex items-center justify-center h-64 min-h-[350px]">
        <div className="text-[#00b4d8] animate-pulse font-semibold">📅 Takvim yükleniyor...</div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="glass-card p-0 overflow-x-auto relative w-full touch-pan-x min-h-[350px]">
      {loading && (
        <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center rounded-2xl">
          <div className="text-[#00b4d8] text-sm font-semibold animate-pulse">Yükleniyor...</div>
        </div>
      )}
      {/* Mobilde haftalık 900px, aylık 2400px — FC iç scroller devre dışı, dış wrapper kaydırır */}
      {/* Masaüstünde haftalık 900px, aylık 1100px — CSS media query (globals.css) yönetir */}
      <div className={
        rangeMode === 'week'
          ? 'calendar-range-week'
          : 'calendar-range-month'
      }>
        <FullCalendar
          ref={calendarRef}
          plugins={[resourceTimelinePlugin, interactionPlugin]}
          initialView={rangeMode === 'week' ? 'resourceTimelineSevenDays' : 'resourceTimelineMonth'}
          initialDate={currentDate}
          views={{
            resourceTimelineSevenDays: {
              type: 'resourceTimeline',
              duration: { days: 7 },
              slotDuration: { days: 1 },
              slotLabelFormat: { day: 'numeric', weekday: 'short' }
            },
            resourceTimelineMonth: {
              type: 'resourceTimeline',
              duration: { months: 1 },
              slotDuration: { days: 1 },
              slotLabelFormat: { day: 'numeric', weekday: 'short' }
            }
          }}
          resources={resources}
          resourceOrder="unitId"
          events={events}
          schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
          headerToolbar={false} // Kendi header'ımızı kullanıyoruz
          resourceAreaHeaderContent={`${categoryConfig.icon} ${categoryConfig.label}`}
          resourceAreaWidth="130px"
          slotDuration={{ days: 1 }}
          displayEventTime={false}
          locale="tr"
          height="auto"
          // Boş alana tıklama → Yeni rezervasyon
          selectable
          selectMirror
          select={(info) => {
            const unitNumber = resources.find(r => r.id === info.resource?.id)?.unitId
            if (!unitNumber) return
            const endDate = new Date(info.endStr)
            endDate.setDate(endDate.getDate() - 1) // FullCalendar end exclusive
            onDateRangeSelect(unitNumber, info.startStr, endDate.toISOString().split('T')[0])
          }}
          // Mevcut rezervasyona veya yeşil boş bara tıklama
          eventClick={(info) => {
            const props = info.event.extendedProps
            if (props.isFreeSlot) {
              onDateRangeSelect(props.unitNum!, props.checkIn!, props.checkOut!)
            } else if (!isPublicView && props.reservation) {
              onEventClick(props.reservation as Reservation)
            }
          }}
          // Boş hücre hover efekti
          eventDidMount={(info) => {
            info.el.title = `${info.event.title}`
          }}
        />
      </div>
    </div>
  )
}
