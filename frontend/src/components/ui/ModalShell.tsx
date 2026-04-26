import React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { isGeocodingDropdownClick } from '@/hooks/useFixedDropdown'

interface ModalShellProps {
  open: boolean
  onClose: () => void
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
  size?: 'sm' | 'lg'
}

export function ModalShell({ open, onClose, icon, title, description, children, size = 'sm' }: ModalShellProps) {
  const scrollClass = size === 'lg' ? 'max-h-[80dvh]' : 'max-h-[65dvh]'

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className={cn(
          'p-0 border-0 bg-transparent shadow-none w-full',
          size === 'lg' ? 'max-w-2xl' : 'max-w-md'
        )}
        onPointerDownOutside={(e) => {
          if (isGeocodingDropdownClick(e.detail.originalEvent as PointerEvent)) {
            e.preventDefault()
          }
        }}
      >
        <div className="luxury-card overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b border-[rgba(212,175,55,0.08)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center">
                {icon}
              </div>
              <div>
                <DialogTitle className="font-serif text-xl font-semibold text-[#F0EAD6] m-0">
                  {title}
                </DialogTitle>
                <DialogDescription className="text-xs text-[#8B7FA8] mt-0.5">
                  {description}
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-[#8B7FA8] hover:text-[#F0EAD6] hover:bg-[rgba(212,175,55,0.08)] transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className={cn('px-6 py-6 overflow-y-auto overscroll-contain', scrollClass)}>
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}