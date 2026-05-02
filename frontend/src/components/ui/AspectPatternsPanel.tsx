import { useState, useEffect } from 'react'
import { TrendingUp, Sparkles } from 'lucide-react'
import { chartsApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface AspectPatternsPanelProps {
  natalChartId: number
  onClose?: () => void
  onAiInterpret?: () => void
}

interface PatternResult {
  name: string
  name_ru: string
  planets: string[]
  aspects: string[]
  element: string | null
  element_ru: string | null
  quality: string | null
  quality_ru: string | null
  focal_planet: string | null
  focal_planet_ru: string | null
  description: string | null
}

const PATTERN_DESCRIPTIONS: Record<string, string> = {
  'Большой трин': 'Три планеты в трине друг к другу — гармоничный поток энергии, природный талант',
  'Тау-квадрат': 'Две планеты в оппозиции с третьей в квадратуре — напряжение и драйв к действию',
  'Йод (Палец Бога)': 'Две планеты в секстиле и обе в квинконсе к третьей — судьбоносная конфигурация',
  'Воздушный змей': 'Большой трин с планетой напротив — творческая реализация через напряжение',
  'Большой крест': 'Четыре планеты в двух оппозициях и четырёх квадратурах — постоянное напряжение и трансформация',
  'Мистический прямоугольник': 'Две оппозиции, соединённые тринами и секстилями — баланс напряжения и гармонии',
  'Стеллиум': 'Три и более планет в одном знаке — концентрация энергии в одной сфере',
}

const ELEMENT_COLORS: Record<string, string> = {
  'Огонь': 'text-[#F87171] bg-[rgba(248,113,113,0.1)]',
  'Земля': 'text-[#34D399] bg-[rgba(52,211,153,0.1)]',
  'Воздух': 'text-[#60A5FA] bg-[rgba(96,165,250,0.1)]',
  'Вода': 'text-[#A78BFA] bg-[rgba(167,139,250,0.1)]',
}

const QUALITY_COLORS: Record<string, string> = {
  'Кардинальный': 'text-[#FACC15] bg-[rgba(250,204,21,0.1)]',
  'Фиксированный': 'text-[#F87171] bg-[rgba(248,113,113,0.1)]',
  'Мутабельный': 'text-[#60A5FA] bg-[rgba(96,165,250,0.1)]',
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

export function AspectPatternsPanel({ natalChartId, onAiInterpret }: AspectPatternsPanelProps) {
  const [data, setData] = useState<{ patterns: PatternResult[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const fetchPatterns = async () => {
      try {
        const res = await chartsApi.getAspectPatterns(natalChartId)
        if (!cancelled) setData(res.data)
      } catch (err: unknown) {
        if (!cancelled) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          setError(detail || 'Не удалось загрузить паттерны')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchPatterns()
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

  if (!data || data.patterns.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="w-8 h-8 text-[#4A3F6A] mx-auto mb-3" />
        <p className="text-[#8B7FA8] text-sm">Паттерны аспектов не найдены в этой карте</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
        <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">Паттерны аспектов</h3>
        <span className="text-xs text-[#8B7FA8]">Найдено: {data.patterns.length}</span>
      </div>

      <div className="space-y-3">
        {data.patterns.map((pattern, i) => {
          const desc = PATTERN_DESCRIPTIONS[pattern.name_ru] || pattern.description
          return (
            <div key={i} className="luxury-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#F0EAD6]">{pattern.name_ru}</h4>
                <div className="flex gap-1.5">
                  {pattern.element_ru && (
                    <span className={cn('text-[9px] px-2 py-0.5 rounded-md font-medium', ELEMENT_COLORS[pattern.element_ru] || 'text-[#8B7FA8] bg-[rgba(139,127,168,0.1)]')}>
                      {pattern.element_ru}
                    </span>
                  )}
                  {pattern.quality_ru && (
                    <span className={cn('text-[9px] px-2 py-0.5 rounded-md font-medium', QUALITY_COLORS[pattern.quality_ru] || 'text-[#8B7FA8] bg-[rgba(139,127,168,0.1)]')}>
                      {pattern.quality_ru}
                    </span>
                  )}
                </div>
              </div>

              {pattern.focal_planet_ru && (
                <div className="text-xs text-[#D4AF37]">
                  Фокальная планета: <span className="font-medium">{pattern.focal_planet_ru}</span>
                </div>
              )}

              <div className="flex flex-wrap gap-1">
                {pattern.planets.map((planet, j) => (
                  <span key={j} className="text-[10px] px-2 py-0.5 rounded bg-[rgba(212,175,55,0.08)] text-[#D4C5A0] border border-[rgba(212,175,55,0.1)]">
                    {planet}
                  </span>
                ))}
              </div>

              {pattern.aspects.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {pattern.aspects.map((asp, j) => (
                    <span key={j} className="text-[9px] text-[#6B5F8A]">
                      {asp}{j < pattern.aspects.length - 1 ? ' ·' : ''}
                    </span>
                  ))}
                </div>
              )}

              {desc && (
                <p className="text-[11px] text-[#8B7FA8] leading-relaxed">{desc}</p>
              )}
            </div>
          )
        })}
      </div>

      {onAiInterpret && <AiButton onClick={onAiInterpret} />}
    </div>
  )
}