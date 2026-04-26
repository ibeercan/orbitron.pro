import { useState, useEffect, useRef } from 'react'
import { Loader2, MapPin, ChevronDown, ChevronUp, Sparkles, Check } from 'lucide-react'
import { NumberPicker } from '@/components/ui/number-picker'
import { chartsApi, geocodingApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useFixedDropdown } from '@/hooks/useFixedDropdown'

const PRESETS = [
  { id: 'general', label: 'Общее', desc: 'Растущая Луна, не без курса, Меркурий прямой' },
  { id: 'business', label: 'Бизнес', desc: 'Юпитер в хорошем доме, нет поражения Луны' },
  { id: 'relationship', label: 'Отношения', desc: 'Венера прямая, гармония Луны и Венеры' },
  { id: 'contracts', label: 'Контракты', desc: 'Меркурий прямой, Луна не в трудных знаках' },
  { id: 'competition', label: 'Конкуренция', desc: 'Марс прямой и силён, нет напряжённых аспектов' },
  { id: 'expansion', label: 'Расширение', desc: 'Юпитер прямой, Луна к benefics' },
]

const CONDITIONS = [
  { key: 'moon_waxing', label: 'Растущая Луна', desc: 'Луна в растущей фазе' },
  { key: 'moon_not_voc', label: 'Луна не без курса', desc: 'Луна имеет применяющие аспекты до смены знака' },
  { key: 'moon_not_combust', label: 'Луна не сожжена', desc: 'Не вблизи Солнца (>8.5°)' },
  { key: 'moon_not_in_difficult_signs', label: 'Луна не в изгнании', desc: 'Не в Скорпионе/Козероге' },
  { key: 'mercury_not_rx', label: 'Меркурий прямой', desc: 'Не ретрограден' },
  { key: 'venus_not_rx', label: 'Венера прямая', desc: 'Не ретроградна' },
  { key: 'jupiter_not_rx', label: 'Юпитер прямой', desc: 'Не ретрограден' },
  { key: 'mars_not_rx', label: 'Марс прямой', desc: 'Не ретрограден' },
  { key: 'no_malefic_to_moon', label: 'Нет поражения Луны', desc: 'Нет напряжённых аспектов от Марса/Сатурна' },
  { key: 'no_hard_to_moon', label: 'Луна без напряжённых', desc: 'Нет квадратур и оппозиций к Луне' },
  { key: 'moon_applying_benefics', label: 'Луна к benefics', desc: 'Примен. аспект к Юпитеру/Венере' },
  { key: 'jupiter_well_placed', label: 'Юпитер в хорошем доме', desc: 'В 1, 4, 7, 10 или 11 доме' },
  { key: 'mars_not_debilitated', label: 'Марс не в изгнании', desc: 'Не в Раке/Весах' },
]

const PRESET_CONDITIONS: Record<string, string[]> = {
  general: ['moon_waxing', 'moon_not_voc', 'mercury_not_rx', 'moon_not_in_difficult_signs'],
  business: ['moon_waxing', 'moon_not_voc', 'mercury_not_rx', 'jupiter_well_placed', 'no_malefic_to_moon'],
  relationship: ['moon_waxing', 'moon_not_voc', 'venus_not_rx', 'moon_not_in_difficult_signs', 'moon_applying_benefics'],
  contracts: ['moon_waxing', 'moon_not_voc', 'mercury_not_rx', 'moon_not_in_difficult_signs'],
  competition: ['mars_not_rx', 'mars_not_debilitated', 'no_hard_to_moon', 'moon_waxing'],
  expansion: ['moon_waxing', 'moon_not_voc', 'jupiter_not_rx', 'moon_applying_benefics'],
}

const DURATION_OPTIONS = [
  { value: 14, label: '2 недели' },
  { value: 30, label: '1 месяц' },
  { value: 90, label: '3 месяца' },
]

interface GeoSuggestion {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

type PollStatus = 'idle' | 'computing' | 'done' | 'error'

interface MomentResult {
  datetime: string
  moon_sign: string | null
  moon_phase: string | null
  conditions_met: string[]
  conditions_missed: string[]
  score: number
  description: string
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">
      {children}
      {required && <span className="text-[#D4AF37] ml-1">*</span>}
    </label>
  )
}

export function ElectionalForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (chart: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const [preset, setPreset] = useState('general')
  const [enabledConditions, setEnabledConditions] = useState<string[]>(PRESET_CONDITIONS.general)
  const [showConditions, setShowConditions] = useState(false)

  const now = new Date()
  const [startDay, setStartDay] = useState(now.getDate())
  const [startMonth, setStartMonth] = useState(now.getMonth() + 1)
  const [startYear, setStartYear] = useState(now.getFullYear())
  const [duration, setDuration] = useState(30)
  const [locationQuery, setLocationQuery] = useState('')
  const [locationValue, setLocationValue] = useState('')
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { containerRef, setIsOpen: setSuggestionsOpen, renderDropdown } = useFixedDropdown()

  const [pollStatus, setPollStatus] = useState<PollStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [moments, setMoments] = useState<MomentResult[]>([])
  const [searchId, setSearchId] = useState<number | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentYear = now.getFullYear()

  useEffect(() => {
    setEnabledConditions(PRESET_CONDITIONS[preset] || [])
  }, [preset])

  const toggleCondition = (key: string) => {
    setEnabledConditions(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  const handleLocationInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setLocationQuery(val)
    setLocationValue('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (val.trim().length < 2) { setSuggestions([]); setSuggestionsOpen(false); return }
      setIsSearching(true)
      try {
        const results = await geocodingApi.search(val)
        setSuggestions(results.slice(0, 5))
        setSuggestionsOpen(results.length > 0)
      } catch { setSuggestions([]) }
      finally { setIsSearching(false) }
    }, 400)
  }

  const handleSelectSuggestion = (s: GeoSuggestion) => {
    const shortName = s.display_name.split(',').slice(0, 3).join(',')
    setLocationQuery(shortName)
    setLocationValue(shortName)
    setSuggestions([])
    setSuggestionsOpen(false)
  }

  const canSearch = locationValue !== '' && enabledConditions.length > 0

  const handleStartSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSearch) return
    setServerError(null)
    setMoments([])
    setPollStatus('computing')
    setProgress(0)

    const startDate = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`
    const endDateObj = new Date(startYear, startMonth - 1 + Math.floor(duration / 30), startDay + (duration % 30))
    const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`

    try {
      const res = await chartsApi.electionalSearch({
        location: locationValue,
        start_date: startDate,
        end_date: endDate,
        preset,
        conditions: enabledConditions,
        step: '4hour',
      })
      const data = res.data as { search_id: number; status: string; progress: number; result?: MomentResult[]; error?: string }
      setSearchId(data.search_id)

      if (data.status === 'done' && data.result) {
        setMoments(data.result)
        setPollStatus('done')
        setProgress(100)
      } else if (data.status === 'computing') {
        setProgress(data.progress || 0)
        const poll = async () => {
          try {
            const pollRes = await chartsApi.electionalPoll(data.search_id)
            const d = pollRes.data as { status: string; progress: number; result?: MomentResult[]; error?: string }
            if (d.status === 'done' && d.result) {
              setMoments(d.result)
              setPollStatus('done')
              setProgress(100)
            } else if (d.status === 'error') {
              setServerError(d.error || 'Ошибка поиска')
              setPollStatus('error')
            } else {
              setProgress(d.progress)
              pollRef.current = setTimeout(poll, 2000)
            }
          } catch {
            setServerError('Ошибка при получении результатов')
            setPollStatus('error')
          }
        }
        pollRef.current = setTimeout(poll, 2000)
      } else if (data.status === 'error') {
        setServerError(data.error || 'Ошибка поиска')
        setPollStatus('error')
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setServerError(e.response?.data?.detail || 'Не удалось начать поиск')
      setPollStatus('error')
    }
  }

  const handleSelectMoment = async (momentIndex: number) => {
    if (!searchId) return
    try {
      const res = await chartsApi.electionalSelect({
        search_id: searchId,
        moment_index: momentIndex,
        theme: 'midnight',
        house_system: 'regiomontanus',
      })
      onSubmit(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setServerError(e.response?.data?.detail || 'Не удалось создать карту')
    }
  }

  const handleCancel = () => {
    if (pollRef.current) clearTimeout(pollRef.current)
    setPollStatus('idle')
    setProgress(0)
    setMoments([])
    setSearchId(null)
    onCancel()
  }

  const handleReset = () => {
    if (pollRef.current) clearTimeout(pollRef.current)
    setPollStatus('idle')
    setProgress(0)
    setMoments([])
    setSearchId(null)
    setServerError(null)
  }

  // Computing state
  if (pollStatus === 'computing') {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full animate-pulse-gold" />
          </div>
          <p className="text-sm text-[#8B7FA8]">Ищем благоприятные моменты…</p>
          <div className="w-full max-w-xs">
            <div className="h-2 rounded-full bg-[rgba(212,175,55,0.1)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C19B25] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-[#4A3F6A] mt-1 text-center">{progress}%</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={handleCancel} className="btn-ghost flex-1 h-11 text-sm font-medium">
            Отмена
          </button>
        </div>
      </div>
    )
  }

  // Results state
  if (pollStatus === 'done' && moments.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#F0EAD6]">
            Найдено моментов: {moments.length}
          </p>
          <button type="button" onClick={handleReset} className="text-xs text-[#8B7FA8] hover:text-[#D4AF37] transition-colors">
            Новый поиск
          </button>
        </div>
        <div className="space-y-2 max-h-[50dvh] overflow-y-auto pr-1">
          {moments.map((m, i) => (
            <button
              key={m.datetime}
              type="button"
              onClick={() => handleSelectMoment(i)}
              className={cn(
                'w-full text-left p-3 rounded-xl border transition-all',
                'border-[rgba(212,175,55,0.08)] hover:border-[rgba(212,175,55,0.25)] hover:bg-[rgba(212,175,55,0.04)]'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[#F0EAD6]">
                  {new Date(m.datetime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className={cn(
                  'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                  m.score >= 80 ? 'bg-[rgba(34,197,94,0.15)] text-green-400' :
                  m.score >= 50 ? 'bg-[rgba(212,175,55,0.15)] text-[#D4AF37]' :
                  'bg-[rgba(255,255,255,0.05)] text-[#8B7FA8]'
                )}>
                  {m.score}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-[#8B7FA8]">
                {m.moon_sign && <span>Луна в {m.moon_sign}</span>}
                {m.moon_phase && <span>· {m.moon_phase}</span>}
                <span>· {m.conditions_met.length}/{m.conditions_met.length + m.conditions_missed.length}</span>
              </div>
            </button>
          ))}
        </div>
        {serverError && (
          <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/08 text-sm text-red-400">
            {serverError}
          </div>
        )}
      </div>
    )
  }

  // Idle / form state
  return (
    <form onSubmit={handleStartSearch} className="space-y-5">
      {/* Preset selector */}
      <div>
        <FieldLabel required>Тип события</FieldLabel>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={cn(
                'px-3 py-2.5 rounded-xl text-left transition-all border',
                preset === p.id
                  ? 'bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.25)]'
                  : 'border-transparent bg-[rgba(212,175,55,0.04)] hover:bg-[rgba(212,175,55,0.08)]'
              )}
            >
              <span className={cn('text-xs font-medium block', preset === p.id ? 'text-[#D4AF37]' : 'text-[#F0EAD6]')}>
                {p.label}
              </span>
              <span className="text-[10px] text-[#4A3F6A] block mt-0.5">{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Conditions toggle */}
      <div className="rounded-xl border border-[rgba(212,175,55,0.1)] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowConditions(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm text-[#8B7FA8] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.04)] transition-all"
        >
          <span className="font-medium">Условия ({enabledConditions.length})</span>
          {showConditions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {showConditions && (
          <div className="px-4 pb-3 space-y-2 border-t border-[rgba(212,175,55,0.08)]">
            {CONDITIONS.map(c => (
              <label key={c.key} className="flex items-start gap-2.5 cursor-pointer group">
                <div className={cn(
                  'w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all shrink-0',
                  enabledConditions.includes(c.key)
                    ? 'bg-[#D4AF37] border-[#D4AF37]'
                    : 'border-[rgba(212,175,55,0.3)] group-hover:border-[rgba(212,175,55,0.5)]'
                )}>
                  {enabledConditions.includes(c.key) && (
                    <Check className="w-2.5 h-2.5 text-[#0A0612]" />
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={enabledConditions.includes(c.key)}
                  onChange={() => toggleCondition(c.key)}
                  className="hidden"
                />
                <div>
                  <span className="text-xs text-[#F0EAD6] font-medium">{c.label}</span>
                  <span className="text-[10px] text-[#4A3F6A] block">{c.desc}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Start date */}
      <div>
        <FieldLabel required>Начало поиска</FieldLabel>
        <div className="grid grid-cols-3 gap-2.5">
          <NumberPicker value={startDay} onChange={v => setStartDay(v ?? 1)} min={1} max={31} placeholder="День" />
          <NumberPicker value={startMonth} onChange={v => setStartMonth(v ?? 1)} min={1} max={12} placeholder="Мес." />
          <NumberPicker value={startYear} onChange={v => setStartYear(v ?? currentYear)} min={currentYear} max={currentYear + 2} placeholder="Год" />
        </div>
      </div>

      {/* Duration */}
      <div>
        <FieldLabel required>Диапазон поиска</FieldLabel>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map(d => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDuration(d.value)}
              className={cn(
                'flex-1 h-9 rounded-xl text-xs font-medium transition-all',
                duration === d.value
                  ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
                  : 'text-[#8B7FA8] hover:text-[#D4AF37]'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div ref={containerRef}>
        <FieldLabel required>Место</FieldLabel>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3F6A] pointer-events-none" />
          <input
            value={locationQuery}
            onChange={handleLocationInput}
            onFocus={() => suggestions.length > 0 && setSuggestionsOpen(true)}
            placeholder="Москва, Россия"
            autoComplete="off"
            className={cn(
              'luxury-input w-full h-11 pl-10 pr-10 text-sm',
              !locationValue && locationQuery && 'error'
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
                onClick={() => handleSelectSuggestion(s)}
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
          disabled={!canSearch}
          className="btn-gold flex-1 h-11 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <><Sparkles className="w-4 h-4" />Найти моменты</>
        </button>
      </div>
    </form>
  )
}