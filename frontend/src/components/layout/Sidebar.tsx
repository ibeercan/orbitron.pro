import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Sparkles,
  User 
} from 'lucide-react'

interface SidebarProps {
  onProfileClick?: () => void
}

export function Sidebar({ onProfileClick }: SidebarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col p-4 h-screen">
        <div className={cn(
          "floating-card-static flex flex-col h-full p-4",
          "justify-between"
        )}>
          <div>
            {/* User Info */}
            <div className="flex items-center gap-3 mb-8 p-3 rounded-xl bg-white/5">
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">{user?.email}</p>
                <p className="text-xs text-gray-500">
                  {user?.is_admin ? 'Admin' : user?.subscription_type === 'premium' ? 'Premium' : 'Free'}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary-400/10 text-secondary-400">
                <LayoutDashboard className="h-5 w-5" />
                <span className="font-medium">Мои карты</span>
              </button>
              <button 
                onClick={onProfileClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
              >
                <Settings className="h-5 w-5" />
                <span className="font-medium">Профиль</span>
              </button>
            </nav>
          </div>

          <div className="space-y-2">
            {user?.is_admin && (
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
                <Sparkles className="h-5 w-5" />
                <span className="font-medium">Инвайты</span>
              </button>
            )}
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Выйти</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="floating-card-static rounded-t-2xl px-4 py-3 flex justify-around items-center">
          <button className="flex flex-col items-center gap-1 p-2 text-secondary-400">
            <LayoutDashboard className="h-6 w-6" />
            <span className="text-xs">Карты</span>
          </button>
          <button 
            onClick={onProfileClick}
            className="flex flex-col items-center gap-1 p-2 text-gray-400"
          >
            <Settings className="h-6 w-6" />
            <span className="text-xs">Профиль</span>
          </button>
          <button 
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 p-2 text-gray-400"
          >
            <LogOut className="h-6 w-6" />
            <span className="text-xs">Выйти</span>
          </button>
        </div>
      </nav>
    </>
  )
}