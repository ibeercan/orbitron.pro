import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { X, Crown, Sparkles } from 'lucide-react'

interface ProfileSlideOverProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileSlideOver({ isOpen, onClose }: ProfileSlideOverProps) {
  const { user } = useAuth()

  return (
    <>
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className={cn(
        "fixed top-0 right-0 bottom-0 z-50 w-full max-w-md",
        "floating-card-static rounded-none border-r-0 border-y-0",
        "transform transition-transform duration-300 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6 overflow-y-auto pb-24">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-white">Профиль</h2>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* User Info Card */}
          <div className="floating-card p-5 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="font-medium text-white text-lg">{user?.email}</p>
                <p className={cn(
                  "text-sm font-medium flex items-center gap-1",
                  user?.subscription_type === 'premium' ? "text-secondary-400" : "text-gray-500"
                )}>
                  {user?.subscription_type === 'premium' ? (
                    <>
                      <Crown className="h-4 w-4" />
                      Premium
                    </>
                  ) : (
                    'Free'
                  )}
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Дата регистрации</span>
                <span className="text-white">
                  {user?.created_at 
                    ? new Date(user.created_at).toLocaleDateString('ru-RU')
                    : '-'}
                </span>
              </div>
              {user?.subscription_end && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Premium до</span>
                  <span className="text-secondary-400">
                    {new Date(user.subscription_end).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Info */}
          {user?.subscription_type !== 'premium' && (
            <div className="floating-card p-5 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-secondary-400" />
                <h3 className="font-semibold text-white">Перейдите на Premium</h3>
              </div>
              <ul className="text-sm text-gray-400 space-y-2 mb-4">
                <li className="flex items-center gap-2">
                  <span className="text-secondary-400">✓</span>
                  Безлимитные запросы к AI астрологу
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-secondary-400">✓</span>
                  Доступ ко всем функциям
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-secondary-400">✓</span>
                  Приоритетная поддержка
                </li>
              </ul>
              <button className="w-full py-3 rounded-xl bg-secondary-400 font-medium text-gray-900 hover:bg-secondary-300 transition-colors">
                Обновить до Premium
              </button>
            </div>
          )}

          {/* Admin Section */}
          {user?.is_admin && (
            <div className="floating-card p-5">
              <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary-400" />
                Управление инвайтами
              </h3>
              <button className="w-full py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors font-medium">
                Создать инвайт
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}