import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { X, Crown, Shield, Check } from 'lucide-react'

interface ProfileSlideOverProps {
  isOpen: boolean
  onClose: () => void
}

const PREMIUM_FEATURES = [
  { text: 'Безлимитные запросы к ИИ-астрологу' },
  { text: 'Приоритетная обработка карт' },
  { text: 'Эксклюзивные интерпретации' },
]

export function ProfileSlideOver({ isOpen, onClose }: ProfileSlideOverProps) {
  const { user } = useAuth()

  const isPremium = user?.subscription_type === 'premium'
  const isAdmin   = user?.is_admin

  const initials = user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 transition-all duration-400',
          isOpen
            ? 'bg-black/60 backdrop-blur-sm opacity-100'
            : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-full max-w-[420px]',
          'slide-over',
          isOpen && 'open'
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-[rgba(212,175,55,0.08)] shrink-0">
            <h2 className="font-serif text-2xl font-semibold text-[#F0EAD6]">
              Профиль
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8B7FA8] hover:text-[#F0EAD6] hover:bg-[rgba(212,175,55,0.08)] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 px-6 py-6 space-y-5">

            {/* ── User card ── */}
            <div className="luxury-card p-5">
              <div className="flex items-center gap-4 mb-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#7B2FBE] flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.25)]">
                    <span className="text-2xl font-bold text-[#0A0612] font-serif">
                      {initials}
                    </span>
                  </div>
                  {(isPremium || isAdmin) && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8960F] flex items-center justify-center shadow-[0_0_8px_rgba(212,175,55,0.5)]">
                      <Crown className="w-3 h-3 text-[#0A0612]" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#F0EAD6] truncate text-base leading-tight">
                    {user?.email}
                  </p>
                  <div className="mt-1.5">
                    {isAdmin ? (
                      <span className="badge-gold">Admin</span>
                    ) : isPremium ? (
                      <span className="badge-gold">Premium</span>
                    ) : (
                      <span className="badge-free">Free</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="gold-divider mb-4" />

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8B7FA8]">Дата регистрации</span>
                  <span className="text-[#F0EAD6] font-medium">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                </div>

                {user?.subscription_end && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8B7FA8]">Premium до</span>
                    <span className="text-[#D4AF37] font-medium">
                      {new Date(user.subscription_end).toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8B7FA8]">Подписка</span>
                  <span className={cn(
                    'font-medium',
                    isPremium || isAdmin ? 'text-[#D4AF37]' : 'text-[#8B7FA8]'
                  )}>
                    {isAdmin ? 'Admin' : isPremium ? 'Premium' : 'Free'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Upgrade card (non-premium) ── */}
            {!isPremium && !isAdmin && (
              <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.25)]"
                style={{
                  background: 'linear-gradient(145deg, rgba(28, 18, 6, 0.95) 0%, rgba(20, 12, 4, 0.98) 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.08), inset 0 1px 0 rgba(212,175,55,0.15)',
                }}
              >
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[rgba(212,175,55,0.04)] blur-3xl pointer-events-none" />

                <div className="relative p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
                      <Crown className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">
                        Перейдите на Premium
                      </h3>
                      <p className="text-xs text-[#8B7FA8]">Разблокируйте все возможности</p>
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-5">
                    {PREMIUM_FEATURES.map(({ text }) => (
                      <li key={text} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[rgba(212,175,55,0.12)] flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-[#D4AF37]" />
                        </div>
                        <span className="text-sm text-[#D4CCBD]">{text}</span>
                      </li>
                    ))}
                  </ul>

                  <button className="btn-gold w-full h-11 text-sm flex items-center justify-center gap-2">
                    <Crown className="w-4 h-4" />
                    Обновить до Premium
                  </button>
                </div>
              </div>
            )}

            {/* ── Premium active badge ── */}
            {(isPremium || isAdmin) && (
              <div className="luxury-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
                    <Crown className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#F0EAD6] text-sm">
                      {isAdmin ? 'Полный доступ' : 'Premium активен'}
                    </h3>
                    <p className="text-xs text-[#8B7FA8]">Все функции разблокированы</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {PREMIUM_FEATURES.map(({ text }) => (
                    <div key={text} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[rgba(212,175,55,0.12)] flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-[#D4AF37]" />
                      </div>
                      <span className="text-xs text-[#8B7FA8]">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Admin section ── */}
            {isAdmin && (
              <div className="luxury-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(123,47,190,0.15)] border border-[rgba(123,47,190,0.25)] flex items-center justify-center">
                    <Shield className="w-4.5 h-4.5 text-[#9D50E0]" style={{ width: 18, height: 18 }} />
                  </div>
                  <h3 className="font-semibold text-[#F0EAD6] text-sm">Управление</h3>
                </div>

                <button className="w-full h-10 rounded-xl bg-[rgba(123,47,190,0.1)] border border-[rgba(123,47,190,0.2)] text-[#9D50E0] text-sm font-medium hover:bg-[rgba(123,47,190,0.18)] transition-colors">
                  Создать инвайт-код
                </button>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-6 pb-6 pt-2 border-t border-[rgba(212,175,55,0.06)] shrink-0">
            <p className="text-xs text-center text-[#2E2548]">
              Orbitron · ИИ-астрология нового поколения
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
