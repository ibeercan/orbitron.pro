import { useState } from 'react'
import { Loader2, Sun, MapPin } from 'lucide-react'
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

interface SolarReturnFormProps {
  natalChartId: number
  onSubmit: (chart: Record<string, unknown>) => void
  onCancel: () => void
}

export function SolarReturnForm({ natalChartId, onSubmit, onCancel }: SolarReturnFormProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [locationOverride, setLocationOverride] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setServerError(null)

    try {
      const res = await chartsApi.createSolarReturn({
        natal_chart_id: natalChartId,
        year,
        location_override: locationOverride.trim() || undefined,
        theme: 'midnight',
      })
      onSubmit(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setServerError(e.response?.data?.detail || 'Не удалось создать солярный возврат')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <FieldLabel required>Год возврата</FieldLabel>
        <NumberPicker value={year} onChange={(v) => setYear(v ?? currentYear)} min={1900} max={currentYear + 1} placeholder="Год" className="w-40" />
        <p className="text-[11px] text-[#4A3F6A] mt-1">
          По умолчанию — текущий год ({currentYear})
        </p>
      </div>

      <div>
        <FieldLabel>Релокация (опционально)</FieldLabel>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3F6A] pointer-events-none" />
          <input
            value={locationOverride}
            onChange={(e) => setLocationOverride(e.target.value)}
            placeholder="55.75, 37.62"
            className="luxury-input w-full h-11 pl-10 text-sm"
          />
        </div>
        <p className="text-[11px] text-[#4A3F6A] mt-1">
          Широта, долгота — для расчёта в другом месте
        </p>
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
            <><Loader2 className="w-4 h-4 animate-spin" />Строим…</>
          ) : (
            <><Sun className="w-4 h-4" />Построить</>
          )}
        </button>
      </div>
    </form>
  )
}
