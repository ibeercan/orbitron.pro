import { useState, useCallback } from 'react'
import { Sparkles, Loader2, Lock, ChevronDown, ChevronUp, Clock, History } from 'lucide-react'
import { notablesApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface AstroTwinsPanelProps {
  natalChartId: number
  isPremium: boolean
}

interface AstroTwinResult {
  name: string
  category: string
  category_ru: string
  notable_for: string
  score: number
  year: number
  shared_features: string[]
  key_aspects: string[]
}

interface HistoricalParallelResult {
  name: string
  year: number
  notable_for: string
  score: number
  key_aspects: string[]
}

type Tab = 'twins' | 'parallels'

function getScoreColor(score: number): string {
  if (score >= 60) return '#D4AF37'
  if (score >= 50) return '#A0A0B0'
  return '#8B7FA8'
}

function getScoreLabel(score: number): string {
  if (score >= 60) return 'Сильное сходство'
  if (score >= 50) return 'Заметное сходство'
  return 'Частичное сходство'
}

function getScoreBg(score: number): string {
  if (score >= 60) return 'rgba(212,175,55,0.12)'
  if (score >= 50) return 'rgba(160,160,176,0.10)'
  return 'rgba(139,127,168,0.08)'
}

function AstroTwinCard({ twin, rank }: { twin: AstroTwinResult; rank: number }) {
  const [expanded, setExpanded] = useState(false)
  const scoreColor = getScoreColor(twin.score)
  const scoreBg = getScoreBg(twin.score)

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200 cursor-pointer group',
        'hover:border-[rgba(212,175,55,0.25)]',
      )}
      style={{
        background: 'rgba(16,11,30,0.6)',
        borderColor: 'rgba(212,175,55,0.10)',
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-3 p-3">
        <div
          className="shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center"
          style={{ background: scoreBg }}
        >
          <span className="text-sm font-bold leading-none" style={{ color: scoreColor }}>
            {twin.score.toFixed(0)}
          </span>
          <span className="text-[8px] text-[#8B7FA8] leading-none mt-0.5">из 100</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#F0EAD6] truncate">{twin.name}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[rgba(212,175,55,0.08)] text-[#D4AF37] border border-[rgba(212,175,55,0.12)] shrink-0">
              {twin.category_ru}
            </span>
          </div>
          <p className="text-[10px] text-[#8B7FA8] mt-0.5 truncate">{twin.notable_for}</p>
          <p className="text-[9px] text-[#4A3F6A] mt-0.5">
            {twin.year} · {getScoreLabel(twin.score)}
          </p>
        </div>

        <span className="shrink-0 text-[10px] font-bold text-[#4A3F6A] mt-1">#{rank}</span>
      </div>

      {expanded && (twin.shared_features.length > 0 || twin.key_aspects.length > 0) && (
        <div className="px-3 pb-3 pt-1 border-t border-[rgba(212,175,55,0.06)]">
          {twin.shared_features.length > 0 && (
            <div className="mb-2">
              <p className="text-[9px] font-semibold text-[#8B7FA8] uppercase tracking-wider mb-1">Общие черты</p>
              <div className="flex flex-wrap gap-1">
                {twin.shared_features.map((f, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(212,175,55,0.06)] text-[#D4AF37]">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
          {twin.key_aspects.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-[#8B7FA8] uppercase tracking-wider mb-1">Ключевые аспекты</p>
              <div className="flex flex-wrap gap-1">
                {twin.key_aspects.map((a, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(139,92,246,0.06)] text-[#A78BFA]">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ParallelCard({ parallel }: { parallel: HistoricalParallelResult }) {
  const [expanded, setExpanded] = useState(false)
  const scoreColor = getScoreColor(parallel.score)

  return (
    <div
      className="rounded-xl border p-3 transition-all duration-200 cursor-pointer"
      style={{
        background: 'rgba(16,11,30,0.6)',
        borderColor: 'rgba(212,175,55,0.10)',
      }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start gap-3">
        <div
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: 'rgba(139,92,246,0.10)' }}
        >
          <History className="w-4 h-4 text-[#A78BFA]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#F0EAD6] truncate">{parallel.name}</span>
            <span className="text-[10px] font-bold" style={{ color: scoreColor }}>
              {parallel.score.toFixed(0)}%
            </span>
          </div>
          <p className="text-[10px] text-[#8B7FA8] mt-0.5 truncate">{parallel.notable_for}</p>
          <p className="text-[9px] text-[#4A3F6A] mt-0.5">{parallel.year}</p>
        </div>
      </div>

      {expanded && parallel.key_aspects.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[rgba(212,175,55,0.06)]">
          <p className="text-[9px] font-semibold text-[#8B7FA8] uppercase tracking-wider mb-1">Резонирующие аспекты</p>
          <div className="flex flex-wrap gap-1">
            {parallel.key_aspects.map((a, i) => (
              <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(139,92,246,0.06)] text-[#A78BFA]">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AstroTwinsPanel({ natalChartId, isPremium }: AstroTwinsPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<Tab>('twins')
  const [twins, setTwins] = useState<AstroTwinResult[]>([])
  const [parallels, setParallels] = useState<HistoricalParallelResult[]>([])
  const [loading, setLoading] = useState(false)

  const fetchTwins = useCallback(async () => {
    setLoading(true)
    try {
      const res = await notablesApi.astroTwins(natalChartId)
      const data = res.data as { status: string; results: AstroTwinResult[] }
      setTwins(data.results || [])
    } catch {
      setTwins([])
    } finally {
      setLoading(false)
    }
  }, [natalChartId])

  const fetchParallels = useCallback(async () => {
    setLoading(true)
    try {
      const res = await notablesApi.historicalParallels(natalChartId)
      const data = res.data as { status: string; results: HistoricalParallelResult[] }
      setParallels(data.results || [])
    } catch {
      setParallels([])
    } finally {
      setLoading(false)
    }
  }, [natalChartId])

  if (!isPremium) {
    return (
      <div className="luxury-card p-5 mt-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">Звёздный двойник</h3>
            <p className="text-xs text-[#8B7FA8]">Найди знаменитостей с похожей картой</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl bg-[rgba(212,175,55,0.03)] border border-[rgba(212,175,55,0.08)]">
          <Lock className="w-6 h-6 text-[#4A3F6A] mb-2" />
          <p className="text-sm text-[#8B7FA8] text-center">Звёздный двойник доступен на тарифе Premium</p>
          <p className="text-xs text-[#4A3F6A] mt-1">Подпишитесь, чтобы найти своих астро-двойников</p>
        </div>
      </div>
    )
  }

  return (
    <div className="luxury-card mt-3 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[rgba(212,175,55,0.03)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-left">
            <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">Звёздный двойник</h3>
            <p className="text-xs text-[#8B7FA8]">
              {expanded ? 'Топ-10 знаменитостей с похожей картой' : 'Найди знаменитостей с похожей картой'}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-[#8B7FA8]" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[#8B7FA8]" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-[rgba(212,175,55,0.08)]">
          <div className="flex items-center gap-1 px-5 py-2 border-b border-[rgba(212,175,55,0.06)]">
            <button
              onClick={() => setTab('twins')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                tab === 'twins'
                  ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] text-[#D4AF37]'
                  : 'text-[#8B7FA8] hover:text-[#F0EAD6]',
              )}
            >
              <Sparkles className="w-3 h-3" />
              Двойники
            </button>
            <button
              onClick={() => setTab('parallels')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                tab === 'parallels'
                  ? 'bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-[#A78BFA]'
                  : 'text-[#8B7FA8] hover:text-[#F0EAD6]',
              )}
            >
              <Clock className="w-3 h-3" />
              Параллели
            </button>
          </div>

          {tab === 'twins' && (
            <div className="p-4">
              {twins.length === 0 && !loading && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <p className="text-sm text-[#8B7FA8]">Найди своих звёздных двойников</p>
                  <button
                    onClick={fetchTwins}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] text-[#D4AF37] text-sm font-medium hover:bg-[rgba(212,175,55,0.15)] transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Найти двойников
                  </button>
                  <p className="text-[10px] text-[#4A3F6A]">Первый расчёт может занять около минуты</p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
                  <p className="text-sm text-[#8B7FA8]">Анализируем 176 знаменитостей…</p>
                  <p className="text-[10px] text-[#4A3F6A]">При первом запросе это может занять около минуты</p>
                </div>
              )}

              {!loading && twins.length > 0 && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {twins.map((twin, i) => (
                      <AstroTwinCard key={twin.name} twin={twin} rank={i + 1} />
                    ))}
                  </div>
                  <div className="flex justify-center mt-3">
                    <button
                      onClick={fetchTwins}
                      className="text-[10px] text-[#4A3F6A] hover:text-[#8B7FA8] transition-colors"
                    >
                      Обновить
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'parallels' && (
            <div className="p-4">
              {parallels.length === 0 && !loading && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <p className="text-sm text-[#8B7FA8]">Исторические параллели</p>
                  <p className="text-[10px] text-[#8B7FA8] text-center max-w-[240px]">
                    Узнайте, какие исторические события резонируют с вашей натальной картой
                  </p>
                  <button
                    onClick={fetchParallels}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)] text-[#A78BFA] text-sm font-medium hover:bg-[rgba(139,92,246,0.15)] transition-all"
                  >
                    <History className="w-4 h-4" />
                    Найти параллели
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="w-6 h-6 text-[#A78BFA] animate-spin" />
                  <p className="text-sm text-[#8B7FA8]">Анализируем исторические события…</p>
                </div>
              )}

              {!loading && parallels.length > 0 && (
                <>
                  <div className="space-y-2">
                    {parallels.map((p) => (
                      <ParallelCard key={p.name} parallel={p} />
                    ))}
                  </div>
                  <div className="flex justify-center mt-3">
                    <button
                      onClick={fetchParallels}
                      className="text-[10px] text-[#4A3F6A] hover:text-[#8B7FA8] transition-colors"
                    >
                      Обновить
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
