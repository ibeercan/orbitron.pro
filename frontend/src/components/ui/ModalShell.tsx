import React from 'react'
import { X } from 'lucide-react'
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
}

export function ModalShell({ open, onClose, icon, title, description, children }: ModalShellProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="p-0 border-0 bg-transparent shadow-none max-w-md w-full"
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

          <div className="px-6 py-6 max-h-[65dvh] overflow-y-auto overscroll-contain">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
