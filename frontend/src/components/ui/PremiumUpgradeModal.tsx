import { Crown, Check } from 'lucide-react'
import { ModalShell } from '@/components/ui/ModalShell'

const FEATURES = [
  'Безлимитные запросы к ИИ-астрологу',
  'Все типы карт: синастрия, композит, давидсон',
  'Транзиты на любую дату + таймлайн',
  'Соляр, лунар, профекции, дирекции, прогрессии',
  'Хорар, электив, ректификация',
  'Отчёт совместимости и PDF-отчёты',
]

export function PremiumUpgradeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      icon={<Crown className="w-5 h-5 text-[#D4AF37]" />}
      title="Перейдите на Premium"
      description="Разблокируйте все возможности"
    >
      <div className="space-y-5">
        <ul className="space-y-2.5">
          {FEATURES.map((text) => (
            <li key={text} className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-[rgba(212,175,55,0.12)] flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-[#D4AF37]" />
              </div>
              <span className="text-sm text-[#F0EAD6]">{text}</span>
            </li>
          ))}
        </ul>

        <button className="btn-gold w-full h-11 text-sm flex items-center justify-center gap-2">
          <Crown className="w-4 h-4" />
          Обновить до Premium
        </button>
      </div>
    </ModalShell>
  )
}