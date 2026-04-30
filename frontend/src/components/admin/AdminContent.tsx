import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '@/lib/api/client'
import { Loader2, Crown, ChevronDown, Key, Users, BarChart3, ScrollText, Mail, Settings, X, MailCheck, MailX, Zap, SendHorizonal } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'analytics' | 'users' | 'invites' | 'subscribers' | 'audit' | 'tokens' | 'settings'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'analytics', label: 'Аналитика', icon: BarChart3 },
  { id: 'users', label: 'Пользователи', icon: Users },
  { id: 'invites', label: 'Коды', icon: Key },
  { id: 'subscribers', label: 'Подписчики', icon: Mail },
  { id: 'audit', label: 'Аудит', icon: ScrollText },
  { id: 'tokens', label: 'Токены', icon: Zap },
  { id: 'settings', label: 'Настройки', icon: Settings },
]

export function AdminContent() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('analytics')

  return (
    <div className="flex flex-col h-full">
      <div className="hidden md:flex items-center gap-3 px-6 py-5 border-b border-[rgba(212,175,55,0.08)] shrink-0">
        <div className="w-9 h-9 rounded-xl bg-[rgba(123,47,190,0.15)] border border-[rgba(123,47,190,0.25)] flex items-center justify-center">
          <Crown className="w-4 h-4 text-[#9D50E0]" />
        </div>
        <div>
          <h1 className="font-serif text-xl font-semibold text-[#F0EAD6]">Управление</h1>
          <p className="text-xs text-[#8B7FA8]">Панель администратора</p>
        </div>
        <div className="flex-1" />
        <button onClick={() => navigate('/dashboard')} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8B7FA8] hover:text-[#F0EAD6] hover:bg-[rgba(212,175,55,0.08)] transition-all">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-1 px-6 py-2.5 border-b border-[rgba(212,175,55,0.06)] shrink-0 overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
tab === t.id
                 ? t.id === 'analytics' ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] text-[#D4AF37]'
                   : t.id === 'users' ? 'bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] text-[#60A5FA]'
                   : t.id === 'invites' ? 'bg-[rgba(123,47,190,0.1)] border border-[rgba(123,47,190,0.2)] text-[#9D50E0]'
                   : t.id === 'subscribers' ? 'bg-[rgba(16,185,129,0.1)] border border-[rgba(16,185,129,0.2)] text-[#34D399]'
                   : t.id === 'tokens' ? 'bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#F59E0B]'
                   : t.id === 'settings' ? 'bg-[rgba(147,130,220,0.1)] border border-[rgba(147,130,220,0.2)] text-[#9382DC]'
                   : 'bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-[#A78BFA]'
                : 'text-[#8B7FA8] hover:text-[#F0EAD6]',
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'analytics' && <AnalyticsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'invites' && <InvitesTab />}
        {tab === 'subscribers' && <SubscribersTab />}
        {tab === 'audit' && <AuditTab />}
        {tab === 'tokens' && <TokensTab />}
        {tab === 'settings' && <SettingsTab />}
      </div>
    </div>
  )
}

function AnalyticsTab() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    adminApi.getStats().then(r => setStats(r.data)).catch(() => setStats(null)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" /></div>
  if (!stats) return <div className="p-6 text-center text-[#8B7FA8]">Не удалось загрузить статистику</div>

  const cards = [
    { label: 'Пользователей', value: stats.total_users, color: '#D4AF37', bg: 'rgba(212,175,55,0.06)', border: 'rgba(212,175,55,0.12)' },
    { label: 'Premium', value: stats.premium_users, color: '#34D399', bg: 'rgba(52,211,153,0.06)', border: 'rgba(52,211,153,0.12)' },
    { label: 'Free', value: stats.free_users, color: '#8B7FA8', bg: 'rgba(139,127,168,0.06)', border: 'rgba(139,127,168,0.1)' },
    { label: 'Карт создано', value: stats.total_charts, color: '#60A5FA', bg: 'rgba(59,130,246,0.06)', border: 'rgba(59,130,246,0.12)' },
    { label: 'AI-запросов сегодня', value: stats.ai_requests_today, color: '#9D50E0', bg: 'rgba(157,80,224,0.06)', border: 'rgba(157,80,224,0.12)' },
    { label: 'AI-запросов / мес', value: stats.ai_requests_month, color: '#A78BFA', bg: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.12)' },
    { label: 'Стоимость AI / мес', value: `${stats.ai_cost_month_rub.toFixed(2)}₽`, color: '#F59E0B', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.12)' },
    { label: 'Инвайтов создано', value: stats.invites_generated, color: '#EC4899', bg: 'rgba(236,72,153,0.06)', border: 'rgba(236,72,153,0.12)' },
    { label: 'Инвайтов использовано', value: stats.invites_used, color: '#10B981', bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.12)' },
  ]

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(c => (
          <div key={c.label} className="rounded-xl border p-4 transition-colors hover:border-opacity-30" style={{ background: c.bg, borderColor: c.border }}>
            <p className="text-[10px] text-[#8B7FA8] mb-1.5">{c.label}</p>
            <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [confirmAction, setConfirmAction] = useState<{ userId: number; action: string; label: string } | null>(null)
  const [resendingId, setResendingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100 }
      if (filter === 'premium') params.subscription = 'premium'
      if (filter === 'free') params.subscription = 'free'
      if (filter === 'admin') params.is_admin = true
      if (filter === 'inactive') params.is_active = false
      if (filter === 'unverified') params.email_verified = false
      const r = await adminApi.listUsers(params)
      setUsers(r.data.users || [])
      setTotal(r.data.total || 0)
    } catch { setUsers([]) }
    finally { setLoading(false) }
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleAction = async (userId: number, action: string, value?: any) => {
    try {
      if (action === 'delete') {
        await adminApi.deleteUser(userId)
      } else {
        const data: any = {}
        if (action === 'toggle_premium') data.subscription_type = value
        if (action === 'toggle_admin') data.is_admin = value
        if (action === 'toggle_active') data.is_active = value
        await adminApi.updateUser(userId, data)
      }
      setConfirmAction(null)
      load()
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Ошибка')
    }
  }

  const handleResend = async (userId: number, email: string) => {
    setResendingId(userId)
    try {
      await adminApi.resendVerification(userId)
      alert(`Письмо отправлено на ${email}`)
    } catch (e: any) {
      alert(e?.response?.data?.detail || 'Ошибка отправки письма')
    } finally {
      setResendingId(null)
    }
  }

  const FILTERS = [
    { id: 'all', label: 'Все' },
    { id: 'premium', label: 'Premium' },
    { id: 'free', label: 'Free' },
    { id: 'admin', label: 'Admin' },
    { id: 'inactive', label: 'Неактивные' },
    { id: 'unverified', label: 'Не подтверждён' },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-[#8B7FA8]">Всего: {total}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all',
                filter === f.id ? 'bg-[rgba(212,175,55,0.1)] text-[#D4AF37] border border-[rgba(212,175,55,0.2)]' : 'text-[#8B7FA8] hover:text-[#F0EAD6]'
              )}>{f.label}</button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" /></div> : (
        <div className="space-y-1">
          {users.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[rgba(212,175,55,0.03)] transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-[rgba(212,175,55,0.06)] flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-[#D4AF37]">{(u.email as string)[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-[#F0EAD6] truncate">{u.email}</span>
                  {u.email_verified ? (
                    <MailCheck className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                  ) : (
                    <button
                      onClick={() => handleResend(u.id, u.email)}
                      disabled={resendingId === u.id}
                      className="flex items-center gap-1 text-[#8B7FA8] hover:text-[#D4AF37] transition-colors"
                      title="Отправить письмо повторно"
                    >
                      <MailX className="w-3.5 h-3.5 shrink-0" />
                      {resendingId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <SendHorizonal className="w-3 h-3" />}
                    </button>
                  )}
                  {u.is_admin && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[rgba(123,47,190,0.1)] text-[#9D50E0] border border-[rgba(123,47,190,0.2)]">Admin</span>}
                  <span className={cn('text-[8px] px-1.5 py-0.5 rounded border',
                    u.subscription_type === 'premium' ? 'bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border-[rgba(212,175,55,0.15)]' : 'bg-[rgba(139,127,168,0.06)] text-[#8B7FA8] border-[rgba(139,127,168,0.1)]'
                  )}>{u.subscription_type === 'premium' ? 'Premium' : 'Free'}</span>
                  {!u.is_active && <span className="text-[8px] px-1.5 py-0.5 rounded bg-[rgba(239,68,68,0.1)] text-red-400 border border-[rgba(239,68,68,0.2)]">Inactive</span>}
                </div>
                <p className="text-[10px] text-[#4A3F6A] mt-0.5">Карт: {u.charts_count} · AI/мес: {u.ai_requests_month} · {new Date(u.created_at).toLocaleDateString('ru')}</p>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleAction(u.id, 'toggle_premium', u.subscription_type === 'premium' ? 'free' : 'premium')}
                  className="text-[9px] px-2.5 py-1.5 rounded-lg bg-[rgba(212,175,55,0.08)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.15)] transition-all border border-[rgba(212,175,55,0.1)]">
                  {u.subscription_type === 'premium' ? '→Free' : '→Premium'}
                </button>
                <button onClick={() => handleAction(u.id, 'toggle_admin', !u.is_admin)}
                  className="text-[9px] px-2.5 py-1.5 rounded-lg bg-[rgba(123,47,190,0.08)] text-[#9D50E0] hover:bg-[rgba(123,47,190,0.15)] transition-all border border-[rgba(123,47,190,0.1)]">
                  {u.is_admin ? '−Admin' : '+Admin'}
                </button>
                <button onClick={() => setConfirmAction({ userId: u.id, action: 'delete', label: `Удалить ${u.email}?` })}
                  className="text-[9px] px-2.5 py-1.5 rounded-lg bg-[rgba(239,68,68,0.08)] text-red-400 hover:bg-[rgba(239,68,68,0.15)] transition-all border border-[rgba(239,68,68,0.1)]">
                  Удалить
                </button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p className="text-center text-sm text-[#8B7FA8] py-8">Нет пользователей</p>}
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmAction(null)} />
          <div className="relative bg-[#0d0b1a] rounded-xl border border-[rgba(212,175,55,0.15)] p-6 max-w-sm shadow-2xl">
            <p className="text-sm text-[#F0EAD6] mb-4">{confirmAction.label}</p>
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setConfirmAction(null)} className="text-xs px-3 py-1.5 rounded-lg text-[#8B7FA8] hover:text-[#F0EAD6] transition-all">Отмена</button>
              <button onClick={() => handleAction(confirmAction.userId, confirmAction.action)} className="text-xs px-3 py-1.5 rounded-lg bg-[rgba(239,68,68,0.15)] text-red-400 hover:bg-[rgba(239,68,68,0.25)] transition-all">Подтвердить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InvitesTab() {
  const [codes, setCodes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [showGenMenu, setShowGenMenu] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await adminApi.listInvites()
      setCodes(r.data.codes || [])
    } catch { setCodes([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const generate = async (count: number) => {
    setGenerating(true)
    setShowGenMenu(false)
    try {
      await adminApi.generateInvites(count)
      load()
    } catch { alert('Ошибка генерации') }
    finally { setGenerating(false) }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const usedCount = codes.filter(c => c.used).length
  const availableCount = codes.length - usedCount

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#8B7FA8]">Всего: {codes.length}</span>
          <span className="text-xs text-[#34D399]">Доступно: {availableCount}</span>
          <span className="text-xs text-[#4A3F6A]">Использовано: {usedCount}</span>
        </div>
        <div className="relative">
          <button onClick={() => setShowGenMenu(v => !v)} disabled={generating}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[rgba(123,47,190,0.1)] border border-[rgba(123,47,190,0.2)] text-[#9D50E0] text-xs font-medium hover:bg-[rgba(123,47,190,0.15)] transition-all">
            {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
            Создать код
            <ChevronDown className="w-3 h-3" />
          </button>
          {showGenMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#1a1630] border border-[rgba(212,175,55,0.1)] rounded-lg overflow-hidden z-10 shadow-xl">
              {[1, 5, 10, 25].map(n => (
                <button key={n} onClick={() => generate(n)}
                  className="block w-full px-4 py-2 text-xs text-[#F0EAD6] hover:bg-[rgba(212,175,55,0.08)] transition-colors">{n} {n === 1 ? 'код' : n < 5 ? 'кода' : 'кодов'}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-[#9D50E0] animate-spin" /></div> : (
        <div className="space-y-1">
          {codes.map(c => (
            <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-[rgba(123,47,190,0.03)] transition-colors">
              <button onClick={() => !c.used && copyCode(c.code)}
                className={cn('text-sm font-mono px-2.5 py-1 rounded-lg transition-all',
                  c.used ? 'text-[#4A3F6A] line-through cursor-default' : 'text-[#D4AF37] bg-[rgba(212,175,55,0.06)] hover:bg-[rgba(212,175,55,0.12)] cursor-pointer border border-[rgba(212,175,55,0.1)]'
                )}>
                {c.code}
                {copied === c.code && <span className="ml-1.5 text-[9px] text-[#34D399]">скопирован</span>}
              </button>
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded',
                c.used ? 'bg-[rgba(139,127,168,0.06)] text-[#8B7FA8]' : 'bg-[rgba(52,211,153,0.06)] text-[#34D399]'
              )}>{c.used ? 'Использован' : 'Доступен'}</span>
              {c.used && c.used_email && <span className="text-[10px] text-[#4A3F6A] truncate">→ {c.used_email}</span>}
              <span className="text-[9px] text-[#4A3F6A] ml-auto shrink-0">{new Date(c.created_at).toLocaleDateString('ru')}</span>
            </div>
          ))}
          {codes.length === 0 && <p className="text-center text-sm text-[#8B7FA8] py-8">Нет кодов</p>}
        </div>
      )}
    </div>
  )
}

function SubscribersTab() {
  const [subscribers, setSubscribers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState<number | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await adminApi.listEarlySubscribers({ limit: 200 })
      setSubscribers(r.data.subscribers || [])
      setTotal(r.data.total || 0)
    } catch { setSubscribers([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const invite = async (id: number) => {
    setInviting(id)
    try {
      const r = await adminApi.inviteSubscriber(id)
      const { code, subscriber_email, email_sent } = r.data
      if (email_sent) {
        setToast({ type: 'success', message: `Инвайт-код отправлен на ${subscriber_email}` })
      } else {
        setToast({ type: 'error', message: `Не удалось отправить письмо. Код: ${code} — скопируйте и отправьте вручную` })
      }
      load()
    } catch { setToast({ type: 'error', message: 'Ошибка при создании инвайта' }) }
    finally { setInviting(null) }
  }

  return (
    <div className="p-6 relative">
      {toast && (
        <div className={cn(
          'absolute top-2 right-2 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg border transition-all',
          toast.type === 'success'
            ? 'bg-[rgba(16,185,129,0.12)] text-[#34D399] border-[rgba(16,185,129,0.2)]'
            : 'bg-[rgba(239,68,68,0.12)] text-[#F87171] border-[rgba(239,68,68,0.2)]'
        )}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <MailCheck className="w-4 h-4 shrink-0" /> : <MailX className="w-4 h-4 shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      )}
      <span className="text-xs text-[#8B7FA8] mb-4 block">Всего: {total}</span>
      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-[#34D399] animate-spin" /></div> : (
        <div className="space-y-1">
          {subscribers.map(s => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-[rgba(16,185,129,0.03)] transition-colors">
              <div className="w-7 h-7 rounded-lg bg-[rgba(16,185,129,0.06)] flex items-center justify-center shrink-0">
                <Mail className="w-3 h-3 text-[#34D399]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-[#F0EAD6] truncate block">{s.email}</span>
                {s.source && <span className="text-[10px] text-[#4A3F6A]">{s.source}</span>}
              </div>
              <span className="text-[9px] text-[#4A3F6A] shrink-0">{new Date(s.created_at).toLocaleDateString('ru')}</span>
              {s.is_registered ? (
                <span className="text-[10px] px-3 py-1.5 rounded-lg bg-[rgba(52,211,153,0.08)] text-[#34D399] border border-[rgba(52,211,153,0.15)] shrink-0">Зарегистрирован</span>
              ) : (
                <button onClick={() => invite(s.id)} disabled={inviting === s.id}
                  className="text-[10px] px-3 py-1.5 rounded-lg bg-[rgba(16,185,129,0.08)] text-[#34D399] hover:bg-[rgba(16,185,129,0.15)] transition-all border border-[rgba(16,185,129,0.1)] shrink-0">
                  {inviting === s.id ? '...' : 'Пригласить'}
                </button>
              )}
            </div>
          ))}
          {subscribers.length === 0 && <p className="text-center text-sm text-[#8B7FA8] py-8">Нет подписчиков</p>}
        </div>
      )}
    </div>
  )
}

function AuditTab() {
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState<string>('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: any = { limit: 100 }
      if (entityFilter) params.entity_type = entityFilter
      const r = await adminApi.listAuditLogs(params)
      setLogs(r.data.logs || [])
      setTotal(r.data.total || 0)
    } catch { setLogs([]) }
    finally { setLoading(false) }
  }, [entityFilter])

  useEffect(() => { load() }, [load])

  const ENTITY_FILTERS = ['', 'user', 'invite', 'subscription', 'payment']
  const ACTION_COLORS: Record<string, string> = {
    create: '#34D399', update: '#60A5FA', delete: '#EF4444',
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs text-[#8B7FA8]">Всего: {total}</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1">
          {ENTITY_FILTERS.map(f => (
            <button key={f} onClick={() => setEntityFilter(f)}
              className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all',
                entityFilter === f ? 'bg-[rgba(139,92,246,0.1)] text-[#A78BFA] border border-[rgba(139,92,246,0.2)]' : 'text-[#8B7FA8] hover:text-[#F0EAD6]'
              )}>{f || 'Все'}</button>
          ))}
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-[#A78BFA] animate-spin" /></div> : (
        <div className="space-y-1">
          {logs.map(l => (
            <div key={l.id} className="px-4 py-3 rounded-xl hover:bg-[rgba(139,92,246,0.03)] transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ color: ACTION_COLORS[l.action] || '#8B7FA8', background: `${ACTION_COLORS[l.action] || '#8B7FA8'}15` }}>{l.action}</span>
                <span className="text-sm text-[#F0EAD6]">{l.entity_type} #{l.entity_id}</span>
                <span className="text-[9px] text-[#4A3F6A] ml-auto">{new Date(l.created_at).toLocaleString('ru')}</span>
              </div>
              {l.old_values && l.new_values && (
                <div className="mt-1.5 text-[10px]">
                  {Object.keys(l.new_values).filter(k => l.old_values.get?.(k) !== l.new_values[k] || l.old_values?.[k] !== l.new_values[k]).map(k => (
                    <span key={k} className="mr-3 inline-block">
                      <span className="text-red-400 line-through">{k}: {String(l.old_values?.[k] ?? '—')}</span>
                      <span className="text-[#34D399] ml-1.5">{k}: {String(l.new_values[k])}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {logs.length === 0 && <p className="text-center text-sm text-[#8B7FA8] py-8">Нет записей</p>}
        </div>
      )}
    </div>
  )
}

function TokensTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string>('month')
  const [userId, setUserId] = useState<number | null>(null)

  const getDates = (p: string) => {
    const now = new Date()
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let start: Date
    switch (p) {
      case 'today': start = new Date(end); break
      case '7d': start = new Date(end.getTime() - 7 * 86400000); break
      case '30d': start = new Date(end.getTime() - 30 * 86400000); break
      case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break
      default: start = new Date(2024, 0, 1); break
    }
    return {
      start_date: start.toISOString().split('T')[0],
      end_date: new Date(end.getTime() + 86400000).toISOString().split('T')[0],
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const dates = getDates(period)
      const params: any = dates
      if (userId !== null) params.user_id = userId
      const r = await adminApi.getTokenAnalytics(params)
      setData(r.data)
    } catch { setData(null) }
    finally { setLoading(false) }
  }, [period, userId])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}М`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}К`
    return n.toFixed(0)
  }

  const fmtRub = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}М`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}К`
    return n.toFixed(2)
  }

  const PERIODS = [
    { id: 'today', label: 'Сегодня' },
    { id: '7d', label: '7 дней' },
    { id: '30d', label: '30 дней' },
    { id: 'month', label: 'Этот месяц' },
    { id: 'all', label: 'Всё время' },
  ]

  const s = data?.summary
  const byDate: any[] = data?.by_date || []
  const byUser: any[] = data?.by_user || []
  const maxCost = Math.max(...byDate.map((d: any) => d.cost_rub), 1)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-1">
        {PERIODS.map(p => (
          <button key={p.id} onClick={() => setPeriod(p.id)}
            className={cn('px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all',
              period === p.id ? 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B] border border-[rgba(245,158,11,0.2)]' : 'text-[#8B7FA8] hover:text-[#F0EAD6]'
            )}>{p.label}</button>
        ))}
        {byUser.length > 0 && (
          <>
            <div className="flex-1" />
            <select value={userId ?? ''} onChange={e => setUserId(e.target.value ? Number(e.target.value) : null)}
              className="text-[10px] px-2 py-1.5 rounded-lg bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.1)] text-[#F0EAD6] outline-none">
              <option value="">Все пользователи</option>
              {byUser.map((u: any) => (
                <option key={u.user_id} value={u.user_id}>{u.user_email || `User #${u.user_id}`}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {loading ? <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#F59E0B] animate-spin" /></div> : !data ? <div className="text-center text-[#8B7FA8]">Не удалось загрузить данные</div> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: 'Вх. токены', value: fmt(s?.total_prompt_tokens || 0), color: '#38BDF8', bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.12)' },
              { label: 'Исх. токены', value: fmt(s?.total_completion_tokens || 0), color: '#FB923C', bg: 'rgba(251,146,60,0.06)', border: 'rgba(251,146,60,0.12)' },
              { label: 'Всего токенов', value: fmt(s?.total_tokens || 0), color: '#A78BFA', bg: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.12)' },
              { label: 'Стоимость', value: `${fmtRub(s?.total_cost_rub || 0)}₽`, color: '#F59E0B', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.12)' },
              { label: 'Запросов', value: fmt(s?.total_requests || 0), color: '#9D50E0', bg: 'rgba(157,80,224,0.06)', border: 'rgba(157,80,224,0.12)' },
              { label: 'Ср. стоимость / запрос', value: `${(s?.avg_cost_per_request || 0).toFixed(2)}₽`, color: '#EC4899', bg: 'rgba(236,72,153,0.06)', border: 'rgba(236,72,153,0.12)' },
            ].map(c => (
              <div key={c.label} className="rounded-xl border p-4 transition-colors hover:border-opacity-30" style={{ background: c.bg, borderColor: c.border }}>
                <p className="text-[10px] text-[#8B7FA8] mb-1.5">{c.label}</p>
                <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>

          {byDate.length > 0 && (
            <div className="rounded-xl border border-[rgba(212,175,55,0.08)] bg-[rgba(10,6,18,0.4)] p-4">
              <p className="text-[10px] text-[#8B7FA8] mb-3 uppercase tracking-wider">Стоимость по дням</p>
              <div className="flex gap-[2px] h-32">
                {byDate.map((d: any) => {
                  const h = maxCost > 0 ? (d.cost_rub / maxCost) * 100 : 0
                  const label = d.date.slice(5)
                  return (
                    <div key={d.date} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-0.5 group relative h-full">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-[#F0EAD6] whitespace-nowrap bg-[#1a1630] px-2 py-1 rounded shadow-lg border border-[rgba(212,175,55,0.1)] z-10">
                        {d.cost_rub.toFixed(2)}₽
                      </div>
                      <div className="w-full rounded-t-sm bg-[rgba(245,158,11,0.3)] group-hover:bg-[rgba(245,158,11,0.5)] transition-colors" style={{ height: `${Math.max(h, 2)}%` }} />
                      <span className="text-[8px] text-[#4A3F6A] truncate w-full text-center">{label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {byUser.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] text-[#8B7FA8] uppercase tracking-wider mb-2">По пользователям</p>
              {byUser.map((u: any) => {
                const pct = s?.total_cost_rub ? (u.cost_rub / s.total_cost_rub) * 100 : 0
                return (
                  <div key={u.user_id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-[rgba(245,158,11,0.03)] transition-colors">
                    <div className="w-7 h-7 rounded-lg bg-[rgba(245,158,11,0.06)] flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-[#F59E0B]">{(u.user_email as string)[0]?.toUpperCase() || '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-[#F0EAD6] truncate block">{u.user_email || `User #${u.user_id}`}</span>
                      <div className="text-[10px] text-[#4A3F6A] mt-0.5">
                        Вх: {fmt(u.prompt_tokens)} · Исх: {fmt(u.completion_tokens)} · {u.requests} запр.
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-semibold text-[#F59E0B]">{u.cost_rub.toFixed(2)}₽</span>
                      <div className="text-[10px] text-[#4A3F6A]">
                        <div className="w-16 h-1 rounded-full bg-[rgba(245,158,11,0.1)] mt-0.5">
                          <div className="h-full rounded-full bg-[rgba(245,158,11,0.4)]" style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SettingsTab() {
  const [registrationOpen, setRegistrationOpen] = useState(true)
  const [costInput, setCostInput] = useState('')
  const [costOutput, setCostOutput] = useState('')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPassword, setSmtpPassword] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('')
  const [frontendUrl, setFrontendUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState('')
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    adminApi.getSettings().then(r => {
      const find = (key: string) => r.data.settings?.find((s: { key: string; value: string }) => s.key === key)
      const reg = find('registration_open')
      setRegistrationOpen(reg?.value !== 'false')
      const ci = find('ai_cost_per_1m_input_rub')
      const co = find('ai_cost_per_1m_output_rub')
      if (ci) setCostInput(ci.value)
      if (co) setCostOutput(co.value)
      const sh = find('smtp_host')
      const sp = find('smtp_port')
      const su = find('smtp_user')
      const spw = find('smtp_password')
      const sf = find('smtp_from')
      const fu = find('frontend_url')
      if (sh) setSmtpHost(sh.value)
      if (sp) setSmtpPort(sp.value)
      if (su) setSmtpUser(su.value)
      if (spw) setSmtpPassword(spw.value)
      if (sf) setSmtpFrom(sf.value)
      if (fu) setFrontendUrl(fu.value)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const data: any = { registration_open: registrationOpen }
      if (costInput !== '') data.ai_cost_per_1m_input_rub = parseFloat(costInput)
      if (costOutput !== '') data.ai_cost_per_1m_output_rub = parseFloat(costOutput)
      if (smtpHost !== '') data.smtp_host = smtpHost
      if (smtpPort !== '') data.smtp_port = parseInt(smtpPort, 10)
      if (smtpUser !== '') data.smtp_user = smtpUser
      if (smtpPassword !== '') data.smtp_password = smtpPassword
      if (smtpFrom !== '') data.smtp_from = smtpFrom
      if (frontendUrl !== '') data.frontend_url = frontendUrl
      await adminApi.updateSettings(data)
      setMessage('Настройки сохранены')
      setTimeout(() => setMessage(''), 3000)
    } catch {
      setMessage('Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const handleTestSmtp = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await adminApi.testSmtp()
      setTestResult({ success: r.data.success, message: r.data.message })
    } catch (e: any) {
      setTestResult({ success: false, message: e?.response?.data?.detail || 'Ошибка соединения' })
    } finally {
      setTesting(false)
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-[rgba(10,6,18,0.6)] border border-[rgba(212,175,55,0.12)] text-[#F0EAD6] text-sm focus:outline-none focus:border-[rgba(212,175,55,0.3)]'

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[#9382DC] animate-spin" /></div>

  return (
    <div className="p-6 space-y-6">
      <h2 className="font-serif text-lg font-semibold text-[#F0EAD6]">Настройки регистрации</h2>

      <div className="luxury-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#F0EAD6]">Открытая регистрация</p>
            <p className="text-xs text-[#8B7FA8] mt-1">
              {registrationOpen
                ? 'Любой email может зарегистрироваться без кода приглашения'
                : 'Регистрация только по коду приглашения'}
            </p>
          </div>
          <button
            onClick={() => setRegistrationOpen(!registrationOpen)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              registrationOpen ? 'bg-[#34D399]' : 'bg-[#4A3F6A]'
            )}
          >
            <span className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
              registrationOpen ? 'translate-x-6' : 'translate-x-1'
            )} />
          </button>
        </div>
      </div>

      <h2 className="font-serif text-lg font-semibold text-[#F0EAD6] pt-2">Стоимость токенов</h2>

      <div className="luxury-card p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-[#F0EAD6]">Входящие токены, ₽ за 1М</label>
          <p className="text-xs text-[#8B7FA8] mt-0.5 mb-2">Цена за 1 миллион входящих (prompt) токенов в рублях</p>
          <input type="text" inputMode="decimal" value={costInput} onChange={e => setCostInput(e.target.value)} placeholder="300.00" className={inputCls} />
        </div>
        <div>
          <label className="text-sm font-medium text-[#F0EAD6]">Исходящие токены, ₽ за 1М</label>
          <p className="text-xs text-[#8B7FA8] mt-0.5 mb-2">Цена за 1 миллион исходящих (completion) токенов в рублях</p>
          <input type="text" inputMode="decimal" value={costOutput} onChange={e => setCostOutput(e.target.value)} placeholder="600.00" className={inputCls} />
        </div>
      </div>

      <h2 className="font-serif text-lg font-semibold text-[#F0EAD6] pt-2">Почтовый сервер</h2>

      <div className="luxury-card p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[#F0EAD6]">SMTP Host</label>
            <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} placeholder="smtp.example.com" className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-[#F0EAD6]">SMTP Port</label>
            <input type="text" inputMode="numeric" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} placeholder="587" className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-[#F0EAD6]">SMTP User</label>
            <input type="text" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} placeholder="user@example.com" className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-medium text-[#F0EAD6]">SMTP Password</label>
            <input type="password" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-[#F0EAD6]">SMTP From</label>
          <input type="text" value={smtpFrom} onChange={e => setSmtpFrom(e.target.value)} placeholder="Orbitron &lt;noreply@orbitron.pro&gt;" className={inputCls} />
        </div>
        <div>
          <label className="text-sm font-medium text-[#F0EAD6]">Frontend URL</label>
          <p className="text-xs text-[#8B7FA8] mt-0.5 mb-2">Используется для ссылок в письмах</p>
          <input type="text" value={frontendUrl} onChange={e => setFrontendUrl(e.target.value)} placeholder="https://orbitron.pro" className={inputCls} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleTestSmtp} disabled={testing}
            className="px-4 py-2 rounded-lg bg-[rgba(52,211,153,0.1)] border border-[rgba(52,211,153,0.2)] text-[#34D399] text-sm font-medium hover:bg-[rgba(52,211,153,0.15)] transition-all disabled:opacity-50 flex items-center gap-2">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Проверить соединение
          </button>
          {testResult && (
            <span className={cn('text-sm', testResult.success ? 'text-[#34D399]' : 'text-red-400')}>{testResult.message}</span>
          )}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="btn-gold h-10 px-6 flex items-center justify-center gap-2 text-sm"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сохранить'}
      </button>

      {message && (
        <p className={cn('text-sm', message.includes('Ошибка') ? 'text-red-400' : 'text-[#34D399]')}>{message}</p>
      )}
    </div>
  )
}
