import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { AppLayout } from '@/components/layout/AppLayout'
import { Sidebar } from '@/components/layout/Sidebar'
import { ProfileSlideOver } from '@/components/layout/ProfileSlideOver'
import { AdminContent } from '@/components/admin/AdminContent'
import { ArrowLeft, Crown } from 'lucide-react'

export default function AdminPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [showProfile, setShowProfile] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [activeMobileNav, setActiveMobileNav] = useState<'charts' | 'profile'>('charts')

  if (!user?.is_admin) {
    navigate('/dashboard', { replace: true })
    return null
  }

  return (
    <AppLayout>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          onProfileClick={() => setShowProfile(true)}
          onCreateChart={() => navigate('/dashboard')}
          charts={[]}
          selectedChart={null}
          onSelectChart={() => navigate('/dashboard')}
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
