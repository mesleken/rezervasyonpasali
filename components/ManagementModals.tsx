'use client'

import React from 'react'

interface CategoryItem {
  id: number
  slug: string
  label: string
  icon: string
  sort_order: number
}

interface AddCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  catLabel: string
  setCatLabel: (v: string) => void
  catIcon: string
  setCatIcon: (v: string) => void
  catSlug: string
  setCatSlug: (v: string) => void
  catError: string
}

export function AddCategoryModal({
  isOpen, onClose, onSubmit, catLabel, setCatLabel, catIcon, setCatIcon, catSlug, setCatSlug, catError
}: AddCategoryModalProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card p-6 max-w-md w-full space-y-4 border border-[#00b4d8]/40 rounded-2xl bg-[#0d1e34]">
        <h3 className="font-bold text-lg text-white text-center">🛖 Yeni Birim Türü (Kategori) Ekle</h3>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-[#8ba0b5] mb-1">Tür Adı (Örn: Taş Ev, Glamping)</label>
            <input
              type="text"
              value={catLabel}
              onChange={e => setCatLabel(e.target.value)}
              placeholder="Örn: Delüks Taş Ev"
              className="form-input text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[#8ba0b5] mb-1">Simge (Emoji)</label>
              <input
                type="text"
                value={catIcon}
                onChange={e => setCatIcon(e.target.value)}
                placeholder="Örn: 🛖"
                className="form-input text-sm text-center"
              />
            </div>
            <div>
              <label className="block text-xs text-[#8ba0b5] mb-1">Kod Slug (Opsiyonel)</label>
              <input
                type="text"
                value={catSlug}
                onChange={e => setCatSlug(e.target.value)}
                placeholder="Örn: tas_ev"
                className="form-input text-sm"
              />
            </div>
          </div>
          {catError && <div className="text-xs text-red-400 text-center font-semibold p-2 bg-red-950/40 rounded border border-red-500/30">{catError}</div>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-[#8ba0b5] hover:text-white text-xs font-semibold">Vazgeç</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold">Ekle</button>
          </div>
        </form>
      </div>
    </div>
  )
}
interface AddUnitModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  categories: CategoryItem[]
  unitCategoryId: number
  setUnitCategoryId: (v: number) => void
  unitNumber: number
  setUnitNumber: (v: number) => void
  unitLabel: string
  setUnitLabel: (v: string) => void
  unitError: string
}

export function AddUnitModal({
  isOpen, onClose, onSubmit, categories, unitCategoryId, setUnitCategoryId, unitNumber, setUnitNumber, unitLabel, setUnitLabel, unitError
}: AddUnitModalProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card p-6 max-w-md w-full space-y-4 border border-[#00b4d8]/40 rounded-2xl bg-[#0d1e34]">
        <h3 className="font-bold text-lg text-white text-center">🏡 Yeni Oda / Birim Ekle</h3>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-[#8ba0b5] mb-1">Birim Türü (Kategori)</label>
            <select
              value={unitCategoryId}
              onChange={e => setUnitCategoryId(Number(e.target.value))}
              className="form-input text-sm bg-[#07111e]"
              required
            >
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-[#8ba0b5] mb-1">Sıra Numarası</label>
              <input
                type="number"
                min={1}
                value={unitNumber}
                onChange={e => setUnitNumber(Number(e.target.value))}
                className="form-input text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-[#8ba0b5] mb-1">Görünür İsim (Opsiyonel)</label>
              <input
                type="text"
                value={unitLabel}
                onChange={e => setUnitLabel(e.target.value)}
                placeholder="Örn: 101 Nolu Oda"
                className="form-input text-sm"
              />
            </div>
          </div>
          {unitError && <div className="text-xs text-red-400 text-center font-semibold p-2 bg-red-950/40 rounded border border-red-500/30">{unitError}</div>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-[#8ba0b5] hover:text-white text-xs font-semibold">Vazgeç</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold">Ekle</button>
          </div>
        </form>
      </div>
    </div>
  )
}
interface MaintenanceModalProps {
  maintTargetUnit: { id: number; label: string } | null
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  maintCheckIn: string
  setMaintCheckIn: (v: string) => void
  maintCheckOut: string
  setMaintCheckOut: (v: string) => void
  maintNotes: string
  setMaintNotes: (v: string) => void
}

export function MaintenanceModal({
  maintTargetUnit, onClose, onSubmit, maintCheckIn, setMaintCheckIn, maintCheckOut, setMaintCheckOut, maintNotes, setMaintNotes
}: MaintenanceModalProps) {
  if (!maintTargetUnit) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card p-6 max-w-md w-full space-y-4 border border-purple-500/40 rounded-2xl bg-[#0d1e34]">
        <div className="flex items-center gap-3 border-b border-white/10 pb-3">
          <span className="text-2xl">🔧</span>
          <div>
            <h3 className="font-bold text-base text-white">Bakım Modu & Tarih Planlama</h3>
            <p className="text-xs text-purple-300 font-semibold">{maintTargetUnit.label}</p>
          </div>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#8ba0b5] mb-1">Bakım Başlangıç</label>
              <input
                type="date"
                value={maintCheckIn}
                onChange={e => setMaintCheckIn(e.target.value)}
                className="form-input text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8ba0b5] mb-1">Bakım Bitiş</label>
              <input
                type="date"
                value={maintCheckOut}
                onChange={e => setMaintCheckOut(e.target.value)}
                className="form-input text-xs"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#8ba0b5] mb-1">Bakım Sebebi / Notu</label>
            <input
              type="text"
              value={maintNotes}
              onChange={e => setMaintNotes(e.target.value)}
              placeholder="Örn: Klima Tamiri, Genel Temizlik"
              className="form-input text-xs"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-[#8ba0b5] hover:text-white text-xs font-semibold">Vazgeç</button>
            <button type="submit" className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-950/50 transition-all">
              🔧 Bakıma Al ve Takvime İşle
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface RemoveMaintenanceModalProps {
  maintRemoveUnit: { id: number; label: string } | null
  onClose: () => void
  onConfirm: () => void
}

export function RemoveMaintenanceModal({ maintRemoveUnit, onClose, onConfirm }: RemoveMaintenanceModalProps) {
  if (!maintRemoveUnit) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card p-6 max-w-sm w-full space-y-4 border border-emerald-500/40 rounded-2xl bg-[#0d1e34] text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-950/50">
          🟢
        </div>
        <h3 className="font-bold text-lg text-white">Bakımdan Çıkarılsın mı?</h3>
        <p className="text-xs text-[#8ba0b5] leading-relaxed">
          <span className="text-white font-bold">"{maintRemoveUnit.label}"</span> birimini bakımdan çıkarıp tekrar aktif kullanıma açmak istediğinizden emin misiniz?
        </p>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button type="button" onClick={onClose} className="py-2.5 rounded-xl bg-white/5 text-[#8ba0b5] hover:text-white text-xs font-semibold">Vazgeç</button>
          <button type="button" onClick={onConfirm} className="py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
            Evet, Bakımdan Çıkar
          </button>
        </div>
      </div>
    </div>
  )
}

interface PinChangeModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
  masterPin: string
  setMasterPin: (v: string) => void
  newPin: string
  setNewPin: (v: string) => void
  pinChangeMsg: string
}

export function PinChangeModal({
  isOpen, onClose, onSubmit, masterPin, setMasterPin, newPin, setNewPin, pinChangeMsg
}: PinChangeModalProps) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-card p-6 max-w-sm w-full space-y-4 border border-[#00b4d8]/40 rounded-2xl bg-[#0d1e34]">
        <h3 className="font-bold text-lg text-white text-center">🔑 Yönetici PIN Kodunu Değiştir</h3>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-amber-300 mb-1">Yönetici Doğrulama Şifresi</label>
            <input
              type="password"
              maxLength={4}
              value={masterPin}
              onChange={e => setMasterPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="form-input text-center font-mono text-xl tracking-[0.4em] border-amber-500/40 focus:border-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs text-[#8ba0b5] mb-1">Yeni 4 Haneli Giriş PIN Kodu</label>
            <input
              type="password"
              maxLength={4}
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Örn: 8620"
              className="form-input text-center font-mono text-xl tracking-[0.4em]"
            />
          </div>
          {pinChangeMsg && (
            <div className={`text-xs text-center font-bold p-2.5 rounded border ${
              pinChangeMsg.includes('✅')
                ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30'
                : 'text-red-400 bg-red-950/40 border-red-500/30'
            }`}>
              {pinChangeMsg}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-white/5 text-[#8ba0b5] hover:text-white text-xs font-semibold">Vazgeç</button>
            <button type="submit" disabled={newPin.length !== 4 || masterPin.length !== 4} className="flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold">
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
