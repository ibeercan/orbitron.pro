import { useState, useEffect, useCallback, useMemo } from 'react'
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
  'North Node': 'Восходящий узел',
  'True Node': 'Восходящий узел',
  'Mean Node': 'Восходящий узел',
  'South Node': 'Нисходящий узел',
  'Mean Apogee': 'Чёрная Луна',
  Chiron: 'Хирон',
  Sun: 'Солнце',
  Moon: 'Луна',
}

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mercury: '☿',
  Venus: '♀',
  Mars: '♂',
  Jupiter: '♃',
  Saturn: '♄',
  Uranus: '♅',
  Neptune: '♆',
  Pluto: '♇',
  'North Node': '☊',
  'True Node': '☊',
  'Mean Node': '☊',
  'South Node': '☋',
  'Mean Apogee': '⚸',
  Chiron: '⚷',
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

type AspectCategory = 'harmonious' | 'challenging' | 'neutral'

function getAspectCategory(aspectName: string): AspectCategory {
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

const ASPECT_STYLES: Record<AspectCategory, {
  gradientFrom: string
  gradientTo: string
  border: string
  glow: string
  dot: string
}> = {
  harmonious: {
    gradientFrom: 'rgba(212,175,55,0.12)',
    gradientTo: 'rgba(212,175,55,0.32)',
    border: 'rgba(212,175,55,0.25)',
    glow: '0 0 10px rgba(212,175,55,0.15)',
    dot: '#D4AF37',
  },
  challenging: {
    gradientFrom: 'rgba(196,77,77,0.10)',
    gradientTo: 'rgba(196,77,77,0.28)',
    border: 'rgba(196,77,77,0.22)',
    glow: '0 0 10px rgba(196,77,77,0.10)',
    dot: '#C44D4D',
  },
  neutral: {
    gradientFrom: 'rgba(139,92,246,0.10)',
    gradientTo: 'rgba(139,92,246,0.28)',
    border: 'rgba(139,92,246,0.22)',
    glow: '0 0 10px rgba(139,92,246,0.10)',
    dot: '#8B5CF6',
  },
}

function formatGlyphLabel(entry: TimelineEntry): string {
  const tGlyph = PLANET_GLYPH[entry.transit_planet] || entry.transit_planet
  const nGlyph = PLANET_GLYPH[entry.natal_planet] || entry.natal_planet
  const symbol = ASPECT_RU[entry.aspect_name]?.symbol || '·'
  return `${tGlyph} ${symbol} ${nGlyph}`
}

function formatTextLabel(entry: TimelineEntry): string {
  const tPlanet = PLANET_RU[entry.transit_planet] || entry.transit_planet
  const nPlanet = PLANET_RU[entry.natal_planet] || entry.natal_planet
  const aspect = ASPECT_RU[entry.aspect_name]
  return `${tPlanet} ${aspect?.label || entry.aspect_name} ${nPlanet}`
}

function formatDateShort(d: string): string {
  const date = new Date(d + 'T00:00:00')
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
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

interface MonthMark {
  label: string
  position: number
}

function getMonthsInRange(startStr: string, endStr: string): MonthMark[] {
  const start = new Date(startStr + 'T00:00:00')
  const end = new Date(endStr + 'T00:00:00')
  const totalMs = end.getTime() - start.getTime()
  if (totalMs <= 0) return []

  const months: MonthMark[] = []
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

interface BarGeometry {
  left: number
  width: number
  exactPositions: number[]
}

function computeBarGeometry(entry: TimelineEntry, startMs: number, totalMs: number): BarGeometry {
  if (entry.exact_dates.length === 0 || totalMs <= 0) {
    return { left: 0, width: 100, exactPositions: [] }
  }

  const firstExact = new Date(entry.exact_dates[0] + 'T00:00:00').getTime()
  const lastExact = new Date(entry.exact_dates[entry.exact_dates.length - 1] + 'T00:00:00').getTime()
  const endMs = startMs + totalMs

  let barStart: number
  let barEnd: number

  if (entry.duration_days && entry.duration_days > 0) {
    const halfDurMs = (entry.duration_days / 2) * 86400000
    barStart = Math.max(startMs, firstExact - halfDurMs)
    barEnd = Math.min(endMs, lastExact + halfDurMs)
  } else {
    const spanMs = lastExact - firstExact
    const padMs = spanMs * 0.2 || 30 * 86400000
    barStart = Math.max(startMs, firstExact - padMs)
    barEnd = Math.min(endMs, lastExact + padMs)
  }

  let barLeft = ((barStart - startMs) / totalMs) * 100
  let barWidth = ((barEnd - barStart) / totalMs) * 100

  barLeft = Math.max(0, Math.min(100, barLeft))
  barWidth = Math.max(1.5, Math.min(100 - barLeft, barWidth))

  const exactPositions = entry.exact_dates
    .map((d) => {
      const exactMs = new Date(d + 'T00:00:00').getTime()
      return ((exactMs - startMs) / totalMs) * 100
    })
    .filter((p) => p >= 0 && p <= 100)

  return { left: barLeft, width: barWidth, exactPositions }
}

interface EntryGroup {
  planet: string
  glyph: string
  nameRu: string
  entries: TimelineEntry[]
}

function groupByPlanet(entries: TimelineEntry[]): EntryGroup[] {
  const map = new Map<string, TimelineEntry[]>()
  for (const e of entries) {
    const key = e.transit_planet
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }

  const groups: EntryGroup[] = []
  for (const [planet, items] of map) {
    groups.push({
      planet,
      glyph: PLANET_GLYPH[planet] || planet,
      nameRu: PLANET_RU[planet] || planet,
      entries: items,
    })
  }

  return groups
}

function BarTooltip({ entry }: { entry: TimelineEntry }) {
  const textLabel = formatTextLabel(entry)
  const dates = entry.exact_dates.map(formatDateShort).join(', ')
  const durationStr = entry.duration_days
    ? `Длительность: ${Math.round(entry.duration_days)} дн.`
    : ''

  return (
    <div
      className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg
        bg-[rgba(16,11,30,0.96)] border border-[rgba(212,175,55,0.2)]
        shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl
        opacity-0 group-hover:opacity-100 pointer-events-none
        transition-opacity duration-150 whitespace-nowrap"
    >
      <p className="text-xs font-medium text-[#F0EAD6]">{textLabel}</p>
      <p className="text-[10px] text-[#8B7FA8] mt-0.5">
        Точно: {dates}
      </p>
      {durationStr && (
        <p className="text-[10px] text-[#8B7FA8]">{durationStr}</p>
      )}
    </div>
  )
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

  const months = useMemo(() => getMonthsInRange(startDate, endDate), [startDate, endDate])
  const startMs = new Date(startDate + 'T00:00:00').getTime()
  const totalMs = new Date(endDate + 'T00:00:00').getTime() - startMs

  const groups = useMemo(() => groupByPlanet(entries), [entries])

  if (!isPremium) {
    return (
      <div className="p-5">
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
    <div className="flex flex-col overflow-hidden">
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
            <>
              <div className="overflow-y-auto overflow-x-hidden" style={{ maxHeight: 400 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr' }}>
                  <div
                    className="sticky top-0 z-20 bg-[rgba(16,11,30,0.98)]"
                    style={{ backdropFilter: 'blur(12px)' }}
                  />
                  <div
                    className="relative h-6 flex items-end sticky top-0 z-20 bg-[rgba(16,11,30,0.98)] border-b border-[rgba(212,175,55,0.08)]"
                    style={{ backdropFilter: 'blur(12px)' }}
                  >
                    {months.map((m, i) => (
                      <span
                        key={i}
                        className="absolute text-[9px] font-medium text-[#4A3F6A] select-none"
                        style={{
                          left: `${m.position}%`,
                          transform: 'translateX(-50%)',
                        }}
                      >
                        {m.label}
                      </span>
                    ))}
                  </div>

                  {groups.map((group, gi) => (
                    <div key={group.planet} className="contents">
                      {gi > 0 && (
                        <>
                          <div className="col-span-2 h-px bg-[rgba(212,175,55,0.10)]" />
                          <div />
                          <div />
                        </>
                      )}

                      <div className="flex items-center gap-2 px-3 py-1 bg-[rgba(212,175,55,0.03)]">
                        <span className="text-base leading-none text-[#D4AF37]">{group.glyph}</span>
                        <span className="text-[11px] font-semibold text-[#F0EAD6] truncate">{group.nameRu}</span>
                      </div>
                      <div className="bg-[rgba(212,175,55,0.03)] h-7" />

                      {group.entries.map((entry, ei) => {
                        const category = getAspectCategory(entry.aspect_name)
                        const style = ASPECT_STYLES[category]
                        const geo = computeBarGeometry(entry, startMs, totalMs)
                        const glyphLabel = formatGlyphLabel(entry)

                        return (
                          <div key={`${group.planet}-${ei}`} className="contents">
                            <div className="flex items-center gap-1.5 px-3 h-7 group/row hover:bg-[rgba(212,175,55,0.03)] transition-colors">
                              <span
                                className="shrink-0 w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: style.dot }}
                              />
                              <span className="text-[11px] text-[#C0B8D8] truncate select-none" title={formatTextLabel(entry)}>
                                {glyphLabel}
                              </span>
                              {entry.is_multi_pass && (
                                <span className="shrink-0 text-[8px] text-[#D4AF37] font-bold leading-none">R</span>
                              )}
                            </div>

                            <div className="relative flex items-center h-7 group/row hover:bg-[rgba(212,175,55,0.03)] transition-colors">
                              <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                  backgroundImage: months.length > 1
                                    ? `repeating-linear-gradient(to right, rgba(212,175,55,0.05) 0px, rgba(212,175,55,0.05) 1px, transparent 1px, transparent)`
                                    : undefined,
                                  backgroundSize: `${100 / months.length}% 100%`,
                                }}
                              />

                              <div className="relative w-full h-5 px-1">
                                <div
                                  className={cn(
                                    'absolute top-1/2 -translate-y-1/2 h-3.5 rounded-full group/bar cursor-pointer',
                                    entry.is_multi_pass && 'border-dashed',
                                  )}
                                  style={{
                                    left: `${geo.left}%`,
                                    width: `${geo.width}%`,
                                    background: `linear-gradient(to right, ${style.gradientFrom}, ${style.gradientTo})`,
                                    borderWidth: 1,
                                    borderStyle: entry.is_multi_pass ? 'dashed' : 'solid',
                                    borderColor: style.border,
                                    boxShadow: style.glow,
                                  }}
                                >
                                  <BarTooltip entry={entry} />

                                  {geo.exactPositions.map((pos, di) => {
                                    const relPos = geo.width > 0
                                      ? ((pos - geo.left) / geo.width) * 100
                                      : 50
                                    if (relPos < -2 || relPos > 102) return null
                                    return (
                                      <div
                                        key={di}
                                        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#F0EAD6] z-10"
                                        style={{
                                          left: `${Math.max(0, Math.min(100, relPos))}%`,
                                          transform: 'translate(-50%, -50%)',
                                          boxShadow: `0 0 6px rgba(240,234,214,0.5), 0 0 2px ${style.dot}`,
                                        }}
                                        title={entry.exact_dates[di] ? formatDateShort(entry.exact_dates[di]) : ''}
                                      />
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center gap-5 px-5 py-2.5 border-t border-[rgba(212,175,55,0.06)] flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                  <span className="text-[10px] text-[#8B7FA8]">Гармоничные</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#C44D4D]" />
                  <span className="text-[10px] text-[#8B7FA8]">Напряжённые</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                  <span className="text-[10px] text-[#8B7FA8]">Нейтральные</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#F0EAD6] shadow-[0_0_4px_rgba(240,234,214,0.4)]" />
                  <span className="text-[10px] text-[#8B7FA8]">Точный аспект</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] text-[#D4AF37] font-bold">R</span>
                  <span className="text-[10px] text-[#8B7FA8]">Ретроградный</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
