import { useState } from 'react'
import { Loader2, Clock } from 'lucide-react'
import { NumberPicker } from '@/components/ui/number-picker'
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

interface TransitFormProps {
  natalChartId: number
  isPremium: boolean
  onSubmit: (chart: Record<string, unknown>) => void
  onCancel: () => void
}

export function TransitForm({ natalChartId, isPremium, onSubmit, onCancel }: TransitFormProps) {
  const currentYear = new Date().getFullYear()
  const now = new Date()
  const [day, setDay] = useState(now.getDate())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(currentYear)
  const [time, setTime] = useState(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
  const [useCustomDate, setUseCustomDate] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const handleNow = () => {
    const n = new Date()
    setDay(n.getDate())
    setMonth(n.getMonth() + 1)
    setYear(n.getFullYear())
    setTime(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`)
    setUseCustomDate(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setServerError(null)

    let transitDatetime: string | undefined
    if (useCustomDate) {
      const d = String(day).padStart(2, '0')
      const m = String(month).padStart(2, '0')
      transitDatetime = `${year}-${m}-${d}T${time}:00`
    }

    try {
      const res = await chartsApi.createTransit({
        natal_chart_id: natalChartId,
        transit_datetime: transitDatetime,
        theme: 'midnight',
      })
      onSubmit(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string }; status?: number } }
      if (e.response?.status === 403) {
        setServerError('Выбор даты транзитов доступен только на Premium')
      } else {
        setServerError(e.response?.data?.detail || 'Не удалось создать карту транзитов')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {isPremium ? (
        <>
          <div>
            <FieldLabel required>Дата транзита</FieldLabel>
            <div className="grid grid-cols-3 gap-2.5">
              <NumberPicker value={day} onChange={setDay} min={1} max={31} placeholder="День" />
              <NumberPicker value={month} onChange={setMonth} min={1} max={12} placeholder="Мес." />
              <NumberPicker value={year} onChange={setYear} min={1900} max={currentYear + 1} placeholder="Год" />
            </div>
          </div>

          <div>
            <FieldLabel required>Время транзита</FieldLabel>
            <input
              value={time}
              onChange={(e) => {
                let val = e.target.value.replace(/[^\d:]/g, '')
                if (val.length === 2 && !val.includes(':')) val += ':'
                setTime(val)
              }}
              placeholder="12:00"
              maxLength={5}
              className="luxury-input h-11 px-4 text-sm w-36"
            />
          </div>

          <button
            type="button"
            onClick={handleNow}
            className="flex items-center gap-1.5 text-xs text-[#8B7FA8] hover:text-[#D4AF37] transition-colors"
          >
            <Clock className="w-3.5 h-3.5" />
            Сейчас
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUseCustomDate(false)}
              className={cn(
                'flex-1 h-9 rounded-xl text-xs font-medium transition-all',
                !useCustomDate
                  ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
                  : 'text-[#8B7FA8] hover:text-[#D4AF37]'
              )}
            >
              Текущий момент
            </button>
            <button
              type="button"
              onClick={() => setUseCustomDate(true)}
              className={cn(
                'flex-1 h-9 rounded-xl text-xs font-medium transition-all',
                useCustomDate
                  ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
                  : 'text-[#8B7FA8] hover:text-[#D4AF37]'
              )}
            >
              Выбрать дату
            </button>
          </div>
        </>
      ) : (
        <div className="px-4 py-4 rounded-xl bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.1)] text-center">
          <p className="text-sm text-[#F0EAD6] font-medium">Транзиты на текущий момент</p>
          <p className="text-xs text-[#8B7FA8] mt-1">Выбор даты доступен на тарифе Premium</p>
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
            <><Clock className="w-4 h-4" />Построить</>
          )}
        </button>
      </div>
    </form>
  )
}
