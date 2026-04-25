import { useState, useRef, useCallback, useEffect } from 'react'
import { Loader2, Plus, Trash2, Crosshair, Briefcase, Heart, MapPin, Activity, Home, GraduationCap, Wallet, Sparkles, Scale, Plane, Pin } from 'lucide-react'
import { NumberPicker } from '@/components/ui/number-picker'
import { chartsApi, geocodingApi } from '@/lib/api/client'
import { useFixedDropdown } from '@/hooks/useFixedDropdown'
import { cn } from '@/lib/utils'

const EVENT_TYPES = [
  { id: 'career', label: 'Карьера', color: '#D4AF37', Icon: Briefcase },
  { id: 'relationship', label: 'Отношения', color: '#EC4899', Icon: Heart },
  { id: 'relocation', label: 'Переезд', color: '#2DD4BF', Icon: MapPin },
  { id: 'health', label: 'Здоровье', color: '#EF4444', Icon: Activity },
  { id: 'family', label: 'Семья', color: '#A78BFA', Icon: Home },
  { id: 'education', label: 'Обучение', color: '#60A5FA', Icon: GraduationCap },
  { id: 'financial', label: 'Финансы', color: '#34D399', Icon: Wallet },
  { id: 'spiritual', label: 'Духовность', color: '#9D50E0', Icon: Sparkles },
  { id: 'legal', label: 'Юридическое', color: '#F59E0B', Icon: Scale },
  { id: 'travel', label: 'Путешествие', color: '#38BDF8', Icon: Plane },
  { id: 'other', label: 'Другое', color: '#8B7FA8', Icon: Pin },
] as const

interface LifeEvent {
  date: string
  eventType: string
  description: string
}

interface MatchedAspect {
  planet: string
  natal_point: string
  aspect: string
  orb: number
  technique: string
}

interface MatchedEvent {
  event_date: string
  event_type: string
  event_description: string | null
  score: number
  matched_aspects: MatchedAspect[]
}

interface RectificationCandidate {
  birth_time: string
  asc_degree: number
  mc_degree: number
  asc_sign: string
  mc_sign: string
  total_score: number
  matched_events: MatchedEvent[]
}

interface RectificationResult {
  candidates: RectificationCandidate[]
  event_count: number
  step_minutes: number
  computation_time_ms: number
}

type PollStatus = 'idle' | 'computing' | 'done' | 'error'

interface RectificationFormProps {
  onSubmit: (result: Record<string, unknown>) => void
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

interface GeoSuggestion {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

function LocationAutocomplete({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { containerRef, setIsOpen, renderDropdown } = useFixedDropdown()

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); setIsOpen(false); return }
    setIsSearching(true)
    try {
      const results = await geocodingApi.search(q)
      setSuggestions(results.slice(0, 5))
      setIsOpen(results.length > 0)
    } catch { setSuggestions([]) }
    finally { setIsSearching(false) }
  }, [setIsOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    onChange('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  const handleSelect = (s: GeoSuggestion) => {
    const shortName = s.display_name.split(',').slice(0, 3).join(',')
    setQuery(shortName)
    onChange(shortName)
    setSuggestions([])
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          value={query}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder="Москва, Россия"
          autoComplete="off"
          className="luxury-input w-full h-11 px-4 text-sm"
        />
        {isSearching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37] animate-spin" />}
      </div>
      {renderDropdown(
        suggestions.map(s => {
          const parts = s.display_name.split(',')
          const city = parts[0]
          const rest = parts.slice(1, 3).join(', ')
          return (
            <button key={s.place_id} type="button" onMouseDown={e => e.preventDefault()} onClick={() => handleSelect(s)}
              className="w-full px-4 py-2.5 text-left hover:bg-[rgba(212,175,55,0.08)] transition-colors">
              <span className="text-sm text-[#F0EAD6]">{city}</span>
              <span className="text-xs text-[#8B7FA8] ml-2">{rest}</span>
            </button>
          )
        })
      )}
    </div>
  )
}

export function RectificationForm({ onSubmit, onCancel }: RectificationFormProps) {
  const currentYear = new Date().getFullYear()
  const [day, setDay] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [location, setLocation] = useState('')
  const [events, setEvents] = useState<LifeEvent[]>([{ date: '', eventType: 'career', description: '' }])
  const [result, setResult] = useState<RectificationResult | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const [pollStatus, setPollStatus] = useState<PollStatus>('idle')
  const [progress, setProgress] = useState(0)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearTimeout(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => stopPolling, [stopPolling])

  const addEvent = () => {
    if (events.length >= 20) return
    setEvents([...events, { date: '', eventType: 'other', description: '' }])
  }

  const removeEvent = (index: number) => {
    if (events.length <= 1) return
    setEvents(events.filter((_, i) => i !== index))
  }

  const updateEvent = (index: number, field: keyof LifeEvent, value: string) => {
    const updated = [...events]
    updated[index] = { ...updated[index], [field]: value }
    setEvents(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!day || !month || !year || !location) return
    const validEvents = events.filter(ev => ev.date)
    if (validEvents.length === 0) return

    setServerError(null)
    setResult(null)
    setPollStatus('computing')
    setProgress(0)

    const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const requestData = {
      birth_date: birthDate,
      location,
      events: validEvents.map(ev => ({ date: ev.date, event_type: ev.eventType, description: ev.description || undefined })),
    }

    const poll = async () => {
      try {
        const res = await chartsApi.rectify(requestData)
        const { status, progress: pct, result: resData, error } = res.data
        if (status === 'computing') {
          setProgress(pct)
          pollRef.current = setTimeout(poll, 2000)
        } else if (status === 'done' && resData) {
          setPollStatus('done')
          setProgress(100)
          setResult(resData as unknown as RectificationResult)
        } else if (status === 'error') {
          setPollStatus('error')
          setServerError(error || 'Ошибка ректификации')
        }
      } catch (err: unknown) {
        const e = err as { response?: { data?: { detail?: string } } }
        setPollStatus('error')
        setServerError(e?.response?.data?.detail || 'Ошибка сети')
      }
    }

    await poll()
  }

  const handleSelectTime = async (birthTime: string) => {
    if (!day || !month || !year || !location) return
    setServerError(null)
    const birthDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const datetime = `${birthDate}T${birthTime}:00`
    try {
      const res = await chartsApi.create({ datetime, location })
      onSubmit(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setServerError(e?.response?.data?.detail || 'Ошибка создания карты')
    }
  }

  const SIGN_RU: Record<string, string> = {
    Aries: 'Овен', Taurus: 'Телец', Gemini: 'Близнецы', Cancer: 'Рак',
    Leo: 'Лев', Virgo: 'Дева', Libra: 'Весы', Scorpio: 'Скорпион',
    Sagittarius: 'Стрелец', Capricorn: 'Козерог', Aquarius: 'Водолей', Pisces: 'Рыбы',
  }

  const TECHNIQUE_LABELS: Record<string, string> = {
    transit: 'Транзит', solar_arc: 'Солярная дуга', progression: 'Прогрессия', profection: 'Профекция',
  }

  if (pollStatus === 'computing') {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-[rgba(212,175,55,0.2)] flex items-center justify-center">
            <Crosshair className="w-7 h-7 text-[#D4AF37] animate-spin" style={{ animationDuration: '3s' }} />
          </div>
          <div className="absolute inset-0 rounded-full animate-pulse-gold" />
        </div>

        <div className="text-center">
          <h3 className="font-serif text-lg font-semibold text-[#F0EAD6] mb-1">Ректификация</h3>
          <p className="text-xs text-[#8B7FA8]">Анализируем кандидатов…</p>
        </div>

        <div className="w-full max-w-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-[#8B7FA8]">Прогресс</span>
            <span className="text-[10px] font-semibold text-[#D4AF37]">{progress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[rgba(139,127,168,0.1)] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F0C842] transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <button type="button" onClick={() => { stopPolling(); setPollStatus('idle'); setProgress(0) }}
          className="text-xs text-[#8B7FA8] hover:text-[#F0EAD6] transition-colors mt-2">
          Отмена
        </button>
      </div>
    )
  }

  if (result) {
    const maxScore = result.candidates[0]?.total_score || 1
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">Результаты ректификации</h3>
            <p className="text-xs text-[#8B7FA8]">Топ-10 кандидатов · {Math.round(result.computation_time_ms / 1000)}с · шаг {result.step_minutes} мин</p>
          </div>
          <button onClick={() => { setResult(null); setPollStatus('idle') }} className="text-xs text-[#8B7FA8] hover:text-[#F0EAD6] transition-colors">Новый расчёт</button>
        </div>

        <div className="space-y-2">
          {result.candidates.map((c, i) => (
            <div key={c.birth_time} className={cn(
              'rounded-xl border p-4 transition-all',
              i === 0 ? 'bg-[rgba(212,175,55,0.06)] border-[rgba(212,175,55,0.15)]' : 'bg-[rgba(16,11,30,0.4)] border-[rgba(212,175,55,0.06)]'
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold',
                    i === 0 ? 'bg-[rgba(212,175,55,0.15)] text-[#D4AF37]' : 'bg-[rgba(139,127,168,0.08)] text-[#8B7FA8]'
                  )}>#{i + 1}</span>
                  <div>
                    <span className="text-sm font-semibold text-[#F0EAD6]">{c.birth_time}</span>
                    <span className="text-xs text-[#8B7FA8] ml-2">ASC {Math.round(c.asc_degree % 30)}° {SIGN_RU[c.asc_sign] || c.asc_sign}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-24 h-1.5 rounded-full bg-[rgba(139,127,168,0.1)] overflow-hidden">
                    <div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${(c.total_score / maxScore) * 100}%` }} />
                  </div>
                  <span className={cn('text-xs font-bold', i === 0 ? 'text-[#D4AF37]' : 'text-[#8B7FA8]')}>{c.total_score.toFixed(1)}</span>
                  <button onClick={() => handleSelectTime(c.birth_time)}
                    className="text-[9px] px-2.5 py-1.5 rounded-lg bg-[rgba(212,175,55,0.08)] text-[#D4AF37] hover:bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.1)] transition-all">
                    Создать карту
                  </button>
                </div>
              </div>
              {c.matched_events.length > 0 && (
                <div className="mt-2 space-y-1">
                  {c.matched_events.filter(me => me.matched_aspects.length > 0).map((me, j) => (
                    <div key={j} className="flex items-center gap-2 text-[10px] text-[#8B7FA8]">
                      <span>{new Date(me.event_date).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}</span>
                      <span className="text-[#4A3F6A]">·</span>
                      {me.matched_aspects.slice(0, 2).map((a, k) => (
                        <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(16,11,30,0.5)]">
                          {a.planet} {a.aspect} {a.natal_point}
                          <span className="text-[#4A3F6A] ml-1">{TECHNIQUE_LABELS[a.technique] || a.technique}</span>
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <FieldLabel required>Дата рождения</FieldLabel>
        <div className="grid grid-cols-3 gap-2.5">
          <NumberPicker value={day} onChange={setDay} min={1} max={31} placeholder="День" />
          <NumberPicker value={month} onChange={setMonth} min={1} max={12} placeholder="Мес." />
          <NumberPicker value={year} onChange={setYear} min={1900} max={currentYear} placeholder="Год" />
        </div>
        <p className="text-[11px] text-[#4A3F6A] mt-1">Время рождения неизвестно — его определит ректификация</p>
      </div>

      <div>
        <FieldLabel required>Место рождения</FieldLabel>
        <LocationAutocomplete value={location} onChange={setLocation} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <FieldLabel required>Жизненные события</FieldLabel>
          <button type="button" onClick={addEvent} disabled={events.length >= 20}
            className="flex items-center gap-1 text-[10px] text-[#D4AF37] hover:text-[#F0C842] font-medium transition-colors disabled:opacity-40">
            <Plus className="w-3 h-3" /> Добавить
          </button>
        </div>
        <div className="space-y-3">
          {events.map((ev, i) => (
            <div key={i} className="rounded-xl border border-[rgba(212,175,55,0.06)] bg-[rgba(16,11,30,0.3)] p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-[#4A3F6A] shrink-0">#{i + 1}</span>
                <input type="date" value={ev.date} onChange={e => updateEvent(i, 'date', e.target.value)}
                  className="luxury-input h-9 px-3 text-xs flex-1" />
                {events.length > 1 && (
                  <button type="button" onClick={() => removeEvent(i)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#4A3F6A] hover:text-red-400 hover:bg-[rgba(239,68,68,0.08)] transition-all shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => updateEvent(i, 'eventType', t.id)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap',
                      ev.eventType === t.id ? 'border' : 'text-[#8B7FA8] hover:text-[#F0EAD6]',
                    )}
                    style={ev.eventType === t.id ? {
                      color: t.color,
                      borderColor: `${t.color}33`,
                      backgroundColor: `${t.color}1A`,
                    } : undefined}
                  >
                    <t.Icon className="w-3 h-3" />
                    {t.label}
                  </button>
                ))}
              </div>
              <input type="text" value={ev.description} onChange={e => updateEvent(i, 'description', e.target.value)}
                placeholder="Краткое описание события…" maxLength={200}
                className="luxury-input w-full h-9 px-3 text-xs" />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-[#4A3F6A] mt-1.5">Чем больше событий — тем точнее результат. Минимум 1, оптимально 5-10.</p>
      </div>

      {serverError && (
        <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/08 text-sm text-red-400">{serverError}</div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel}
          className="btn-ghost flex-1 h-11 text-sm font-medium">Отмена</button>
        <button type="submit" disabled={!day || !month || !year || !location || !events.some(e => e.date)}
          className="btn-gold flex-1 h-11 text-sm flex items-center justify-center gap-2">
          <><Crosshair className="w-4 h-4" />Ректификация</>
        </button>
      </div>
    </form>
  )
}
