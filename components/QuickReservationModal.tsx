'use client'

import { useState, useRef, useEffect } from 'react'
import { todayYMD, tomorrowYMD, formatDateTR, formatDateWithDayTR, calcNights } from '@/lib/dateUtils'
import type { Unit, Category, QuickReservationPayload } from '@/types'

interface Props {
  isOpen: boolean
  unit: Unit | null
  category: Category | null
  defaultCheckIn?: string
  defaultCheckOut?: string
  onClose: () => void
  onSave: (payload: QuickReservationPayload) => Promise<{ error?: string }>
}

export default function QuickReservationModal({
  isOpen, unit, category, defaultCheckIn, defaultCheckOut, onClose, onSave
}: Props) {
  const [guestName, setGuestName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'active' | 'pending'>('active')
  const [checkIn, setCheckIn] = useState(defaultCheckIn || todayYMD())
  const [checkOut, setCheckOut] = useState(defaultCheckOut || tomorrowYMD())
  const [priceType, setPriceType] = useState<'daily' | 'total'>('daily')
  const [price, setPrice] = useState<string>('')
  const [deposit, setDeposit] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  // Modal açılınca formu sıfırla ve odaklan
  useEffect(() => {
    if (isOpen) {
      setGuestName('')
      setPhone('')
      setNotes('')
      setStatus('active')
      setCheckIn(defaultCheckIn || todayYMD())
      setCheckOut(defaultCheckOut || tomorrowYMD())
      setPriceType('daily')
      setPrice('')
      setDeposit('')
      setError(null)
      setTimeout(() => nameRef.current?.focus(), 100)
    }
  }, [isOpen, defaultCheckIn, defaultCheckOut])

  if (!isOpen || !unit || !category) return null

  const nights = calcNights(checkIn, checkOut)
  const numPrice = Number(price) || 0
  const numDeposit = Number(deposit) || 0
  const totalAmount = priceType === 'daily' ? numPrice * (nights > 0 ? nights : 1) : numPrice
  const remainingBalance = Math.max(0, totalAmount - numDeposit)
  const isValid = nights > 0 && guestName.trim().length >= 2

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) {
      setError('Ad Soyad zorunludur (en az 2 karakter). Tarihler geçerli olmalıdır.')
      return
    }
    setSaving(true)
    setError(null)

    const result = await onSave({
      unit_id: unit!.id,
      guest_name: guestName.trim(),
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
      check_in: checkIn,
      check_out: checkOut,
      price_type: priceType,
      price: numPrice,
      deposit: numDeposit,
    })

    setSaving(false)
    if (result.error) {
      setError(result.error)
    } else {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Kart */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-lg mx-auto">
        <div className="glass-card overflow-hidden shadow-2xl shadow-black/60">

          {/* Başlık */}
          <div className="bg-gradient-to-r from-[rgba(0,180,216,0.15)] to-[rgba(42,157,143,0.15)]
                          border-b border-[rgba(0,180,216,0.15)] px-5 py-4 flex justify-between items-start">
            <div>
              <div className="font-bold text-lg font-display flex items-center gap-2">
                <span>{category.icon}</span>
                <span>{unit.label}</span>
              </div>
              <div className="text-[#8ba0b5] text-sm mt-0.5">
                {formatDateTR(checkIn)} – {formatDateTR(checkOut)}
                {nights > 0 && (
                  <span className="ml-2 text-[#00b4d8] font-semibold">({nights} gece)</span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-[#8ba0b5] hover:text-white text-2xl leading-none mt-0.5 touch-target"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Tarih Seçicileri (Birim tıklandıktan sonra değiştirilebilir) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#8ba0b5] mb-1.5">Giriş</label>
                <input
                  type="date"
                  value={checkIn}
                  min={todayYMD()}
                  onChange={e => {
                    setCheckIn(e.target.value)
                    if (e.target.value >= checkOut) {
                      const d = new Date(e.target.value)
                      d.setDate(d.getDate() + 1)
                      setCheckOut(d.toISOString().split('T')[0])
                    }
                  }}
                  className="form-input"
                />
                {checkIn && (
                  <div className="text-[11px] text-[#00b4d8] font-medium mt-1">
                    🗓️ {formatDateWithDayTR(checkIn)}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-[#8ba0b5] mb-1.5">Çıkış</label>
                <input
                  type="date"
                  value={checkOut}
                  min={checkIn}
                  onChange={e => setCheckOut(e.target.value)}
                  className="form-input"
                />
                {checkOut && (
                  <div className="text-[11px] text-[#00b4d8] font-medium mt-1">
                    🗓️ {formatDateWithDayTR(checkOut)}
                  </div>
                )}
              </div>
            </div>

            {/* Alan 1: Ad Soyad — Zorunlu */}
            <div>
              <label className="block text-xs text-[#8ba0b5] mb-1.5">
                👤 İsim Soyisim <span className="text-red-400">*</span>
              </label>
              <input
                ref={nameRef}
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Ahmet Yılmaz"
                autoComplete="name"
                className="form-input"
                required
              />
            </div>

            {/* Alan 2: Telefon */}
            <div>
              <label className="block text-xs text-[#8ba0b5] mb-1.5">📞 Telefon</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="0532 000 00 00"
                autoComplete="tel"
                className="form-input"
                inputMode="tel"
              />
            </div>

            {/* Alan 3: Fiyat ve Kapora Yönetimi */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-xs text-[#00b4d8] font-bold uppercase tracking-wider">
                  💳 Fiyat & Kapora Detayı
                </label>
                {/* Fiyat Tipi Toggle */}
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/10 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPriceType('daily')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      priceType === 'daily'
                        ? 'bg-[#00b4d8] text-white shadow-sm'
                        : 'text-[#8ba0b5] hover:text-white'
                    }`}
                  >
                    🌙 Günlük Fiyat
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceType('total')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      priceType === 'total'
                        ? 'bg-[#00b4d8] text-white shadow-sm'
                        : 'text-[#8ba0b5] hover:text-white'
                    }`}
                  >
                    💰 Toplam Fiyat
                  </button>
                </div>
              </div>

              {/* Tutar & Kapora Girişleri */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#8ba0b5] mb-1">
                    {priceType === 'daily' ? 'Günlük Tutar (TL)' : 'Toplam Tutar (TL)'}
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder={priceType === 'daily' ? 'Örn: 1500' : 'Örn: 4500'}
                    className="form-input text-base font-semibold"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8ba0b5] mb-1">Alınan Kapora (TL)</label>
                  <input
                    type="number"
                    value={deposit}
                    onChange={e => setDeposit(e.target.value)}
                    placeholder="Örn: 500"
                    className="form-input text-base font-semibold"
                    min="0"
                  />
                </div>
              </div>

              {/* CANLI HESAPLAMA KARTI */}
              {numPrice > 0 && (
                <div className="mt-2 p-3 rounded-lg bg-gradient-to-r from-emerald-950/50 to-cyan-950/50 border border-emerald-500/30 text-xs space-y-1">
                  <div className="flex justify-between text-[#8ba0b5]">
                    <span>Konaklama Bedeli ({nights} gece):</span>
                    <span className="font-semibold text-white">{totalAmount.toLocaleString('tr-TR')} TL</span>
                  </div>
                  {numDeposit > 0 && (
                    <div className="flex justify-between text-[#8ba0b5]">
                      <span>Alınan Kapora:</span>
                      <span className="font-semibold text-amber-400">-{numDeposit.toLocaleString('tr-TR')} TL</span>
                    </div>
                  )}
                  <div className="pt-1 border-t border-white/10 flex justify-between items-center font-bold text-sm">
                    <span className="text-emerald-300">⚡ Müşteriden Alınacak Kalan:</span>
                    <span className="text-emerald-400 text-base font-extrabold">{remainingBalance.toLocaleString('tr-TR')} TL</span>
                  </div>
                </div>
              )}
            </div>

            {/* Alan 4: Not */}
            <div>
              <label className="block text-xs text-[#8ba0b5] mb-1.5">📝 Notlar (İsteğe Bağlı)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Erken giriş, özel istek..."
                rows={2}
                className="form-input resize-none"
              />
            </div>

            {/* Durum Seçimi */}
            <div>
              <label className="block text-xs text-[#8ba0b5] mb-2">Rezervasyon Durumu</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('active')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all
                    ${status === 'active'
                      ? 'bg-[rgba(42,157,143,0.25)] border-[#2a9d8f] text-white'
                      : 'bg-white/5 border-white/10 text-[#8ba0b5] hover:bg-white/10'}`}
                >
                  ✅ Aktif
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('pending')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all
                    ${status === 'pending'
                      ? 'bg-[rgba(244,162,97,0.25)] border-[#f4a261] text-white'
                      : 'bg-white/5 border-white/10 text-[#8ba0b5] hover:bg-white/10'}`}
                >
                  ⏳ Kapora Bekleniyor
                </button>
              </div>
            </div>

            {/* Hata */}
            {error && (
              <div className="bg-red-900/30 border border-red-700/40 rounded-xl px-4 py-3 text-red-300 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* Kaydet Butonu — Büyük ve belirgin */}
            <button
              type="submit"
              disabled={saving || !isValid}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200
                ${isValid && !saving
                  ? 'btn-primary'
                  : 'bg-white/10 text-[#8ba0b5] cursor-not-allowed'}`}
            >
              {saving ? '⏳ Kaydediliyor...' : '✅  KAYDET'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 text-[#8ba0b5] hover:text-white text-sm transition-colors"
            >
              İptal
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
