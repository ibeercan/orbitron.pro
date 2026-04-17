import { useState, useEffect } from 'react'
import { chartsApi } from '@/lib/api/client'
import { AppLayout } from '@/components/layout/AppLayout'
import { Sidebar } from '@/components/layout/Sidebar'
import { ProfileSlideOver } from '@/components/layout/ProfileSlideOver'
import { AIChat } from '@/components/chat/AIChat'
import { Plus, MapPin, Calendar, Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Chart {
  id: string
  native_data: { datetime: string; location: string }
  result_data: Record<string, unknown>
  svg_path: string
  prompt_text: string
  created_at: string
}

export default function Dashboard() {
  const [charts, setCharts] = useState<Chart[]>([])
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [isCreatingChart, setIsCreatingChart] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [chatSessionId, setChatSessionId] = useState<number | null>(null)

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

  const loadChartSvg = async (chartId: string) => {
    try {
      const res = await chartsApi.getSvg(chartId)
      setSvgContent(res.data.svg)
    } catch (err) {
      console.error('Failed to load chart SVG:', err)
    }
  }

  const selectChart = (chart: Chart) => {
    setSelectedChart(chart)
    loadChartSvg(chart.id)
  }

  const createChart = async () => {
    setIsCreatingChart(true)
    try {
      await chartsApi.create({
        datetime: '2000-01-01T12:00:00',
        location: 'Moscow, Russia',
        theme: 'classic',
        house_system: 'placidus',
        preset: 'detailed',
        zodiac_palette: 'rainbow',
      })
      await loadCharts()
    } catch (err) {
      console.error('Failed to create chart:', err)
    } finally {
      setIsCreatingChart(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex h-screen">
        {/* Sidebar - desktop only */}
        <Sidebar 
          onProfileClick={() => setShowProfile(true)} 
        />

        {/* Main Content */}
        <main className="flex-1 flex flex-col md:pl-4 p-4 pb-24 md:pb-4 overflow-hidden">
          {/* Header - mobile only */}
          <div className="md:hidden flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold text-white">Мои карты</h1>
            <button
              onClick={createChart}
              disabled={isCreatingChart}
              className="p-2 rounded-xl bg-secondary-400 text-gray-900"
            >
              {isCreatingChart ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            </button>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
            {/* Charts List */}
            <div className="floating-card flex flex-col min-h-0">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="font-semibold text-white">Натальные карты</h2>
                <button
                  onClick={createChart}
                  disabled={isCreatingChart}
                  className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary-400 text-gray-900 font-medium hover:bg-secondary-300 transition-colors disabled:opacity-50"
                >
                  {isCreatingChart ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Создать
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {charts.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400 mb-4">Нет карт</p>
                    <button
                      onClick={createChart}
                      className="px-6 py-3 rounded-xl bg-secondary-400 font-medium text-gray-900 hover:bg-secondary-300"
                    >
                      Создать первую карту
                    </button>
                  </div>
                ) : (
                  charts.map((chart) => (
                    <button
                      key={chart.id}
                      onClick={() => selectChart(chart)}
                      className={cn(
                        "w-full p-4 rounded-xl text-left transition-all",
                        selectedChart?.id === chart.id
                          ? "bg-secondary-400/10 border border-secondary-400/30"
                          : "bg-white/5 border border-white/5 hover:border-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-white truncate">
                            {new Date(chart.native_data.datetime).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{chart.native_data.location}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Chart Viewer */}
            <div className="floating-card flex flex-col min-h-0">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="font-semibold text-white">Карта</h2>
                {selectedChart && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="h-4 w-4" />
                    {new Date(selectedChart.native_data.datetime).toLocaleDateString('ru-RU')}
                  </div>
                )}
              </div>

              <div className="flex-1 p-4 overflow-auto">
                {selectedChart ? (
                  svgContent ? (
                    <div 
                      className="w-full h-full flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: svgContent }} 
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-secondary-400" />
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="w-16 h-16 mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
                      <Sparkles className="h-8 w-8 text-gray-500" />
                    </div>
                    <p className="text-gray-400">Выберите карту для просмотра</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Chat - full width on mobile, half on large screens */}
            <div className="lg:col-span-2 min-h-[400px]">
              <AIChat 
                chartId={selectedChart?.id || ''}
                sessionId={chatSessionId}
                onSessionCreated={(sessionId) => setChatSessionId(sessionId)}
              />
            </div>
          </div>
        </main>

        {/* Profile Slide-over */}
        <ProfileSlideOver 
          isOpen={showProfile} 
          onClose={() => setShowProfile(false)} 
        />
      </div>
    </AppLayout>
  )
}