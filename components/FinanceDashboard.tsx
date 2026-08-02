'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDateTR, calcNights } from '@/lib/dateUtils'
import { CATEGORIES } from '@/types'
import type { Reservation } from '@/types'

interface Props {
  onBack: () => void
  onLogout: () => void
}

type PeriodFilter = 'today' | 'week' | 'month' | 'last_month' | 'year' | 'all' | 'custom'

export default function FinanceDashboard({ onBack, onLogout }: Props) {
  const [period, setPeriod] = useState<PeriodFilter>('month')
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

  // Tarih aralığını döneme göre hesapla
  const calculateDates = useCallback((p: PeriodFilter) => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()

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
        end: `${y}-${mStr}-${daysInMonth}`
      }
    }
    if (p === 'last_month') {
      const prevM = m === 0 ? 11 : m - 1
      const prevY = m === 0 ? y - 1 : y
      const daysInMonth = new Date(prevY, prevM + 1, 0).getDate()
      const mStr = String(prevM + 1).padStart(2, '0')
      return {
        start: `${prevY}-${mStr}-01`,
        end: `${prevY}-${mStr}-${daysInMonth}`
      }
    }
    if (p === 'year') {
      return {
        start: `${y}-01-01`,
        end: `${y}-12-31`
      }
    }
    if (p === 'all') {
      return { start: '', end: '' }
    }
    return { start: startDate, end: endDate }
  }, [startDate, endDate])

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

  // Tüm 6 Kategorinin Eksiksiz Haritalanması
  const allCategoryStats = CATEGORIES.map(cat => {
    const found = categoryStats.find(s => s.slug === cat.slug)
    return {
      cat,
      count: found?.count || 0,
      revenue: found?.revenue || 0,
      deposit: found?.deposit || 0,
      remaining: found?.remaining || 0,
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
              <p className="text-xs text-[#8ba0b5]">Gelir, Kapora ve Alacak Analizleri</p>
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

          {/* Oturumu Kapat */}
          <button
            onClick={onLogout}
            className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-xs font-semibold transition-all touch-target"
          >
            🔒 Kilitle
          </button>
        </div>
      </div>

      {/* Dönem Filtreleme Barı */}
      <div className="glass-card p-4 space-y-3">
        <label className="block text-xs font-bold text-[#8ba0b5] uppercase tracking-wider">
          📅 Dönem Filtresi:
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'today', label: 'Bugün' },
            { id: 'week', label: 'Bu Hafta' },
            { id: 'month', label: 'Bu Ay' },
            { id: 'last_month', label: 'Geçen Ay' },
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Kart 2: Alınan Kapora */}
        <div className="glass-card p-5 border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-950/40 to-slate-900/60 space-y-1">
          <div className="flex justify-between items-center text-xs text-[#8ba0b5]">
            <span>Tahsil Edilen Kapora</span>
            <span className="text-xl">🏦</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-400">
            {loading ? '...' : `${summary.totalDeposit.toLocaleString('tr-TR')} TL`}
          </div>
          <div className="text-[11px] text-amber-300/80 font-medium pt-1">
            Kasaya giren ödemeler
          </div>
        </div>

        {/* Kart 3: Alınması Gereken Kalan */}
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

        {/* Kart 4: Satılan Gece & Ortalama Fiyat */}
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

      {/* Kategori Bazlı Dağılım (Tüm 6 Konaklama Türü) */}
      <div className="glass-card p-5 space-y-4">
        <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
          <span>🏠</span>
          <span>Konaklama Türlerine Göre Gelir Dağılımı</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {allCategoryStats.map(({ cat, count, revenue, deposit, remaining }) => {
            const percent = summary.totalRevenue > 0 ? Math.round((revenue / summary.totalRevenue) * 100) : 0
            return (
              <div
                key={cat.slug}
                className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2.5 hover:border-[#00b4d8]/40 transition-all"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 font-bold text-sm text-white">
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </div>
                  <span className="text-xs font-bold text-[#00b4d8] bg-[#00b4d8]/15 px-2 py-0.5 rounded-md border border-[#00b4d8]/30">
                    {count} rezervasyon (%{percent})
                  </span>
                </div>

                {/* Yüzde Barı */}
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#00b4d8] to-[#2a9d8f] h-full rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-1 pt-1 text-center text-xs">
                  <div className="bg-black/20 p-1.5 rounded border border-white/5">
                    <div className="text-[10px] text-[#8ba0b5]">Toplam</div>
                    <div className="font-bold text-white mt-0.5">{revenue.toLocaleString('tr-TR')} ₺</div>
                  </div>
                  <div className="bg-black/20 p-1.5 rounded border border-white/5">
                    <div className="text-[10px] text-[#8ba0b5]">Kapora</div>
                    <div className="font-bold text-amber-400 mt-0.5">{deposit.toLocaleString('tr-TR')} ₺</div>
                  </div>
                  <div className="bg-black/20 p-1.5 rounded border border-white/5">
                    <div className="text-[10px] text-[#8ba0b5]">Kalan</div>
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
                  <th className="py-3 px-3 text-right">Kapora</th>
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
                      <td className="py-3 px-3 text-right font-semibold text-amber-400">
                        {deposit.toLocaleString('tr-TR')} TL
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
