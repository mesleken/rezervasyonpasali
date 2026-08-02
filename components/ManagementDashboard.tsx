'use client'

import { useState, useEffect, useCallback } from 'react'

interface CategoryItem {
  id: number
  slug: string
  label: string
  icon: string
  sort_order: number
}

interface UnitItem {
  id: number
  category_id: number
  unit_number: number
  label: string
  is_active: boolean
  category?: CategoryItem
}

interface Props {
  onBack: () => void
  onLogout: () => void
}

export default function ManagementDashboard({ onBack, onLogout }: Props) {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [units, setUnits] = useState<UnitItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all')

  // Modallar
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [selectedCatForUnit, setSelectedCatForUnit] = useState<number | null>(null)

  // PIN Değiştirme Modalı
  const [showPinChange, setShowPinChange] = useState(false)
  const [masterPin, setMasterPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [pinChangeMsg, setPinChangeMsg] = useState('')

  // Bakım Modu Tarihli Modal State'leri
  const [maintTargetUnit, setMaintTargetUnit] = useState<{ id: number; label: string } | null>(null)
  const [maintCheckIn, setMaintCheckIn] = useState<string>(new Date().toISOString().split('T')[0])
  const [maintCheckOut, setMaintCheckOut] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  )
  const [maintNotes, setMaintNotes] = useState<string>('Tesis Bakım & Onarım')

  // Bakımdan Çıkar Onay Modalı State'i
  const [maintRemoveUnit, setMaintRemoveUnit] = useState<{ id: number; label: string } | null>(null)

  // Form State'leri
  const [catLabel, setCatLabel] = useState('')
  const [catIcon, setCatIcon] = useState('🏠')
  const [catSlug, setCatSlug] = useState('')
  const [catError, setCatError] = useState('')

  const [unitCategoryId, setUnitCategoryId] = useState<number>(0)
  const [unitNumber, setUnitNumber] = useState<number>(1)
  const [unitLabel, setUnitLabel] = useState('')
  const [unitError, setUnitError] = useState('')

  // Toast bildirimi
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // Verileri yükle
  const loadAdminData = useCallback(async () => {
    setLoading(true)
    try {
      const [resCats, resUnits] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch('/api/admin/units')
      ])

      const catsJson = await resCats.json()
      const unitsJson = await resUnits.json()

      if (catsJson.data) setCategories(catsJson.data)
      if (unitsJson.data) setUnits(unitsJson.data)
    } catch (e) {
      console.error('Yönetim verileri yüklenemedi:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAdminData()
  }, [loadAdminData])

  // Yeni Birim Türü (Kategori) Ekle
  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    setCatError('')
    if (!catLabel.trim()) {
      setCatError('Kategori adı zorunludur.')
      return
    }

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: catLabel.trim(),
          icon: catIcon.trim() || '🛖',
          slug: catSlug.trim() || undefined,
          sort_order: categories.length + 1
        })
      })
      const json = await res.json()
      if (!res.ok) {
        setCatError(json.error || 'Kategori eklenemedi.')
        return
      }
      showToast(`Yeni birim türü "${catLabel}" eklendi! 🎉`)
      setShowAddCategory(false)
      setCatLabel('')
      setCatIcon('🏠')
      setCatSlug('')
      loadAdminData()
    } catch {
      setCatError('Sunucu hatası.')
    }
  }

  // Birim Türü Sil
  async function handleDeleteCategory(catId: number, label: string) {
    if (!confirm(`"${label}" türünü ve bu türe bağlı tüm verileri silmek istediğinizden emin misiniz?`)) return

    try {
      const res = await fetch(`/api/admin/categories?id=${catId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        showToast(json.error || 'Silme işlemi başarısız.', 'error')
        return
      }
      showToast(`"${label}" birim türü silindi.`)
      loadAdminData()
    } catch {
      showToast('Silme hatası.', 'error')
    }
  }

  // Yeni Birim Ekle
  async function handleAddUnit(e: React.FormEvent) {
    e.preventDefault()
    setUnitError('')
    const targetCatId = unitCategoryId || selectedCatForUnit || (categories[0]?.id || 0)

    if (!targetCatId) {
      setUnitError('Lütfen bir konaklama türü seçin.')
      return
    }

    const catObj = categories.find(c => c.id === targetCatId)

    try {
      const res = await fetch('/api/admin/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: targetCatId,
          unit_number: unitNumber,
          label: unitLabel.trim() || `${catObj?.label || 'Birim'} ${unitNumber}`,
          is_active: true
        })
      })
      const json = await res.json()
      if (!res.ok) {
        setUnitError(json.error || 'Birim eklenemedi.')
        return
      }
      showToast(`Yeni birim "${json.data?.label || unitNumber}" eklendi! 🎉`)
      setShowAddUnit(false)
      setUnitLabel('')
      setUnitNumber(1)
      loadAdminData()
    } catch {
      setUnitError('Sunucu hatası.')
    }
  }

  // Tarihli Bakım Moduna Al ve Takvime Mor Barlar İşle
  async function handleCreateMaintenance(e: React.FormEvent) {
    e.preventDefault()
    if (!maintTargetUnit) return
    if (!maintCheckIn || !maintCheckOut) {
      showToast('Lütfen başlangıç ve bitiş tarihlerini seçin.', 'error')
      return
    }
    if (maintCheckOut <= maintCheckIn) {
      showToast('Bitiş tarihi başlangıç tarihinden sonra olmalıdır.', 'error')
      return
    }

    try {
      // 1. Takvime Mor Bakım Kaydı Oluştur (status: 'maintenance')
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_id: maintTargetUnit.id,
          guest_name: '🔧 BAKIMDA',
          status: 'maintenance',
          check_in: maintCheckIn,
          check_out: maintCheckOut,
          notes: maintNotes.trim() || 'Tesis Bakım Modu',
          price: 0,
          deposit: 0
        })
      })

      const json = await res.json()
      if (!res.ok) {
        showToast(json.error || 'Bakım kaydı oluşturulamadı.', 'error')
        return
      }

      // 2. Birimi Bakım Moduna (is_active = false) Al
      await fetch('/api/admin/units', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: maintTargetUnit.id, is_active: false })
      })

      showToast(`"${maintTargetUnit.label}" ${maintCheckIn} - ${maintCheckOut} tarihleri arasında bakıma alındı ve takvime MOR renkle işlendi! 🔧🟣`)
      setMaintTargetUnit(null)
      loadAdminData()
    } catch {
      showToast('Bakım kaydı oluşturma hatası.', 'error')
    }
  }

  // Birimi Bakımdan Çıkar (Aktif 🟢)
  async function handleRemoveMaintenance(unitId: number, label: string) {
    try {
      await fetch('/api/admin/units', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: unitId, is_active: true })
      })
      showToast(`"${label}" bakımdan çıkarıldı ve kullanıma açıldı! 🟢`)
      setMaintRemoveUnit(null)
      loadAdminData()
    } catch {
      showToast('Bakımdan çıkarma hatası.', 'error')
    }
  }

  // Birim Sil
  async function handleDeleteUnit(unitId: number, label: string) {
    if (!confirm(`"${label}" birimini silmek istediğinizden emin misiniz?`)) return

    try {
      const res = await fetch(`/api/admin/units?id=${unitId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        showToast(json.error || 'Birim silinemedi.', 'error')
        return
      }
      showToast(`"${label}" birimi silindi.`)
      loadAdminData()
    } catch {
      showToast('Silme hatası.', 'error')
    }
  }

  // Master PIN ile Giriş PIN Kodu Değiştirme
  function handleChangePin(e: React.FormEvent) {
    e.preventDefault()
    if (masterPin.trim() !== '2205') {
      setPinChangeMsg('⚠️ Hatalı Yönetici Doğrulama Şifresi!')
      return
    }
    if (newPin.length !== 4) {
      setPinChangeMsg('Yeni PIN 4 haneli sayı olmalıdır.')
      return
    }
    localStorage.setItem('pasali_admin_pin', newPin)
    setPinChangeMsg('✅ Giriş PIN Kodu başarıyla güncellendi!')
    setTimeout(() => {
      setShowPinChange(false)
      setMasterPin('')
      setNewPin('')
      setPinChangeMsg('')
    }, 1500)
  }

  const filteredUnits = selectedCatFilter === 'all'
    ? units
    : units.filter(u => u.category_id === Number(selectedCatFilter))

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Bildirimi */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl font-bold text-xs shadow-2xl border transition-all ${
          toast.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
            : 'bg-red-950/90 border-red-500/40 text-red-300'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Top Header Bar */}
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
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="font-display font-bold text-lg text-white leading-tight">Tesis & Birim Yönetim Paneli</h2>
              <p className="text-xs text-[#8ba0b5]">Konaklama Türleri, Birim Ekleme/Silme ve Tarihli Bakım Modu</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* PIN Değiştir */}
          <button
            onClick={() => setShowPinChange(true)}
            className="btn-ghost px-3.5 py-2 rounded-xl text-xs font-semibold text-[#8ba0b5] hover:text-white touch-target border border-amber-500/30 text-amber-300"
          >
            🔑 PIN Değiştir
          </button>
        </div>
      </div>

      {/* ============================================================
          SECTION 1: KONAKLAMA TÜRLERİ (KATEGORİLER)
      ============================================================ */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <span>🏠</span>
              <span>Konaklama Türleri ({categories.length})</span>
            </h3>
            <p className="text-xs text-[#8ba0b5] mt-0.5">Tesisinizde bulunan aktif konaklama kategorileri</p>
          </div>

          <button
            onClick={() => setShowAddCategory(true)}
            className="btn-primary px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 touch-target"
          >
            <span>➕</span>
            <span>Yeni Birim Türü Ekle</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-[#00b4d8] animate-pulse text-sm">Yükleniyor...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map(cat => {
              const catUnitCount = units.filter(u => u.category_id === cat.id).length
              return (
                <div
                  key={cat.id}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3 hover:border-[#00b4d8]/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-bold text-sm text-white">
                      <span className="text-xl">{cat.icon}</span>
                      <span>{cat.label}</span>
                    </div>
                    <span className="text-xs font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
                      {catUnitCount} Birim
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedCatForUnit(cat.id)
                        setUnitCategoryId(cat.id)
                        const existingNums = units.filter(u => u.category_id === cat.id).map(u => u.unit_number)
                        const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0
                        setUnitNumber(maxNum + 1)
                        setShowAddUnit(true)
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all text-center"
                    >
                      ➕ Birim Ekle
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.label)}
                      className="py-1.5 px-3 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition-all"
                      title="Kategoriyi Sil"
                    >
                      🗑️ Sil
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ============================================================
          SECTION 2: BİRİMLER & TARİHLİ BAKIM MODU
      ============================================================ */}
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <span>🛏️</span>
              <span>Birim Listesi & Tarihli Bakım Modu Yönetimi ({filteredUnits.length})</span>
            </h3>
            <p className="text-xs text-[#8ba0b5] mt-0.5">Birimleri tarih aralığı seçerek bakıma alabilir ve takvime Mor renkli bar ekleyebilirsiniz</p>
          </div>

          <button
            onClick={() => {
              setSelectedCatForUnit(categories[0]?.id || 0)
              setUnitCategoryId(categories[0]?.id || 0)
              setUnitNumber(1)
              setShowAddUnit(true)
            }}
            className="btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 touch-target"
          >
            <span>➕</span>
            <span>Yeni Birim Ekle</span>
          </button>
        </div>

        {/* Kategori Filtresi */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            onClick={() => setSelectedCatFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              selectedCatFilter === 'all'
                ? 'bg-[#00b4d8] text-white border-[#00b4d8] font-bold'
                : 'bg-white/5 border-white/10 text-[#8ba0b5]'
            }`}
          >
            Tüm Birimler ({units.length})
          </button>
          {categories.map(cat => {
            const count = units.filter(u => u.category_id === cat.id).length
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCatFilter(String(cat.id))}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  selectedCatFilter === String(cat.id)
                    ? 'bg-[#00b4d8] text-white border-[#00b4d8] font-bold'
                    : 'bg-white/5 border-white/10 text-[#8ba0b5]'
                }`}
              >
                {cat.icon} {cat.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Birimler Tablosu / Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {filteredUnits.map(unit => {
            const cat = unit.category || categories.find(c => c.id === unit.category_id)
            const unitLabel = unit.label || `${cat?.label || 'Birim'} ${unit.unit_number}`
            return (
              <div
                key={unit.id}
                className={`p-3.5 rounded-xl border space-y-2.5 transition-all ${
                  unit.is_active
                    ? 'bg-white/5 border-white/10 hover:border-[#00b4d8]/40'
                    : 'bg-purple-950/40 border-purple-500/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="font-bold text-sm text-white">
                    <span>{cat?.icon || '🏠'} </span>
                    <span>{unitLabel}</span>
                  </div>
                  <span className="text-[10px] text-[#8ba0b5] font-mono">#{unit.unit_number}</span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {/* Bakım Modu / Aktiflik Butonu (Bakıma Al / Bakımdan Çıkar) */}
                  {unit.is_active ? (
                    <button
                      onClick={() => setMaintTargetUnit({ id: unit.id, label: unitLabel })}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                    >
                      <span>🔧 Bakıma Al</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setMaintRemoveUnit({ id: unit.id, label: unitLabel })}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                    >
                      <span>🟢 Bakımdan Çıkar</span>
                    </button>
                  )}

                  {/* Sil Butonu */}
                  <button
                    onClick={() => handleDeleteUnit(unit.id, unitLabel)}
                    className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs transition-all"
                    title="Birimi Sil"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ============================================================
          MODAL 1: YENİ KATEGORİ (BİRİM TÜRÜ) EKLE
      ============================================================ */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full space-y-4 border border-[#00b4d8]/40 rounded-2xl bg-[#0d1e34]">
            <h3 className="font-bold text-lg text-white text-center">➕ Yeni Konaklama Türü Ekle</h3>
            <form onSubmit={handleAddCategory} className="space-y-3">
              <div>
                <label className="block text-xs text-[#8ba0b5] mb-1">Tür Adı / Etiket</label>
                <input
                  type="text"
                  value={catLabel}
                  onChange={e => setCatLabel(e.target.value)}
                  placeholder="Örn: Tiny House, Glamping"
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs text-[#8ba0b5] mb-1">Simge / Emoji</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={catIcon}
                    onChange={e => setCatIcon(e.target.value)}
                    placeholder="Örn: 🛖"
                    className="form-input text-center text-xl w-20"
                    required
                  />
                  <div className="flex-1 flex items-center gap-1.5 overflow-x-auto p-1 bg-black/20 rounded-xl border border-white/5">
                    {['🏠', '⛺', '🔵', '📍', '🚐', '🅿️', '🛖', '🌲', '⛵', '🏰'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setCatIcon(emoji)}
                        className="w-8 h-8 rounded-lg hover:bg-white/10 text-lg flex items-center justify-center shrink-0"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {catError && (
                <div className="text-xs text-center font-bold text-red-400 bg-red-950/40 p-2 rounded border border-red-500/30">
                  {catError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-[#8ba0b5] hover:text-white text-xs font-semibold"
                >
                  İptal
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold">
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: YENİ BİRİM EKLE
      ============================================================ */}
      {showAddUnit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full space-y-4 border border-[#00b4d8]/40 rounded-2xl bg-[#0d1e34]">
            <h3 className="font-bold text-lg text-white text-center">➕ Yeni Birim Ekle</h3>
            <form onSubmit={handleAddUnit} className="space-y-3">
              <div>
                <label className="block text-xs text-[#8ba0b5] mb-1">Konaklama Türü</label>
                <select
                  value={unitCategoryId || selectedCatForUnit || (categories[0]?.id || 0)}
                  onChange={e => setUnitCategoryId(Number(e.target.value))}
                  className="form-input"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[#8ba0b5] mb-1">Birim Numarası</label>
                  <input
                    type="number"
                    min={1}
                    value={unitNumber}
                    onChange={e => setUnitNumber(Number(e.target.value))}
                    className="form-input text-center"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8ba0b5] mb-1">Birim Adı (İsteğe Bağlı)</label>
                  <input
                    type="text"
                    value={unitLabel}
                    onChange={e => setUnitLabel(e.target.value)}
                    placeholder="Örn: Bungalov 4"
                    className="form-input"
                  />
                </div>
              </div>

              {unitError && (
                <div className="text-xs text-center font-bold text-red-400 bg-red-950/40 p-2 rounded border border-red-500/30">
                  {unitError}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUnit(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-[#8ba0b5] hover:text-white text-xs font-semibold"
                >
                  İptal
                </button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl btn-primary text-xs font-bold">
                  Birim Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 3: TARİHLİ BAKIMA ALMA MODALI (MOR BAR TAKVİM KAYDI)
      ============================================================ */}
      {maintTargetUnit && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-md w-full space-y-4 border border-purple-500/40 rounded-2xl bg-[#0d1e34]">
            <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-purple-950/50">
              🔧
            </div>
            <h3 className="font-bold text-lg text-white text-center">
              "{maintTargetUnit.label}" Birimini Bakıma Al
            </h3>
            <p className="text-xs text-[#8ba0b5] text-center">
              Seçeceğiniz tarih aralığında bu birim takvimde <strong className="text-purple-300">MOR renkte "🔧 BAKIMDA"</strong> olarak gösterilecek ve rezervasyonlara kapatılacaktır.
            </p>

            <form onSubmit={handleCreateMaintenance} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[#8ba0b5] mb-1">Başlangıç Tarihi</label>
                  <input
                    type="date"
                    value={maintCheckIn}
                    onChange={e => setMaintCheckIn(e.target.value)}
                    className="form-input text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#8ba0b5] mb-1">Bitiş Tarihi</label>
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
                <label className="block text-xs text-[#8ba0b5] mb-1">Bakım Nedeni / Not (İsteğe Bağlı)</label>
                <input
                  type="text"
                  value={maintNotes}
                  onChange={e => setMaintNotes(e.target.value)}
                  placeholder="Örn: Klima & boya bakımı"
                  className="form-input text-sm"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMaintTargetUnit(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-[#8ba0b5] hover:text-white text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white text-xs font-bold shadow-lg shadow-purple-950/50 hover:opacity-90 transition-all"
                >
                  🔧 Bakıma Al ve Takvime İşle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 4: BAKIMDAN ÇIKAR ONAY MODALI
      ============================================================ */}
      {maintRemoveUnit && (
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
              <button
                type="button"
                onClick={() => setMaintRemoveUnit(null)}
                className="py-2.5 rounded-xl bg-white/5 text-[#8ba0b5] hover:text-white text-xs font-semibold"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => handleRemoveMaintenance(maintRemoveUnit.id, maintRemoveUnit.label)}
                className="py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
              >
                Evet, Bakımdan Çıkar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 5: PIN DEĞİŞTİRME MODALI
      ============================================================ */}
      {showPinChange && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-card p-6 max-w-sm w-full space-y-4 border border-[#00b4d8]/40 rounded-2xl bg-[#0d1e34]">
            <h3 className="font-bold text-lg text-white text-center">🔑 Yönetici PIN Kodunu Değiştir</h3>
            <form onSubmit={handleChangePin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1">
                  Yönetici Doğrulama Şifresi
                </label>
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
                <button
                  type="button"
                  onClick={() => {
                    setShowPinChange(false)
                    setMasterPin('')
                    setNewPin('')
                    setPinChangeMsg('')
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 text-[#8ba0b5] hover:text-white text-xs font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={newPin.length !== 4 || masterPin.length !== 4}
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
