'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDateTR, calcNights, monthNameTR } from '@/lib/dateUtils'
import { CATEGORIES } from '@/types'
import type { Reservation } from '@/types'

interface Props {
  onBack: () => void
  onLogout: () => void
}

type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom'

// Ciro Dağılımı Donut Pie Chart Bileşeni
function RevenuePieChart({ data, totalRevenue }: { data: any[]; totalRevenue: number }) {
  const CATEGORY_COLORS: Record<string, string> = {
    bungalov: '#000000', // Siyah (Belirgin Mat Siyah)
    cadir: '#2a9d8f',
    dome: '#3498db',
    cadir_yeri: '#f4a261',
    karavan: '#9b59b6',
    karavan_yeri: '#e74c3c',
  }

  const radius = 70
  const strokeWidth = 24
  const circumference = 2 * Math.PI * radius
  let accumulatedPercent = 0

  const validData = data.filter(d => d.revenue > 0)

  return (
    <div className="glass-card p-5 space-y-4 border border-white/10">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
          <span>🥧</span>
          <span>Konaklama Türlerine Göre Ciro Pasta Grafiği</span>
        </h3>
        <span className="text-xs text-[#8ba0b5] font-medium bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
          Net Ciro: <strong className="text-white">{totalRevenue.toLocaleString('tr-TR')} TL</strong>
        </span>
      </div>

      {totalRevenue === 0 || validData.length === 0 ? (
        <div className="text-center py-8 text-[#8ba0b5] text-xs">
          Seçilen dönem için ciro verisi bulunamadı.
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center justify-around gap-6 pt-2">
          {/* SVG Donut */}
          <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              <circle
                cx="100"
                cy="100"
                r={radius}
                fill="transparent"
                stroke="rgba(255, 255, 255, 0.05)"
                strokeWidth={strokeWidth}
              />
              {validData.map(item => {
                const percent = (item.revenue / totalRevenue) * 100
                const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference)
                accumulatedPercent += percent

                return (
                  <circle
                    key={item.cat.slug}
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="transparent"
                    stroke={CATEGORY_COLORS[item.cat.slug] || '#000000'}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    style={item.cat.slug === 'bungalov' ? { filter: 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.6))' } : undefined}
                    className="transition-all duration-500 hover:opacity-80 cursor-pointer"
                  >
                    <title>{`${item.cat.label}: ${item.revenue.toLocaleString('tr-TR')} TL (%${Math.round(percent)})`}</title>
                  </circle>
                )
              })}
            </svg>

            {/* Donut Merkez Alanı */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-2">
              <span className="text-[10px] text-[#8ba0b5] font-medium uppercase tracking-wider">Net Ciro</span>
              <span className="font-extrabold text-sm text-white mt-0.5">
                {totalRevenue.toLocaleString('tr-TR')} ₺
              </span>
            </div>
          </div>

          {/* Lejant (Kategori Kırılım Listesi) */}
          <div className="flex-1 w-full space-y-2 max-w-md">
            {data.map(item => {
              const isBungalov = item.cat.slug === 'bungalov'
              const color = CATEGORY_COLORS[item.cat.slug] || '#00b4d8'
              return (
                <div key={item.cat.slug} className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-xl border border-white/5 hover:border-white/20 transition-all">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                        isBungalov ? 'bg-black border border-white/70 shadow-md shadow-white/20' : ''
                      }`}
                      style={{ backgroundColor: isBungalov ? '#000000' : color }}
                    />
                    <span className="text-white font-medium">{item.cat.icon} {item.cat.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{item.revenue.toLocaleString('tr-TR')} ₺</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded text-cyan-300 bg-cyan-950/60 border border-cyan-500/30">
                      %{item.revenuePercent}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function FinanceDashboard({ onBack, onLogout }: Props) {
  const [period, setPeriod] = useState<PeriodFilter>('month')
  const [monthDate, setMonthDate] = useState<Date>(new Date())
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState({
    totalReservations: 0,
    totalRevenue: 0,
    totalDeposit: 0,
    remainingBalance: 0,
    totalNights: 0,
    avgPerNight: 0
  })
  const [categoryStats, setCategoryStats] = useState<any[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])

  // PIN Değiştirme Modalı
  const [showPinChange, setShowPinChange] = useState(false)
  const [newPin, setNewPin] = useState('')
  const [pinChangeMsg, setPinChangeMsg] = useState('')

  // Ay Değiştirme
  function goFinanceMonth(offset: number) {
    setMonthDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + offset)
      return d
    })
    setPeriod('month')
  }

  // Tarih aralığını döneme göre hesapla
  const calculateDates = useCallback((p: PeriodFilter) => {
    const now = new Date()
    const y = monthDate.getFullYear()
    const m = monthDate.getMonth()

    if (p === 'today') {
      const t = now.toISOString().split('T')[0]
      return { start: t, end: t }
    }
    if (p === 'week') {
      const d = new Date(now)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Pazartesi
      const monday = new Date(d.setDate(diff))
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
      }
    }
    if (p === 'month') {
      const daysInMonth = new Date(y, m + 1, 0).getDate()
      const mStr = String(m + 1).padStart(2, '0')
      return {
        start: `${y}-${mStr}-01`,
        end: `${y}-${mStr}-${String(daysInMonth).padStart(2, '0')}`
      }
    }
    if (p === 'year') {
      return {
        start: `${now.getFullYear()}-01-01`,
        end: `${now.getFullYear()}-12-31`
      }
    }
    if (p === 'all') {
      return { start: '', end: '' }
    }
    return { start: startDate, end: endDate }
  }, [period, monthDate, startDate, endDate])

  const loadData = useCallback(async () => {
    setLoading(true)
    const { start, end } = calculateDates(period)
    try {
      let url = '/api/finance'
      if (start && end) {
        url += `?startDate=${start}&endDate=${end}`
      }
      const res = await fetch(url)
      const json = await res.json()
      if (json.data) {
        setSummary(json.data.summary)
        setCategoryStats(json.data.categoryStats)
        setReservations(json.data.reservations)
      }
    } catch (e) {
      console.error('Finans verileri yüklenemedi:', e)
    } finally {
      setLoading(false)
    }
  }, [period, calculateDates])

  useEffect(() => {
    loadData()
  }, [loadData])

  // CSV İndirme
  function exportCSV() {
    if (reservations.length === 0) return
    const headers = ['Misafir', 'Telefon', 'Birim', 'Giris', 'Cikis', 'Gece', 'Fiyat_Tipi', 'Toplam_Tutar', 'Alinan_Kapora', 'Kalan_Bakiye', 'Durum']
    const rows = reservations.map(r => {
      const price = Number(r.price) || 0
      const deposit = Number(r.deposit) || 0
      const nights = calcNights(r.check_in, r.check_out)
      const isDaily = r.price_type !== 'total'
      const totalAmount = isDaily ? price * (nights > 0 ? nights : 1) : price
      const remaining = Math.max(0, totalAmount - deposit)
      const unitLabel = r.unit?.label || `Birim #${r.unit_id}`
      return [
        `"${r.guest_name}"`,
        `"${r.phone || ''}"`,
        `"${unitLabel}"`,
        r.check_in,
        r.check_out,
        nights,
        isDaily ? 'Gunluk' : 'Toplam',
        totalAmount,
        deposit,
        remaining,
        r.status
      ].join(',')
    })

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `pasali_finans_raporu_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // PIN Değiştirme
  function handleChangePin(e: React.FormEvent) {
    e.preventDefault()
    if (newPin.length !== 4) {
      setPinChangeMsg('PIN 4 haneli sayı olmalıdır.')
      return
    }
    localStorage.setItem('pasali_admin_pin', newPin)
    setPinChangeMsg('✅ PIN Kodu başarıyla güncellendi!')
    setTimeout(() => {
      setShowPinChange(false)
      setNewPin('')
      setPinChangeMsg('')
    }, 1500)
  }

  // Seçili dönemin gün sayısı
  const getPeriodDays = useCallback(() => {
    const now = new Date()
    if (period === 'today') return 1
    if (period === 'week') return 7
    if (period === 'month') return new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
    if (period === 'year') return 365
    const { start, end } = calculateDates(period)
    if (start && end) {
      const d1 = new Date(start)
      const d2 = new Date(end)
      const diff = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
      return Math.max(1, diff)
    }
    return 30
  }, [period, monthDate, calculateDates])

  const periodDays = getPeriodDays()

  // Tüm 6 Kategorinin Eksiksiz Haritalanması
  const allCategoryStats = CATEGORIES.map(cat => {
    const found = categoryStats.find(s => s.slug === cat.slug)
    const count = found?.count || 0
    const revenue = found?.revenue || 0
    const deposit = found?.deposit || 0
    const remaining = found?.remaining || 0
    const nights = found?.nights || 0

    // 1. Ciro Payı Yüzdesi (Tüm tesise göre)
    const revenuePercent = summary.totalRevenue > 0 ? Math.round((revenue / summary.totalRevenue) * 100) : 0

    // 2. Birim Doluluk Yüzdesi (Kendi kapasitesine & döneme göre)
    const capacityNights = cat.count * periodDays
    const occupancyPercent = capacityNights > 0 ? Math.min(100, Math.round((nights / capacityNights) * 100)) : 0

    return {
      cat,
      count,
      revenue,
      deposit,
      remaining,
      nights,
      revenuePercent,
      occupancyPercent
    }
  })

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar / Header */}
      <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3 border border-[#00b4d8]/30">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="btn-ghost px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 touch-target"
          >
            <span>←</span>
            <span>Takvime Dön</span>
          </button>
          <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <div>
              <h2 className="font-display font-bold text-lg text-white leading-tight">Yönetici Finans Dashboard</h2>
              <p className="text-xs text-[#8ba0b5]">Gelir ve Alacak Analizleri</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* CSV İndir */}
          <button
            onClick={exportCSV}
            disabled={reservations.length === 0}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-target"
          >
            <span>📥</span>
            <span>Excel/CSV İndir</span>
          </button>

          {/* PIN Değiştir */}
          <button
            onClick={() => setShowPinChange(true)}
            className="btn-ghost px-3 py-2 rounded-xl text-xs font-medium text-[#8ba0b5] hover:text-white touch-target"
          >
            🔑 PIN Değiştir
          </button>
        </div>
      </div>

      {/* Dönem Filtreleme Barı */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="text-xs font-bold text-[#8ba0b5] uppercase tracking-wider">
            📅 Dönem Filtresi:
          </label>

          {/* Ay Gezinme Navigatörü (‹ Ağustos 2026 ›) */}
          <div className="flex items-center gap-1.5 bg-[#07111e] border border-[#00b4d8]/40 rounded-xl p-1 shadow-inner">
            <button
              type="button"
              onClick={() => goFinanceMonth(-1)}
              className="btn-ghost w-8 h-8 rounded-lg text-base flex items-center justify-center shrink-0 touch-target font-bold"
              aria-label="Önceki Ay"
            >
              ‹
            </button>
            <span className="font-display font-bold text-xs sm:text-sm text-center text-white px-2 min-w-[120px]">
              {monthNameTR(monthDate.getMonth())} {monthDate.getFullYear()}
            </span>
            <button
              type="button"
              onClick={() => goFinanceMonth(1)}
              className="btn-ghost w-8 h-8 rounded-lg text-base flex items-center justify-center shrink-0 touch-target font-bold"
              aria-label="Sonraki Ay"
            >
              ›
            </button>
          </div>
        </div>

        {/* Hızlı Seçim Butonları */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {[
            { id: 'month', label: `📅 Ay Bazlı (${monthNameTR(monthDate.getMonth()).slice(0, 3)})` },
            { id: 'today', label: 'Bugün' },
            { id: 'week', label: 'Bu Hafta' },
            { id: 'year', label: 'Bu Yıl' },
            { id: 'all', label: 'Tüm Zamanlar' },
            { id: 'custom', label: 'Özel Tarih' },
          ].map(btn => (
            <button
              key={btn.id}
              onClick={() => setPeriod(btn.id as PeriodFilter)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer touch-target border ${
                period === btn.id
                  ? 'bg-[#00b4d8] text-white border-[#00b4d8] shadow-lg shadow-cyan-950/40 font-bold scale-102'
                  : 'bg-white/5 border-white/10 text-[#8ba0b5] hover:bg-white/10 hover:text-white'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Özel Tarih Girişleri */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/5">
            <div>
              <label className="block text-xs text-[#8ba0b5] mb-1">Başlangıç Tarihi</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="form-input text-xs py-2"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8ba0b5] mb-1">Bitiş Tarihi</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="form-input text-xs py-2"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Kartları (Metrikler) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Kart 1: Net Toplam Ciro */}
        <div className="glass-card p-5 border-l-4 border-l-[#00b4d8] bg-gradient-to-br from-cyan-950/40 to-slate-900/60 space-y-1">
          <div className="flex justify-between items-center text-xs text-[#8ba0b5]">
            <span>Net Toplam Ciro</span>
            <span className="text-xl">💵</span>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {loading ? '...' : `${summary.totalRevenue.toLocaleString('tr-TR')} TL`}
          </div>
          <div className="text-[11px] text-[#00b4d8] font-medium pt-1">
            {summary.totalReservations} rezervasyon toplamı
          </div>
        </div>

        {/* Kart 2: Alınması Gereken Kalan */}
        <div className="glass-card p-5 border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-950/40 to-slate-900/60 space-y-1">
          <div className="flex justify-between items-center text-xs text-[#8ba0b5]">
            <span>Gelecek Kalan Tahsilat</span>
            <span className="text-xl">⚡</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {loading ? '...' : `${summary.remainingBalance.toLocaleString('tr-TR')} TL`}
          </div>
          <div className="text-[11px] text-emerald-300/80 font-medium pt-1">
            Girişte/Çıkışta alınacak alacak
          </div>
        </div>

        {/* Kart 3: Satılan Gece & Ortalama Fiyat */}
        <div className="glass-card p-5 border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-950/40 to-slate-900/60 space-y-1">
          <div className="flex justify-between items-center text-xs text-[#8ba0b5]">
            <span>Satılan Gece & Ortalama</span>
            <span className="text-xl">🌙</span>
          </div>
          <div className="text-2xl font-extrabold text-purple-300">
            {loading ? '...' : `${summary.totalNights} Gece`}
          </div>
          <div className="text-[11px] text-purple-200/80 font-medium pt-1">
            Ort. Gece: {summary.avgPerNight.toLocaleString('tr-TR')} TL
          </div>
        </div>
      </div>

      {/* Ciro Dağılımı Donut Pasta Grafiği */}
      <RevenuePieChart data={allCategoryStats} totalRevenue={summary.totalRevenue} />

      {/* Kategori Bazlı Dağılım (Tüm 6 Konaklama Türü) */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
          <span>🏠</span>
          <span>Konaklama Türlerine Göre Gelir & Doluluk Dağılımı</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allCategoryStats.map(({ cat, count, revenue, remaining, nights, revenuePercent, occupancyPercent }) => {
            const avgPrice = nights > 0 ? Math.round(revenue / nights) : 0
            return (
              <div
                key={cat.slug}
                className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2.5 hover:border-[#00b4d8]/40 transition-all"
              >
                <div className="flex justify-between items-center gap-1 flex-wrap">
                  <div className="flex items-center gap-2 font-bold text-sm text-white">
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                      %{occupancyPercent} Doluluk
                    </span>
                    <span className="text-[11px] font-bold text-[#00b4d8] bg-[#00b4d8]/15 px-2 py-0.5 rounded-md border border-[#00b4d8]/30">
                      %{revenuePercent} Ciro Payı
                    </span>
                  </div>
                </div>

                {/* Yüzde Barı — Ciro Payı Görselleştirme */}
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#00b4d8] to-[#2a9d8f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${revenuePercent}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-1.5 pt-1 text-center text-xs">
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                    <div className="text-[10px] text-[#8ba0b5]">Toplam Ciro ({count} rez)</div>
                    <div className="font-bold text-white mt-0.5">{revenue.toLocaleString('tr-TR')} ₺</div>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                    <div className="text-[10px] text-[#8ba0b5]">Gece & Ortalama</div>
                    <div className="font-bold text-purple-300 mt-0.5">
                      {nights} Gece
                      <span className="text-[10px] block text-purple-200/80 font-normal">
                        ({avgPrice.toLocaleString('tr-TR')} ₺/gece)
                      </span>
                    </div>
                  </div>
                  <div className="bg-black/20 p-2 rounded-lg border border-white/5">
                    <div className="text-[10px] text-[#8ba0b5]">Kalan Alacak</div>
                    <div className="font-bold text-emerald-400 mt-0.5">{remaining.toLocaleString('tr-TR')} ₺</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Detaylı Rezervasyon & Finans Tablosu */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
            <span>📋</span>
            <span>Döneme Ait İşlem & Misafir Detayı ({reservations.length})</span>
          </h3>
        </div>

        {reservations.length === 0 ? (
          <div className="text-center py-8 text-[#8ba0b5]">
            Seçili dönemde kayıtlı finansal rezervasyon bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[#8ba0b5] uppercase tracking-wider">
                  <th className="py-3 px-3">Misafir</th>
                  <th className="py-3 px-3">Birim</th>
                  <th className="py-3 px-3">Tarihler</th>
                  <th className="py-3 px-3">Fiyat Tipi</th>
                  <th className="py-3 px-3 text-right">Toplam Tutar</th>
                  <th className="py-3 px-3 text-right">Kalan Alacak</th>
                  <th className="py-3 px-3 text-center">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {reservations.map(r => {
                  const price = Number(r.price) || 0
                  const deposit = Number(r.deposit) || 0
                  const nights = calcNights(r.check_in, r.check_out)
                  const isDaily = r.price_type !== 'total'
                  const totalAmount = isDaily ? price * (nights > 0 ? nights : 1) : price
                  const remaining = Math.max(0, totalAmount - deposit)
                  const unitLabel = r.unit?.label || `Birim #${r.unit_id}`
                  const catIcon = (r.unit?.category as { icon?: string })?.icon || '🏠'

                  return (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 font-semibold text-white">
                        <div>{r.guest_name}</div>
                        {r.phone && <div className="text-[10px] text-[#00b4d8]">{r.phone}</div>}
                      </td>
                      <td className="py-3 px-3 font-medium text-[#8ba0b5]">
                        <span>{catIcon} </span>
                        <span className="text-white">{unitLabel}</span>
                      </td>
                      <td className="py-3 px-3 text-[#8ba0b5]">
                        <div>{formatDateTR(r.check_in)} – {formatDateTR(r.check_out)}</div>
                        <div className="text-[10px] text-[#00b4d8]">{nights} gece</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-white/10 px-2 py-0.5 rounded text-[10px] text-white">
                          {isDaily ? `Günlük (${price} TL)` : 'Sabit Toplam'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        {totalAmount.toLocaleString('tr-TR')} TL
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-400">
                        {remaining.toLocaleString('tr-TR')} TL
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            r.status === 'completed'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                              : r.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {r.status === 'completed'
                            ? '🎉 Tamamlandı'
                            : r.status === 'active'
                            ? '✅ Aktif'
                            : '⏳ Kapora Bekliyor'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PIN Değiştirme Modalı */}
      {showPinChange && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-sm w-full space-y-4 border border-[#00b4d8]/40 rounded-2xl bg-[#0d1e34]">
            <h3 className="font-bold text-lg text-white text-center">🔑 Yönetici PIN Kodunu Değiştir</h3>
            <form onSubmit={handleChangePin} className="space-y-3">
              <div>
                <label className="block text-xs text-[#8ba0b5] mb-1">Yeni 4 Haneli PIN Kodu</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Örn: 8620"
                  className="form-input text-center font-mono text-2xl tracking-[0.4em]"
                />
              </div>

              {pinChangeMsg && (
                <div className="text-xs text-center font-bold text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-500/30">
                  {pinChangeMsg}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPinChange(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-[#8ba0b5] hover:text-white text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={newPin.length !== 4}
                  className="flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
