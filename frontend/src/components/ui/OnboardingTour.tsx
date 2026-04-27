import { useState, useEffect, useCallback } from 'react'
import { X, ChevronRight, Star, Sparkles, Target, Heart, MessageCircle, MapPin, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/auth-context'

const STEPS = [
  {
    id: 'welcome',
    title: 'Добро пожаловать в Orbitron',
    description: 'Ваш персональный астрологический помощник. Давайте познакомимся с интерфейсом — это займёт меньше минуты.',
    icon: Star,
    target: null,
  },
  {
    id: 'chart',
    title: 'Натальная карта',
    description: 'Натальная карта — это снимок неба в момент вашего рождения. Она показывает расположение планет в знаках и домах, аспекты между ними и ключевые темы вашей жизни.',
    icon: Target,
    target: null,
    education: true,
  },
  {
    id: 'sidebar',
    title: 'Боковая панель',
    description: 'Здесь находятся все ваши карты. Выберите карту, чтобы её просмотреть. Кнопка + создаёт новую натальную карту.',
    icon: MapPin,
    target: '[data-onboarding="sidebar"]',
  },
  {
    id: 'actions',
    title: 'Типы карт',
    description: 'Из натальной карты можно построить транзиты, соляры, лунары, возвраты, дирекции, прогрессии, профекции и другие типы карт. Через меню + доступны хорар, электив и ректификация. Premium открывает все типы.',
    icon: Heart,
    target: '[data-onboarding="actions"]',
  },
  {
    id: 'chat',
    title: 'ИИ-Астролог',
    description: 'Задайте любой вопрос о вашей карте — ИИ-астролог даст профессиональную интерпретацию. Бесплатно: 3 вопроса в месяц. Premium: без ограничений.',
    icon: MessageCircle,
    target: '[data-onboarding="chat"]',
  },
  {
    id: 'profile',
    title: 'Профиль и настройки',
    description: 'В профиле вы можете управлять подпиской, добавить данные партнёров для карт отношений и выйти из аккаунта.',
    icon: BookOpen,
    target: '[data-onboarding="profile"]',
  },
]

interface OnboardingTourProps {
  onComplete: () => void
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [visible, setVisible] = useState(false)
  const { completeOnboarding } = useAuth()

  const current = STEPS[step]

  const updateTargetRect = useCallback(() => {
    if (!current.target) {
      setTargetRect(null)
      return
    }
    const el = document.querySelector(current.target) as HTMLElement | null
    if (!el) {
      setTargetRect(null)
      return
    }
    setTargetRect(el.getBoundingClientRect())
  }, [current.target])

  useEffect(() => {
    setVisible(true)
  }, [])

  useEffect(() => {
    updateTargetRect()
    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect, true)
    return () => {
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    }
  }, [updateTargetRect])

  const next = () => {
    if (step < STEPS.length - 1) {
      setVisible(false)
      setTimeout(() => {
        setStep((s) => s + 1)
        setVisible(true)
      }, 200)
    } else {
      finish()
    }
  }

  const skip = () => {
    finish()
  }

  const finish = async () => {
    setVisible(false)
    setTimeout(() => {
      onComplete()
      completeOnboarding()
    }, 200)
  }

  const getTooltipPosition = () => {
    if (!targetRect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }

    const padding = 16
    const tooltipWidth = 360
    const tooltipHeight = 260
    const vw = window.innerWidth
    const vh = window.innerHeight

    const center = {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2,
    }

    let top: number
    let left: number

    if (center.y + targetRect.height / 2 + padding + tooltipHeight < vh) {
      top = targetRect.bottom + padding
    } else {
      top = targetRect.top - padding - tooltipHeight
    }

    left = center.x - tooltipWidth / 2

    if (left < padding) left = padding
    if (left + tooltipWidth > vw - padding) left = vw - padding - tooltipWidth

    if (top < padding) top = padding
    if (top + tooltipHeight > vh - padding) top = vh - padding - tooltipHeight

    return {
      top: `${top}px`,
      left: `${left}px`,
      transform: 'none',
    }
  }

  const Icon = current.icon

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-[80] transition-opacity duration-200',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={skip}
      />

      {targetRect && (
        <div
          className={cn(
            'fixed z-[81] rounded-xl transition-all duration-300 pointer-events-none',
            visible ? 'opacity-100' : 'opacity-0'
          )}
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
            border: '2px solid rgba(212,175,55,0.4)',
            borderRadius: 12,
          }}
        />
      )}

      <div
        className={cn(
          'fixed z-[82] w-[360px] max-w-[calc(100vw-32px)] transition-all duration-300',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        )}
        style={getTooltipPosition()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="luxury-card overflow-hidden">
          <div className="px-6 pt-6 pb-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-semibold text-[#F0EAD6]">{current.title}</h3>
                  <p className="text-[10px] text-[#4A3F6A] mt-0.5">
                    Шаг {step + 1} из {STEPS.length}
                  </p>
                </div>
              </div>
              <button
                onClick={skip}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#4A3F6A] hover:text-[#F0EAD6] hover:bg-[rgba(212,175,55,0.08)] transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <p className="text-sm text-[#8B7FA8] leading-relaxed mb-5">{current.description}</p>

            {current.education && (
              <div className="space-y-3 mb-5">
                <div className="px-4 py-3 rounded-xl bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.1)]">
                  <p className="text-xs font-semibold text-[#D4AF37] mb-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Что показывает натальная карта
                  </p>
                  <ul className="text-xs text-[#8B7FA8] space-y-1 leading-relaxed">
                    <li>• <strong className="text-[#F0EAD6]">Солнце</strong> — ваша суть, эго, сознание</li>
                    <li>• <strong className="text-[#F0EAD6]">Луна</strong> — эмоции, подсознание, уют</li>
                    <li>• <strong className="text-[#F0EAD6]">Асцендент</strong> — как вас видят другие</li>
                    <li>• <strong className="text-[#F0EAD6]">Дома</strong> — сферы жизни, где разворачиваются события</li>
                    <li>• <strong className="text-[#F0EAD6]">Аспекты</strong> — взаимодействия планет, ваши таланты и вызовы</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all',
                      i === step ? 'bg-[#D4AF37] w-4' : i < step ? 'bg-[#D4AF37]/50' : 'bg-[#4A3F6A]'
                    )}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={skip}
                  className="text-xs text-[#4A3F6A] hover:text-[#8B7FA8] transition-colors"
                >
                  Пропустить
                </button>
                <button
                  onClick={next}
                  className="btn-gold h-9 px-5 text-sm flex items-center gap-1.5"
                >
                  {step === STEPS.length - 1 ? (
                    <>
                      <Star className="w-3.5 h-3.5" />
                      Начать
                    </>
                  ) : (
                    <>
                      Далее
                      <ChevronRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
