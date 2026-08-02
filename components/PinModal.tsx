'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const DEFAULT_PIN = '8620'

export default function PinModal({ isOpen, onClose, onSuccess }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setPin('')
      setError(false)
      setShake(false)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  if (!isOpen) return null

  function getSavedPin(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pasali_admin_pin') || DEFAULT_PIN
    }
    return DEFAULT_PIN
  }

  function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const savedPin = getSavedPin()
    if (pin.trim() === savedPin) {
      onSuccess()
    } else {
      setError(true)
      setShake(true)
      setPin('')
      setTimeout(() => setShake(false), 500)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-sm mx-auto">
        <div
          className={`glass-card p-6 shadow-2xl border border-[#00b4d8]/40 rounded-2xl bg-[#0d1e34]/95 text-center space-y-5 transition-transform ${
            shake ? 'animate-bounce border-red-500' : ''
          }`}
        >
          {/* İkon & Başlık */}
          <div className="space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00b4d8]/20 to-[#2a9d8f]/20 border border-[#00b4d8]/30 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-cyan-950/50">
              🔒
            </div>
            <h3 className="font-display font-bold text-xl text-white">Yönetici Finans Girişi</h3>
            <p className="text-xs text-[#8ba0b5]">
              Finansal raporları görüntülemek için lütfen 4 haneli PIN kodunuzu girin.
            </p>
          </div>

          {/* Form / PIN Input */}
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <input
                ref={inputRef}
                type="password"
                maxLength={4}
                value={pin}
                onChange={e => {
                  setError(false)
                  setPin(e.target.value.replace(/\D/g, ''))
                }}
                placeholder="••••"
                className="w-full text-center text-3xl font-mono tracking-[0.5em] py-3 bg-black/40 border border-[rgba(0,180,216,0.3)] rounded-xl text-[#00b4d8] focus:border-[#00b4d8] focus:outline-none"
                autoComplete="off"
                inputMode="numeric"
              />
            </div>

            {error && (
              <div className="text-xs text-red-400 font-semibold bg-red-950/50 border border-red-500/30 rounded-lg py-1.5 px-3">
                ⚠️ Hatalı PIN Kodu! Lütfen tekrar deneyin.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#8ba0b5] hover:text-white text-sm font-semibold transition-all touch-target"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={pin.length < 4}
                className={`py-3 rounded-xl text-sm font-bold transition-all touch-target shadow-lg ${
                  pin.length === 4
                    ? 'btn-primary'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                Giriş Yap
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
