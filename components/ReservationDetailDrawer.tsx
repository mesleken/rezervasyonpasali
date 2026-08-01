'use client'

import { useState, useEffect } from 'react'
import { formatDateTR, calcNights } from '@/lib/dateUtils'
import type { Reservation } from '@/types'

interface Props {
  reservation: Reservation | null
  isOpen: boolean
  onClose: () => void
  onCancel: (id: string) => void
  onActivate?: (id: string, depositAmount?: number) => void  // pending → active
  onComplete?: (id: string, totalAmount: number) => void // → completed
}

const STATUS_LABELS: Record<string, string> = {
  active: '✅ Aktif (Ödeme Bekliyor)',
  pending: '⏳ Kapora Bekleniyor',
  completed: '🎉 Ödeme Tamamlandı (Arşivlendi)',
  cancelled: '❌ İptal Edildi',
}

export default function ReservationDetailDrawer({
  reservation, isOpen, onClose, onCancel, onActivate, onComplete
}: Props) {
  const [activateDeposit, setActivateDeposit] = useState<string>('')

  useEffect(() => {
    if (reservation) {
      setActivateDeposit(reservation.deposit ? String(reservation.deposit) : '')
    }
  }, [reservation])

  if (!isOpen || !reservation) return null

  const nights = calcNights(reservation.check_in, reservation.check_out)
  const unit = reservation.unit

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer — alttan veya sağdan açılır (mobil: alt, tablet: sağ) */}
      <div className="fixed inset-x-0 bottom-0 tablet:right-0 tablet:inset-x-auto tablet:inset-y-0
                      tablet:w-96 z-50">
        <div className="glass-card h-full rounded-b-none tablet:rounded-l-2xl tablet:rounded-r-none
                        overflow-y-auto shadow-2xl shadow-black/70 flex flex-col">

          {/* Başlık */}
          <div className="bg-gradient-to-r from-[rgba(0,180,216,0.15)] to-transparent
                          border-b border-[rgba(0,180,216,0.15)] px-5 py-4 flex justify-between items-center
                          sticky top-0">
            <div>
              <div className="font-bold text-lg font-display">Rezervasyon Detayı</div>
              <div className="text-xs text-[#5c748a] mt-0.5">#{reservation.id.slice(0, 8)}</div>
            </div>
            <button
              onClick={onClose}
              className="text-[#8ba0b5] hover:text-white text-2xl touch-target"
            >×</button>
          </div>

          {/* İçerik */}
          <div className="flex-1 p-5 space-y-4">
            {/* Birim Bilgisi */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-xs text-[#8ba0b5] mb-1">Birim</div>
              <div className="font-semibold text-white">
                {unit?.category && (
                  <span className="mr-2">
                    {(unit.category as { icon?: string }).icon}
                  </span>
                )}
                {unit?.label || `Birim #${reservation.unit_id}`}
              </div>
            </div>

            {/* Tarihler */}
            <div className="bg-white/5 rounded-xl p-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-[#8ba0b5] mb-1">📅 Giriş</div>
                <div className="font-semibold">{formatDateTR(reservation.check_in)}</div>
              </div>
              <div>
                <div className="text-xs text-[#8ba0b5] mb-1">📅 Çıkış</div>
                <div className="font-semibold">{formatDateTR(reservation.check_out)}</div>
              </div>
              <div className="col-span-2 text-center">
                <span className="text-[#00b4d8] font-bold">{nights} gece</span>
              </div>
            </div>

            {/* Misafir Bilgileri */}
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <div>
                <div className="text-xs text-[#8ba0b5] mb-1">👤 Misafir</div>
                <div className="font-bold text-lg">{reservation.guest_name}</div>
              </div>
              {reservation.phone && (
                <div>
                  <div className="text-xs text-[#8ba0b5] mb-1">📞 Telefon</div>
                  <a
                    href={`tel:${reservation.phone}`}
                    className="font-semibold text-[#00b4d8] hover:underline"
                  >
                    {reservation.phone}
                  </a>
                </div>
              )}
              {reservation.notes && (
                <div>
                  <div className="text-xs text-[#8ba0b5] mb-1">📝 Notlar</div>
                  <div className="text-[#8ba0b5] italic">{reservation.notes}</div>
                </div>
              )}
            </div>

            {/* Fiyat & Ödeme / Kapora Kartı */}
            {(() => {
              const price = reservation.price || 0
              const deposit = reservation.deposit || 0
              const isDaily = reservation.price_type !== 'total'
              const totalAmount = isDaily ? price * (nights > 0 ? nights : 1) : price
              const remainingBalance = Math.max(0, totalAmount - deposit)

              return (
                <div className="bg-gradient-to-br from-cyan-950/40 to-emerald-950/40 border border-[#00b4d8]/20 rounded-xl p-4 space-y-2.5">
                  <div className="text-xs text-[#00b4d8] font-bold uppercase tracking-wider flex justify-between items-center">
                    <span>💳 Finansal Özet</span>
                    <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white font-normal">
                      {isDaily ? `Günlük ${price.toLocaleString('tr-TR')} TL` : 'Toplam Sabit Fiyat'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm pt-1">
                    <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                      <div className="text-xs text-[#8ba0b5]">Toplam Konaklama</div>
                      <div className="font-bold text-white mt-0.5">
                        {totalAmount > 0 ? `${totalAmount.toLocaleString('tr-TR')} TL` : 'Belirtilmedi'}
                      </div>
                    </div>
                    <div className="bg-black/20 p-2.5 rounded-lg border border-white/5">
                      <div className="text-xs text-[#8ba0b5]">Alınan Kapora</div>
                      <div className="font-bold text-amber-400 mt-0.5">
                        {deposit > 0 ? `${deposit.toLocaleString('tr-TR')} TL` : '0 TL'}
                      </div>
                    </div>
                  </div>

                  {/* KALAN TAHSİLAT KARTI */}
                  <div
                    onClick={() => {
                      if (reservation.status !== 'completed' && onComplete) {
                        onComplete(reservation.id, totalAmount)
                      }
                    }}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                      reservation.status === 'completed'
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25 cursor-pointer shadow-lg shadow-emerald-950/30'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xs text-emerald-300 font-bold uppercase tracking-wide flex items-center gap-1">
                          ⚡ ALINMASI GEREKEN KALAN
                        </div>
                        <div className="text-[11px] text-[#8ba0b5] mt-0.5">
                          {reservation.status === 'completed'
                            ? 'Ödeme Tamamen Alındı'
                            : 'Tıkla → Ödemeyi Al & Tamamlandı Yap'}
                        </div>
                      </div>
                      <div className="text-xl font-extrabold text-emerald-400">
                        {remainingBalance.toLocaleString('tr-TR')} TL
                      </div>
                    </div>

                    {reservation.status !== 'completed' && onComplete && (
                      <button
                        type="button"
                        className="w-full py-2 bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-400/40 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        ✅ Ödemeyi Tamamla (Mavi Renk Yap & Arşivle)
                      </button>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Durum */}
            <div className="bg-white/5 rounded-xl p-4">
              <div className="text-xs text-[#8ba0b5] mb-1">Durum</div>
              <div className={`font-semibold ${
                reservation.status === 'active' ? 'text-[#2a9d8f]'
                : reservation.status === 'pending' ? 'text-[#f4a261]'
                : reservation.status === 'completed' ? 'text-[#3498db]'
                : 'text-[#8ba0b5]'
              }`}>
                {STATUS_LABELS[reservation.status]}
              </div>
            </div>
          </div>

          {/* Aksiyon Butonları — Alt kısım sabit */}
          {reservation.status !== 'cancelled' && (
            <div className="p-5 border-t border-[rgba(0,180,216,0.12)] space-y-3">
              {/* Ödeme Tamamlandı Olarak İşaretle (Completed) */}
              {reservation.status !== 'completed' && onComplete && (
                <button
                  onClick={() => {
                    const price = reservation.price || 0
                    const isDaily = reservation.price_type !== 'total'
                    const totalAmount = isDaily ? price * (nights > 0 ? nights : 1) : price
                    onComplete(reservation.id, totalAmount)
                  }}
                  className="w-full py-3.5 rounded-xl bg-blue-600/25 border border-blue-500
                             text-white font-bold transition-all hover:bg-blue-600/40
                             touch-target flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40"
                >
                  🎉 Ödeme Tamamlandı (Tamamlandı Olarak Arşivle)
                </button>
              )}

              {/* Kapora Bekliyorsa → Kapora Girişi ve Aktife Çevir */}
              {reservation.status === 'pending' && onActivate && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2.5">
                  <div className="text-xs text-amber-300 font-bold flex justify-between items-center">
                    <span>💵 Alınan Kapora Tutarı (TL)</span>
                    <span className="text-[10px] text-[#8ba0b5]">İsteğe Bağlı Değiştirilebilir</span>
                  </div>
                  <input
                    type="number"
                    value={activateDeposit}
                    onChange={e => setActivateDeposit(e.target.value)}
                    placeholder="Örn: 500"
                    className="form-input text-base font-bold bg-black/40 text-amber-300 border-amber-500/40 focus:border-amber-400"
                    min="0"
                  />
                  <button
                    onClick={() => onActivate(reservation.id, Number(activateDeposit) || 0)}
                    className="w-full py-3.5 rounded-xl bg-[#2a9d8f] hover:bg-[#218378]
                               text-white font-bold transition-all touch-target shadow-lg shadow-emerald-950/40
                               flex items-center justify-center gap-2"
                  >
                    ✅ Aktife Çevir (Kaporayı Kaydet & Kırmızı Yap)
                  </button>
                </div>
              )}
              {/* İptal Et */}
              <button
                onClick={() => onCancel(reservation.id)}
                className="w-full py-3.5 rounded-xl bg-[rgba(192,57,43,0.15)] border border-[rgba(192,57,43,0.4)]
                           text-red-400 font-semibold transition-all hover:bg-[rgba(192,57,43,0.3)]
                           touch-target"
              >
                ❌ Rezervasyonu İptal Et
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
