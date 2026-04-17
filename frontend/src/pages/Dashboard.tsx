import { useState, useEffect } from 'react'
import { chartsApi } from '@/lib/api/client'
import { AppLayout } from '@/components/layout/AppLayout'
import { Sidebar } from '@/components/layout/Sidebar'
import { ProfileSlideOver } from '@/components/layout/ProfileSlideOver'
import { AssistantChat } from '@/components/chat/AssistantChat'
import { CreateChartModal } from '@/components/ui/CreateChartModal'
import { Loader2, Calendar, MapPin, Sparkles, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Chart {
  id: number
  native_data: { datetime: string; location: string }
  result_data: Record<string, unknown>
  svg_path: string
  prompt_text: string
  created_at: string
}

/* ── Empty state illustration ── */
function EmptyChartState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
      {/* Animated constellation */}
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

          {/* Stars */}
          {[
            [56, 8], [96, 30], [96, 82], [56, 104], [16, 82], [16, 30],
          ].map(([cx, cy], i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="3" fill="#D4AF37" filter="url(#ecGlow)" opacity="0.7" />
              <line
                x1={56} y1={56} x2={cx} y2={cy}
                stroke="rgba(212,175,55,0.15)" strokeWidth="0.8"
              />
            </g>
          ))}

          {/* Center */}
          <circle cx="56" cy="56" r="7" fill="#D4AF37" filter="url(#ecGlow)" opacity="0.9">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="56" cy="56" r="3.5" fill="#FFF8DC" opacity="0.6" />
        </svg>
      </div>

      <h3 className="font-serif text-2xl font-semibold text-[#F0EAD6] mb-2">
        Нет выбранной карты
      </h3>
      <p className="text-sm text-[#8B7FA8] leading-relaxed max-w-xs mb-6">
        Выберите натальную карту в боковой панели, чтобы её просмотреть и поговорить с ИИ-астрологом
      </p>
      <button
        onClick={onCreate}
        className="btn-gold px-6 py-2.5 text-sm flex items-center gap-2"
      >
        <Star className="w-4 h-4" />
        Создать первую карту
      </button>
    </div>
  )
}

/* ── Chart header info ── */
function ChartHeader({ chart }: { chart: Chart }) {
  const date = new Date(chart.native_data.datetime)
  const birthDate = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const birthTime = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const location = chart.native_data.location.split(',').slice(0, 2).join(', ').trim()

  return (
    <div className="flex items-center gap-5 flex-wrap">
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

export default function Dashboard() {
  const [charts, setCharts] = useState<Chart[]>([])
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [svgLoading, setSvgLoading] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<number | null>(null)

  /* Mobile tabs */
  const [mobilePanelTab, setMobilePanelTab] = useState<'chart' | 'chat'>('chart')
  const [activeMobileNav, setActiveMobileNav] = useState<'charts' | 'profile'>('charts')

  useEffect(() => {
    loadCharts()
  }, [])

  const loadCharts = async () => {
    try {
      const res = await chartsApi.list()
      setCharts(res.data)
    } catch (err) {
      console.error('Failed to load charts:', err)
    }
  }

  const loadChartSvg = async (chartId: number) => {
    setSvgLoading(true)
    setSvgContent('')
    try {
      const res = await chartsApi.getSvg(chartId)
      setSvgContent(res.data.svg)
    } catch (err) {
      console.error('Failed to load chart SVG:', err)
    } finally {
      setSvgLoading(false)
    }
  }

  const selectChart = (chart: Chart) => {
    if (selectedChart?.id === chart.id) return
    setSelectedChart(chart)
    setChatSessionId(null)
    loadChartSvg(chart.id)
  }

  const handleChartCreated = (newChart: {
    id: number
    native_data: { datetime: string; location: string }
    result_data: Record<string, unknown>
    svg_path: string
    prompt_text: string
    created_at: string
  }) => {
    const chart: Chart = { ...newChart }
    setCharts((prev) => [chart, ...prev])
    selectChart(chart)
  }

  return (
    <AppLayout>
      <div className="flex h-screen overflow-hidden">

        {/* ── Sidebar (desktop: nav + charts list) ── */}
        <Sidebar
          onProfileClick={() => setShowProfile(true)}
          onCreateChart={() => setShowCreateModal(true)}
          charts={charts}
          selectedChart={selectedChart}
          onSelectChart={selectChart}
          activeMobileTab={activeMobileNav}
          onMobileTabChange={(tab) => {
            setActiveMobileNav(tab)
            if (tab === 'profile') setShowProfile(true)
          }}
        />

        {/* ── Main content area ── */}
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* ════════════════════════════════════════
              DESKTOP: 2 panels side by side — Chart | Chat
              ════════════════════════════════════════ */}
          <div className="hidden md:flex flex-1 gap-0 overflow-hidden">

            {/* Chart panel */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden p-4 pr-2">
              <div className="luxury-card flex flex-col h-full overflow-hidden">

                {/* Chart panel header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(212,175,55,0.08)] shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                    <span className="font-serif text-lg font-semibold text-[#F0EAD6]">
                      Натальная карта
                    </span>
                  </div>
                  {selectedChart && <ChartHeader chart={selectedChart} />}
                </div>

                {/* Chart content */}
                <div className="flex-1 overflow-auto relative">
                  {!selectedChart ? (
                    <EmptyChartState onCreate={() => setShowCreateModal(true)} />
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
                    <div className="chart-glow-container relative w-full h-full flex items-center justify-center p-6">
                      <div
                        className="relative z-10 w-full h-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:max-h-full [&_svg]:drop-shadow-[0_0_24px_rgba(212,175,55,0.12)]"
                        dangerouslySetInnerHTML={{ __html: svgContent }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-[#8B7FA8]">Не удалось загрузить карту</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Chat panel */}
            <div className="w-[340px] xl:w-[380px] 2xl:w-[420px] shrink-0 flex flex-col overflow-hidden p-4 pl-2">
              <div className="luxury-card flex flex-col h-full overflow-hidden">
                <AssistantChat
                  chartId={selectedChart ? String(selectedChart.id) : ''}
                  sessionId={chatSessionId}
                  onSessionCreated={(id) => setChatSessionId(id)}
                />
              </div>
            </div>
          </div>

          {/* ════════════════════════════════════════
              MOBILE: Tab switcher — Chart / Chat
              ════════════════════════════════════════ */}
          <div className="md:hidden flex flex-col flex-1 overflow-hidden pb-[72px]">

            {/* Mobile tab bar */}
            <div className="flex items-center gap-1 px-4 pt-4 pb-2 shrink-0">
              <button
                onClick={() => setMobilePanelTab('chart')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-medium transition-all',
                  mobilePanelTab === 'chart'
                    ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
                    : 'text-[#8B7FA8] hover:text-[#F0EAD6]'
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
                    : 'text-[#8B7FA8] hover:text-[#F0EAD6]'
                )}
              >
                <Sparkles className="w-3.5 h-3.5" />
                ИИ-Астролог
              </button>
            </div>

            {/* Mobile chart list (above content, collapsible feel) */}
            {charts.length > 0 && (
              <div className="px-4 pb-2 shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
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
                          {new Date(chart.native_data.datetime).toLocaleDateString('ru-RU', {
                            day: 'numeric', month: 'short', year: '2-digit'
                          })}
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
                    <EmptyChartState onCreate={() => setShowCreateModal(true)} />
                  ) : svgLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
                      <p className="text-xs text-[#8B7FA8]">Строим карту…</p>
                    </div>
                  ) : svgContent ? (
                    <div
                      className="flex-1 flex items-center justify-center p-4 [&_svg]:max-w-full [&_svg]:max-h-full"
                      dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-sm text-[#8B7FA8]">Ошибка загрузки</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="luxury-card h-full flex flex-col overflow-hidden">
                  <AssistantChat
                    chartId={selectedChart ? String(selectedChart.id) : ''}
                    sessionId={chatSessionId}
                    onSessionCreated={(id) => setChatSessionId(id)}
                  />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Profile slide-over */}
        <ProfileSlideOver
          isOpen={showProfile}
          onClose={() => setShowProfile(false)}
        />

        {/* Create chart modal */}
        <CreateChartModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleChartCreated}
        />
      </div>
    </AppLayout>
  )
}
