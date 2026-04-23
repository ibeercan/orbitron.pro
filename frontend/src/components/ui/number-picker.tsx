import { useState, useCallback, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumberPickerProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  label?: string
  placeholder?: string
  className?: string
}

export function NumberPicker({
  value,
  onChange,
  min = 1,
  max = 31,
  step = 1,
  label,
  placeholder,
  className,
}: NumberPickerProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const increment = useCallback(() => {
    if (value < max) {
      onChange(value + step)
    }
  }, [value, max, step, onChange])

  const decrement = useCallback(() => {
    if (value > min) {
      onChange(value - step)
    }
  }, [value, min, step, onChange])

  const handleMouseDown = (action: 'inc' | 'dec') => {
    action === 'inc' ? increment() : decrement()
    intervalRef.current = setInterval(
      action === 'inc' ? increment : decrement,
      150
    )
  }

  const handleMouseUp = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <div className={cn('relative', className)}>
      {label && (
        <label className="block text-[10px] font-semibold text-[#8B7FA8] uppercase tracking-[0.12em] mb-1.5">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center h-11 rounded-xl border luxury-input',
          focused && 'focused'
        )}
      >
        <input
          ref={inputRef}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = parseInt(e.target.value)
            if (!isNaN(v)) {
              onChange(v)
            } else if (e.target.value === '') {
              onChange(min)
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              increment()
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              decrement()
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-center text-sm text-[#F0EAD6] placeholder:text-[#8B7FA8] placeholder:opacity-50 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <div className="flex flex-col border-l border-[rgba(212,175,55,0.14)]">
          <button
            type="button"
            onClick={increment}
            onMouseDown={() => handleMouseDown('inc')}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onPointerUp={handleMouseUp}
            disabled={value >= max}
            className="flex items-center justify-center w-8 h-[22px] text-[#8B7FA8] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] disabled:opacity-30 disabled:hover:bg-transparent transition-all rounded-tr-xl"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={decrement}
            onMouseDown={() => handleMouseDown('dec')}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onPointerUp={handleMouseUp}
            disabled={value <= min}
            className="flex items-center justify-center w-8 h-[22px] text-[#8B7FA8] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] disabled:opacity-30 disabled:hover:bg-transparent transition-all rounded-br-xl"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}