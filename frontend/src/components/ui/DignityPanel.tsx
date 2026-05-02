import { useState, useEffect } from 'react'
import { Shield, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { chartsApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface DignityPanelProps {
  natalChartId: number
  onClose?: () => void
  onAiInterpret?: () => void
}

interface PlanetDignity {
  planet: string
  sign: string
  degree: number
  traditional: Record<string, unknown> | null
  modern: Record<string, unknown> | null
  total_score: number | null
  is_peregrine: boolean | null
}

interface MutualReception {
  type: string
  planet1: string
  planet2: string
  planet1_sign: string
  planet2_sign: string
  strength: string
  description: string
}

interface AccidentalDignity {
  planet: string
  total_score: number
  house_conditions: Record<string, unknown>[]
  universal_conditions: Record<string, unknown>[]
}

const PLANET_RU: Record<string, string> = {
  Sun: 'Солнце', Moon: 'Луна', Mercury: 'Меркурий', Venus: 'Венера',
  Mars: 'Марс', Jupiter: 'Юпитер', Saturn: 'Сатурн',
  Uranus: 'Уран', Neptune: 'Нептун', Pluto: 'Плутон',
  'North Node': 'Северный узел', 'South Node': 'Южный узел',
  Chiron: 'Хирон', Lilith: 'Лилит',
}

const DIGNITY_RU: Record<string, string> = {
  domicile: 'Обитель', exaltation: 'Экзальтация', triplicity: 'Триплицитет',
  term: 'Термы', face: 'Декада', detriment: 'Заточение', fall: 'Падение',
  peregrine: 'Перегрин',
}

const DIGNITY_SCORE_COLORS: Record<string, string> = {
  domicile: 'text-[#34D399]', exaltation: 'text-[#34D399]',
  triplicity: 'text-[#6EE7B7]', term: 'text-[#6EE7B7]', face: 'text-[#A7F3D0]',
  detriment: 'text-[#F87171]', fall: 'text-[#F87171]',
  peregrine: 'text-[#9CA3AF]',
}

const SIGN_RU: Record<string, string> = {
  Aries: 'Овен', Taurus: 'Телец', Gemini: 'Близнецы', Cancer: 'Рак',
  Leo: 'Лев', Virgo: 'Дева', Libra: 'Весы', Scorpio: 'Скорпион',
  Sagittarius: 'Стрелец', Capricorn: 'Козерог', Aquarius: 'Водолей', Pisces: 'Рыбы',
}

function planetRu(name: string): string {
  return PLANET_RU[name] || name
}

function signRu(name: string): string {
  return SIGN_RU[name] || name
}

function formatDignityEntry(key: string, value: unknown): string | null {
  if (!value || (typeof value === 'object' && !Object.keys(value as Record<string, unknown>).length)) return null
  const label = DIGNITY_RU[key] || key
  const v = value as Record<string, unknown>
  if (typeof v.value === 'number') {
    return `${label} (${v.value > 0 ? '+' : ''}${v.value})`
  }
  return label
}

function SectBadge({ sect }: { sect: string }) {
  const label = sect === 'day' ? 'Дневная' : 'Ночная'
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

export function DignityPanel({ natalChartId, onAiInterpret }: DignityPanelProps) {
  const [data, setData] = useState<{
    sect: string
    planet_dignities: PlanetDignity[]
    mutual_receptions: Record<string, MutualReception[]>
    accidental_dignities: AccidentalDignity[]
    strongest_planet: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedPlanet, setExpandedPlanet] = useState<string | null>(null)
  const [showAccidental, setShowAccidental] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchDignities = async () => {
      try {
        const res = await chartsApi.getDignities(natalChartId)
        if (!cancelled) setData(res.data)
      } catch (err: unknown) {
        if (!cancelled) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          setError(detail || 'Не удалось загрузить достоинства')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchDignities()
    return () => { cancelled = true }
  }, [natalChartId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D4AF37] border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-[#F87171] text-sm">{error}</p>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Shield className="w-4 h-4 text-[#D4AF37]" />
        <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">Достоинства планет</h3>
        <SectBadge sect={data.sect} />
        {data.strongest_planet && (
          <span className="text-xs text-[#8B7FA8]">
            Сильнейшая: <span className="text-[#D4AF37]">{planetRu(data.strongest_planet)}</span>
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {data.planet_dignities.map((p) => {
          const trad = p.traditional as Record<string, unknown> | null
          const score = Number(trad?.score ?? p.total_score ?? 0)
          const isExpanded = expandedPlanet === p.planet
          const dignitiesList = trad?.dignities as string[] | undefined
          const details = trad?.details as Record<string, unknown> | undefined

          return (
            <div key={p.planet} className="luxury-card p-3 cursor-pointer" onClick={() => setExpandedPlanet(isExpanded ? null : p.planet)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#F0EAD6]">{planetRu(p.planet)}</span>
                  <span className="text-[10px] text-[#8B7FA8]">{signRu(p.sign)} {typeof p.degree === 'number' ? `${p.degree.toFixed(1)}°` : ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-md',
                    score >= 5 ? 'bg-[rgba(52,211,153,0.15)] text-[#34D399]' :
                    score >= 3 ? 'bg-[rgba(110,231,183,0.1)] text-[#6EE7B7]' :
                    score >= 1 ? 'bg-[rgba(167,243,208,0.08)] text-[#A7F3D0]' :
                    score <= -5 ? 'bg-[rgba(248,113,113,0.15)] text-[#F87171]' :
                    score <= -3 ? 'bg-[rgba(248,113,113,0.1)] text-[#FCA5A5]' :
                    'bg-[rgba(139,127,168,0.1)] text-[#8B7FA8]'
                  )}>
                    {score > 0 ? '+' : ''}{score}
                  </span>
                  {p.is_peregrine && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(107,114,128,0.1)] text-[#9CA3AF]">Перегрин</span>
                  )}
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-[#4A3F6A]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#4A3F6A]" />}
                </div>
              </div>

              {dignitiesList && dignitiesList.length > 0 && !isExpanded && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {dignitiesList.map((d: string) => (
                    <span key={d} className={cn('text-[9px] px-1.5 py-0.5 rounded', DIGNITY_SCORE_COLORS[d] || 'text-[#8B7FA8]', 'bg-[rgba(255,255,255,0.03)]')}>
                      {DIGNITY_RU[d] || d}
                    </span>
                  ))}
                </div>
              )}

              {isExpanded && details && (
                <div className="mt-2 space-y-1">
                  {Object.entries(details).map(([key, val]) => {
                    const v = val as Record<string, unknown>
                    if (!v || typeof v !== 'object') return null
                    const label = formatDignityEntry(key, val)
                    if (!label) return null
                    const desc = typeof v.description === 'string' ? v.description : ''
                    return (
                      <div key={key} className="flex items-start gap-2 text-xs">
                        <span className={cn('shrink-0 font-medium', DIGNITY_SCORE_COLORS[key] || 'text-[#8B7FA8]')}>
                          {label}
                        </span>
                        {desc && <span className="text-[#6B5F8A]">{desc}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {Object.keys(data.mutual_receptions).length > 0 && (
        <div className="luxury-card p-4">
          <h4 className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider mb-2">Взаимный приём</h4>
          {Object.entries(data.mutual_receptions).map(([system, receptions]) => (
            <div key={system} className="space-y-1">
              {receptions.map((r, i) => (
                <div key={i} className="text-xs text-[#D4C5A0] flex items-start gap-1.5">
                  <span className="text-[#D4AF37]">◇</span>
                  <span>{planetRu(r.planet1)} в {signRu(r.planet2_sign)} ↔ {planetRu(r.planet2)} в {signRu(r.planet1_sign)}</span>
                  <span className="text-[#8B7FA8]">· {r.type.includes('domicile') ? 'по обители' : r.type.includes('exaltation') ? 'по экзальтации' : 'смешанный'}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {data.accidental_dignities.length > 0 && (
        <div className="luxury-card p-4">
          <button className="flex items-center gap-2 w-full text-left" onClick={() => setShowAccidental(!showAccidental)}>
            <h4 className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider">Случайные достоинства</h4>
            {showAccidental ? <ChevronUp className="w-3.5 h-3.5 text-[#4A3F6A]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#4A3F6A]" />}
          </button>
          {showAccidental && (
            <div className="mt-3 space-y-2">
              {data.accidental_dignities.map((a) => (
                <div key={a.planet} className="text-xs">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#F0EAD6] font-medium">{planetRu(a.planet)}</span>
                    <span className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-semibold',
                      a.total_score >= 5 ? 'bg-[rgba(52,211,153,0.15)] text-[#34D399]' :
                      a.total_score >= 3 ? 'bg-[rgba(110,231,183,0.1)] text-[#6EE7B7]' :
                      a.total_score >= 0 ? 'bg-[rgba(139,127,168,0.1)] text-[#8B7FA8]' :
                      'bg-[rgba(248,113,113,0.15)] text-[#F87171]'
                    )}>
                      {a.total_score > 0 ? '+' : ''}{a.total_score}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[#6B5F8A]">
                    {a.house_conditions.map((hc, i) => {
                      const h = hc as Record<string, unknown>
                      const conds = (h.conditions as Record<string, unknown>[] | undefined) || []
                      return conds.map((c, j) => (
                        <span key={`${i}-${j}`}>
                          {typeof c.description === 'string' ? c.description : ''} {typeof c.value === 'number' ? (c.value > 0 ? `+${c.value}` : `${c.value}`) : ''}
                        </span>
                      ))
                    })}
                    {a.universal_conditions.map((c, j) => (
                      <span key={`u-${j}`}>
                        {typeof c.description === 'string' ? c.description : ''} {typeof c.value === 'number' ? (c.value > 0 ? `+${c.value}` : `${c.value}`) : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {onAiInterpret && <AiButton onClick={onAiInterpret} />}
    </div>
  )
}