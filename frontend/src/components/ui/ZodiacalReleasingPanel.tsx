import { useState, useEffect } from 'react'
import { Compass, Sparkles } from 'lucide-react'
import { chartsApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ZodiacalReleasingPanelProps {
  natalChartId: number
  onClose?: () => void
  onAiInterpret?: () => void
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



function SectBadge({ sect }: { sect: string }) {
  const label = sect === 'day' ? 'Дневная' : sect === 'night' ? 'Ночная' : ''
  if (!label) return null
  return (
    <span className={cn(
      'px-2 py-0.5 rounded-md text-[10px] font-medium',
      sect === 'day'
        ? 'bg-[rgba(250,204,21,0.1)] text-[#FACC15] border border-[rgba(250,204,21,0.2)]'
        : 'bg-[rgba(139,92,246,0.1)] text-[#A78BFA] border border-[rgba(139,92,246,0.2)]'
    )}>
      {label}
    </span>
  )
}

function AiButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8960F] text-[#0A0612] font-semibold text-sm hover:from-[#E0BD4A] hover:to-[#C9A528] transition-all"
    >
      <Sparkles className="w-4 h-4" />
      ИИ-интерпретация
    </button>
  )
}

export function ZodiacalReleasingPanel({ natalChartId, onAiInterpret }: ZodiacalReleasingPanelProps) {
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Compass className="w-4 h-4 text-[#D4AF37]" />
        <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">Зодиакальное высвобождение</h3>
        {data && <SectBadge sect={data.sect} />}
        {data && <span className="text-xs text-[#8B7FA8]">{data.lot_ru} в {data.lot_sign_ru}</span>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-wider mb-1.5">Лот</label>
          <Select value={selectedLot} onValueChange={setSelectedLot}>
            <SelectTrigger className="luxury-select-trigger h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="luxury-select-content" position="popper" sideOffset={4}>
              {LOT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-wider mb-1.5">Глубина</label>
          <Select value={String(maxLevel)} onValueChange={(v) => setMaxLevel(Number(v))}>
            <SelectTrigger className="luxury-select-trigger h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="luxury-select-content" position="popper" sideOffset={4}>
              <SelectItem value="1">Периоды (L1)</SelectItem>
              <SelectItem value="2">С подпериодами (L2)</SelectItem>
              <SelectItem value="3">С микропериодами (L3)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="text-center py-8">
          <p className="text-[#F87171] text-sm">{error}</p>
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
                        'luxury-card px-3 py-2 flex items-center gap-2 text-xs',
                        p.is_peak && 'border-[rgba(52,211,153,0.3)]',
                        p.is_loosing_bond && 'border-[rgba(248,113,113,0.3)]',
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

      {onAiInterpret && <AiButton onClick={onAiInterpret} />}
    </div>
  )
}