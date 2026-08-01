'use client'

interface Props {
  isOpen: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  confirmVariant?: 'danger' | 'primary'
}

export default function ConfirmDialog({
  isOpen, message, onConfirm, onCancel,
  confirmLabel = 'Evet, İptal Et',
  confirmVariant = 'danger'
}: Props) {
  if (!isOpen) return null
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center px-4">
        <div className="glass-card max-w-sm w-full p-6 shadow-2xl shadow-black/70">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">
              {confirmVariant === 'danger' ? '⚠️' : 'ℹ️'}
            </div>
            <p className="text-white font-medium leading-relaxed">{message}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 rounded-xl bg-white/8 border border-white/10
                         text-[#8ba0b5] font-semibold hover:bg-white/15 transition-all touch-target"
            >
              Hayır
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3.5 rounded-xl font-bold transition-all touch-target
                ${confirmVariant === 'danger'
                  ? 'bg-[rgba(192,57,43,0.2)] border border-red-600/50 text-red-400 hover:bg-[rgba(192,57,43,0.35)]'
                  : 'btn-primary'
                }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
