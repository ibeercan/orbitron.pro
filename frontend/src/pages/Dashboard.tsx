import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { chartsApi, chatApi } from '@/lib/api/client'
import { AppLayout } from '@/components/layout/AppLayout'
import { Sidebar } from '@/components/layout/Sidebar'
import { ProfileSlideOver } from '@/components/layout/ProfileSlideOver'
import { AssistantChat } from '@/components/chat/AssistantChat'
import { CreateChartModal } from '@/components/ui/CreateChartModal'
import { ModalShell } from '@/components/ui/ModalShell'
import { TransitForm } from '@/components/ui/TransitForm'
import { SynastryForm } from '@/components/ui/SynastryForm'
import { SolarReturnForm } from '@/components/ui/SolarReturnForm'
import { LunarReturnForm } from '@/components/ui/LunarReturnForm'
import { ProfectionForm } from '@/components/ui/ProfectionForm'
import { RectificationForm } from '@/components/ui/RectificationForm'
import { SolarArcForm } from '@/components/ui/SolarArcForm'
import { ProgressionForm } from '@/components/ui/ProgressionForm'
import { CompositeForm } from '@/components/ui/CompositeForm'
import { HoraryForm } from '@/components/ui/HoraryForm'
import { ElectionalForm } from '@/components/ui/ElectionalForm'
import { TransitTimeline } from '@/components/ui/TransitTimeline'
import { AstroTwinsPanel } from '@/components/ui/AstroTwinsPanel'
import { OnboardingTour } from '@/components/ui/OnboardingTour'
import { Loader2, Calendar, MapPin, Sparkles, Star, Trash2, AlertTriangle, Maximize2, Heart, Clock, Sun, Moon, Target, FileText, Lock, Crown, ArrowLeft, Crosshair, Navigation, Zap, Merge, Compass, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'

const ZODIAC_SIGNS = ['Овен','Телец','Близнецы','Рак','Лев','Дева','Весы','Скорпион','Стрелец','Козерог','Водолей','Рыбы']

const CHART_TYPE_LABELS: Record<string, string> = {
  natal: 'Натальная карта',
  synastry: 'Синастрия',
  transit: 'Транзиты',
  solar_return: 'Солярный возврат',
  lunar_return: 'Лунарный возврат',
  profection: 'Профекция',
  solar_arc: 'Солярные дуги',
  progression: 'Вторичные прогрессии',
  composite: 'Композит',
  davison: 'Давидсон',
  horary: 'Хорарная карта',
  electional: 'Элективная карта',
}

function ChartActionButton({ icon: Icon, label, premium, onClick }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  premium?: boolean
  onClick: () => void
}) {
  const { user } = useAuth()
  const locked = premium && !user?.is_subscription_active && !user?.is_admin

  return (
    <button
      onClick={locked ? () => alert('Доступно на Premium') : onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
        locked
          ? 'text-[#4A3F6A] hover:text-[#8B7FA8] cursor-not-allowed'
          : 'text-[#8B7FA8] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)]'
      )}
    >
      {locked ? <Lock className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
      {label}
    </button>
  )
}

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

/* ── Confirm delete dialog ── */
function DeleteConfirmDialog({
  chart,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  chart: Chart
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  const date = new Date(chart.native_data.datetime).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
  const location = chart.native_data.location.split(',')[0].trim()

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm" onClick={onCancel} />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-sm px-4">
        <div className="luxury-card p-6 animate-scale-in">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">Удалить карту?</h3>
              <p className="text-xs text-[#8B7FA8] mt-0.5">Действие необратимо</p>
            </div>
          </div>

          <div className="px-3.5 py-2.5 rounded-lg bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.12)] mb-5">
            <p className="text-sm font-medium text-[#F0EAD6]">{date}</p>
            <p className="text-xs text-[#8B7FA8] mt-0.5">{location}</p>
          </div>

          <p className="text-sm text-[#8B7FA8] mb-5 leading-relaxed">
            Карта и вся история чата с ИИ-астрологом будут удалены безвозвратно.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="btn-ghost flex-1 h-10 text-sm font-medium"
            >
              Отмена
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 h-10 rounded-xl bg-red-500/15 border border-red-500/25 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Удалить
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/* ── Empty state ── */
function EmptyChartState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
      <div className="relative w-28 h-28 mb-6 animate-float">
        <svg viewBox="0 0 112 112" fill="none" className="w-full h-full">
          <defs>
            <radialGradient id="ecBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(212,175,55,0.08)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
            <filter id="ecGlow">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx="56" cy="56" r="52" fill="url(#ecBg)" />
          <circle cx="56" cy="56" r="52" stroke="rgba(212,175,55,0.12)" strokeWidth="1" />
          <circle cx="56" cy="56" r="36" stroke="rgba(212,175,55,0.08)" strokeWidth="1" strokeDasharray="3 4" />
          <circle cx="56" cy="56" r="20" stroke="rgba(212,175,55,0.1)" strokeWidth="1" />
          {[[56,8],[96,30],[96,82],[56,104],[16,82],[16,30]].map(([cx,cy],i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="3" fill="#D4AF37" filter="url(#ecGlow)" opacity="0.7" />
              <line x1={56} y1={56} x2={cx} y2={cy} stroke="rgba(212,175,55,0.15)" strokeWidth="0.8" />
            </g>
          ))}
          <circle cx="56" cy="56" r="7" fill="#D4AF37" filter="url(#ecGlow)" opacity="0.9">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="56" cy="56" r="3.5" fill="#FFF8DC" opacity="0.6" />
        </svg>
      </div>
      <h3 className="font-serif text-2xl font-semibold text-[#F0EAD6] mb-2">Выберите карту</h3>
      <p className="text-sm text-[#8B7FA8] leading-relaxed max-w-xs">
        Выберите натальную карту в боковой панели, чтобы её просмотреть и поговорить с ИИ-астрологом
      </p>
    </div>
  )
}

/* ── Chart header info ── */
function ChartHeader({ chart }: { chart: Chart }) {
  const date = new Date(chart.native_data.datetime)
  const birthDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  const birthTime = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  const location = chart.native_data.location.split(',').slice(0, 2).join(', ').trim()
  const typeLabel = CHART_TYPE_LABELS[chart.chart_type || 'natal'] || 'Натальная карта'

  return (
    <div className="flex items-center gap-5 flex-wrap">
      {chart.name && (
        <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.15)] text-[#F0EAD6]">
          {chart.name}
        </span>
      )}
      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] text-[#D4AF37]">
        {typeLabel}
      </span>
      <div className="flex items-center gap-2 text-sm">
        <Calendar className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span className="text-[#F0EAD6] font-medium">{birthDate}</span>
        <span className="text-[#8B7FA8]">{birthTime}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span className="text-[#8B7FA8]">{location}</span>
      </div>
    </div>
  )
}

interface ProfectionMeta {
  profected_house: number
  profected_sign: string
  ruler: string
  ruler_house: number | null
  ruler_position?: { sign: string; sign_degree: number; is_retrograde: boolean } | null
  planets_in_house: string[]
  monthly?: { profected_house: number; profected_sign: string; ruler: string } | null
}

function getProfectionData(chart: Chart, fallback: ProfectionMeta | null): ProfectionMeta | null {
  if (fallback) return fallback
  const rd = chart.result_data as Record<string, unknown>
  if (!rd?.profected_house) return null
  return {
    profected_house: rd.profected_house as number,
    profected_sign: rd.profected_sign as string,
    ruler: rd.ruler as string,
    ruler_house: (rd.ruler_house as number) ?? null,
    ruler_position: rd.ruler_position as ProfectionMeta['ruler_position'],
    planets_in_house: (rd.planets_in_house as string[]) ?? [],
    monthly: rd.monthly as ProfectionMeta['monthly'],
  }
}

/* ── Profection info panel (shown instead of SVG) ── */
function ProfectionInfoPanel({ data }: { data: ProfectionMeta }) {
  const houseLabel = `${data.profected_house} дом`
  const signLabel = ZODIAC_SIGNS[ZODIAC_SIGNS.findIndex((_, i) => {
    const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
    return signs[i] === data.profected_sign
  })] || data.profected_sign

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-8">
      <div className="w-20 h-20 rounded-full bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center mb-5">
        <Target className="w-8 h-8 text-[#D4AF37]" />
      </div>

      <h3 className="font-serif text-xl font-semibold text-[#F0EAD6] mb-1">Профекция</h3>
      <p className="text-sm text-[#8B7FA8] mb-6">Годовой прогноз по домам</p>

      <div className="w-full max-w-sm space-y-3">
        {/* House + Sign */}
        <div className="luxury-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[rgba(212,175,55,0.1)] flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-[#D4AF37]">{data.profected_house}</span>
            </div>
            <div>
              <p className="text-xs text-[#8B7FA8]">Профекционный дом</p>
              <p className="text-sm font-semibold text-[#F0EAD6]">{houseLabel} — {signLabel}</p>
            </div>
          </div>
        </div>

        {/* Ruler */}
        <div className="luxury-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[rgba(212,175,55,0.1)] flex items-center justify-center shrink-0">
              <Crown className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-[#8B7FA8]">Управитель года</p>
              <p className="text-sm font-semibold text-[#F0EAD6]">
                {data.ruler}
                {data.ruler_house != null ? ` · ${data.ruler_house} дом` : ''}
              </p>
              {data.ruler_position && (
                <p className="text-xs text-[#8B7FA8] mt-0.5">
                  {ZODIAC_SIGNS[['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].indexOf(data.ruler_position.sign)] || data.ruler_position.sign} {data.ruler_position.sign_degree.toFixed(1)}°
                  {data.ruler_position.is_retrograde ? ' R' : ''}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Planets in house */}
        {data.planets_in_house.length > 0 && (
          <div className="luxury-card p-4">
            <p className="text-xs text-[#8B7FA8] mb-2">Планеты в профекционном доме</p>
            <div className="flex flex-wrap gap-2">
              {data.planets_in_house.map((p) => (
                <span key={p} className="px-2.5 py-1 rounded-lg bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.15)] text-xs font-medium text-[#D4AF37]">
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Monthly profection */}
        {data.monthly && (
          <div className="luxury-card p-4">
            <p className="text-xs text-[#8B7FA8] mb-2">Месячная профекция</p>
            <p className="text-sm font-semibold text-[#F0EAD6]">
              {data.monthly.profected_house} дом — {ZODIAC_SIGNS[['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'].indexOf(data.monthly.profected_sign)] || data.monthly.profected_sign}
            </p>
            <p className="text-xs text-[#8B7FA8] mt-0.5">
              Управитель: {data.monthly.ruler}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [charts, setCharts] = useState<Chart[]>([])
  const [chartsLoaded, setChartsLoaded] = useState(false)
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [svgLoading, setSvgLoading] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<number | null>(null)
  const handleSessionCreated = useCallback((id: number) => setChatSessionId(id), [])

  /* Sidebar collapsed state */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  /* Delete flow */
  const [chartToDelete, setChartToDelete] = useState<Chart | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  /* Mobile */
  const [mobilePanelTab, setMobilePanelTab] = useState<'chart' | 'chat'>('chart')
  const [activeMobileNav, setActiveMobileNav] = useState<'charts' | 'profile'>('charts')

  /* Astrologer mode — fullscreen chat */
  const [astrologerMode, setAstrologerMode] = useState(false)

  const { user } = useAuth()
  const isPremium = (user?.is_subscription_active ?? false) || (user?.is_admin ?? false)

  const [profectionData, setProfectionData] = useState<ProfectionMeta | null>(null)

  const [activeModal, setActiveModal] = useState<string | null>(null)

  const [showOnboardingTour, setShowOnboardingTour] = useState(false)
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false)

  const closeModal = () => setActiveModal(null)

  const handleOnboardingComplete = () => {
    setShowOnboardingTour(false)
    setShowWelcomeMessage(true)
  }

  const onChartCreatedFromModal = (newChart: Record<string, unknown>) => {
    const chart = newChart as unknown as Chart
    setCharts((prev) => [chart, ...prev])
    selectChart(chart)
    closeModal()
  }

  const onProfectionCreated = (newChart: Record<string, unknown>, meta: Record<string, unknown>) => {
    const chart = newChart as unknown as Chart
    setProfectionData(meta as unknown as ProfectionMeta)
    setCharts((prev) => [chart, ...prev])
    selectChart(chart)
    closeModal()
  }

  const handlePdfDownload = async () => {
    if (!selectedChart) return
    try {
      const res = await chartsApi.generateReport(selectedChart.id)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orbitron_report_${selectedChart.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string }; status?: number } }
      if (e.response?.status === 403) {
        alert('Эта функция доступна только на тарифе Premium')
      } else {
        alert('Не удалось сгенерировать PDF отчёт')
      }
    }
  }

  useEffect(() => {
    loadCharts()
  }, [])

  const loadCharts = async () => {
    try {
      const res = await chartsApi.list()
      setCharts(res.data)
    } catch (err) {
      console.error('Failed to load charts:', err)
    } finally {
      setChartsLoaded(true)
    }
  }

const loadChartSvg = async (chart: Chart) => {
    // If svg_data is already embedded (new charts), decode inline
    if (chart.svg_data) {
      try {
        // atob returns binary string, need TextDecoder for proper UTF-8
        const binaryStr = atob(chart.svg_data)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i)
        }
        const decoder = new TextDecoder('utf-8')
        const svgStr = decoder.decode(bytes)
        setSvgContent(svgStr)
        setSvgLoading(false)
        return
      } catch (e) {
        console.error('Failed to decode SVG:', e)
        // fall through to API call
      }
    }

    // Otherwise fetch from API (legacy charts or stripped list response)
    setSvgLoading(true)
    setSvgContent('')
    try {
      const res = await chartsApi.getSvg(chart.id)
      setSvgContent(res.data.svg)
    } catch (err) {
      console.error('Failed to load chart SVG:', err)
    } finally {
      setSvgLoading(false)
    }
  }

  const selectChart = async (chart: Chart) => {
    if (selectedChart?.id === chart.id) return
    setSearchParams({ chart: String(chart.id) }, { replace: true })
    setSelectedChart(chart)
    setChatSessionId(null)

    if ((chart.chart_type || 'natal') === 'profection') {
      setSvgLoading(false)
      setSvgContent('')
      if (!profectionData) {
        const fromResult = getProfectionData(chart, null)
        setProfectionData(fromResult)
      }
    } else {
      setProfectionData(null)
      setSvgLoading(true)
      setSvgContent('')
      loadChartSvg(chart)
    }

    try {
      const res = await chatApi.listSessions()
      const sessions = res.data.sessions ?? []
      const match = sessions.find((s: { chart_id: number }) => s.chart_id === chart.id)
      if (match) {
        setChatSessionId(match.id)
      }
    } catch {
      // no existing session — will be created on first message
    }
  }

  const handleChartCreated = (newChart: Chart) => {
    setCharts((prev) => [newChart, ...prev])
    selectChart(newChart)
  }

  const backToNatalChart = () => {
    if (!selectedChart?.parent_chart_id) return
    const parent = charts.find((c) => c.id === selectedChart.parent_chart_id)
    if (parent) selectChart(parent)
  }

  useEffect(() => {
    if (chartsLoaded && charts.length === 0) {
      setShowCreateModal(true)
    }
  }, [chartsLoaded, charts.length])

  const initialChartSelected = useRef(false)

  useEffect(() => {
    if (!chartsLoaded || initialChartSelected.current) return
    initialChartSelected.current = true
    const id = searchParams.get('chart')
    if (id) {
      const c = charts.find(c => c.id === Number(id))
      if (c) selectChart(c)
    }
  }, [chartsLoaded])

  useEffect(() => {
    if (user && !user.onboarding_completed && !showOnboardingTour) {
      const timer = setTimeout(() => setShowOnboardingTour(true), 800)
      return () => clearTimeout(timer)
    }
  }, [user?.onboarding_completed])

  /* ── Delete handlers ── */
  const requestDeleteChart = (chart: Chart) => {
    setChartToDelete(chart)
  }

  const confirmDeleteChart = async () => {
    if (!chartToDelete) return
    setIsDeleting(true)
    try {
      await chartsApi.delete(chartToDelete.id)
      setCharts((prev) => prev.filter((c) => c.id !== chartToDelete.id))
      if (selectedChart?.id === chartToDelete.id) {
        setSearchParams({}, { replace: true })
        setSelectedChart(null)
        setSvgContent('')
        setChatSessionId(null)
      }
      setChartToDelete(null)
    } catch (err) {
      console.error('Failed to delete chart:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex h-screen overflow-hidden">

        {/* ── Sidebar ── */}
        <Sidebar
          onProfileClick={() => setShowProfile(true)}
          onCreateChart={() => setShowCreateModal(true)}
          onCreateHorary={() => setActiveModal('horary')}
          onCreateElectional={() => setActiveModal('electional')}
          charts={charts}
          selectedChart={selectedChart}
          onSelectChart={selectChart}
          onDeleteChart={requestDeleteChart}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          onAstrologerMode={() => selectedChart && setAstrologerMode(true)}
          activeMobileTab={activeMobileNav}
          onMobileTabChange={(tab) => {
            setActiveMobileNav(tab)
            if (tab === 'profile') setShowProfile(true)
          }}
          data-onboarding="sidebar"
        />

        {/* ── Main content ── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">

          {/* ═══════════════════════════
              DESKTOP: chart | chat
              ═══════════════════════════ */}
          <div className="hidden md:flex flex-1 gap-0 overflow-hidden">

            {/* Chart panel */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden p-4 pr-2">
              <div className="luxury-card flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(212,175,55,0.08)] shrink-0">
                  <div className="flex items-center gap-3">
                    {selectedChart?.parent_chart_id ? (
                      <button onClick={backToNatalChart} className="flex items-center gap-1.5 text-xs text-[#8B7FA8] hover:text-[#D4AF37] transition-colors shrink-0" title="Назад к натальной карте">
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                    )}
                    <span className="font-serif text-lg font-semibold text-[#F0EAD6]">
                      {selectedChart?.name || CHART_TYPE_LABELS[selectedChart?.chart_type || 'natal'] || 'Натальная карта'}
                    </span>
                  </div>
                  {selectedChart && <ChartHeader chart={selectedChart} />}
                </div>

                {selectedChart && (selectedChart.chart_type || 'natal') === 'natal' && (
                  <div className="flex items-center gap-1.5 px-5 py-2 border-b border-[rgba(212,175,55,0.06)] shrink-0 overflow-x-auto" data-onboarding="actions">
                    <ChartActionButton icon={Heart} label="Синастрия" premium onClick={() => setActiveModal('synastry')} />
                    <ChartActionButton icon={Merge} label="Композит" premium onClick={() => setActiveModal('composite')} />
                    <ChartActionButton icon={Clock} label="Транзиты" onClick={() => setActiveModal('transit')} />
                    <ChartActionButton icon={Sun} label="Соляр" premium onClick={() => setActiveModal('solar_return')} />
                    <ChartActionButton icon={Moon} label="Лунар" premium onClick={() => setActiveModal('lunar_return')} />
                    <ChartActionButton icon={Target} label="Профекция" premium onClick={() => setActiveModal('profection')} />
                    <ChartActionButton icon={Navigation} label="Дирекции" premium onClick={() => setActiveModal('solar_arc')} />
                    <ChartActionButton icon={Zap} label="Прогрессии" premium onClick={() => setActiveModal('progression')} />
                    <ChartActionButton icon={Crosshair} label="Ректификация" premium onClick={() => setActiveModal('rectification')} />
                    <ChartActionButton icon={Compass} label="Хорар" premium onClick={() => setActiveModal('horary')} />
                    <ChartActionButton icon={Search} label="Электив" premium onClick={() => setActiveModal('electional')} />
                    <ChartActionButton icon={FileText} label="PDF" premium onClick={handlePdfDownload} />
                  </div>
                )}

                <div className="flex-1 overflow-auto relative">
                  {!selectedChart ? (
                    <EmptyChartState />
                  ) : (selectedChart.chart_type || 'natal') === 'profection' && getProfectionData(selectedChart, profectionData) ? (
                    <ProfectionInfoPanel data={getProfectionData(selectedChart, profectionData)!} />
                  ) : svgLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" />
                        </div>
                        <div className="absolute inset-0 rounded-full animate-pulse-gold" />
                      </div>
                      <p className="text-sm text-[#8B7FA8]">Строим карту…</p>
                    </div>
                  ) : svgContent ? (
                    <div className="chart-glow-container">
                      <div
                        className="chart-svg-wrapper"
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-[#8B7FA8]">Не удалось загрузить карту</p>
                    </div>
                  )}
                </div>
                {selectedChart && (selectedChart.chart_type || 'natal') === 'transit' && (
                  <div className="shrink-0 max-h-[50vh] flex flex-col overflow-hidden border-t border-[rgba(212,175,55,0.08)]">
                    <TransitTimeline
                      natalChartId={selectedChart.id}
                      parentChartId={selectedChart.parent_chart_id}
                      isPremium={isPremium}
                    />
                  </div>
                )}
                {selectedChart && (selectedChart.chart_type || 'natal') === 'natal' && selectedChart.id && (
                  <div className="shrink-0 max-h-[50vh] flex flex-col overflow-hidden border-t border-[rgba(212,175,55,0.08)]">
                    <AstroTwinsPanel
                      key={selectedChart.id}
                      natalChartId={selectedChart.id}
                      isPremium={isPremium}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Chat panel */}
            <div className="w-[340px] xl:w-[380px] 2xl:w-[420px] shrink-0 flex flex-col overflow-hidden p-4 pl-2" data-onboarding="chat">
              <div className="luxury-card flex flex-col h-full overflow-hidden relative">
                {/* Astrologer mode button */}
                {selectedChart && (
                  <button
                    onClick={() => setAstrologerMode(true)}
                    title="Режим астролога — только чат"
                    className="absolute top-3.5 right-3.5 z-10 w-7 h-7 rounded-lg flex items-center justify-center text-[#4A3F6A] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-all"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <AssistantChat
                  chartId={selectedChart ? String(selectedChart.id) : ''}
                  sessionId={chatSessionId}
                  onSessionCreated={handleSessionCreated}
                  showWelcome={showWelcomeMessage}
                  onWelcomeDismiss={() => setShowWelcomeMessage(false)}
                  chartType={selectedChart?.chart_type || 'natal'}
                />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════
              ASTROLOGER MODE OVERLAY (desktop)
              ═══════════════════════════ */}
          {astrologerMode && selectedChart && (
            <div className="absolute inset-0 z-50 hidden md:flex flex-col">
              {/* Dark starfield backdrop */}
              <div className="absolute inset-0 bg-[#0A0612]">
                <div className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage: `radial-gradient(ellipse at 20% 30%, rgba(123,47,190,0.15) 0%, transparent 50%),
                      radial-gradient(ellipse at 80% 70%, rgba(212,175,55,0.08) 0%, transparent 50%)`,
                  }}
                />
              </div>
              <div className="relative z-10 flex flex-col h-full w-full px-4">
                <div className="luxury-card flex flex-col flex-1 overflow-hidden">
                  <AssistantChat
                    chartId={String(selectedChart.id)}
                    sessionId={chatSessionId}
                    onSessionCreated={handleSessionCreated}
                    fullscreen
                    onExitFullscreen={() => setAstrologerMode(false)}
                    chartType={selectedChart?.chart_type || 'natal'}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════
              MOBILE: tab switcher
              ═══════════════════════════ */}
          <div className="md:hidden flex flex-col flex-1 overflow-hidden pb-[72px]">

            {/* Astrologer mode overlay — mobile fullscreen chat */}
            {astrologerMode && selectedChart && (
              <div className="absolute inset-0 z-50 flex flex-col bg-[#0A0612]" style={{
                backgroundImage: `radial-gradient(ellipse at 20% 30%, rgba(123,47,190,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(212,175,55,0.08) 0%, transparent 50%)`,
              }}>
                <div className="flex flex-col h-full px-3 py-3 pb-0">
                  <div className="luxury-card flex flex-col flex-1 overflow-hidden">
                    <AssistantChat
                      chartId={String(selectedChart.id)}
                      sessionId={chatSessionId}
                      onSessionCreated={handleSessionCreated}
                      fullscreen
                      onExitFullscreen={() => setAstrologerMode(false)}
                      chartType={selectedChart?.chart_type || 'natal'}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tab bar */}
            <div className="flex items-center gap-1 px-4 pt-4 pb-2 shrink-0">
              <button
                onClick={() => setMobilePanelTab('chart')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-medium transition-all',
                  mobilePanelTab === 'chart'
                    ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
                    : 'text-[#8B7FA8]'
                )}
              >
                <Star className="w-3.5 h-3.5" />
                Карта
              </button>
              <button
                onClick={() => setMobilePanelTab('chat')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-medium transition-all',
                  mobilePanelTab === 'chat'
                    ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
                    : 'text-[#8B7FA8]'
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                ИИ-Астролог
              </button>
            </div>

            {/* Charts horizontal scroll — only on chart tab */}
            {charts.length > 0 && mobilePanelTab === 'chart' && (
              <div className="px-4 pb-2 shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {charts.map((chart) => {
                    const isActive = selectedChart?.id === chart.id
                    return (
                      <button
                        key={chart.id}
                        onClick={() => selectChart(chart)}
                        className={cn(
                          'shrink-0 px-3 py-2 rounded-xl text-left transition-all',
                          isActive ? 'chart-item-active' : 'chart-item'
                        )}
                      >
                        <p className={cn('text-xs font-semibold whitespace-nowrap', isActive ? 'text-[#D4AF37]' : 'text-[#F0EAD6]')}>
                          {new Date(chart.native_data.datetime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </p>
                        <p className="text-[10px] text-[#8B7FA8] whitespace-nowrap mt-0.5">
                          {chart.native_data.location.split(',')[0]}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Panel content */}
            <div className="flex-1 overflow-hidden px-4 pb-2">
              {mobilePanelTab === 'chart' ? (
                <div className="luxury-card h-full flex flex-col overflow-hidden">
                  {!selectedChart ? (
                    <EmptyChartState />
                  ) : (selectedChart.chart_type || 'natal') === 'profection' && getProfectionData(selectedChart, profectionData) ? (
                    <ProfectionInfoPanel data={getProfectionData(selectedChart, profectionData)!} />
                  ) : svgLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
                      <p className="text-xs text-[#8B7FA8]">Строим карту…</p>
                    </div>
                  ) : svgContent ? (
                    <div className="chart-glow-container flex-1">
                      <div
                        className="chart-svg-wrapper"
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-[#8B7FA8]">Ошибка загрузки</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Chat tab — show Maximize button to enter astrologer mode */
                <div className="luxury-card h-full flex flex-col overflow-hidden">
                  <AssistantChat
                    chartId={selectedChart ? String(selectedChart.id) : ''}
                    sessionId={chatSessionId}
                    onSessionCreated={handleSessionCreated}
                    showWelcome={showWelcomeMessage}
                    onWelcomeDismiss={() => setShowWelcomeMessage(false)}
                    chartType={selectedChart?.chart_type || 'natal'}
                  />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Profile slide-over */}
        <ProfileSlideOver isOpen={showProfile} onClose={() => setShowProfile(false)} data-onboarding="profile" />

        {/* Create chart modal */}
        <CreateChartModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleChartCreated}
        />

        {/* Synastry modal */}
        {selectedChart && (
          <ModalShell
            open={activeModal === 'synastry'}
            onClose={closeModal}
            icon={<Heart className="w-4 h-4 text-[#D4AF37]" style={{ width: 16, height: 16 }} />}
            title="Синастрия"
            description="Совместимость двух натальных карт"
          >
            <SynastryForm
              natalChartId={selectedChart.id}
              onSubmit={onChartCreatedFromModal}
              onCancel={closeModal}
            />
          </ModalShell>
        )}

        {/* Composite modal */}
        {selectedChart && (
          <ModalShell
            open={activeModal === 'composite'}
            onClose={closeModal}
            icon={<Merge className="w-4 h-4 text-[#D4AF37]" style={{ width: 16, height: 16 }} />}
            title="Композит / Давидсон"
            description="Карта отношений как единое целое"
          >
            <CompositeForm
              natalChartId={selectedChart.id}
              onSubmit={onChartCreatedFromModal}
              onCancel={closeModal}
            />
          </ModalShell>
        )}

        {/* Horary modal */}
        <ModalShell
          open={activeModal === 'horary'}
          onClose={closeModal}
          icon={<Compass className="w-4 h-4 text-[#D4AF37]" style={{ width: 16, height: 16 }} />}
          title="Хорарная карта"
          description="Ответ на конкретный вопрос по моменту его задавания"
        >
          <HoraryForm
            onSubmit={onChartCreatedFromModal}
            onCancel={closeModal}
          />
        </ModalShell>

        {/* Electional modal */}
        <ModalShell
          open={activeModal === 'electional'}
          onClose={closeModal}
          icon={<Sparkles className="w-4 h-4 text-[#D4AF37]" style={{ width: 16, height: 16 }} />}
          title="Элективная карта"
          description="Выбор наилучшего момента для начинания"
        >
          <ElectionalForm
            onSubmit={onChartCreatedFromModal}
            onCancel={closeModal}
          />
        </ModalShell>

        {/* Transit modal */}
        {selectedChart && (
          <ModalShell
            open={activeModal === 'transit'}
            onClose={closeModal}
            icon={<Clock className="w-4 h-4 text-[#D4AF37]" style={{ width: 16, height: 16 }} />}
            title="Транзиты"
            description="Текущие планетные влияния"
          >
            <TransitForm
              natalChartId={selectedChart.id}
              isPremium={isPremium}
              onSubmit={onChartCreatedFromModal}
              onCancel={closeModal}
            />
          </ModalShell>
        )}

        {/* Solar return modal */}
        {selectedChart && (
          <ModalShell
            open={activeModal === 'solar_return'}
            onClose={closeModal}
            icon={<Sun className="w-4 h-4 text-[#D4AF37]" style={{ width: 16, height: 16 }} />}
            title="Солярный возврат"
            description="Годовой прогноз по возвращению Солнца"
          >
            <SolarReturnForm
              natalChartId={selectedChart.id}
              onSubmit={onChartCreatedFromModal}
              onCancel={closeModal}
            />
          </ModalShell>
        )}

        {/* Lunar return modal */}
        {selectedChart && (
          <ModalShell
            open={activeModal === 'lunar_return'}
            onClose={closeModal}
            icon={<Moon className="w-4 h-4 text-[#D4AF37]" style={{ width: 16, height: 16 }} />}
            title="Лунарный возврат"
            description="Месячный прогноз по возвращению Луны"
          >
            <LunarReturnForm
              natalChartId={selectedChart.id}
              onSubmit={onChartCreatedFromModal}
              onCancel={closeModal}
            />
          </ModalShell>
        )}

        {/* Profection modal */}
        {selectedChart && (
          <ModalShell
            open={activeModal === 'profection'}
            onClose={closeModal}
            icon={<Target className="w-4 h-4 text-[#D4AF37]" style={{ width: 16, height: 16 }} />}
            title="Профекция"
            description="Годовой прогноз по домам"
          >
            <ProfectionForm
              natalChartId={selectedChart.id}
              onSubmit={onProfectionCreated}
              onCancel={closeModal}
            />
          </ModalShell>
        )}

        {/* Solar arc modal */}
        {selectedChart && (
          <ModalShell
            open={activeModal === 'solar_arc'}
            onClose={closeModal}
            icon={<Navigation className="w-4 h-4 text-[#D4AF37]" style={{ width: 16, height: 16 }} />}
            title="Солярные дуги"
            description="Прогностическая техника — дирекции по дуге Солнца"
          >
            <SolarArcForm
              natalChartId={selectedChart.id}
              onSubmit={onChartCreatedFromModal}
              onCancel={closeModal}
            />
          </ModalShell>
        )}

        {/* Progression modal */}
        {selectedChart && (
          <ModalShell
            open={activeModal === 'progression'}
            onClose={closeModal}
            icon={<Zap className="w-4 h-4 text-[#D4AF37]" style={{ width: 16, height: 16 }} />}
            title="Вторичные прогрессии"
            description="Прогностическая техника — один день = один год жизни"
          >
            <ProgressionForm
              natalChartId={selectedChart.id}
              onSubmit={onChartCreatedFromModal}
              onCancel={closeModal}
            />
          </ModalShell>
        )}

        {/* Rectification modal */}
        <ModalShell
          open={activeModal === 'rectification'}
          onClose={closeModal}
          icon={<Crosshair className="w-4 h-4 text-[#D4AF37]" style={{ width: 16, height: 16 }} />}
          title="Ректификация"
          description="Определение времени рождения по жизненным событиям"
        >
          <RectificationForm
            onSubmit={(chart) => onChartCreatedFromModal(chart)}
            onCancel={closeModal}
          />
        </ModalShell>

        {/* Delete confirmation dialog */}
        {chartToDelete && (
          <DeleteConfirmDialog
            chart={chartToDelete}
            onConfirm={confirmDeleteChart}
            onCancel={() => setChartToDelete(null)}
            isDeleting={isDeleting}
          />
        )}

        {/* Onboarding tour */}
        {showOnboardingTour && (
          <OnboardingTour onComplete={handleOnboardingComplete} />
        )}
      </div>
    </AppLayout>
  )
}
