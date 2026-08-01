// Türkçe tarih yardımcı fonksiyonları

const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
]

const TR_DAYS_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']

/** "2026-08-10" → "10 Ağustos 2026" */
export function formatDateTR(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** "2026-08-10" → "Pzt, 10 Ağu" */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${TR_DAYS_SHORT[d.getDay()]}, ${d.getDate()} ${TR_MONTHS[d.getMonth()].slice(0, 3)}`
}

/** "2026-08-10" ve "2026-08-13" → "3 gece" */
export function calcNights(checkIn: string, checkOut: string): number {
  const d1 = new Date(checkIn)
  const d2 = new Date(checkOut)
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24))
}

/** Bugünün tarihini "YYYY-MM-DD" formatında döndür */
export function todayYMD(): string {
  return new Date().toISOString().split('T')[0]
}

/** Yarının tarihini "YYYY-MM-DD" formatında döndür */
export function tomorrowYMD(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

/** Ay adını Türkçe döndür */
export function monthNameTR(monthIndex: number): string {
  return TR_MONTHS[monthIndex]
}

const TR_DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']

/** "2026-08-10" → "10 Ağustos 2026, Pazartesi" */
export function formatDateWithDayTR(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  if (isNaN(d.getTime())) return dateStr
  return `${d.getDate()} ${TR_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${TR_DAYS[d.getDay()]}`
}
