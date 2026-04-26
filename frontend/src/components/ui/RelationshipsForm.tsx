import { useState } from 'react'
import { Heart, Merge, MapPin } from 'lucide-react'
import { SynastryForm } from '@/components/ui/SynastryForm'
import { CompositeForm } from '@/components/ui/CompositeForm'
import { cn } from '@/lib/utils'

const RELATIONSHIP_TYPES = [
  { id: 'synastry' as const, label: 'Синастрия', desc: 'Наложение двух натальных карт', icon: Heart },
  { id: 'composite' as const, label: 'Композит', desc: 'Средняя точка планет', icon: Merge },
  { id: 'davison' as const, label: 'Давидсон', desc: 'Средняя точка времени и места', icon: MapPin },
]

type RelationshipType = 'synastry' | 'composite' | 'davison'

interface RelationshipsFormProps {
  natalChartId: number
  onSubmit: (chart: Record<string, unknown>) => void
  onCancel: () => void
}

export function RelationshipsForm({ natalChartId, onSubmit, onCancel }: RelationshipsFormProps) {
  const [selectedType, setSelectedType] = useState<RelationshipType>('synastry')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pt-1 pb-1.5">
        <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-[0.14em]">Тип отношений</span>
        <div className="flex-1 h-px bg-[rgba(212,175,55,0.1)]" />
      </div>

      <div className="space-y-1.5">
        {RELATIONSHIP_TYPES.map((t) => {
          const Icon = t.icon
          const isActive = selectedType === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedType(t.id)}
              className={cn(
                'w-full text-left p-2.5 rounded-xl transition-all border',
                isActive
                  ? 'bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.25)]'
                  : 'border-transparent bg-[rgba(212,175,55,0.04)] hover:bg-[rgba(212,175,55,0.08)]'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
                  isActive ? 'bg-[rgba(212,175,55,0.2)]' : 'bg-[rgba(212,175,55,0.07)]'
                )}>
                  <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-[#D4AF37]' : 'text-[#4A3F6A]')} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={cn('text-xs font-medium block', isActive ? 'text-[#D4AF37]' : 'text-[#F0EAD6]')}>
                    {t.label}
                  </span>
                  <span className="text-[10px] text-[#4A3F6A] block mt-0.5">{t.desc}</span>
                </div>
                <div className={cn(
                  'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                  isActive ? 'border-[#D4AF37]' : 'border-[rgba(212,175,55,0.3)]'
                )}>
                  {isActive && <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {selectedType === 'synastry' && (
        <SynastryForm key="synastry" natalChartId={natalChartId} onSubmit={onSubmit} onCancel={onCancel} />
      )}
      {selectedType === 'composite' && (
        <CompositeForm key="composite" natalChartId={natalChartId} onSubmit={onSubmit} onCancel={onCancel} defaultType="composite" />
      )}
      {selectedType === 'davison' && (
        <CompositeForm key="davison" natalChartId={natalChartId} onSubmit={onSubmit} onCancel={onCancel} defaultType="davison" />
      )}
    </div>
  )
}