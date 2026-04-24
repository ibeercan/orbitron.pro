import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { chartsApi } from '@/lib/api/client'
import { AppLayout } from '@/components/layout/AppLayout'
import { Sidebar } from '@/components/layout/Sidebar'
import { ProfileSlideOver } from '@/components/layout/ProfileSlideOver'
import { AdminContent } from '@/components/admin/AdminContent'
import { ArrowLeft, Crown } from 'lucide-react'

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

export default function AdminPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [charts, setCharts] = useState<Chart[]>([])
  const [showProfile, setShowProfile] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeMobileNav, setActiveMobileNav] = useState<'charts' | 'profile'>('charts')

  useEffect(() => {
    chartsApi.list().then(r => setCharts(r.data)).catch(() => {})
  }, [])

  if (!user?.is_admin) {
    navigate('/dashboard', { replace: true })
    return null
  }

  const selectedChartId = searchParams.get('chart')
  const selectedChart = selectedChartId ? charts.find(c => c.id === Number(selectedChartId)) ?? null : null

  const handleSelectChart = (chart: Chart) => {
    navigate(`/dashboard?chart=${chart.id}`)
  }

  return (
    <AppLayout>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          onProfileClick={() => setShowProfile(true)}
          onCreateChart={() => navigate('/dashboard')}
          charts={charts}
          selectedChart={selectedChart}
          onSelectChart={handleSelectChart}
          onDeleteChart={() => {}}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(v => !v)}
          onAstrologerMode={() => {}}
          activeMobileTab={activeMobileNav}
          onMobileTabChange={tab => {
            setActiveMobileNav(tab)
            if (tab === 'profile') setShowProfile(true)
          }}
        />

        <main className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
          <div className="flex items-center gap-3 px-4 py-3 md:hidden border-b border-[rgba(212,175,55,0.08)] shrink-0 bg-[rgba(10,6,18,0.8)]">
            <button onClick={() => navigate('/dashboard')} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8B7FA8] hover:text-[#F0EAD6] hover:bg-[rgba(212,175,55,0.08)] transition-all">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-[rgba(123,47,190,0.15)] border border-[rgba(123,47,190,0.25)] flex items-center justify-center">
              <Crown className="w-4 h-4 text-[#9D50E0]" />
            </div>
            <span className="font-serif text-lg font-semibold text-[#F0EAD6]">Управление</span>
          </div>

          <div className="flex-1 overflow-hidden bg-[rgba(10,6,18,0.6)] backdrop-blur-sm">
            <AdminContent />
          </div>
        </main>

        <ProfileSlideOver isOpen={showProfile} onClose={() => setShowProfile(false)} />
      </div>
    </AppLayout>
  )
}
