import { useState } from 'react'
import { Loader2, Target } from 'lucide-react'
import { NumberPicker } from '@/components/ui/number-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { chartsApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">
      {children}
      {required && <span className="text-[#D4AF37] ml-1">*</span>}
    </label>
  )
}

interface ProfectionFormProps {
  natalChartId: number
  onSubmit: (chart: Record<string, unknown>, meta: Record<string, unknown>) => void
  onCancel: () => void
}

export function ProfectionForm({ natalChartId, onSubmit, onCancel }: ProfectionFormProps) {
  const currentYear = new Date().getFullYear()
  const now = new Date()
  const [mode, setMode] = useState<'date' | 'age'>('date')
  const [day, setDay] = useState(now.getDate())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(currentYear)
  const [age, setAge] = useState(0)
  const [rulership, setRulership] = useState('traditional')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setServerError(null)

    try {
      const payload: Record<string, unknown> = {
        natal_chart_id: natalChartId,
        rulership,
      }
      if (mode === 'date') {
        const d = String(day).padStart(2, '0')
        const m = String(month).padStart(2, '0')
        payload.target_date = `${year}-${m}-${d}`
      } else {
        payload.age = age
      }

      const res = await chartsApi.createProfection(payload as Parameters<typeof chartsApi.createProfection>[0])
      const chart = res.data.chart ?? res.data
      const meta = res.data.chart ? {
        profected_house: res.data.profected_house,
        profected_sign: res.data.profected_sign,
        ruler: res.data.ruler,
        ruler_house: res.data.ruler_house,
        ruler_position: res.data.ruler_position,
        planets_in_house: res.data.planets_in_house,
        monthly: res.data.monthly,
      } : {}
      onSubmit(chart, meta)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setServerError(e.response?.data?.detail || 'Не удалось рассчитать профекцию')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMode('date')}
          className={cn(
            'flex-1 h-9 rounded-xl text-xs font-medium transition-all',
            mode === 'date'
              ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
              : 'text-[#8B7FA8] hover:text-[#D4AF37]'
          )}
        >
          По дате
        </button>
        <button
          type="button"
          onClick={() => setMode('age')}
          className={cn(
            'flex-1 h-9 rounded-xl text-xs font-medium transition-all',
            mode === 'age'
              ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
              : 'text-[#8B7FA8] hover:text-[#D4AF37]'
          )}
        >
          По возрасту
        </button>
      </div>

      {mode === 'date' ? (
        <div>
          <FieldLabel required>Дата расчёта</FieldLabel>
          <div className="grid grid-cols-3 gap-2.5">
            <NumberPicker value={day} onChange={(v) => setDay(v ?? 1)} min={1} max={31} placeholder="День" />
            <NumberPicker value={month} onChange={(v) => setMonth(v ?? 1)} min={1} max={12} placeholder="Мес." />
            <NumberPicker value={year} onChange={(v) => setYear(v ?? currentYear)} min={1900} max={currentYear + 1} placeholder="Год" />
          </div>
        </div>
      ) : (
        <div>
          <FieldLabel required>Возраст</FieldLabel>
          <NumberPicker value={age} onChange={(v) => setAge(v ?? 0)} min={0} max={120} placeholder="Возраст" className="w-32" />
          <p className="text-[11px] text-[#4A3F6A] mt-1">0 = первый год жизни (1-й дом)</p>
        </div>
      )}

      <div>
        <FieldLabel>Система управителей</FieldLabel>
        <Select value={rulership} onValueChange={setRulership}>
          <SelectTrigger className="luxury-select-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="luxury-select-content">
            <SelectItem value="traditional">Традиционная</SelectItem>
            <SelectItem value="modern">Современная</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
            <><Loader2 className="w-4 h-4 animate-spin" />Расчитываем…</>
          ) : (
            <><Target className="w-4 h-4" />Рассчитать</>
          )}
        </button>
      </div>
    </form>
  )
}
