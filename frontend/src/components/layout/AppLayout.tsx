import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface AppLayoutProps {
  children: React.ReactNode
  className?: string
}

export function AppLayout({ children, className }: AppLayoutProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    type Star = {
      x: number; y: number
      r: number; alpha: number
      twinkleSpeed: number; twinkleOffset: number
    }

    const stars: Star[] = Array.from({ length: 220 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.3 + 0.15,
      alpha: Math.random() * 0.5 + 0.08,
      twinkleSpeed: Math.random() * 0.012 + 0.004,
      twinkleOffset: Math.random() * Math.PI * 2,
    }))

    let t = 0
    let animationId: number

    const animate = () => {
      t += 0.016

      /* Deep space background */
      ctx.fillStyle = '#0A0612'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      /* Subtle nebula glow — top-left purple */
      const g1 = ctx.createRadialGradient(
        canvas.width * 0.12, canvas.height * 0.15, 0,
        canvas.width * 0.12, canvas.height * 0.15, canvas.width * 0.38
      )
      g1.addColorStop(0, 'rgba(123,47,190,0.055)')
      g1.addColorStop(1, 'transparent')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      /* Subtle nebula glow — bottom-right gold */
      const g2 = ctx.createRadialGradient(
        canvas.width * 0.88, canvas.height * 0.82, 0,
        canvas.width * 0.88, canvas.height * 0.82, canvas.width * 0.28
      )
      g2.addColorStop(0, 'rgba(212,175,55,0.032)')
      g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      /* Stars with twinkle */
      stars.forEach((s) => {
        const pulse = Math.sin(t * s.twinkleSpeed * 60 + s.twinkleOffset) * 0.28 + 0.72
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(240, 234, 214, ${s.alpha * pulse})`
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className={cn('relative min-h-screen overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
      />
      <div className="relative z-10 min-h-screen">
        {children}
      </div>
    </div>
  )
}
