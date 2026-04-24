import { useState } from 'react'
import { Star, Sparkles, ChevronRight, BookOpen, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const TIPS = [
  {
    icon: Star,
    title: 'Натальная карта',
    text: 'Это фотография неба в момент вашего рождения. Положение планет в знаках и домах определяет ваши черты, таланты и жизненные темы.',
  },
  {
    icon: Sparkles,
    title: 'Как работает ИИ-Астролог',
    text: 'ИИ анализирует данные вашей карты — планеты, аспекты, дома — и даёт профессиональную интерпретацию. Чем точнее время рождения, тем точнее прогноз.',
  },
  {
    icon: BookOpen,
    title: 'Совет',
    text: 'Задавайте конкретные вопросы: "Что означает моя Венера в Скорпионе?" или "Какие у меня таланты по натальной карте?" — получите более глубокий ответ.',
  },
]

export function WelcomeMessage({ onDismiss }: { onDismiss: () => void }) {
  const [expandedTip, setExpandedTip] = useState<number | null>(null)

  return (
    <div className="animate-fade-in-fast">
      <div className="msg-ai px-4 py-3">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-sm font-semibold text-[#D4AF37]">Добро пожаловать!</span>
          </div>
          <button
            onClick={onDismiss}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#4A3F6A] hover:text-[#F0EAD6] hover:bg-[rgba(212,175,55,0.08)] transition-all -mt-1 -mr-1"
          >
            <X className="w-3 h-3" />
          </button>
        </div>

        <p className="text-sm text-[#D4CCBD] leading-relaxed mb-3">
          Я ваш ИИ-астролог. Создайте натальную карту, и я помогу разобраться в её значении. Вот несколько ключевых понятий:
        </p>

        <div className="space-y-2">
          {TIPS.map((tip, i) => {
            const Icon = tip.icon
            const isOpen = expandedTip === i
            return (
              <button
                key={i}
                onClick={() => setExpandedTip(isOpen ? null : i)}
                className="w-full text-left rounded-lg border border-[rgba(212,175,55,0.08)] bg-[rgba(212,175,55,0.03)] hover:bg-[rgba(212,175,55,0.06)] transition-all overflow-hidden"
              >
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <Icon className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                  <span className="text-xs font-semibold text-[#F0EAD6] flex-1">{tip.title}</span>
                  <ChevronRight className={cn(
                    'w-3 h-3 text-[#4A3F6A] transition-transform shrink-0',
                    isOpen && 'rotate-90'
                  )} />
                </div>
                {isOpen && (
                  <div className="px-3 pb-2.5 pt-0">
                    <p className="text-xs text-[#8B7FA8] leading-relaxed">{tip.text}</p>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
