import { useState, useEffect, useCallback } from 'react'
import { Clock, Loader2, Lock, ChevronDown, ChevronUp } from 'lucide-react'
import { chartsApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface TransitTimelineProps {
  natalChartId: number
  parentChartId?: number | null
  isPremium: boolean
}

interface TimelineEntry {
  transit_planet: string
  natal_planet: string
  aspect_name: string
  exact_dates: string[]
  is_multi_pass: boolean
  duration_days: number | null
}

interface TimelineResponse {
  entries: TimelineEntry[]
}

const PLANET_RU: Record<string, string> = {
  Mercury: 'Меркурий',
  Venus: 'Венера',
  Mars: 'Марс',
  Jupiter: 'Юпитер',
  Saturn: 'Сатурн',
  Uranus: 'Уран',
  Neptune: 'Нептун',
  Pluto: 'Плутон',
  'North Node': 'Rahu',
  Chiron: 'Хирон',
  Sun: 'Солнце',
  Moon: 'Луна',
}

const ASPECT_RU: Record<string, { label: string; symbol: string }> = {
  conjunction: { label: 'Соединение', symbol: '☌' },
  square: { label: 'Квадратура', symbol: '□' },
  opposition: { label: 'Оппозиция', symbol: '☍' },
  trine: { label: 'Трин', symbol: '△' },
  sextile: { label: 'Секстиль', symbol: '⚹' },
}

const MONTH_LABELS_RU = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
]

function getAspectColor(aspectName: string): string {
  switch (aspectName) {
    case 'trine':
    case 'sextile':
      return 'rgba(212,175,55,0.5)'
    case 'square':
    case 'opposition':
      return 'rgba(239,68,68,0.5)'
    case 'conjunction':
      return 'rgba(139,92,246,0.5)'
    default:
      return 'rgba(139,92,246,0.5)'
  }
}

function getAspectBorderColor(aspectName: string): string {
  switch (aspectName) {
    case 'trine':
    case 'sextile':
      return 'rgba(212,175,55,0.35)'
    case 'square':
    case 'opposition':
      return 'rgba(239,68,68,0.35)'
    case 'conjunction':
      return 'rgba(139,92,246,0.35)'
    default:
      return 'rgba(139,92,246,0.35)'
  }
}

function getAspectCategory(aspectName: string): string {
  switch (aspectName) {
    case 'trine':
    case 'sextile':
      return 'harmonious'
    case 'square':
    case 'opposition':
      return 'challenging'
    default:
      return 'neutral'
  }
}

function formatRowLabel(entry: TimelineEntry): string {
  const tPlanet = PLANET_RU[entry.transit_planet] || entry.transit_planet
  const nPlanet = PLANET_RU[entry.natal_planet] || entry.natal_planet
  const aspect = ASPECT_RU[entry.aspect_name]
  const symbol = aspect?.symbol || '·'
  return `${tPlanet} ${symbol} ${nPlanet}`
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getDefaultStart(): string {
  return toISODate(new Date())
}

function getDefaultEnd(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 6)
  return toISODate(d)
}

function getMonthsInRange(startStr: string, endStr: string): { label: string; position: number }[] {
  const start = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  const totalMs = end.getTime() - start.getTime()
  if (totalMs <= 0) return []

  const months: { label: string; position: number }[] = []
  const current = new Date(start.getFullYear(), start.getMonth(), 1)

  while (current <= end) {
    const msFromStart = current.getTime() - start.getTime()
    const position = (msFromStart / totalMs) * 100
    if (position >= 0 && position <= 100) {
      months.push({
        label: MONTH_LABELS_RU[current.getMonth()],
        position: Math.min(100, Math.max(0, position)),
      })
    }
    current.setMonth(current.getMonth() + 1)
  }

  return months
}

export function TransitTimeline({ natalChartId, parentChartId, isPremium }: TransitTimelineProps) {
  const effectiveNatalId = parentChartId ?? natalChartId
  const [startDate, setStartDate] = useState(getDefaultStart())
  const [endDate, setEndDate] = useState(getDefaultEnd())
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchData = useCallback(async () => {
    if (!isPremium) return
    setLoading(true)
    try {
      const res = await chartsApi.getTransitTimeline(effectiveNatalId, startDate, endDate)
      const data = res.data as TimelineResponse
      setEntries(data.entries || [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [effectiveNatalId, startDate, endDate, isPremium])

  useEffect(() => {
    if (expanded && isPremium) {
      fetchData()
    }
  }, [expanded, isPremium, fetchData])

  const months = getMonthsInRange(startDate, endDate)
  const startMs = new Date(startDate + 'T00:00:00').getTime()
  const endMs = new Date(endDate + 'T00:00:00').getTime()
  const totalMs = endMs - startMs

  if (!isPremium) {
    return (
      <div className="luxury-card p-5 mt-3">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
            <Clock className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">Транзитный таймлайн</h3>
            <p className="text-xs text-[#8B7FA8]">Временная шкала транзитных аспектов</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl bg-[rgba(212,175,55,0.03)] border border-[rgba(212,175,55,0.08)]">
          <Lock className="w-6 h-6 text-[#4A3F6A] mb-2" />
          <p className="text-sm text-[#8B7FA8] text-center">Транзитный таймлайн доступен на тарифе Premium</p>
          <p className="text-xs text-[#4A3F6A] mt-1">Подпишитесь, чтобы увидеть временную шкалу аспектов</p>
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
            <Clock className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="text-left">
            <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">Транзитный таймлайн</h3>
            <p className="text-xs text-[#8B7FA8]">
              {expanded ? `${startDate} — ${endDate}` : 'Временная шкала транзитных аспектов'}
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
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[rgba(212,175,55,0.06)] flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em]">С</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="luxury-input h-8 px-2.5 text-xs w-[120px] sm:w-[130px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em]">По</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="luxury-input h-8 px-2.5 text-xs w-[120px] sm:w-[130px]"
              />
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] text-[#D4AF37] text-xs font-medium hover:bg-[rgba(212,175,55,0.15)] transition-all disabled:opacity-50"
            >
              <Clock className="w-3 h-3" />
              Обновить
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
              <p className="text-sm text-[#8B7FA8]">Загрузка таймлайна…</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <p className="text-sm text-[#8B7FA8]">Нет транзитных аспектов в выбранном периоде</p>
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
              <div className="relative px-3 sm:px-5 pt-2 pb-1">
                <div className="flex justify-between text-[10px] text-[#4A3F6A] mb-1" style={{ marginLeft: 100 }}>
                  {months.map((m, i) => (
                    <span
                      key={i}
                      className="absolute"
                      style={{ left: `calc(100px + (100% - 100px) * ${m.position / 100})`, transform: 'translateX(-50%)' }}
                    >
                      {m.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="relative overflow-x-auto" style={{ paddingLeft: 100, minWidth: 0 }}>
                {months.map((m, i) => (
                  <div
                    key={`grid-${i}`}
                    className="absolute top-0 bottom-0 border-l border-[rgba(212,175,55,0.06)]"
                    style={{ left: `${m.position}%` }}
                  />
                ))}

                {entries.map((entry, idx) => {
                  const color = getAspectColor(entry.aspect_name)
                  const borderColor = getAspectBorderColor(entry.aspect_name)
                  const category = getAspectCategory(entry.aspect_name)

                  let barLeft = 0
                  let barWidth = 100
                  if (entry.exact_dates.length > 0 && totalMs > 0) {
                    const firstExact = new Date(entry.exact_dates[0] + 'T00:00:00').getTime()
                    const lastExact = new Date(entry.exact_dates[entry.exact_dates.length - 1] + 'T00:00:00').getTime()
                    const spanMs = lastExact - firstExact

                    if (entry.duration_days && entry.duration_days > 0) {
                      const halfDurMs = (entry.duration_days / 2) * 86400000
                      const barStart = Math.max(startMs, firstExact - halfDurMs)
                      const barEnd = Math.min(endMs, lastExact + halfDurMs)
                      barLeft = ((barStart - startMs) / totalMs) * 100
                      barWidth = ((barEnd - barStart) / totalMs) * 100
                    } else {
                      const padMs = spanMs * 0.2 || 30 * 86400000
                      const barStart = Math.max(startMs, firstExact - padMs)
                      const barEnd = Math.min(endMs, lastExact + padMs)
                      barLeft = ((barStart - startMs) / totalMs) * 100
                      barWidth = ((barEnd - barStart) / totalMs) * 100
                    }
                  }

                  barLeft = Math.max(0, Math.min(100, barLeft))
                  barWidth = Math.max(2, Math.min(100 - barLeft, barWidth))

                  return (
                    <div key={idx} className="flex items-center h-8 border-b border-[rgba(212,175,55,0.04)]">
                      <div
                        className="absolute left-0 w-[100px] flex items-center px-1 sm:px-3 text-[10px] sm:text-[11px] text-[#F0EAD6] truncate z-10"
                        style={{ top: `calc(${idx * 32}px)` }}
                      >
                        <span className={cn(
                          'shrink-0 w-1.5 h-1.5 rounded-full mr-2',
                          category === 'harmonious' && 'bg-[#D4AF37]',
                          category === 'challenging' && 'bg-red-500',
                          category === 'neutral' && 'bg-violet-500',
                        )} />
                        <span className="truncate">{formatRowLabel(entry)}</span>
                        {entry.is_multi_pass && (
                          <span className="shrink-0 ml-1 text-[9px] text-[#D4AF37] font-bold">R</span>
                        )}
                      </div>
                      <div
                        className="absolute h-5 rounded-sm"
                        style={{
                          left: `${barLeft}%`,
                          width: `${barWidth}%`,
                          backgroundColor: color,
                          borderColor,
                          borderWidth: 1,
                          borderStyle: 'solid',
                          top: `${idx * 32 + 6}px`,
                        }}
                      >
                        {entry.exact_dates.map((d, di) => {
                          if (totalMs <= 0) return null
                          const exactMs = new Date(d + 'T00:00:00').getTime()
                          const pos = ((exactMs - startMs) / totalMs) * 100
                          if (pos < 0 || pos > 100) return null
                          const barStartMs = barLeft / 100 * totalMs + startMs
                          const barW = barWidth / 100 * totalMs
                          const relPos = barW > 0 ? ((exactMs - barStartMs) / barW) * 100 : 50
                          if (relPos < 0 || relPos > 100) return null
                          return (
                            <div
                              key={di}
                              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 bg-[#F0EAD6] border border-[rgba(212,175,55,0.3)] z-10"
                              style={{ left: `${relPos}%`, transform: 'translateX(-50%) rotate(45deg) translateY(-50%)' }}
                              title={d}
                            />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-6 px-5 py-3 border-t border-[rgba(212,175,55,0.06)]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
              <span className="text-[10px] text-[#8B7FA8]">Гармоничные</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-[10px] text-[#8B7FA8]">Напряжённые</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-[10px] text-[#8B7FA8]">Нейтральные</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rotate-45 bg-[#F0EAD6] border border-[rgba(212,175,55,0.3)]" />
              <span className="text-[10px] text-[#8B7FA8]">Точный аспект</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-[#D4AF37] font-bold">R</span>
              <span className="text-[10px] text-[#8B7FA8]">Ретроградный</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}