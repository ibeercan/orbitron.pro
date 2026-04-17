import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MapPin, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { chartsApi, geocodingApi } from '@/lib/api/client'

// --- Validation schema ---
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
    theme: z.string().default('classic'),
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

// --- Nominatim suggestion ---
interface GeoSuggestion {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

// --- Location autocomplete component ---
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
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Москва, Россия"
          className={`pl-9 pr-9 ${error ? 'border-red-500/60 focus:border-red-500' : ''}`}
          autoComplete="off"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-white/10 bg-gray-900 shadow-xl overflow-hidden">
          {suggestions.map((s) => {
            const parts = s.display_name.split(',')
            const city = parts[0]
            const rest = parts.slice(1, 3).join(',')
            return (
              <button
                key={s.place_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors group"
              >
                <MapPin className="h-4 w-4 text-secondary-400 mt-0.5 shrink-0 group-hover:text-secondary-300" />
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{city}</p>
                  <p className="text-xs text-gray-500 truncate">{rest}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
}

// --- Date fields ---
function DateTimeFields({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<FormValues>>['register']
  errors: Record<string, { message?: string }>
}) {
  return (
    <div className="space-y-3">
      <Label>Дата рождения</Label>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <Input
            {...register('day')}
            placeholder="День"
            type="number"
            min={1}
            max={31}
            className={errors.day ? 'border-red-500/60' : ''}
          />
          {errors.day && (
            <p className="mt-1 text-xs text-red-400">{errors.day.message}</p>
          )}
        </div>
        <div>
          <Input
            {...register('month')}
            placeholder="Месяц"
            type="number"
            min={1}
            max={12}
            className={errors.month ? 'border-red-500/60' : ''}
          />
          {errors.month && (
            <p className="mt-1 text-xs text-red-400">{errors.month.message}</p>
          )}
        </div>
        <div>
          <Input
            {...register('year')}
            placeholder="Год"
            type="number"
            min={1900}
            max={currentYear}
            className={errors.year ? 'border-red-500/60' : ''}
          />
          {errors.year && (
            <p className="mt-1 text-xs text-red-400">{errors.year.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label className="mb-1.5 block">Время рождения</Label>
        <Input
          {...register('time')}
          placeholder="12:00"
          maxLength={5}
          className={`w-32 ${errors.time ? 'border-red-500/60' : ''}`}
          onChange={(e) => {
            let val = e.target.value.replace(/[^\d:]/g, '')
            if (val.length === 2 && !val.includes(':')) {
              val = val + ':'
            }
            e.target.value = val
            register('time').onChange(e)
          }}
        />
        {errors.time && (
          <p className="mt-1 text-xs text-red-400">{errors.time.message}</p>
        )}
      </div>
    </div>
  )
}

// --- Advanced settings ---
function AdvancedSettings({
  control,
}: {
  control: ReturnType<typeof useForm<FormValues>>['control']
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
      >
        <span>Дополнительные настройки</span>
        {open ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5">
          <div className="pt-4">
            <Label className="mb-1.5 block">Тема оформления</Label>
            <Controller
              name="theme"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="classic">Классическая</SelectItem>
                    <SelectItem value="modern">Современная</SelectItem>
                    <SelectItem value="cosmic">Космическая</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Система домов</Label>
            <Controller
              name="house_system"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placidus">Плацидус</SelectItem>
                    <SelectItem value="whole_sign">Целые знаки</SelectItem>
                    <SelectItem value="koch">Кох</SelectItem>
                    <SelectItem value="porphyrius">Порфирий</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Детализация</Label>
            <Controller
              name="preset"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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

// --- Main modal ---
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
      theme: 'classic',
      house_system: 'placidus',
      preset: 'detailed',
    },
  })

  const locationValue = watch('location')

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true)
    setServerError(null)

    const day = String(data.day).padStart(2, '0')
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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-secondary-400/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-secondary-400" />
            </div>
            <DialogTitle>Новая натальная карта</DialogTitle>
          </div>
          <DialogDescription>
            Введите дату, время и место рождения для построения натальной карты
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 mt-2">
          {/* Date & time */}
          <DateTimeFields register={register} errors={errors as Record<string, { message?: string }>} />

          {/* Location */}
          <div>
            <Label className="mb-1.5 block">Место рождения</Label>
            <LocationAutocomplete
              value={locationValue}
              onChange={(val) => setValue('location', val, { shouldValidate: true })}
              error={(errors.location as { message?: string })?.message}
            />
          </div>

          {/* Advanced */}
          <AdvancedSettings control={control} />

          {/* Server error */}
          {serverError && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {serverError}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Строим карту…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Создать карту
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}