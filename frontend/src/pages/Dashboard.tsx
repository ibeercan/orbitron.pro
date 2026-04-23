import { useState, useEffect } from 'react'
import { chartsApi, chatApi } from '@/lib/api/client'
import { AppLayout } from '@/components/layout/AppLayout'
import { Sidebar } from '@/components/layout/Sidebar'
import { ProfileSlideOver } from '@/components/layout/ProfileSlideOver'
import { AssistantChat } from '@/components/chat/AssistantChat'
import { CreateChartModal } from '@/components/ui/CreateChartModal'
import { Loader2, Calendar, MapPin, Sparkles, Star, Trash2, AlertTriangle, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Chart {
  id: number
  native_data: { datetime: string; location: string }
  result_data: Record<string, unknown>
  svg_path?: string | null
  svg_data?: string | null
  prompt_text: string
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
function EmptyChartState({ onCreate }: { onCreate: () => void }) {
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
      <h3 className="font-serif text-2xl font-semibold text-[#F0EAD6] mb-2">Нет выбранной карты</h3>
      <p className="text-sm text-[#8B7FA8] leading-relaxed max-w-xs mb-6">
        Выберите натальную карту в боковой панели, чтобы её просмотреть и поговорить с ИИ-астрологом
      </p>
      <button onClick={onCreate} className="btn-gold px-6 py-2.5 text-sm flex items-center gap-2">
        <Star className="w-4 h-4" />
        Создать первую карту
      </button>
    </div>
  )
}

/* ── Chart header info ── */
function ChartHeader({ chart }: { chart: Chart }) {
  const date = new Date(chart.native_data.datetime)
  const birthDate = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  const birthTime = date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
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
    setSelectedChart(chart)
    setChatSessionId(null)
    setSvgLoading(true)
    setSvgContent('')
    loadChartSvg(chart)

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
                    <div className="w-2 h-2 rounded-full bg-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.8)]" />
                    <span className="font-serif text-lg font-semibold text-[#F0EAD6]">Натальная карта</span>
                  </div>
                  {selectedChart && <ChartHeader chart={selectedChart} />}
                </div>

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
              </div>
            </div>

            {/* Chat panel */}
            <div className="w-[340px] xl:w-[380px] 2xl:w-[420px] shrink-0 flex flex-col overflow-hidden p-4 pl-2">
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
                  onSessionCreated={(id) => setChatSessionId(id)}
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
                    onSessionCreated={(id) => setChatSessionId(id)}
                    fullscreen
                    onExitFullscreen={() => setAstrologerMode(false)}
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
                      onSessionCreated={(id) => setChatSessionId(id)}
                      fullscreen
                      onExitFullscreen={() => setAstrologerMode(false)}
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
                    <EmptyChartState onCreate={() => setShowCreateModal(true)} />
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
                    onSessionCreated={(id) => setChatSessionId(id)}
                  />
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Profile slide-over */}
        <ProfileSlideOver isOpen={showProfile} onClose={() => setShowProfile(false)} />

        {/* Create chart modal */}
        <CreateChartModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleChartCreated}
        />

        {/* Delete confirmation dialog */}
        {chartToDelete && (
          <DeleteConfirmDialog
            chart={chartToDelete}
            onConfirm={confirmDeleteChart}
            onCancel={() => setChartToDelete(null)}
            isDeleting={isDeleting}
          />
        )}
      </div>
    </AppLayout>
  )
}
