import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'

interface DropdownPosition {
  left: number
  top: number
  width: number
}

const DROPDOWN_ATTR = 'data-geocoding-dropdown'

export function useFixedDropdown() {
  const containerRef = useRef<HTMLDivElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<DropdownPosition>({ left: 0, top: 0, width: 360 })

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    setPosition({
      left: rect.left,
      top: rect.bottom + 6,
      width: Math.min(rect.width, 360),
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updatePosition()
    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [isOpen, updatePosition])

  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        containerRef.current?.contains(target) ||
        portalRef.current?.contains(target)
      ) {
        return
      }
      setIsOpen(false)
    }
    const handleTouchOutside = (e: TouchEvent) => {
      const target = e.target as Node
      if (
        containerRef.current?.contains(target) ||
        portalRef.current?.contains(target)
      ) {
        return
      }
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleTouchOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleTouchOutside)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen || !portalRef.current) return
    const el = portalRef.current
    const stripAriaHidden = () => {
      if (el.hasAttribute('aria-hidden')) {
        el.removeAttribute('aria-hidden')
      }
    }
    stripAriaHidden()
    const observer = new MutationObserver(stripAriaHidden)
    observer.observe(el, { attributes: true, attributeFilter: ['aria-hidden'] })
    return () => observer.disconnect()
  }, [isOpen])

  const renderDropdown = (content: React.ReactNode) => {
    if (!isOpen) return null
    return createPortal(
      <div
        ref={portalRef}
        data-geocoding-dropdown
        className="fixed z-[70] rounded-xl border border-[rgba(212,175,55,0.15)] overflow-hidden"
        style={{
          left: position.left,
          top: position.top,
          width: position.width,
          maxWidth: 360,
          pointerEvents: 'auto',
          background: 'linear-gradient(145deg, rgba(22,15,40,0.98) 0%, rgba(13,9,32,0.99) 100%)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,175,55,0.06)',
        }}
      >
        {content}
      </div>,
      document.body
    )
  }

  return { containerRef, isOpen, setIsOpen, renderDropdown }
}

export function isGeocodingDropdownClick(e: PointerEvent): boolean {
  const target = e.target as HTMLElement
  return !!target.closest(`[${DROPDOWN_ATTR}]`)
}
