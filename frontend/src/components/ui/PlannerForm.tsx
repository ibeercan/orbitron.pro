import { useState, useRef } from 'react'
import { Loader2, BookOpen, Download } from 'lucide-react'
import { chartsApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

const PRESETS = [
  { id: 'minimal', label: 'Минимум', desc: 'Натальная, фазы, луна без курса' },
  { id: 'standard', label: 'Стандарт', desc: 'Натальная, транзиты, фазы, луна без курса, станции' },
  { id: 'full', label: 'Полный', desc: 'Все техники и ежедневные страницы' },
]

const PAGE_SIZES = [
  { id: 'a4', label: 'A4' },
  { id: 'a5', label: 'A5' },
  { id: 'letter', label: 'Letter' },
]

const WEEK_STARTS = [
  { id: 'monday', label: 'Понедельник' },
  { id: 'sunday', label: 'Воскресенье' },
]

interface ToggleConfig {
  key: string
  label: string
  desc?: string
  subOptions?: SubOptionConfig[]
}

interface SubOptionConfig {
  key: string
  type: 'select'
  options: { value: string; label: string }[]
  coerceToBoolean?: boolean
}

const FRONT_MATTER_TOGGLES: ToggleConfig[] = [
  { key: 'front_natal', label: 'Натальная карта' },
  { key: 'front_progressed', label: 'Прогрессии' },
  { key: 'front_solar_return', label: 'Солярный возврат' },
  { key: 'front_profections', label: 'Профекции' },
  {
    key: 'front_zr_timeline',
    label: 'Зодиакальное высвобождение',
    desc: 'Временная шкала периодов',
    subOptions: [
      {
        key: 'front_zr_lot',
        type: 'select',
        options: [
          { value: 'Part of Fortune', label: 'Колесо Фортуны' },
          { value: 'Part of Spirit', label: 'Колесо Духа' },
        ],
      },
    ],
  },
  {
    key: 'front_ephemeris',
    label: 'Графическая эфемерида',
    subOptions: [
      {
        key: 'front_ephemeris_harmonic',
        type: 'select',
        options: [
          { value: '360', label: 'Полный зодиак (360°)' },
          { value: '90', label: '90° Карта' },
          { value: '45', label: '45° Карта' },
        ],
      },
    ],
  },
]

const DAILY_TOGGLES: ToggleConfig[] = [
  {
    key: 'include_natal_transits',
    label: 'Транзиты к натальным планетам',
    subOptions: [
      {
        key: 'include_natal_transits_outer_only',
        type: 'select',
        coerceToBoolean: true,
        options: [
          { value: 'true', label: 'Только внешние' },
          { value: 'false', label: 'Все планеты' },
        ],
      },
    ],
  },
  { key: 'include_mundane_transits', label: 'Мунданные транзиты', desc: 'Аспекты планет на небе' },
  { key: 'include_moon_phases', label: 'Лунные фазы' },
  {
    key: 'include_voc',
    label: 'Луна без курса',
    subOptions: [
      {
        key: 'include_voc_mode',
        type: 'select',
        options: [
          { value: 'traditional', label: 'Традиционная (Солнце–Сатурн)' },
          { value: 'modern', label: 'Современная (с Ураном–Плутоном)' },
        ],
      },
    ],
  },
  { key: 'include_ingresses', label: 'Вхождения в знаки' },
  { key: 'include_stations', label: 'Станции планет', desc: 'Ретроградное и прямое движение' },
]

const PRESET_CONFIGS: Record<string, Record<string, unknown>> = {
  minimal: {
    front_natal: true,
    front_progressed: false,
    front_solar_return: false,
    front_profections: false,
    front_zr_timeline: false,
    front_ephemeris: false,
    include_natal_transits: false,
    include_natal_transits_outer_only: true,
    include_mundane_transits: false,
    include_moon_phases: true,
    include_voc: true,
    include_voc_mode: 'traditional',
    include_ingresses: false,
    include_stations: false,
  },
  standard: {
    front_natal: true,
    front_progressed: false,
    front_solar_return: false,
    front_profections: false,
    front_zr_timeline: false,
    front_ephemeris: false,
    include_natal_transits: true,
    include_natal_transits_outer_only: true,
    include_mundane_transits: false,
    include_moon_phases: true,
    include_voc: true,
    include_voc_mode: 'traditional',
    include_ingresses: false,
    include_stations: true,
  },
  full: {
    front_natal: true,
    front_progressed: true,
    front_solar_return: true,
    front_profections: true,
    front_zr_timeline: true,
    front_ephemeris: true,
    include_natal_transits: true,
    include_natal_transits_outer_only: true,
    include_mundane_transits: false,
    include_moon_phases: true,
    include_voc: true,
    include_voc_mode: 'traditional',
    include_ingresses: true,
    include_stations: true,
  },
}

type PlannerFormProps = {
  natalChartId: number
  onCancel: () => void
}

type PlannerStatus = 'form' | 'computing' | 'done' | 'error'

type DateMode = 'full_year' | 'custom'

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-3 pb-1.5">
      <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.14em]">{children}</span>
      <div className="flex-1 h-px bg-[rgba(212,175,55,0.1)]" />
    </div>
  )
}

function ToggleRow({
  config,
  toggles,
  onToggle,
  onSubOptionChange,
}: {
  config: ToggleConfig
  toggles: Record<string, unknown>
  onToggle: (key: string) => void
  onSubOptionChange: (key: string, value: unknown) => void
}) {
  const isChecked = !!toggles[config.key]
  const hasSubOptions = config.subOptions && config.subOptions.length > 0

  return (
    <div>
      <label className="flex items-center gap-3 cursor-pointer group py-1">
        <div
          className={cn(
            'w-8 h-[18px] rounded-full relative transition-all shrink-0',
            isChecked ? 'bg-[#D4AF37]' : 'bg-[rgba(212,175,55,0.2)]'
          )}
          onClick={() => onToggle(config.key)}
        >
          <div
            className={cn(
              'absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white transition-all',
              isChecked ? 'left-[15px]' : 'left-[2px]'
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className={cn('text-xs font-medium', isChecked ? 'text-[#F0EAD6]' : 'text-[#4A3F6A]')}>
            {config.label}
          </span>
          {config.desc && isChecked && (
            <span className="text-[10px] text-[#4A3F6A] ml-1.5">{config.desc}</span>
          )}
        </div>
      </label>
      {isChecked && hasSubOptions && (
        <div className="ml-11 mt-1 space-y-1.5 pb-1">
          {config.subOptions!.map((sub) => {
            if (sub.type === 'select') {
              const currentVal = String(toggles[sub.key] ?? sub.options[0].value)
              return (
                <div key={sub.key} className="flex flex-wrap gap-1.5">
                  {sub.options.map((opt) => {
                    const isSelected = currentVal === String(opt.value)
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => {
                          const val = sub.coerceToBoolean ? opt.value === 'true' : (sub.key === 'front_ephemeris_harmonic' ? parseInt(String(opt.value), 10) : opt.value)
                          onSubOptionChange(sub.key, val)
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all border',
                          isSelected
                            ? 'bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
                            : 'border-transparent text-[#8B7FA8] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.06)]'
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              )
            }
            return null
          })}
        </div>
      )}
    </div>
  )
}

export function PlannerForm({ natalChartId, onCancel }: PlannerFormProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [preset, setPreset] = useState('standard')
  const [dateMode, setDateMode] = useState<DateMode>('full_year')
  const [dateRangeStart, setDateRangeStart] = useState('')
  const [dateRangeEnd, setDateRangeEnd] = useState('')
  const [pageSize, setPageSize] = useState('a4')
  const [weekStartsOn, setWeekStartsOn] = useState('monday')
  const [bindingMargin, setBindingMargin] = useState('')

  const [toggles, setToggles] = useState<Record<string, unknown>>({
    ...PRESET_CONFIGS.standard,
    front_zr_lot: 'Part of Fortune',
    front_ephemeris_harmonic: 360,
  })

  const [status, setStatus] = useState<PlannerStatus>('form')
  const [progress, setProgress] = useState(0)
  const [, setDownloadUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [plannerId, setPlannerId] = useState<number | null>(null)
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePresetSelect = (id: string) => {
    setPreset(id)
    const config = PRESET_CONFIGS[id]
    if (config) {
      setToggles(prev => ({
        ...prev,
        ...config,
        front_zr_lot: prev.front_zr_lot ?? 'Part of Fortune',
        front_ephemeris_harmonic: prev.front_ephemeris_harmonic ?? 360,
      }))
    }
  }

  const handleToggle = (key: string) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSubOptionChange = (key: string, value: unknown) => {
    setToggles(prev => ({ ...prev, [key]: value }))
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus('computing')
    setProgress(0)
    setDownloadUrl(null)

    const payload: Record<string, unknown> = {
      chart_id: natalChartId,
      year,
      preset,
      page_size: pageSize,
      week_starts_on: weekStartsOn,
      date_range_start: dateMode === 'custom' ? dateRangeStart : null,
      date_range_end: dateMode === 'custom' ? dateRangeEnd : null,
      binding_margin: bindingMargin ? parseFloat(bindingMargin) : null,
      front_natal: !!toggles.front_natal,
      front_progressed: !!toggles.front_progressed,
      front_solar_return: !!toggles.front_solar_return,
      front_profections: !!toggles.front_profections,
      front_zr_timeline: !!toggles.front_zr_timeline,
      front_zr_lot: toggles.front_zr_lot ?? 'Part of Fortune',
      front_ephemeris: !!toggles.front_ephemeris,
      front_ephemeris_harmonic: toggles.front_ephemeris_harmonic ?? 360,
      include_natal_transits: !!toggles.include_natal_transits,
      include_natal_transits_outer_only: toggles.include_natal_transits_outer_only !== false,
      include_mundane_transits: !!toggles.include_mundane_transits,
      include_moon_phases: !!toggles.include_moon_phases,
      include_voc: !!toggles.include_voc,
      include_voc_mode: toggles.include_voc_mode ?? 'traditional',
      include_ingresses: !!toggles.include_ingresses,
      include_stations: !!toggles.include_stations,
    }

    try {
      const res = await chartsApi.plannerGenerate(payload as Parameters<typeof chartsApi.plannerGenerate>[0])
      const data = res.data as { planner_id: number; status: string; progress: number; download_url?: string }

      if (data.status === 'done' && data.download_url) {
        setStatus('done')
        setDownloadUrl(data.download_url)
        setProgress(100)
        setPlannerId(data.planner_id)
        return
      }

      setPlannerId(data.planner_id)
      setProgress(data.progress || 0)

      const poll = async () => {
        try {
          const pollRes = await chartsApi.plannerPoll(data.planner_id)
          const d = pollRes.data as { status: string; progress: number; download_url?: string | null; error?: string }
          if (d.status === 'done') {
            setStatus('done')
            setDownloadUrl(d.download_url || `/api/v1/planner/${data.planner_id}/download`)
            setProgress(100)
          } else if (d.status === 'error') {
            setError(d.error || 'Ошибка генерации')
            setStatus('error')
          } else {
            setProgress(d.progress)
            pollRef.current = setTimeout(poll, 2000)
          }
        } catch {
          setError('Ошибка при получении статуса')
          setStatus('error')
        }
      }
      pollRef.current = setTimeout(poll, 2000)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string }; status?: number } }
      if (e.response?.status === 403) {
        setError('Доступно на тарифе Premium')
      } else {
        setError(e.response?.data?.detail || 'Не удалось начать генерацию')
      }
      setStatus('error')
    }
  }

  const handleDownload = async () => {
    if (!plannerId) return
    try {
      const res = await chartsApi.plannerDownload(plannerId)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `orbitron_planner_${year}_${preset}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('Не удалось скачать PDF')
    }
  }

  const handleCancel = () => {
    if (pollRef.current) clearTimeout(pollRef.current)
    setStatus('form')
    setProgress(0)
    setError(null)
    setDownloadUrl(null)
    setPlannerId(null)
  }

  const handleReset = () => {
    if (pollRef.current) clearTimeout(pollRef.current)
    setStatus('form')
    setProgress(0)
    setError(null)
    setDownloadUrl(null)
    setPlannerId(null)
  }

  if (status === 'computing') {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" />
            </div>
            <div className="absolute inset-0 rounded-full animate-pulse-gold" />
          </div>
          <p className="text-sm text-[#8B7FA8]">Генерируем планер на {year} год…</p>
          <p className="text-xs text-[#4A3F6A]">Это может занять 30–120 секунд</p>
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

  if (status === 'done') {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center py-6 gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <p className="text-sm font-medium text-[#F0EAD6]">Планер готов!</p>
        </div>
        <button
          onClick={handleDownload}
          className="btn-gold w-full h-11 text-sm flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Скачать PDF
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="btn-ghost w-full h-11 text-sm font-medium"
        >
          Новый планер
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[#4A3F6A] hover:text-[#8B7FA8] transition-colors w-full text-center"
        >
          Закрыть
        </button>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="space-y-5">
        <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/08 text-sm text-red-400">
          {error || 'Произошла ошибка'}
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="btn-ghost w-full h-11 text-sm font-medium"
        >
          Попробовать снова
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-[#4A3F6A] hover:text-[#8B7FA8] transition-colors w-full text-center"
        >
          Закрыть
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleGenerate} className="space-y-4">
      {/* ── DATE RANGE ── */}
      <SectionHeader>Период</SectionHeader>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDateMode('full_year')}
          className={cn(
            'flex-1 h-9 rounded-xl text-xs font-medium transition-all',
            dateMode === 'full_year'
              ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
              : 'text-[#8B7FA8] hover:text-[#D4AF37]'
          )}
        >
          Весь год
        </button>
        <button
          type="button"
          onClick={() => setDateMode('custom')}
          className={cn(
            'flex-1 h-9 rounded-xl text-xs font-medium transition-all',
            dateMode === 'custom'
              ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
              : 'text-[#8B7FA8] hover:text-[#D4AF37]'
          )}
        >
          Период
        </button>
      </div>

      {dateMode === 'full_year' ? (
        <div className="flex gap-2">
          {[currentYear, currentYear + 1].map(y => (
            <button
              key={y}
              type="button"
              onClick={() => setYear(y)}
              className={cn(
                'flex-1 h-9 rounded-xl text-xs font-medium transition-all',
                year === y
                  ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
                  : 'text-[#8B7FA8] hover:text-[#D4AF37]'
              )}
            >
              {y}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="date"
                value={dateRangeStart}
                onChange={(e) => setDateRangeStart(e.target.value)}
                className="luxury-input w-full h-9 text-xs px-2"
                placeholder="Начало"
              />
            </div>
            <div className="flex-1">
              <input
                type="date"
                value={dateRangeEnd}
                onChange={(e) => setDateRangeEnd(e.target.value)}
                className="luxury-input w-full h-9 text-xs px-2"
                placeholder="Конец"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── PRESSET ── */}
      <div>
        <SectionHeader>Набор</SectionHeader>
        <div className="space-y-1.5">
          {PRESETS.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePresetSelect(p.id)}
              className={cn(
                'w-full text-left p-2.5 rounded-xl transition-all border',
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

      {/* ── FRONT MATTER ── */}
      <div>
        <SectionHeader>Начальные страницы</SectionHeader>
        <div className="space-y-1">
          {FRONT_MATTER_TOGGLES.map(config => (
            <ToggleRow
              key={config.key}
              config={config}
              toggles={toggles}
              onToggle={handleToggle}
              onSubOptionChange={handleSubOptionChange}
            />
          ))}
        </div>
      </div>

      {/* ── DAILY CONTENT ── */}
      <div>
        <SectionHeader>Ежедневные страницы</SectionHeader>
        <div className="space-y-1">
          {DAILY_TOGGLES.map(config => (
            <ToggleRow
              key={config.key}
              config={config}
              toggles={toggles}
              onToggle={handleToggle}
              onSubOptionChange={handleSubOptionChange}
            />
          ))}
        </div>
      </div>

      {/* ── PAGE LAYOUT ── */}
      <div>
        <SectionHeader>Оформление</SectionHeader>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">
              Формат страницы
            </label>
            <div className="flex gap-2">
              {PAGE_SIZES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setPageSize(s.id)}
                  className={cn(
                    'flex-1 h-9 rounded-xl text-xs font-medium transition-all',
                    pageSize === s.id
                      ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
                      : 'text-[#8B7FA8] hover:text-[#D4AF37]'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">
              Неделя начинается с
            </label>
            <div className="flex gap-2">
              {WEEK_STARTS.map(w => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWeekStartsOn(w.id)}
                  className={cn(
                    'flex-1 h-9 rounded-xl text-xs font-medium transition-all',
                    weekStartsOn === w.id
                      ? 'bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-[#D4AF37]'
                      : 'text-[#8B7FA8] hover:text-[#D4AF37]'
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">
              Поле для переплёта
              <span className="normal-case tracking-normal text-[9px] text-[#4A3F6A] ml-1">(в дюймах, необязательно)</span>
            </label>
            <input
              type="number"
              value={bindingMargin}
              onChange={(e) => setBindingMargin(e.target.value)}
              min="0"
              max="2"
              step="0.1"
              placeholder="0"
              className="luxury-input w-full h-9 text-xs px-3"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/08 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onCancel} className="btn-ghost flex-1 h-11 text-sm font-medium">
          Отмена
        </button>
        <button
          type="submit"
          className="btn-gold flex-1 h-11 text-sm flex items-center justify-center gap-2"
        >
          <BookOpen className="w-4 h-4" />
          Генерировать
        </button>
      </div>
    </form>
  )
}