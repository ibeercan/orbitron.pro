import React, { useState, useRef, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MapPin, ChevronDown, ChevronUp, Compass } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NumberPicker } from '@/components/ui/number-picker'
import { chartsApi, geocodingApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useFixedDropdown } from '@/hooks/useFixedDropdown'

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate()
}

const currentYear = new Date().getFullYear()

const schema = z
  .object({
    question: z.string().min(3, 'Введите вопрос (минимум 3 символа)'),
    name: z.string().optional(),
    day: z
      .string()
      .min(1, 'Введите день')
      .transform(Number)
      .refine((v) => v >= 1 && v <= 31, 'День от 1 до 31'),
    month: z
      .string()
      .min(1, 'Введите месяц')
      .transform(Number)
      .refine((v) => v >= 1 && v <= 12, 'Месяц от 1 до 12'),
    year: z
      .string()
      .min(1, 'Введите год')
      .transform(Number)
      .refine((v) => v >= 1900 && v <= currentYear + 1, `Год от 1900 до ${currentYear + 1}`),
    time: z
      .string()
      .min(1, 'Введите время')
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Формат HH:MM (24ч)'),
    location: z.string().min(2, 'Выберите место'),
    theme: z.string().default('midnight'),
    house_system: z.string().default('regiomontanus'),
    preset: z.string().default('detailed'),
  })
  .superRefine((data, ctx) => {
    const maxDay = getDaysInMonth(data.month as number, data.year as number)
    if ((data.day as number) > maxDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['day'],
        message: `В этом месяце не более ${maxDay} дней`,
      })
    }
  })

type FormValues = z.input<typeof schema>

interface GeoSuggestion {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">
      {children}
      {required && <span className="text-[#D4AF37] ml-1">*</span>}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">{message}</p>
}

function LocationAutocomplete({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (val: string) => void
  error?: string
}) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { containerRef, setIsOpen, renderDropdown } = useFixedDropdown()

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }
    setIsSearching(true)
    try {
      const results = await geocodingApi.search(q)
      setSuggestions(results.slice(0, 5))
      setIsOpen(results.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }, [setIsOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    onChange('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  const handleSelect = (suggestion: GeoSuggestion) => {
    const shortName = suggestion.display_name.split(',').slice(0, 3).join(',')
    setQuery(shortName)
    onChange(shortName)
    setSuggestions([])
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3F6A] pointer-events-none" />
        <input
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Москва, Россия"
          autoComplete="off"
          className={cn(
            'luxury-input w-full h-11 pl-10 pr-10 text-sm',
            error && 'error'
          )}
        />
        {isSearching && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37] animate-spin" />
        )}
      </div>

      {renderDropdown(
        suggestions.map((s) => {
          const parts = s.display_name.split(',')
          const city = parts[0]
          const rest = parts.slice(1, 3).join(', ')
          return (
            <button
              key={s.place_id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(s)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[rgba(212,175,55,0.05)] transition-colors border-b border-[rgba(212,175,55,0.06)] last:border-0"
            >
              <MapPin className="w-3.5 h-3.5 text-[#D4AF37] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-[#F0EAD6] font-medium truncate">{city}</p>
                <p className="text-xs text-[#8B7FA8] truncate mt-0.5">{rest}</p>
              </div>
            </button>
          )
        })
      )}

      <FieldError message={error} />
    </div>
  )
}

function AdvancedSettings({
  control,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control']
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-[rgba(212,175,55,0.1)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#8B7FA8] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.04)] transition-all"
      >
        <span className="font-medium">Дополнительные настройки</span>
        {open
          ? <ChevronUp className="w-4 h-4" />
          : <ChevronDown className="w-4 h-4" />
        }
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-[rgba(212,175,55,0.08)]">
          <div className="pt-4">
            <FieldLabel>Тема оформления</FieldLabel>
            <Controller
              name="theme"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="luxury-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="luxury-select-content" position="popper" sideOffset={4}>
                    <SelectItem value="midnight">Полночь (тёмная)</SelectItem>
                    <SelectItem value="celestial">Небесная</SelectItem>
                    <SelectItem value="dark">Тёмная</SelectItem>
                    <SelectItem value="classic">Классическая</SelectItem>
                    <SelectItem value="sepia">Сепия</SelectItem>
                    <SelectItem value="neon">Неон</SelectItem>
                    <SelectItem value="pastel">Пастель</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <FieldLabel>Система домов</FieldLabel>
            <Controller
              name="house_system"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="luxury-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="luxury-select-content" position="popper" sideOffset={4}>
                    <SelectItem value="regiomontanus">Региомонтан</SelectItem>
                    <SelectItem value="placidus">Плацидус</SelectItem>
                    <SelectItem value="whole_sign">Целые знаки</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-[11px] text-[#4A3F6A] mt-1">
              Региомонтан — стандартная система для хорарной астрологии
            </p>
          </div>

          <div>
            <FieldLabel>Детализация</FieldLabel>
            <Controller
              name="preset"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="luxury-select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="luxury-select-content" position="popper" sideOffset={4}>
                    <SelectItem value="minimal">Минимальная</SelectItem>
                    <SelectItem value="standard">Стандартная</SelectItem>
                    <SelectItem value="detailed">Подробная</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
      )}
    </div>
  )
}

interface HoraryFormProps {
  onSubmit: (chart: Record<string, unknown>) => void
  onCancel: () => void
}

export function HoraryForm({ onSubmit, onCancel }: HoraryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      question: '',
      name: '',
      day: String(now.getDate()),
      month: String(now.getMonth() + 1),
      year: String(now.getFullYear()),
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      location: '',
      theme: 'midnight',
      house_system: 'regiomontanus',
      preset: 'detailed',
    },
  })

  const locationValue = watch('location')

  const onFormSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    setServerError(null)

    const day = String(data.day).padStart(2, '0')
    const month = String(data.month).padStart(2, '0')
    const datetime = `${data.year}-${month}-${day}T${data.time}:00`

    try {
      const res = await chartsApi.createHorary({
        datetime,
        location: data.location,
        question: data.question,
        name: data.name || undefined,
        theme: data.theme,
        house_system: data.house_system,
        preset: data.preset,
      })
      onSubmit(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setServerError(e.response?.data?.detail || 'Не удалось создать карту')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-5">
      {/* Question */}
      <div>
        <FieldLabel required>Хорарный вопрос</FieldLabel>
        <textarea
          {...register('question')}
          rows={3}
          placeholder="Найду ли я работу в этом году?"
          autoComplete="off"
          className={cn(
            'luxury-input w-full px-4 py-3 text-sm resize-none',
            errors.question && 'error'
          )}
        />
        <FieldError message={(errors.question as { message?: string })?.message} />
        <p className="text-[11px] text-[#4A3F6A] mt-1">
          Сформулируйте конкретный вопрос для хорарной карты
        </p>
      </div>

      {/* Name */}
      <div>
        <FieldLabel>Имя / название</FieldLabel>
        <input
          {...register('name')}
          placeholder="Хорар о работе"
          autoComplete="name"
          className="luxury-input w-full h-11 px-4 text-sm"
        />
      </div>

      {/* Date */}
      <div>
        <FieldLabel required>Момент вопроса</FieldLabel>
        <div className="grid grid-cols-3 gap-2.5">
          <Controller
            name="day"
            control={control}
            render={({ field }) => (
              <NumberPicker
                value={field.value ? Number(field.value) : null}
                onChange={(v) => field.onChange(v !== null ? String(v) : '')}
                min={1}
                max={31}
                placeholder="День"
              />
            )}
          />
          <Controller
            name="month"
            control={control}
            render={({ field }) => (
              <NumberPicker
                value={field.value ? Number(field.value) : null}
                onChange={(v) => field.onChange(v !== null ? String(v) : '')}
                min={1}
                max={12}
                placeholder="Мес."
              />
            )}
          />
          <Controller
            name="year"
            control={control}
            render={({ field }) => (
              <NumberPicker
                value={field.value ? Number(field.value) : null}
                onChange={(v) => field.onChange(v !== null ? String(v) : '')}
                min={1900}
                max={currentYear + 1}
                placeholder="Год"
              />
            )}
          />
        </div>
        {(errors.day || errors.month || errors.year) && (
          <p className="text-[11px] text-red-400 mt-1.5">
            {(errors.day as { message?: string })?.message ||
              (errors.month as { message?: string })?.message ||
              (errors.year as { message?: string })?.message}
          </p>
        )}
      </div>

      {/* Time */}
      <div>
        <FieldLabel required>Время вопроса</FieldLabel>
        <input
          {...register('time')}
          placeholder="12:00"
          maxLength={5}
          inputMode="numeric"
          autoComplete="off"
          className={cn('luxury-input h-11 px-4 text-sm w-36', errors.time && 'error')}
          onChange={(e) => {
            let val = e.target.value.replace(/[^\d:]/g, '')
            if (val.length === 2 && !val.includes(':')) val = val + ':'
            e.target.value = val
            register('time').onChange(e)
          }}
        />
        <FieldError message={(errors.time as { message?: string })?.message} />
      </div>

      {/* Location */}
      <div>
        <FieldLabel required>Место вопроса</FieldLabel>
        <LocationAutocomplete
          value={locationValue}
          onChange={(val) => setValue('location', val, { shouldValidate: true })}
          error={(errors.location as { message?: string })?.message}
        />
        <p className="text-[11px] text-[#4A3F6A] mt-1">
          Место, где вы находились в момент задавания вопроса
        </p>
      </div>

      {/* Advanced settings */}
      <AdvancedSettings control={control} />

      {/* Server error */}
      {serverError && (
        <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/08 text-sm text-red-400">
          {serverError}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="btn-ghost flex-1 h-11 text-sm font-medium"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-gold flex-1 h-11 text-sm flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Строим…</>
          ) : (
            <><Compass className="w-4 h-4" />Построить</>
          )}
        </button>
      </div>
    </form>
  )
}