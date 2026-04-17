import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { chartsApi, aiApi, inviteApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface Chart {
  id: string
  native_data: { datetime: string; location: string }
  result_data: Record<string, unknown>
  svg_path: string
  prompt_text: string
  created_at: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [charts, setCharts] = useState<Chart[]>([])
  const [selectedChart, setSelectedChart] = useState<Chart | null>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingChart, setIsCreatingChart] = useState(false)
  const [inviteCodes, setInviteCodes] = useState<{ code: string; used: boolean }[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadCharts()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const sendMessage = async () => {
    if (!input.trim() || !selectedChart || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await aiApi.interpret(selectedChart.id, input, 'chat')
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.data.interpretation,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      console.error('AI interpret failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const createChart = async () => {
    setIsCreatingChart(true)
    try {
      // Demo: create chart with sample data
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
              {user?.is_admin ? 'Admin' : user?.subscription_type === 'premium' ? 'Premium' : 'Free'}
            </p>
          </div>
        </div>

        <nav className="space-y-2">
          <button className="w-full rounded-md bg-white/10 px-4 py-2 text-left text-white">
            Мои карты
          </button>
          {user?.is_admin && (
            <button
              onClick={async () => {
                try {
                  const res = await inviteApi.list()
                  setInviteCodes(res.data.codes)
                  setShowInviteModal(true)
                } catch (err) {
                  console.error('Failed to load invites:', err)
                }
              }}
              className="w-full rounded-md px-4 py-2 text-left text-gray-400 hover:bg-white/5 hover:text-white"
            >
              Инвайты
            </button>
          )}
          <button
            onClick={() => navigate('/profile')}
            className="w-full rounded-md px-4 py-2 text-left text-gray-400 hover:bg-white/5 hover:text-white"
          >
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

      {/* Main */}
      <main className="flex-1 flex">
        {/* Charts List */}
        <div className="w-80 border-r border-white/10 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Натальные карты</h2>
            <button
              onClick={createChart}
              disabled={isCreatingChart}
              className="rounded-md bg-secondary-400 px-3 py-1 text-sm font-medium text-gray-900 hover:bg-secondary-300 disabled:opacity-50"
            >
              {isCreatingChart ? 'Создание...' : 'Создать'}
            </button>
          </div>

          <div className="space-y-2">
            {charts.map((chart) => (
              <button
                key={chart.id}
                onClick={() => selectChart(chart)}
                className={cn(
                  'w-full rounded-md border p-3 text-left transition-all',
                  selectedChart?.id === chart.id
                    ? 'border-secondary-500 bg-secondary-500/10'
                    : 'border-white/10 hover:border-white/20'
                )}
              >
                <p className="font-medium text-white">
                  {new Date(chart.native_data.datetime).toLocaleDateString('ru-RU')}
                </p>
                <p className="text-sm text-gray-500">{chart.native_data.location}</p>
              </button>
            ))}

            {charts.length === 0 && (
              <p className="text-center text-gray-500">Нет карт. Создайте первую.</p>
            )}
          </div>
        </div>

        {/* Chart Viewer + AI Chat */}
        <div className="flex-1 flex">
          {/* SVG Viewer */}
          <div className="flex-1 p-4">
            {selectedChart ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-white/10 bg-white/5">
                {svgContent ? (
                  <div className="max-h-full max-w-full overflow-auto p-4" dangerouslySetInnerHTML={{ __html: svgContent }} />
                ) : (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-gray-500">
                Выберите карту для просмотра
              </div>
            )}
          </div>

          {/* AI Chat */}
          <div className="w-96 border-l border-white/10 flex flex-col">
            <div className="border-b border-white/10 p-4">
              <h3 className="font-semibold text-white">AI Астролог</h3>
              <p className="text-xs text-gray-500">
                {user?.subscription_type === 'premium' ? 'Безлимит' : '5 запросов/месяц'}
              </p>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'max-w-[85%] rounded-lg px-4 py-2',
                    msg.role === 'user'
                      ? 'ml-auto bg-primary-500/20 text-white'
                      : 'bg-white/5 text-gray-300'
                  )}
                >
                  {msg.content}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-secondary border-t-transparent" />
                  Думаю...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-white/10 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Задайте вопрос..."
                  disabled={!selectedChart || isLoading}
                  className="flex-1 rounded-md border border-white/20 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-secondary-500 focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={sendMessage}
                  disabled={!selectedChart || isLoading || !input.trim()}
                  className="rounded-md bg-secondary-400 px-4 py-2 font-medium text-gray-900 hover:bg-secondary-300 disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Admin Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-white/20 bg-background p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Управление инвайтами</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <button
              onClick={async () => {
                try {
                  const res = await inviteApi.generate()
                  setInviteCodes([{ code: res.data.code, used: false }, ...inviteCodes])
                } catch (err) {
                  console.error('Failed to generate invite:', err)
                }
              }}
              className="mb-4 w-full rounded-md bg-secondary-400 px-4 py-2 font-medium text-gray-900 hover:bg-secondary-300"
            >
              Создать новый инвайт
            </button>

            <div className="max-h-60 space-y-2 overflow-auto">
              {inviteCodes.map((invite) => (
                <div
                  key={invite.code}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-3 py-2"
                >
                  <code className="font-mono text-white">{invite.code}</code>
                  <span className={invite.used ? 'text-red-400' : 'text-green-400'}>
                    {invite.used ? 'Использован' : 'Доступен'}
                  </span>
                </div>
              ))}
              {inviteCodes.length === 0 && (
                <p className="text-center text-gray-500">Нет инвайтов</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}