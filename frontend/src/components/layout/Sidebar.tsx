import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import {
  LogOut,
  User,
  Plus,
  MapPin,
  Crown,
  Sparkles,
  LayoutDashboard,
  Settings,
} from 'lucide-react'

/* ── Chart type (mirrored from Dashboard) ── */
interface Chart {
  id: number
  native_data: { datetime: string; location: string }
  result_data: Record<string, unknown>
  svg_path: string
  prompt_text: string
  created_at: string
}

interface SidebarProps {
  onProfileClick?: () => void
  onCreateChart?: () => void
  charts?: Chart[]
  selectedChart?: Chart | null
  onSelectChart?: (chart: Chart) => void
  activeMobileTab?: 'charts' | 'profile'
  onMobileTabChange?: (tab: 'charts' | 'profile') => void
}

/* ── Mini Orbitron logo ── */
function SidebarLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="sbCoreGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0C842" />
          <stop offset="100%" stopColor="#B8960F" />
        </linearGradient>
        <linearGradient id="sbOrbitGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.2" />
        </linearGradient>
        <filter id="sbGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <ellipse cx="50" cy="50" rx="38" ry="14" fill="none"
        stroke="url(#sbOrbitGold)" strokeWidth="1.5">
        <animateTransform attributeName="transform" type="rotate"
          from="0 50 50" to="360 50 50" dur="30s" additive="sum" repeatCount="indefinite" />
      </ellipse>
      <circle cx="88" cy="50" r="4" fill="#D4AF37" filter="url(#sbGlow)">
        <animateTransform attributeName="transform" type="rotate"
          from="0 50 50" to="360 50 50" dur="30s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="50" r="10" fill="url(#sbCoreGold)" filter="url(#sbGlow)">
        <animate attributeName="r" values="9;11;9" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="50" r="5.5" fill="#FFF8DC" opacity="0.5" />
    </svg>
  )
}

function formatChartDate(datetime: string) {
  return new Date(datetime).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatShortDate(datetime: string) {
  return new Date(datetime).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: '2-digit',
  })
}

function formatLocation(location: string) {
  return location.split(',')[0].trim()
}

export function Sidebar({
  onProfileClick,
  onCreateChart,
  charts = [],
  selectedChart,
  onSelectChart,
  activeMobileTab = 'charts',
  onMobileTabChange,
}: SidebarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const subscriptionLabel = user?.is_admin
    ? 'Admin'
    : user?.subscription_type === 'premium'
    ? 'Premium'
    : 'Free'

  const isPremium = user?.subscription_type === 'premium' || user?.is_admin

  return (
    <>
      {/* ════════════════════════════════════════
          DESKTOP SIDEBAR
          ════════════════════════════════════════ */}
      <aside className="hidden md:flex w-[260px] xl:w-[280px] shrink-0 flex-col h-screen luxury-panel">
        <div className="flex flex-col h-full">

          {/* ── Logo header ── */}
          <div className="px-5 pt-6 pb-5 border-b border-[rgba(212,175,55,0.08)]">
            <div className="flex items-center gap-3">
              <SidebarLogo />
              <div>
                <span className="font-serif text-xl font-semibold gold-gradient-text leading-none tracking-wide">
                  Orbitron
                </span>
                <p className="text-[10px] text-[#4A3F6A] uppercase tracking-[0.18em] mt-0.5 font-medium">
                  ИИ Астролог
                </p>
              </div>
            </div>
          </div>

          {/* ── User block ── */}
          <div className="px-4 py-4 border-b border-[rgba(212,175,55,0.06)]">
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.08)]">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#7B2FBE] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(212,175,55,0.2)]">
                <span className="text-sm font-semibold text-[#0A0612] uppercase">
                  {user?.email?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#F0EAD6] truncate leading-tight">
                  {user?.email}
                </p>
                <div className="mt-0.5">
                  {isPremium ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#D4AF37] uppercase tracking-wide">
                      <Crown className="w-2.5 h-2.5" />
                      {subscriptionLabel}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-[#8B7FA8] uppercase tracking-wide">
                      {subscriptionLabel}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Charts section ── */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-[10px] font-semibold text-[#4A3F6A] uppercase tracking-[0.16em]">
                Мои карты
              </span>
              <button
                onClick={onCreateChart}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#0A0612] bg-gradient-to-r from-[#D4AF37] to-[#C19B25] hover:from-[#E8C43A] hover:to-[#D4AF37] transition-all shadow-[0_2px_8px_rgba(212,175,55,0.3)] active:scale-95"
              >
                <Plus className="w-3 h-3" />
                Новая
              </button>
            </div>

            {/* Charts list */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
              {charts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-2 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.1)] flex items-center justify-center mb-3">
                    <Sparkles className="w-5 h-5 text-[#4A3F6A]" />
                  </div>
                  <p className="text-xs text-[#4A3F6A] leading-relaxed">
                    Нет натальных карт.
                    <br />
                    Создайте первую карту.
                  </p>
                  <button
                    onClick={onCreateChart}
                    className="mt-3 text-xs text-[#D4AF37] hover:text-[#F0C842] font-medium transition-colors"
                  >
                    + Создать карту
                  </button>
                </div>
              ) : (
                charts.map((chart) => {
                  const isActive = selectedChart?.id === chart.id
                  return (
                    <button
                      key={chart.id}
                      onClick={() => onSelectChart?.(chart)}
                      className={cn(
                        'w-full text-left transition-all duration-200 rounded-xl p-3',
                        isActive ? 'chart-item-active' : 'chart-item'
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={cn(
                            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                            isActive
                              ? 'bg-[rgba(212,175,55,0.2)]'
                              : 'bg-[rgba(212,175,55,0.07)]'
                          )}
                        >
                          <Sparkles
                            className={cn(
                              'w-3.5 h-3.5',
                              isActive ? 'text-[#D4AF37]' : 'text-[#4A3F6A]'
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              'text-xs font-semibold leading-tight truncate',
                              isActive ? 'text-[#D4AF37]' : 'text-[#F0EAD6]'
                            )}
                          >
                            {formatChartDate(chart.native_data.datetime)}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-[#4A3F6A] shrink-0" />
                            <span className="text-[11px] text-[#8B7FA8] truncate">
                              {formatLocation(chart.native_data.location)}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#4A3F6A] mt-0.5">
                            {formatShortDate(chart.created_at)}
                          </p>
                        </div>
                        {isActive && (
                          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0 shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* ── Bottom navigation ── */}
          <div className="px-3 pb-5 pt-3 border-t border-[rgba(212,175,55,0.06)] space-y-1">
            <button onClick={onProfileClick} className="nav-item">
              <Settings className="w-4 h-4" />
              <span>Профиль</span>
            </button>

            {user?.is_admin && (
              <button className="nav-item">
                <Crown className="w-4 h-4" />
                <span>Управление</span>
              </button>
            )}

            <button onClick={handleLogout} className="nav-item nav-item-danger">
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          MOBILE BOTTOM NAV
          ════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bottom-nav">
        <div className="flex items-center justify-around">
          <button
            onClick={() => onMobileTabChange?.('charts')}
            className={cn(
              'flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl transition-all',
              activeMobileTab === 'charts'
                ? 'text-[#D4AF37]'
                : 'text-[#4A3F6A]'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
              activeMobileTab === 'charts' ? 'bg-[rgba(212,175,55,0.12)]' : 'bg-transparent'
            )}>
              <LayoutDashboard className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wide">Карты</span>
          </button>

          <button
            onClick={onCreateChart}
            className="flex flex-col items-center gap-1 px-4 py-1"
          >
            <div className="w-10 h-10 rounded-2xl btn-gold flex items-center justify-center shadow-[0_4px_16px_rgba(212,175,55,0.35)]">
              <Plus className="w-5 h-5" />
            </div>
          </button>

          <button
            onClick={() => {
              onMobileTabChange?.('profile')
              onProfileClick?.()
            }}
            className={cn(
              'flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl transition-all',
              activeMobileTab === 'profile'
                ? 'text-[#D4AF37]'
                : 'text-[#4A3F6A]'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
              activeMobileTab === 'profile' ? 'bg-[rgba(212,175,55,0.12)]' : 'bg-transparent'
            )}>
              <User className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wide">Профиль</span>
          </button>
        </div>
      </nav>
    </>
  )
}
