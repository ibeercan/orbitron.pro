import { useState, useEffect } from 'react'
import { Hexagon, Sparkles } from 'lucide-react'
import { chartsApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface ArabicPartsPanelProps {
  natalChartId: number
  onClose?: () => void
  onAiInterpret?: () => void
}

interface PartResult {
  name: string
  name_ru: string
  sign: string
  sign_ru: string
  degree: number
  degree_in_sign: number
}

const SIGN_SYMBOLS: Record<string, string> = {
  'Овен': '♈', 'Телец': '♉', 'Близнецы': '♊', 'Рак': '♋',
  'Лев': '♌', 'Дева': '♍', 'Весы': '♎', 'Скорпион': '♏',
  'Стрелец': '♐', 'Козерог': '♑', 'Водолей': '♒', 'Рыбы': '♓',
}

const KEY_PARTS = ['Лот Фортуны', 'Лот Духа', 'Лот Брака', 'Лот Отца', 'Лот Матери', 'Лот Детей']

function formatDegree(degreeInSign: number, signRu: string): string {
  const d = Math.floor(degreeInSign)
  const m = Math.floor((degreeInSign - d) * 60)
  const symbol = SIGN_SYMBOLS[signRu] || ''
  return `${d}°${String(m).padStart(2, '0')}' ${symbol}${signRu}`
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

export function ArabicPartsPanel({ natalChartId, onAiInterpret }: ArabicPartsPanelProps) {
  const [data, setData] = useState<{ parts: PartResult[]; sect: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'key'>('key')

  useEffect(() => {
    let cancelled = false
    const fetchParts = async () => {
      try {
        const res = await chartsApi.getArabicParts(natalChartId)
        if (!cancelled) setData(res.data)
      } catch (err: unknown) {
        if (!cancelled) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          setError(detail || 'Не удалось загрузить арабские части')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchParts()
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

  const displayed = filter === 'key'
    ? data.parts.filter((p) => KEY_PARTS.includes(p.name_ru))
    : data.parts

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Hexagon className="w-4 h-4 text-[#D4AF37]" />
        <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">Арабские части</h3>
        <SectBadge sect={data.sect} />
        <span className="text-xs text-[#8B7FA8]">{data.parts.length} частей</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter('key')}
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg transition-all',
            filter === 'key'
              ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
              : 'text-[#8B7FA8] hover:text-[#D4AF37]'
          )}
        >
          Ключевые
        </button>
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1.5 text-xs rounded-lg transition-all',
            filter === 'all'
              ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
              : 'text-[#8B7FA8] hover:text-[#D4AF37]'
          )}
        >
          Все
        </button>
      </div>

      <div className="space-y-1">
        {displayed.map((part) => {
          const isKey = KEY_PARTS.includes(part.name_ru)
          return (
            <div
              key={part.name}
              className={cn(
                'luxury-card px-3 py-2.5 flex items-center justify-between',
                isKey && 'border-[rgba(212,175,55,0.15)]'
              )}
            >
              <div className="flex items-center gap-2">
                {isKey && <span className="text-[10px] text-[#D4AF37]">◆</span>}
                <span className={cn('text-sm', isKey ? 'text-[#F0EAD6] font-medium' : 'text-[#D4C5A0]')}>
                  {part.name_ru}
                </span>
              </div>
              <span className="text-xs text-[#8B7FA8] font-mono">
                {formatDegree(part.degree_in_sign, part.sign_ru)}
              </span>
            </div>
          )
        })}
      </div>

      {onAiInterpret && <AiButton onClick={onAiInterpret} />}
    </div>
  )
}