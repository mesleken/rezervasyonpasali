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
  onDateRangeSelect: (unitId: number, start: string, end: string) => void
  onEventClick: (reservation: Reservation) => void
}

export default function CalendarView({
  categorySlug, currentDate, onDateRangeSelect, onEventClick
}: Props) {
  const calendarRef = useRef<FullCalendar>(null)
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

  // Rezervasyonları API'den yükle
  const loadReservations = useCallback(async () => {
    setLoading(true)
    const y = currentDate.getFullYear()
    const m = currentDate.getMonth() + 1
    try {
      const res = await fetch(`/api/reservations?categorySlug=${categorySlug}&year=${y}&month=${m}`)
      const text = await res.text()
      if (!text) {
        setEvents([])
        return
      }
      const json = JSON.parse(text)
      if (!res.ok) throw new Error(json.error || 'İstek başarısız')

      // Dolu rezervasyonlar
      const busyEvts: CalendarEvent[] = (json.data || []).map((r: Reservation) => {
        const colors = STATUS_COLORS[r.status as ReservationStatus] || STATUS_COLORS.active
        return {
          id: r.id,
          resourceId: `${categorySlug}_${r.unit?.unit_number}`,
          title: r.guest_name + (r.phone ? ` · ${r.phone}` : ''),
          start: `${r.check_in}T12:00:00`,
          end: `${r.check_out}T00:00:00`,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          extendedProps: { reservation: r, status: r.status },
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
          .filter((r: Reservation) => r.unit?.unit_number === unitNum)
          .sort((a: Reservation, b: Reservation) => a.check_in.localeCompare(b.check_in))

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
        calendarRef.current.getApi().gotoDate(currentDate)
      } catch (e) {
        // Ignored if API not ready yet
      }
    }
  }, [currentDate])

  // Dışarıdan yenileme için global callback
  useEffect(() => {
    (window as Window & { __refreshCalendar?: () => void }).__refreshCalendar = loadReservations
    return () => {
      delete (window as Window & { __refreshCalendar?: () => void }).__refreshCalendar
    }
  }, [loadReservations])

  if (!isMounted) {
    return (
      <div className="glass-card flex items-center justify-center h-64 min-h-[350px]">
        <div className="text-[#00b4d8] animate-pulse font-semibold">📅 Takvim yükleniyor...</div>
      </div>
    )
  }

  return (
    <div className="glass-card p-0 overflow-x-auto relative w-full touch-pan-x min-h-[350px]">
      {loading && (
        <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center rounded-2xl">
          <div className="text-[#00b4d8] text-sm font-semibold animate-pulse">Yükleniyor...</div>
        </div>
      )}
      <div className="min-w-[1100px]">
        <FullCalendar
          ref={calendarRef}
          plugins={[resourceTimelinePlugin, interactionPlugin]}
          initialView="resourceTimelineMonth"
          initialDate={currentDate}
          resources={resources}
          events={events}
          schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
          headerToolbar={false} // Kendi header'ımızı kullanıyoruz
          resourceAreaHeaderContent={`${categoryConfig.icon} ${categoryConfig.label}`}
          resourceAreaWidth="130px"
          slotDuration={{ days: 1 }}
          slotLabelFormat={{ day: 'numeric', weekday: 'short' }}
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
            onDateRangeSelect(info.resource!.id as unknown as number, info.startStr, endDate.toISOString().split('T')[0])
          }}
          // Mevcut rezervasyona veya yeşil boş bara tıklama
          eventClick={(info) => {
            const props = info.event.extendedProps
            if (props.isFreeSlot) {
              onDateRangeSelect(props.unitNum!, props.checkIn!, props.checkOut!)
            } else {
              const res = props.reservation as Reservation
              onEventClick(res)
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
