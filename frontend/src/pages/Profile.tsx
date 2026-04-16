import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

export default function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-white/5 p-4">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400" />
          <div>
            <p className="font-medium text-white">{user?.email}</p>
            <p className="text-xs text-gray-500">
              {user?.subscription_type === 'premium' ? 'Premium' : 'Free'}
            </p>
          </div>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full rounded-md px-4 py-2 text-left text-gray-400 hover:bg-white/5 hover:text-white"
          >
            Мои карты
          </button>
          <button className="w-full rounded-md bg-white/10 px-4 py-2 text-left text-white">
            Профиль
          </button>
        </nav>

        <button
          onClick={handleLogout}
          className="mt-6 w-full rounded-md border border-white/20 px-4 py-2 text-gray-400 hover:border-red-500/50 hover:text-red-500"
        >
          Выйти
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-semibold text-white mb-8">Профиль</h1>

          {/* User Info */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6 mb-6">
            <h2 className="text-lg font-medium text-white mb-4">Информация</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-400">Email</span>
                <span className="text-white">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Статус</span>
                <span
                  className={cn(
                    'font-medium',
                    user?.subscription_type === 'premium' ? 'text-secondary-400' : 'text-gray-400'
                  )}
                >
                  {user?.subscription_type === 'premium' ? 'Premium' : 'Free'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Дата регистрации</span>
                <span className="text-white">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString('ru-RU')
                    : '-'}
                </span>
              </div>
              {user?.subscription_end && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Premium до</span>
                  <span className="text-secondary-400">
                    {new Date(user.subscription_end).toLocaleDateString('ru-RU')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Subscription */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-6">
            <h2 className="text-lg font-medium text-white mb-4">Подписка</h2>
            {user?.subscription_type === 'premium' ? (
              <div className="text-center py-4">
                <p className="text-secondary-400 font-medium mb-2">Активна</p>
                <p className="text-sm text-gray-400">
                  До {user.subscription_end ? new Date(user.subscription_end).toLocaleDateString('ru-RU') : '-'}
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 mb-4">Перейдите на Premium для:</p>
                <ul className="text-sm text-gray-500 space-y-2 mb-4">
                  <li>• Безлимитные запросы к AI астрологу</li>
                  <li>• Доступ ко всем функциям</li>
                  <li>• Приоритетная поддержка</li>
                </ul>
                <button className="rounded-md bg-secondary-400 px-6 py-2 font-medium text-gray-900 hover:bg-secondary-300">
                  Обновить до Premium
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}