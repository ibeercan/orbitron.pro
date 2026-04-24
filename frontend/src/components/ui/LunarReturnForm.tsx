import { useState } from 'react'
import { Loader2, Moon } from 'lucide-react'
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

interface LunarReturnFormProps {
  natalChartId: number
  onSubmit: (chart: Record<string, unknown>) => void
  onCancel: () => void
}

export function LunarReturnForm({ natalChartId, onSubmit, onCancel }: LunarReturnFormProps) {
  const currentYear = new Date().getFullYear()
  const now = new Date()
  const [day, setDay] = useState(now.getDate())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(currentYear)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setServerError(null)

    const d = String(day).padStart(2, '0')
    const m = String(month).padStart(2, '0')
    const nearDate = `${year}-${m}-${d}T12:00:00`

    try {
      const res = await chartsApi.createLunarReturn({
        natal_chart_id: natalChartId,
        near_date: nearDate,
        theme: 'midnight',
      })
      onSubmit(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setServerError(e.response?.data?.detail || 'Не удалось создать лунарный возврат')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <FieldLabel required>Дата для поиска лунара</FieldLabel>
        <div className="grid grid-cols-3 gap-2.5">
          <NumberPicker value={day} onChange={setDay} min={1} max={31} placeholder="День" />
          <NumberPicker value={month} onChange={setMonth} min={1} max={12} placeholder="Мес." />
          <NumberPicker value={year} onChange={setYear} min={1900} max={currentYear + 1} placeholder="Год" />
        </div>
        <p className="text-[11px] text-[#4A3F6A] mt-1">
          Будет найден ближайший лунарный возврат к этой дате
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
            <><Moon className="w-4 h-4" />Построить</>
          )}
        </button>
      </div>
    </form>
  )
}
