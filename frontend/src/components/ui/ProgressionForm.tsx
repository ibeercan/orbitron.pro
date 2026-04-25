import { useState } from 'react'
import { Loader2, Zap } from 'lucide-react'
import { NumberPicker } from '@/components/ui/number-picker'
import { chartsApi } from '@/lib/api/client'

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">
      {children}
      {required && <span className="text-[#D4AF37] ml-1">*</span>}
    </label>
  )
}

interface ProgressionFormProps {
  natalChartId: number
  onSubmit: (chart: Record<string, unknown>) => void
  onCancel: () => void
}

export function ProgressionForm({ natalChartId, onSubmit, onCancel }: ProgressionFormProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [age, setAge] = useState<number | null>(null)
  const [inputMode, setInputMode] = useState<'year' | 'age'>('year')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setServerError(null)

    try {
      const data: {
        natal_chart_id: number
        target_date?: string
        age?: number
        theme: string
      } = {
        natal_chart_id: natalChartId,
        theme: 'midnight',
      }

      if (inputMode === 'year') {
        data.target_date = `${year}-01-01T12:00:00`
      } else if (age !== null) {
        data.age = age
      }

      const res = await chartsApi.createProgression(data)
      onSubmit(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setServerError(e.response?.data?.detail || 'Не удалось создать прогрессии')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <FieldLabel>Способ ввода</FieldLabel>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setInputMode('year')}
            className={cn_mode(inputMode === 'year')}
          >
            Год
          </button>
          <button
            type="button"
            onClick={() => setInputMode('age')}
            className={cn_mode(inputMode === 'age')}
          >
            Возраст
          </button>
        </div>
      </div>

      {inputMode === 'year' ? (
        <div>
          <FieldLabel required>Целевой год</FieldLabel>
          <NumberPicker value={year} onChange={(v) => setYear(v ?? currentYear)} min={1900} max={currentYear + 1} placeholder="Год" className="w-40" />
          <p className="text-[11px] text-[#4A3F6A] mt-1">
            По умолчанию — текущий год ({currentYear})
          </p>
        </div>
      ) : (
        <div>
          <FieldLabel required>Возраст</FieldLabel>
          <NumberPicker value={age} onChange={(v) => setAge(v)} min={0} max={120} placeholder="Возраст" className="w-40" />
          <p className="text-[11px] text-[#4A3F6A] mt-1">
            Прогрессии на указанный возраст
          </p>
        </div>
      )}

      {serverError && (
        <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/08 text-sm text-red-400">
          {serverError}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className="btn-ghost flex-1 h-11 text-sm font-medium">
          Отмена
        </button>
        <button type="submit" disabled={isSubmitting} className="btn-gold flex-1 h-11 text-sm flex items-center justify-center gap-2">
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Строим…</>
          ) : (
            <><Zap className="w-4 h-4" />Построить</>
          )}
        </button>
      </div>
    </form>
  )
}

function cn_mode(active: boolean) {
  return `px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
    active
      ? 'bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] text-[#D4AF37]'
      : 'bg-[rgba(212,175,55,0.04)] border border-transparent text-[#4A3F6A] hover:text-[#8B7FA8]'
  }`
}
