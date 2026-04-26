import { useState } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { NumberPicker } from '@/components/ui/number-picker'
import { chartsApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

const PLANETS = [
  { id: 'Mercury', label: 'Меркурий', emoji: '☿' },
  { id: 'Venus', label: 'Венера', emoji: '♀' },
  { id: 'Mars', label: 'Марс', emoji: '♂' },
  { id: 'Jupiter', label: 'Юпитер', emoji: '♃' },
  { id: 'Saturn', label: 'Сатурн', emoji: '♄' },
]

interface PlanetaryReturnFormProps {
  natalChartId: number
  onSubmit: (chart: Record<string, unknown>) => void
  onCancel: () => void
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">
      {children}
      {required && <span className="text-[#D4AF37] ml-1">*</span>}
    </label>
  )
}

export function PlanetaryReturnForm({ natalChartId, onSubmit, onCancel }: PlanetaryReturnFormProps) {
  const now = new Date()
  const [planet, setPlanet] = useState('Saturn')
  const [day, setDay] = useState(now.getDate())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [locationOverride, setLocationOverride] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerError(null)
    setIsSubmitting(true)

    const nearDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00`

    try {
      const res = await chartsApi.createPlanetaryReturn({
        natal_chart_id: natalChartId,
        planet,
        near_date: nearDate,
        location_override: locationOverride || undefined,
        theme: 'midnight',
      })
      onSubmit(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string }; status?: number } }
      if (e.response?.status === 403) {
        setServerError('Доступно на тарифе Premium')
      } else {
        setServerError(e.response?.data?.detail || 'Не удалось создать карту')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <FieldLabel required>Планета</FieldLabel>
        <div className="grid grid-cols-5 gap-2">
          {PLANETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlanet(p.id)}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all border',
                planet === p.id
                  ? 'bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.25)]'
                  : 'border-transparent bg-[rgba(212,175,55,0.04)] hover:bg-[rgba(212,175,55,0.08)]'
              )}
            >
              <span className="text-lg leading-none">{p.emoji}</span>
              <span className={cn('text-[10px] font-medium', planet === p.id ? 'text-[#D4AF37]' : 'text-[#8B7FA8]')}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>Искомая дата</FieldLabel>
        <p className="text-[10px] text-[#4A3F6A] mb-2">Будет найден ближайший возврат к этой дате</p>
        <div className="grid grid-cols-3 gap-2.5">
          <NumberPicker value={day} onChange={v => setDay(v ?? 1)} min={1} max={31} placeholder="День" />
          <NumberPicker value={month} onChange={v => setMonth(v ?? 1)} min={1} max={12} placeholder="Мес." />
          <NumberPicker value={year} onChange={v => setYear(v ?? now.getFullYear())} min={1900} max={2100} placeholder="Год" />
        </div>
      </div>

      <div>
        <FieldLabel>Релокация
          <span className="normal-case tracking-normal text-[9px] text-[#4A3F6A] ml-1">необязательно</span>
        </FieldLabel>
        <input
          type="text"
          value={locationOverride}
          onChange={(e) => setLocationOverride(e.target.value)}
          placeholder="55.75, 37.62"
          className="luxury-input w-full h-9 text-xs px-3"
        />
      </div>

      {serverError && (
        <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/08 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1 h-11 text-sm font-medium">
          Отмена
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-gold flex-1 h-11 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Построить
        </button>
      </div>
    </form>
  )
}