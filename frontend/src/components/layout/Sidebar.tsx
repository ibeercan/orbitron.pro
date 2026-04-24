import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import {
  LogOut,
  User,
  Plus,
  Crown,
  Sparkles,
  LayoutDashboard,
  Settings,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  Star,
  Heart,
  Clock,
  Sun,
  Moon,
  Target,
} from 'lucide-react'

const CHART_TYPE_LABELS: Record<string, string> = {
  natal: 'Натальная',
  synastry: 'Синастрия',
  transit: 'Транзиты',
  solar_return: 'Соляр',
  lunar_return: 'Лунар',
  profection: 'Профекция',
}

const CHART_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  natal: Star,
  synastry: Heart,
  transit: Clock,
  solar_return: Sun,
  lunar_return: Moon,
  profection: Target,
}

/* ── Chart type ── */
interface Chart {
  id: number
  name?: string | null
  chart_type?: string
  parent_chart_id?: number | null
  person_id?: number | null
  native_data: { datetime: string; location: string; [key: string]: unknown }
  result_data: Record<string, unknown>
  svg_path?: string | null
  svg_data?: string | null
  prompt_text?: string | null
  created_at: string
}

interface SidebarProps {
  onProfileClick?: () => void
  onCreateChart?: () => void
  charts?: Chart[]
  selectedChart?: Chart | null
  onSelectChart?: (chart: Chart) => void
  onDeleteChart?: (chart: Chart) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  onAstrologerMode?: () => void
  activeMobileTab?: 'charts' | 'profile'
  onMobileTabChange?: (tab: 'charts' | 'profile') => void
}

/* ── Animated mini logo ── */
function SidebarLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <svg
      width={collapsed ? 28 : 32}
      height={collapsed ? 28 : 32}
      viewBox="0 0 100 100"
      fill="none"
      className="shrink-0"
    >
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
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke="url(#sbOrbitGold)" strokeWidth="1.5">
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
    day: 'numeric', month: 'long', year: 'numeric',
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
  onDeleteChart,
  collapsed = false,
  onToggleCollapse,
  onAstrologerMode,
  activeMobileTab = 'charts',
  onMobileTabChange,
}: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const isPremium = user?.subscription_type === 'premium' || user?.is_admin
  const subscriptionLabel = user?.is_admin ? 'Admin' : isPremium ? 'Premium' : 'Free'

  return (
    <>
      {/* ════════════════════════════════════════
          DESKTOP SIDEBAR
          ════════════════════════════════════════ */}
      <aside
        className={cn(
          'hidden md:flex flex-col h-screen luxury-panel transition-all duration-300 ease-luxury shrink-0',
          collapsed ? 'w-[60px]' : 'w-[260px] xl:w-[280px]'
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">

          {/* ── Logo header ── */}
          <div className={cn(
            'flex items-center border-b border-[rgba(212,175,55,0.08)] shrink-0 transition-all duration-300',
            collapsed ? 'px-3 py-5 justify-center' : 'px-5 pt-6 pb-5 gap-3'
          )}>
            <SidebarLogo collapsed={collapsed} />
            {!collapsed && (
              <div className="flex-1 min-w-0 animate-fade-in-fast">
                <span className="font-serif text-xl font-semibold gold-gradient-text leading-none tracking-wide block">
                  Orbitron
                </span>
                <p className="text-[10px] text-[#4A3F6A] uppercase tracking-[0.18em] mt-0.5 font-medium">
                  ИИ Астролог
                </p>
              </div>
            )}
            {/* Action buttons — shown only in expanded mode */}
            {!collapsed && (
              <div className="ml-auto flex items-center gap-1">
                {selectedChart && (
                  <button
                    onClick={onAstrologerMode}
                    title="Режим астролога"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#4A3F6A] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-all"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={onToggleCollapse}
                  title="Свернуть панель"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[#4A3F6A] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-all"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* ── User block ── */}
          <div className={cn(
            'border-b border-[rgba(212,175,55,0.06)] shrink-0 transition-all duration-300',
            collapsed ? 'px-2 py-3 flex justify-center' : 'px-4 py-4'
          )}>
            {collapsed ? (
              /* Collapsed: just the avatar */
              <div
                title={user?.email}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#7B2FBE] flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.2)] cursor-default"
              >
                <span className="text-sm font-semibold text-[#0A0612] uppercase">
                  {user?.email?.[0] || 'U'}
                </span>
              </div>
            ) : (
              /* Expanded: full user card */
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
            )}
          </div>

          {/* ── Charts section ── */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {collapsed ? (
              /* Collapsed: icon-only list */
              <div className="flex-1 overflow-y-auto py-3 flex flex-col items-center gap-1.5 px-1.5">
                {/* New chart button */}
                <button
                  onClick={onCreateChart}
                  title="Новая карта"
                  className="w-9 h-9 rounded-xl btn-gold flex items-center justify-center shadow-[0_2px_8px_rgba(212,175,55,0.3)] mb-1"
                >
                  <Plus className="w-4 h-4" />
                </button>

                {charts.map((chart) => {
                  const isActive = selectedChart?.id === chart.id
                  const typeKey = chart.chart_type || 'natal'
                  const Icon = CHART_TYPE_ICONS[typeKey] || Star
                  const typeLabel = CHART_TYPE_LABELS[typeKey] || 'Натальная'
                  const collapsedTitle = chart.name
                    ? `${chart.name} · ${typeLabel}`
                    : `${typeLabel} · ${formatChartDate(chart.native_data.datetime)}`
                  return (
                    <button
                      key={chart.id}
                      onClick={() => onSelectChart?.(chart)}
                      title={collapsedTitle}
                      className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                        isActive
                          ? 'bg-[rgba(212,175,55,0.18)] border border-[rgba(212,175,55,0.4)]'
                          : 'bg-[rgba(212,175,55,0.04)] border border-transparent hover:border-[rgba(212,175,55,0.2)]'
                      )}
                    >
                      <Icon className={cn('w-4 h-4', isActive ? 'text-[#D4AF37]' : 'text-[#4A3F6A]')} />
                    </button>
                  )
                })}
              </div>
            ) : (
              /* Expanded: full list */
              <>
                <div className="flex items-center justify-between px-4 pt-4 pb-2 shrink-0">
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

                <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
                  {charts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 px-2 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.1)] flex items-center justify-center mb-3">
                        <Sparkles className="w-5 h-5 text-[#4A3F6A]" />
                      </div>
                      <p className="text-xs text-[#4A3F6A] leading-relaxed">
                        Пока нет карт
                      </p>
                    </div>
                  ) : (
                    charts.map((chart) => {
                      const isActive = selectedChart?.id === chart.id
                      const typeKey = chart.chart_type || 'natal'
                      const Icon = CHART_TYPE_ICONS[typeKey] || Star
                      const typeLabel = CHART_TYPE_LABELS[typeKey] || 'Натальная'
                      const displayName = chart.name || typeLabel
                      return (
                        <div
                          key={chart.id}
                          className={cn(
                            'group relative rounded-xl transition-all duration-200',
                            isActive ? 'chart-item-active' : 'chart-item'
                          )}
                        >
                          <button
                            onClick={() => onSelectChart?.(chart)}
                            className="w-full text-left p-3 pr-8"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className={cn(
                                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                                isActive ? 'bg-[rgba(212,175,55,0.2)]' : 'bg-[rgba(212,175,55,0.07)]'
                              )}>
                                <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-[#D4AF37]' : 'text-[#4A3F6A]')} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn('text-xs font-semibold leading-tight truncate', isActive ? 'text-[#D4AF37]' : 'text-[#F0EAD6]')}>
                                  {displayName}
                                </p>
                                <p className="text-[11px] text-[#8B7FA8] truncate mt-0.5">
                                  {chart.name ? `${typeLabel} · ` : ''}{formatChartDate(chart.native_data.datetime)} · {formatLocation(chart.native_data.location)}
                                </p>
                              </div>
                              {isActive && (
                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 shrink-0 shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                              )}
                            </div>
                          </button>

                          {/* Delete button — appears on hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteChart?.(chart)
                            }}
                            title="Удалить карту"
                            className={cn(
                              'absolute right-2 top-1/2 -translate-y-1/2',
                              'w-6 h-6 rounded-lg flex items-center justify-center',
                              'text-[#4A3F6A] hover:text-red-400 hover:bg-red-400/10',
                              'opacity-0 group-hover:opacity-100 transition-all duration-150'
                            )}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Bottom navigation ── */}
          <div className={cn(
            'border-t border-[rgba(212,175,55,0.06)] shrink-0 transition-all duration-300',
            collapsed ? 'px-1.5 py-3 flex flex-col items-center gap-1' : 'px-3 pb-5 pt-3 space-y-1'
          )}>
            {collapsed ? (
              /* Collapsed: icon buttons */
              <>
                {/* Expand toggle */}
                <button
                  onClick={onToggleCollapse}
                  title="Развернуть панель"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#4A3F6A] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-all"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={onProfileClick}
                  title="Профиль"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#4A3F6A] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-all"
                >
                  <Settings className="w-4 h-4" />
                </button>
                {user?.is_admin && (
                  <button
                    onClick={() => navigate('/admin')}
                    title="Управление"
                    className={cn(
                      'w-9 h-9 rounded-xl flex items-center justify-center transition-all',
                      location.pathname === '/admin' ? 'text-[#9D50E0] bg-[rgba(123,47,190,0.1)]' : 'text-[#4A3F6A] hover:text-[#9D50E0] hover:bg-[rgba(123,47,190,0.08)]'
                    )}
                  >
                    <Crown className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  title="Выйти"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[#4A3F6A] hover:text-red-400 hover:bg-red-400/10 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              /* Expanded: full nav items */
              <>
                <button onClick={onProfileClick} className="nav-item">
                  <Settings className="w-4 h-4" />
                  <span>Профиль</span>
                </button>
                {user?.is_admin && (
                  <button onClick={() => navigate('/admin')} className={cn('nav-item', location.pathname === '/admin' && 'nav-item-active')}>
                    <Crown className="w-4 h-4" />
                    <span>Управление</span>
                  </button>
                )}
                <button onClick={handleLogout} className="nav-item nav-item-danger">
                  <LogOut className="w-4 h-4" />
                  <span>Выйти</span>
                </button>
              </>
            )}
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
              activeMobileTab === 'charts' ? 'text-[#D4AF37]' : 'text-[#4A3F6A]'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
              activeMobileTab === 'charts' ? 'bg-[rgba(212,175,55,0.12)]' : 'bg-transparent'
            )}>
              <LayoutDashboard style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wide">Карты</span>
          </button>

          <button
            onClick={onCreateChart}
            className="flex flex-col items-center gap-1 px-4 py-1.5"
          >
            <div className="w-10 h-10 rounded-2xl btn-gold flex items-center justify-center shadow-[0_4px_16px_rgba(212,175,55,0.35)]">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium text-[#D4AF37] uppercase tracking-wide">Новая</span>
          </button>

          <button
            onClick={() => {
              onMobileTabChange?.('profile')
              onProfileClick?.()
            }}
            className={cn(
              'flex flex-col items-center gap-1 px-5 py-1.5 rounded-xl transition-all',
              activeMobileTab === 'profile' ? 'text-[#D4AF37]' : 'text-[#4A3F6A]'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all',
              activeMobileTab === 'profile' ? 'bg-[rgba(212,175,55,0.12)]' : 'bg-transparent'
            )}>
              <User style={{ width: 18, height: 18 }} />
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wide">Профиль</span>
          </button>
        </div>
      </nav>
    </>
  )
}
