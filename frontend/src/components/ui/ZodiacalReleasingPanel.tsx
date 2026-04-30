import { useState, useEffect } from 'react'
import { Compass } from 'lucide-react'
import { chartsApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface ZodiacalReleasingPanelProps {
  natalChartId: number
  onClose: () => void
}

interface ZRPeriod {
  level: number
  sign: string
  sign_ru: string
  ruler: string
  ruler_ru: string
  start_date: string
  end_date: string
  length_days: number
  is_peak: boolean
  is_loosing_bond: boolean
  score: number | null
}

const LOT_OPTIONS = [
  { value: 'Part of Fortune', label: 'Лот Фортуны (материальное)' },
  { value: 'Part of Spirit', label: 'Лот Духа (духовное)' },
]

const LEVEL_LABELS: Record<number, string> = {
  1: 'Большие периоды',
  2: 'Подпериоды',
  3: 'Микро-периоды',
  4: 'Микро-микро-периоды',
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function scoreColor(score: number | null): string {
  if (score === null || score === undefined) return 'text-[#8B7FA8]'
  if (score >= 3) return 'text-[#34D399]'
  if (score >= 1) return 'text-[#6EE7B7]'
  if (score <= -3) return 'text-[#F87171]'
  if (score <= -1) return 'text-[#FCA5A5]'
  return 'text-[#8B7FA8]'
}

function scoreBg(score: number | null): string {
  if (score === null || score === undefined) return 'bg-[rgba(139,127,168,0.08)]'
  if (score >= 3) return 'bg-[rgba(52,211,153,0.1)]'
  if (score >= 1) return 'bg-[rgba(110,231,183,0.06)]'
  if (score <= -3) return 'bg-[rgba(248,113,113,0.1)]'
  if (score <= -1) return 'bg-[rgba(248,113,113,0.05)]'
  return 'bg-[rgba(139,127,168,0.05)]'
}

export function ZodiacalReleasingPanel({ natalChartId, onClose }: ZodiacalReleasingPanelProps) {
  const [data, setData] = useState<{
    lot: string
    lot_ru: string
    lot_sign: string
    lot_sign_ru: string
    birth_date: string
    sect: string
    periods: Record<number, ZRPeriod[]>
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLot, setSelectedLot] = useState('Part of Fortune')
  const [maxLevel, setMaxLevel] = useState(2)

  const fetchData = async (lot: string, level: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await chartsApi.getZodiacalReleasing(natalChartId, [lot], level)
      setData(res.data)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(detail || 'Не удалось загрузить зодиакальное высвобождение')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(selectedLot, maxLevel)
  }, [selectedLot, maxLevel, natalChartId])

  const sectLabel = data?.sect === 'day' ? 'Дневная' : data?.sect === 'night' ? 'Ночная' : ''

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Compass className="w-4 h-4 text-[#D4AF37]" />
        <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">Зодиакальное высвобождение</h3>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-wider mb-1.5">Лот</label>
          <select
            value={selectedLot}
            onChange={(e) => setSelectedLot(e.target.value)}
            className="w-full h-9 rounded-lg bg-[rgba(212,175,55,0.05)] border border-[rgba(212,175,55,0.15)] text-sm text-[#F0EAD6] px-3 focus:outline-none focus:border-[#D4AF37]"
          >
            {LOT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-wider mb-1.5">Глубина</label>
          <select
            value={maxLevel}
            onChange={(e) => setMaxLevel(Number(e.target.value))}
            className="w-full h-9 rounded-lg bg-[rgba(212,175,55,0.05)] border border-[rgba(212,175,55,0.15)] text-sm text-[#F0EAD6] px-3 focus:outline-none focus:border-[#D4AF37]"
          >
            <option value={1}>Периоды (L1)</option>
            <option value={2}>С подпериодами (L2)</option>
            <option value={3}>С микропериодами (L3)</option>
          </select>
        </div>
      </div>

      {data && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#8B7FA8]">
          <span className={cn(
            'px-2 py-0.5 rounded-md text-[10px] font-medium',
            data.sect === 'day'
              ? 'bg-[rgba(250,204,21,0.1)] text-[#FACC15] border border-[rgba(250,204,21,0.2)]'
              : 'bg-[rgba(139,92,246,0.1)] text-[#A78BFA] border border-[rgba(139,92,246,0.2)]'
          )}>
            {sectLabel} карта
          </span>
          <span>{data.lot_ru} в {data.lot_sign_ru}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-[#F87171] text-sm">{error}</p>
          <button onClick={onClose} className="mt-4 text-[#8B7FA8] text-xs hover:text-[#D4AF37] transition-colors">
            Закрыть
          </button>
        </div>
      )}

      {data && !loading && !error && (
        <div className="space-y-6">
          {Object.entries(data.periods).map(([levelStr, periods]) => {
            const level = Number(levelStr)
            return (
              <div key={level}>
                <h4 className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-2">
                  {LEVEL_LABELS[level] || `Уровень ${level}`}
                </h4>
                <div className="space-y-1">
                  {periods.map((p, i) => (
                    <div
                      key={i}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs',
                        scoreBg(p.score),
                        p.is_peak && 'ring-1 ring-[rgba(52,211,153,0.3)]',
                        p.is_loosing_bond && 'ring-1 ring-[rgba(248,113,113,0.3)]',
                      )}
                    >
                      <span className="w-16 shrink-0 text-[#8B7FA8] font-mono">
                        {formatDate(p.start_date).replace(/ г\.$/, '')}
                      </span>
                      <span className={cn('font-medium min-w-[70px]', scoreColor(p.score))}>
                        {p.sign_ru}
                      </span>
                      <span className="text-[#6B5F8A] min-w-[70px]">
                        {p.ruler_ru}
                      </span>
                      <span className="flex-1" />
                      {p.is_peak && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(52,211,153,0.12)] text-[#34D399]">Пик</span>
                      )}
                      {p.is_loosing_bond && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(248,113,113,0.12)] text-[#F87171]">Потеря связи</span>
                      )}
                      {p.score !== null && p.score !== undefined && (
                        <span className={cn('text-[10px] font-semibold', scoreColor(p.score))}>
                          {p.score > 0 ? '+' : ''}{p.score}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}