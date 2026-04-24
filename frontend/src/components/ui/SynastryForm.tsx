import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Heart, MapPin, UserPlus, Trash2 } from 'lucide-react'
import { NumberPicker } from '@/components/ui/number-picker'
import { chartsApi, personsApi, geocodingApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { useFixedDropdown } from '@/hooks/useFixedDropdown'

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

interface Person {
  id: number
  name: string
  datetime: string
  location: string
}

interface SynastryFormProps {
  natalChartId: number
  onSubmit: (chart: Record<string, unknown>) => void
  onCancel: () => void
}

export function SynastryForm({ natalChartId, onSubmit, onCancel }: SynastryFormProps) {
  const [mode, setMode] = useState<'saved' | 'manual'>('saved')
  const [persons, setPersons] = useState<Person[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null)
  const [personsLoading, setPersonsLoading] = useState(true)

  const [person2Name, setPerson2Name] = useState('')
  const [day, setDay] = useState(1)
  const [month, setMonth] = useState(1)
  const [year, setYear] = useState(1990)
  const [time, setTime] = useState('12:00')
  const [locationQuery, setLocationQuery] = useState('')
  const [locationValue, setLocationValue] = useState('')
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [savePerson, setSavePerson] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { containerRef, setIsOpen: setSuggestionsOpen, renderDropdown } = useFixedDropdown()
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    loadPersons()
  }, [])

  const loadPersons = async () => {
    setPersonsLoading(true)
    try {
      const res = await personsApi.list()
      setPersons(res.data || [])
      if ((res.data || []).length === 0) {
        setMode('manual')
      }
    } catch {
      setMode('manual')
    } finally {
      setPersonsLoading(false)
    }
  }

  const handleDeletePerson = async (personId: number) => {
    try {
      await personsApi.delete(personId)
      setPersons((prev) => prev.filter((p) => p.id !== personId))
      if (selectedPersonId === personId) {
        setSelectedPersonId(null)
      }
      if (persons.length <= 1) {
        setMode('manual')
      }
    } catch {
      // ignore
    }
  }

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([])
      setSuggestionsOpen(false)
      return
    }
    setIsSearching(true)
    try {
      const results = await geocodingApi.search(q)
      setSuggestions(results.slice(0, 5))
      setSuggestionsOpen(results.length > 0)
    } catch {
      setSuggestions([])
    } finally {
      setIsSearching(false)
    }
  }, [setSuggestionsOpen])

  const handleLocationInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setLocationQuery(val)
    setLocationValue('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  const handleSelectSuggestion = (s: GeoSuggestion) => {
    const shortName = s.display_name.split(',').slice(0, 3).join(',')
    setLocationQuery(shortName)
    setLocationValue(shortName)
    setSuggestions([])
    setSuggestionsOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setServerError(null)

    try {
      if (mode === 'saved' && selectedPersonId) {
        const res = await chartsApi.createSynastry({
          natal_chart_id: natalChartId,
          person_id: selectedPersonId,
          theme: 'midnight',
        })
        onSubmit(res.data)
        return
      }

      if (!locationValue) {
        setServerError('Выберите место рождения из подсказок')
        setIsSubmitting(false)
        return
      }

      const d = String(day).padStart(2, '0')
      const m = String(month).padStart(2, '0')
      const datetime = `${year}-${m}-${d}T${time}:00`

      if (savePerson) {
        try {
          const pRes = await personsApi.create({
            name: person2Name || 'Partner',
            datetime,
            location: locationValue,
          })
          const res = await chartsApi.createSynastry({
            natal_chart_id: natalChartId,
            person_id: pRes.data.id,
            theme: 'midnight',
          })
          onSubmit(res.data)
          return
        } catch {
          // fall through to manual mode
        }
      }

      const res = await chartsApi.createSynastry({
        natal_chart_id: natalChartId,
        person2_datetime: datetime,
        person2_location: locationValue,
        person2_name: person2Name || 'Partner',
        theme: 'midnight',
      })
      onSubmit(res.data)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setServerError(e.response?.data?.detail || 'Не удалось создать синастрию')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = mode === 'saved' ? selectedPersonId !== null : locationValue !== ''

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {personsLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" />
        </div>
      ) : persons.length > 0 ? (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('saved')}
              className={cn(
                'flex-1 h-9 rounded-xl text-xs font-medium transition-all',
                mode === 'saved'
                  ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
                  : 'text-[#8B7FA8] hover:text-[#D4AF37]'
              )}
            >
              Из сохранённых
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={cn(
                'flex-1 h-9 rounded-xl text-xs font-medium transition-all',
                mode === 'manual'
                  ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
                  : 'text-[#8B7FA8] hover:text-[#D4AF37]'
              )}
            >
              Ввести вручную
            </button>
          </div>

          {mode === 'saved' ? (
            <div>
              <FieldLabel required>Выберите человека</FieldLabel>
              <div className="space-y-1.5">
                {persons.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      'group relative flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer',
                      selectedPersonId === p.id
                        ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)]'
                        : 'border border-[rgba(212,175,55,0.06)] hover:border-[rgba(212,175,55,0.15)]'
                    )}
                    onClick={() => setSelectedPersonId(p.id)}
                  >
                    <div className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                      selectedPersonId === p.id ? 'bg-[rgba(212,175,55,0.2)]' : 'bg-[rgba(212,175,55,0.07)]'
                    )}>
                      <Heart className={cn('w-3.5 h-3.5', selectedPersonId === p.id ? 'text-[#D4AF37]' : 'text-[#4A3F6A]')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('text-sm font-medium truncate', selectedPersonId === p.id ? 'text-[#D4AF37]' : 'text-[#F0EAD6]')}>
                        {p.name}
                      </p>
                      <p className="text-[11px] text-[#8B7FA8] truncate">
                        {new Date(p.datetime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {p.location.split(',')[0]}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePerson(p.id)
                      }}
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#4A3F6A] hover:text-red-400 hover:bg-red-400/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
             <ManualEntry
              person2Name={person2Name} setPerson2Name={setPerson2Name}
              day={day} setDay={setDay}
              month={month} setMonth={setMonth}
              year={year} setYear={setYear}
              time={time} setTime={setTime}
              locationQuery={locationQuery}
              locationValue={locationValue}
              suggestions={suggestions}
              setSuggestionsOpen={setSuggestionsOpen}
              isSearching={isSearching}
              containerRef={containerRef}
              renderDropdown={renderDropdown}
              onLocationInput={handleLocationInput}
              onSelectSuggestion={handleSelectSuggestion}
              savePerson={savePerson} setSavePerson={setSavePerson}
              currentYear={currentYear}
            />
          )}
        </>
      ) : (
        <ManualEntry
          person2Name={person2Name} setPerson2Name={setPerson2Name}
          day={day} setDay={setDay}
          month={month} setMonth={setMonth}
          year={year} setYear={setYear}
          time={time} setTime={setTime}
          locationQuery={locationQuery}
          locationValue={locationValue}
          suggestions={suggestions}
              setSuggestionsOpen={setSuggestionsOpen}
              isSearching={isSearching}
              containerRef={containerRef}
              renderDropdown={renderDropdown}
              onLocationInput={handleLocationInput}
              onSelectSuggestion={handleSelectSuggestion}
              savePerson={savePerson} setSavePerson={setSavePerson}
              currentYear={currentYear}
        />
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
        <button type="submit" disabled={isSubmitting || !canSubmit} className="btn-gold flex-1 h-11 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Строим…</>
          ) : (
            <><Heart className="w-4 h-4" />Построить</>
          )}
        </button>
      </div>
    </form>
  )
}

function ManualEntry({
  person2Name, setPerson2Name,
  day, setDay,
  month, setMonth,
  year, setYear,
  time, setTime,
  locationQuery,
  locationValue,
  suggestions,
  setSuggestionsOpen,
  isSearching,
  containerRef,
  renderDropdown,
  onLocationInput,
  onSelectSuggestion,
  savePerson, setSavePerson,
  currentYear,
}: {
  person2Name: string; setPerson2Name: (v: string) => void
  day: number; setDay: (v: number) => void
  month: number; setMonth: (v: number) => void
  year: number; setYear: (v: number) => void
  time: string; setTime: (v: string) => void
  locationQuery: string
  locationValue: string
  suggestions: GeoSuggestion[]
  setSuggestionsOpen: (v: boolean) => void
  isSearching: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  renderDropdown: (content: React.ReactNode) => React.ReactNode
  onLocationInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSelectSuggestion: (s: GeoSuggestion) => void
  savePerson: boolean; setSavePerson: (v: boolean) => void
  currentYear: number
}) {
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Имя</FieldLabel>
        <input
          value={person2Name}
          onChange={(e) => setPerson2Name(e.target.value)}
          placeholder="Имя партнёра"
          autoComplete="name"
          className="luxury-input w-full h-11 px-4 text-sm"
        />
      </div>

      <div>
        <FieldLabel required>Дата рождения</FieldLabel>
        <div className="grid grid-cols-3 gap-2.5">
          <NumberPicker value={day} onChange={(v) => setDay(v ?? 1)} min={1} max={31} placeholder="День" />
          <NumberPicker value={month} onChange={(v) => setMonth(v ?? 1)} min={1} max={12} placeholder="Мес." />
          <NumberPicker value={year} onChange={(v) => setYear(v ?? currentYear)} min={1900} max={currentYear} placeholder="Год" />
        </div>
      </div>

      <div>
        <FieldLabel required>Время рождения</FieldLabel>
        <input
          value={time}
          onChange={(e) => {
            let val = e.target.value.replace(/[^\d:]/g, '')
            if (val.length === 2 && !val.includes(':')) val += ':'
            setTime(val)
          }}
          placeholder="12:00"
          maxLength={5}
          inputMode="numeric"
          autoComplete="off"
          className="luxury-input h-11 px-4 text-sm w-36"
        />
      </div>

      <div ref={containerRef}>
        <FieldLabel required>Место рождения</FieldLabel>
        <div className="relative">
          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3F6A] pointer-events-none" />
          <input
            value={locationQuery}
            onChange={onLocationInput}
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
                onClick={() => onSelectSuggestion(s)}
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

      <label className="flex items-center gap-2.5 cursor-pointer group">
        <div className={cn(
          'w-4 h-4 rounded border flex items-center justify-center transition-all',
          savePerson
            ? 'bg-[#D4AF37] border-[#D4AF37]'
            : 'border-[rgba(212,175,55,0.3)] group-hover:border-[rgba(212,175,55,0.5)]'
        )}>
          {savePerson && (
            <svg className="w-2.5 h-2.5 text-[#0A0612]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <input type="checkbox" checked={savePerson} onChange={(e) => setSavePerson(e.target.checked)} className="hidden" />
        <span className="text-xs text-[#8B7FA8] group-hover:text-[#D4AF37] transition-colors flex items-center gap-1.5">
          <UserPlus className="w-3 h-3" />
          Сохранить профиль для будущих синастрий
        </span>
      </label>
    </div>
  )
}
