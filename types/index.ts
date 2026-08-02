// PAŞALI Kamp Rezervasyon Sistemi — TypeScript Tip Tanımları

export type CategorySlug =
  | 'bungalov'
  | 'cadir'
  | 'dome'
  | 'cadir_yeri'
  | 'karavan'
  | 'karavan_yeri'

export interface Category {
  id: number
  slug: CategorySlug
  label: string
  icon: string
  sort_order: number
}

export type CleaningStatus = 'clean' | 'dirty' | 'in_progress'

export interface Unit {
  id: number
  category_id: number
  unit_number: number
  label: string
  is_active: boolean
  cleaning_status?: CleaningStatus
  category?: Category
}

export type ReservationStatus = 'active' | 'pending' | 'completed' | 'cancelled' | 'maintenance'

export interface Reservation {
  id: string
  unit_id: number
  guest_name: string
  phone: string | null
  notes: string | null
  status: ReservationStatus
  check_in: string  // 'YYYY-MM-DD'
  check_out: string // 'YYYY-MM-DD'
  price_type?: 'daily' | 'total'
  price?: number
  deposit?: number
  guest_count?: number
  created_at: string
  unit?: Unit
}

// Hızlı Rezervasyon Formu için (sadece 3 alan)
export interface QuickReservationPayload {
  unit_id: number
  category_slug?: CategorySlug
  unit_number?: number
  guest_name: string
  phone?: string
  notes?: string
  status: 'active' | 'pending'
  check_in: string
  check_out: string
  price_type?: 'daily' | 'total'
  price?: number
  deposit?: number
  guest_count?: number
}

// Müsaitlik sorgulama sonucu
export interface AvailableUnit {
  unit: Unit
  category: Category
}

// FullCalendar için kaynak (resource) tipi
export interface CalendarResource {
  id: string       // unit.id.toString()
  title: string    // "Bungalov 1"
  unitId: number
  categorySlug: CategorySlug
}

// FullCalendar için etkinlik (event) tipi
export interface CalendarEvent {
  id: string              // reservation.id
  resourceId: string      // unit.id.toString()
  title: string           // guest_name
  start: string           // check_in
  end: string             // check_out (FullCalendar exclusive)
  backgroundColor: string
  borderColor: string
  extendedProps: {
    reservation?: Reservation
    status: ReservationStatus
    isFreeSlot?: boolean
    unitNum?: number
    checkIn?: string
    checkOut?: string
  }
}

// Kategori yapılandırması (sabit)
export const CATEGORIES: Array<{
  slug: CategorySlug
  label: string
  icon: string
  count: number
  sort_order: number
}> = [
  { slug: 'bungalov',    label: 'Bungalov',    icon: '🏠', count: 3,  sort_order: 1 },
  { slug: 'cadir',       label: 'Çadır',       icon: '⛺', count: 8,  sort_order: 2 },
  { slug: 'dome',        label: 'Dome Çadır',  icon: '🔵', count: 2,  sort_order: 3 },
  { slug: 'cadir_yeri',  label: 'Çadır Yeri',  icon: '📍', count: 10, sort_order: 4 },
  { slug: 'karavan',     label: 'Karavan',      icon: '🚐', count: 3,  sort_order: 5 },
  { slug: 'karavan_yeri',label: 'Karavan Yeri', icon: '🅿️', count: 10, sort_order: 6 },
]

// Toplam birim sayısı: 36
export const TOTAL_UNITS = CATEGORIES.reduce((sum, c) => sum + c.count, 0)

// Durum renkleri
export const STATUS_COLORS: Record<ReservationStatus, { bg: string; border: string; text: string }> = {
  active:      { bg: '#c0392b', border: '#e74c3c', text: '#ffffff' },
  pending:     { bg: '#e67e22', border: '#f4a261', text: '#ffffff' },
  completed:   { bg: '#2980b9', border: '#3498db', text: '#ffffff' },
  cancelled:   { bg: '#555555', border: '#777777', text: '#aaaaaa' },
  maintenance: { bg: '#8e44ad', border: '#9b59b6', text: '#ffffff' },
}
