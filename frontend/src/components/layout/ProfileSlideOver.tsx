import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { personsApi, geocodingApi } from '@/lib/api/client'
import { NumberPicker } from '@/components/ui/number-picker'
import { cn } from '@/lib/utils'
import { useFixedDropdown } from '@/hooks/useFixedDropdown'
import { X, Crown, Shield, Check, Users, Trash2, Plus, MapPin, Loader2 } from 'lucide-react'

interface ProfileSlideOverProps {
  isOpen: boolean
  onClose: () => void
}

interface Person {
  id: number
  name: string
  datetime: string
  location: string
}

interface GeoSuggestion {
  place_id: number
  display_name: string
  lat: string
  lon: string
}

const PREMIUM_FEATURES = [
  { text: 'Безлимитные запросы к ИИ-астрологу' },
  { text: 'Безлимит натальных карт' },
  { text: 'Синастрия с AI-анализом совместимости' },
  { text: 'Транзиты на любую дату + таймлайн' },
  { text: 'Солярный и лунарный возврат' },
  { text: 'Профекции (управитель года)' },
  { text: 'PDF-отчёты с вложенной картой' },
]

export function ProfileSlideOver({ isOpen, onClose }: ProfileSlideOverProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const isPremium = user?.subscription_type === 'premium'
  const isAdmin   = user?.is_admin

  const initials = user?.email?.[0]?.toUpperCase() || 'U'

  /* ── Person profiles ── */
  const [persons, setPersons] = useState<Person[]>([])
  const [personsLoading, setPersonsLoading] = useState(false)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const [personName, setPersonName] = useState('')
  const [personDay, setPersonDay] = useState(1)
  const [personMonth, setPersonMonth] = useState(1)
  const [personYear, setPersonYear] = useState(1990)
  const [personTime, setPersonTime] = useState('12:00')
  const [personLocQuery, setPersonLocQuery] = useState('')
  const [personLocValue, setPersonLocValue] = useState('')
  const [personSuggestions, setPersonSuggestions] = useState<GeoSuggestion[]>([])
  const [personLocSearching, setPersonLocSearching] = useState(false)
  const [personSaving, setPersonSaving] = useState(false)
  const [personError, setPersonError] = useState<string | null>(null)
  const { containerRef: locContainerRef, setIsOpen: setPersonSuggestionsOpen, renderDropdown } = useFixedDropdown()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentYear = new Date().getFullYear()

  useEffect(() => {
    if (isOpen) loadPersons()
  }, [isOpen])

  const loadPersons = async () => {
    setPersonsLoading(true)
    try {
      const res = await personsApi.list()
      setPersons(res.data || [])
    } catch {
      // ignore
    } finally {
      setPersonsLoading(false)
    }
  }

  const handleDeletePerson = async (personId: number) => {
    try {
      await personsApi.delete(personId)
      setPersons((prev) => prev.filter((p) => p.id !== personId))
    } catch {
      // ignore
    }
  }

  const searchLocation = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setPersonSuggestions([])
      setPersonSuggestionsOpen(false)
      return
    }
    setPersonLocSearching(true)
    try {
      const results = await geocodingApi.search(q)
      setPersonSuggestions(results.slice(0, 5))
      setPersonSuggestionsOpen(results.length > 0)
    } catch {
      setPersonSuggestions([])
    } finally {
      setPersonLocSearching(false)
    }
  }, [setPersonSuggestionsOpen])

  const handleLocInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setPersonLocQuery(val)
    setPersonLocValue('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchLocation(val), 400)
  }

  const handleSelectSuggestion = (s: GeoSuggestion) => {
    const shortName = s.display_name.split(',').slice(0, 3).join(',')
    setPersonLocQuery(shortName)
    setPersonLocValue(shortName)
    setPersonSuggestions([])
    setPersonSuggestionsOpen(false)
  }

  const handleSavePerson = async () => {
    setPersonError(null)
    if (!personName.trim()) {
      setPersonError('Введите имя')
      return
    }
    if (!personLocValue) {
      setPersonError('Выберите место рождения из подсказок')
      return
    }

    const d = String(personDay).padStart(2, '0')
    const m = String(personMonth).padStart(2, '0')
    const datetime = `${personYear}-${m}-${d}T${personTime}:00`

    setPersonSaving(true)
    try {
      const res = await personsApi.create({
        name: personName.trim(),
        datetime,
        location: personLocValue,
      })
      setPersons((prev) => [res.data, ...prev])
      setShowAddPerson(false)
      setPersonName('')
      setPersonLocQuery('')
      setPersonLocValue('')
    } catch {
      setPersonError('Не удалось сохранить профиль')
    } finally {
      setPersonSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 transition-all duration-400',
          isOpen
            ? 'bg-black/60 backdrop-blur-sm opacity-100'
            : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50 w-full max-w-[420px]',
          'slide-over',
          isOpen && 'open'
        )}
      >
        <div className="flex flex-col h-full overflow-y-auto">

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-[rgba(212,175,55,0.08)] shrink-0">
            <h2 className="font-serif text-2xl font-semibold text-[#F0EAD6]">
              Профиль
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8B7FA8] hover:text-[#F0EAD6] hover:bg-[rgba(212,175,55,0.08)] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 px-6 py-6 space-y-5">

            {/* ── User card ── */}
            <div className="luxury-card p-5">
              <div className="flex items-center gap-4 mb-5">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#7B2FBE] flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.25)]">
                    <span className="text-2xl font-bold text-[#0A0612] font-serif">
                      {initials}
                    </span>
                  </div>
                  {(isPremium || isAdmin) && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8960F] flex items-center justify-center shadow-[0_0_8px_rgba(212,175,55,0.5)]">
                      <Crown className="w-3 h-3 text-[#0A0612]" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#F0EAD6] truncate text-base leading-tight">
                    {user?.email}
                  </p>
                  <div className="mt-1.5">
                    {isAdmin ? (
                      <span className="badge-gold">Admin</span>
                    ) : isPremium ? (
                      <span className="badge-gold">Premium</span>
                    ) : (
                      <span className="badge-free">Free</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="gold-divider mb-4" />

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8B7FA8]">Дата регистрации</span>
                  <span className="text-[#F0EAD6] font-medium">
                    {user?.created_at
                      ? new Date(user.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                </div>

                {isPremium && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#8B7FA8]">Premium до</span>
                    <span className="text-[#D4AF37] font-medium">
                      {user?.subscription_end
                        ? new Date(user.subscription_end).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : '∞'}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#8B7FA8]">Подписка</span>
                  <span className={cn(
                    'font-medium',
                    isPremium || isAdmin ? 'text-[#D4AF37]' : 'text-[#8B7FA8]'
                  )}>
                    {isAdmin ? 'Admin' : isPremium ? 'Premium' : 'Free'}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Upgrade card (non-premium) ── */}
            {!isPremium && !isAdmin && (
              <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.25)]"
                style={{
                  background: 'linear-gradient(145deg, rgba(28, 18, 6, 0.95) 0%, rgba(20, 12, 4, 0.98) 100%)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.08), inset 0 1px 0 rgba(212,175,55,0.15)',
                }}
              >
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[rgba(212,175,55,0.04)] blur-3xl pointer-events-none" />

                <div className="relative p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
                      <Crown className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">
                        Перейдите на Premium
                      </h3>
                      <p className="text-xs text-[#8B7FA8]">Разблокируйте все возможности</p>
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-5">
                    {PREMIUM_FEATURES.map(({ text }) => (
                      <li key={text} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-[rgba(212,175,55,0.12)] flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-[#D4AF37]" />
                        </div>
                        <span className="text-sm text-[#D4CCBD]">{text}</span>
                      </li>
                    ))}
                  </ul>

                  <button className="btn-gold w-full h-11 text-sm flex items-center justify-center gap-2">
                    <Crown className="w-4 h-4" />
                    Обновить до Premium
                  </button>
                </div>
              </div>
            )}

            {/* ── Premium active badge ── */}
            {(isPremium || isAdmin) && (
              <div className="luxury-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
                    <Crown className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#F0EAD6] text-sm">
                      {isAdmin ? 'Полный доступ' : 'Premium активен'}
                    </h3>
                    <p className="text-xs text-[#8B7FA8]">Все функции разблокированы</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {PREMIUM_FEATURES.map(({ text }) => (
                    <div key={text} className="flex items-center gap-2.5">
                      <div className="w-4 h-4 rounded-full bg-[rgba(212,175,55,0.12)] flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-[#D4AF37]" />
                      </div>
                      <span className="text-xs text-[#8B7FA8]">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Admin section ── */}
            {isAdmin && (
              <div className="luxury-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(123,47,190,0.15)] border border-[rgba(123,47,190,0.25)] flex items-center justify-center">
                    <Shield className="w-4.5 h-4.5 text-[#9D50E0]" style={{ width: 18, height: 18 }} />
                  </div>
                  <h3 className="font-semibold text-[#F0EAD6] text-sm">Управление</h3>
                </div>

                <button onClick={() => { onClose(); navigate('/admin') }} className="w-full h-10 rounded-xl bg-[rgba(123,47,190,0.1)] border border-[rgba(123,47,190,0.2)] text-[#9D50E0] text-sm font-medium hover:bg-[rgba(123,47,190,0.18)] transition-colors">
                  Открыть панель
                </button>
              </div>
            )}

            {/* ════════════════════════════════════════
                Person Profiles section
                ════════════════════════════════════════ */}
            <div className="luxury-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
                    <Users className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#F0EAD6] text-sm">Профили людей</h3>
                    <p className="text-xs text-[#8B7FA8]">Для синастрии и совместимости</p>
                  </div>
                </div>
                {!showAddPerson && (
                  <button
                    onClick={() => setShowAddPerson(true)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8B7FA8] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Person list */}
              {personsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" />
                </div>
              ) : persons.length === 0 && !showAddPerson ? (
                <div className="text-center py-4">
                  <p className="text-xs text-[#4A3F6A]">Нет сохранённых профилей</p>
                  <button
                    onClick={() => setShowAddPerson(true)}
                    className="mt-2 text-xs text-[#D4AF37] hover:text-[#F0C842] font-medium transition-colors flex items-center gap-1 mx-auto"
                  >
                    <Plus className="w-3 h-3" />
                    Добавить
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {persons.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[rgba(212,175,55,0.06)]"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[rgba(212,175,55,0.07)] flex items-center justify-center shrink-0">
                        <Users className="w-3.5 h-3.5 text-[#4A3F6A]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#F0EAD6] truncate">{p.name}</p>
                        <p className="text-[11px] text-[#8B7FA8] truncate">
                          {new Date(p.datetime).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {' · '}
                          {p.location.split(',')[0]}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeletePerson(p.id)}
                        className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[#4A3F6A] hover:text-red-400 hover:bg-red-400/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add person inline form */}
              {showAddPerson && (
                <div className="mt-3 pt-3 border-t border-[rgba(212,175,55,0.08)] space-y-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">Имя</label>
                    <input
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value)}
                      placeholder="Имя человека"
                      autoComplete="name"
                      className="luxury-input w-full h-10 px-3.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">Дата рождения</label>
                    <div className="grid grid-cols-3 gap-2">
                      <NumberPicker value={personDay} onChange={(v) => setPersonDay(v ?? 1)} min={1} max={31} placeholder="День" />
                      <NumberPicker value={personMonth} onChange={(v) => setPersonMonth(v ?? 1)} min={1} max={12} placeholder="Мес." />
                      <NumberPicker value={personYear} onChange={(v) => setPersonYear(v ?? currentYear)} min={1900} max={currentYear} placeholder="Год" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">Время рождения</label>
                    <input
                      value={personTime}
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^\d:]/g, '')
                        if (val.length === 2 && !val.includes(':')) val += ':'
                        setPersonTime(val)
                      }}
                      placeholder="12:00"
                      maxLength={5}
                      inputMode="numeric"
                      autoComplete="off"
                      className="luxury-input h-10 px-3.5 text-sm w-32"
                    />
                  </div>

                  <div ref={locContainerRef}>
                    <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">Место рождения</label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A3F6A] pointer-events-none" />
                      <input
                        value={personLocQuery}
                        onChange={handleLocInput}
                        onFocus={() => personSuggestions.length > 0 && setPersonSuggestionsOpen(true)}
                        placeholder="Москва, Россия"
                        autoComplete="off"
                        className={cn(
                          'luxury-input w-full h-10 pl-10 pr-10 text-sm',
                          !personLocValue && personLocQuery && 'error'
                        )}
                      />
                      {personLocSearching && (
                        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37] animate-spin" />
                      )}
                    </div>

                    {renderDropdown(
                      personSuggestions.map((s) => {
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

                  {personError && (
                    <p className="text-[11px] text-red-400">{personError}</p>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => {
                        setShowAddPerson(false)
                        setPersonError(null)
                      }}
                      disabled={personSaving}
                      className="btn-ghost flex-1 h-9 text-xs font-medium"
                    >
                      Отмена
                    </button>
                    <button
                      onClick={handleSavePerson}
                      disabled={personSaving}
                      className="btn-gold flex-1 h-9 text-xs flex items-center justify-center gap-1.5"
                    >
                      {personSaving ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Сохраняем…</>
                      ) : (
                        <><Plus className="w-3.5 h-3.5" />Сохранить</>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* ── Footer ── */}
          <div className="px-6 pb-6 pt-2 border-t border-[rgba(212,175,55,0.06)] shrink-0" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}>
            <p className="text-xs text-center text-[#2E2548]">
              Orbitron · ИИ-астрология нового поколения
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
