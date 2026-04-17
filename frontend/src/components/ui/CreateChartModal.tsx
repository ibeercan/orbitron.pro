import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MapPin, ChevronDown, ChevronUp, Star, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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

/* ── Validation schema ── */
function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate()
}

const currentYear = new Date().getFullYear()

const schema = z
  .object({
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
      .refine((v) => v >= 1900 && v <= currentYear, `Год от 1900 до ${currentYear}`),
    time: z
      .string()
      .min(1, 'Введите время')
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Формат HH:MM (24ч)'),
    location: z.string().min(2, 'Выберите место рождения'),
    theme: z.string().default('midnight'),
    house_system: z.string().default('placidus'),
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

/* ── Geocoding suggestion type ── */
interface GeoSuggestion {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

/* ── Styled field label ── */
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">
      {children}
      {required && <span className="text-[#D4AF37] ml-1">*</span>}
    </label>
  )
}

/* ── Styled error message ── */
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-[11px] text-red-400 mt-1.5 flex items-center gap-1">{message}</p>
}

/* ── Location autocomplete ── */
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
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
  }, [])

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

      {/* Dropdown suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-[60] mt-1.5 w-full rounded-xl border border-[rgba(212,175,55,0.15)] overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(22,15,40,0.98) 0%, rgba(13,9,32,0.99) 100%)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.06)',
          }}
        >
          {suggestions.map((s) => {
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
          })}
        </div>
      )}

      <FieldError message={error} />
    </div>
  )
}

/* ── Advanced settings section ── */
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
                  <SelectContent className="luxury-select-content">
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
                  <SelectContent className="luxury-select-content">
                    <SelectItem value="placidus">Плацидус</SelectItem>
                    <SelectItem value="whole_sign">Целые знаки</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
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
                  <SelectContent className="luxury-select-content">
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

/* ── Main modal ── */
interface CreateChartModalProps {
  open: boolean
  onClose: () => void
  onCreated: (chart: {
    id: number
    native_data: { datetime: string; location: string }
    result_data: Record<string, unknown>
    svg_path: string
    prompt_text: string
    created_at: string
  }) => void
}

export function CreateChartModal({ open, onClose, onCreated }: CreateChartModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      day: '',
      month: '',
      year: '',
      time: '',
      location: '',
      theme: 'midnight',
      house_system: 'placidus',
      preset: 'detailed',
    },
  })

  const locationValue = watch('location')

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    setServerError(null)

    const day   = String(data.day).padStart(2, '0')
    const month = String(data.month).padStart(2, '0')
    const datetime = `${data.year}-${month}-${day}T${data.time}:00`

    try {
      const res = await chartsApi.create({
        datetime,
        location: data.location,
        theme: data.theme,
        house_system: data.house_system,
        preset: data.preset,
      })
      reset()
      onCreated(res.data)
      onClose()
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Не удалось создать карту. Попробуйте ещё раз.'
      setServerError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-md w-full">
        <div className="luxury-card overflow-hidden">
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-[rgba(212,175,55,0.08)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
                <Star className="w-4.5 h-4.5 text-[#D4AF37]" style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <DialogTitle className="font-serif text-xl font-semibold text-[#F0EAD6] m-0">
                  Новая натальная карта
                </DialogTitle>
                <DialogDescription className="text-xs text-[#8B7FA8] mt-0.5">
                  Введите дату, время и место рождения
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8B7FA8] hover:text-[#F0EAD6] hover:bg-[rgba(212,175,55,0.08)] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form body */}
          <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {/* ── Date fields ── */}
              <div>
                <FieldLabel required>Дата рождения</FieldLabel>
                <div className="grid grid-cols-3 gap-2.5">
                  <Controller
                    name="day"
                    control={control}
                    render={({ field }) => (
                      <NumberPicker
                        value={field.value ? Number(field.value) : 0}
                        onChange={(v) => field.onChange(String(v))}
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
                        value={field.value ? Number(field.value) : 0}
                        onChange={(v) => field.onChange(String(v))}
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
                        value={field.value ? Number(field.value) : 0}
                        onChange={(v) => field.onChange(String(v))}
                        min={1900}
                        max={currentYear}
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

              {/* ── Time field ── */}
              <div>
                <FieldLabel required>Время рождения</FieldLabel>
                <input
                  {...register('time')}
                  placeholder="12:00"
                  maxLength={5}
                  className={cn('luxury-input h-11 px-4 text-sm w-36', errors.time && 'error')}
                  onChange={(e) => {
                    let val = e.target.value.replace(/[^\d:]/g, '')
                    if (val.length === 2 && !val.includes(':')) val = val + ':'
                    e.target.value = val
                    register('time').onChange(e)
                  }}
                />
                <FieldError message={(errors.time as { message?: string })?.message} />
                <p className="text-[11px] text-[#4A3F6A] mt-1">
                  Используйте 24-часовой формат (например, 14:30)
                </p>
              </div>

              {/* ── Location ── */}
              <div>
                <FieldLabel required>Место рождения</FieldLabel>
                <LocationAutocomplete
                  value={locationValue}
                  onChange={(val) => setValue('location', val, { shouldValidate: true })}
                  error={(errors.location as { message?: string })?.message}
                />
              </div>

              {/* ── Advanced settings ── */}
              <AdvancedSettings control={control} />

              {/* ── Server error ── */}
              {serverError && (
                <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/08 text-sm text-red-400">
                  {serverError}
                </div>
              )}

              {/* ── Actions ── */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
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
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Строим карту…
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4" />
                      Создать карту
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
