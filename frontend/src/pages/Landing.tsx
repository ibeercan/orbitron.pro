import { useRef, useEffect, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { subscriptionApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface SubscribeFormData {
  email: string
  invite_code?: string
}

export default function Landing() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const { register, handleSubmit, formState: { errors }, reset } = useForm<SubscribeFormData>()

  // Starfield animation
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

    // Stars
    const stars: { x: number; y: number; z: number; brightness: number }[] = []
    const numStars = 200

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width - canvas.width / 2,
        y: Math.random() * canvas.height - canvas.height / 2,
        z: Math.random() * canvas.width,
        brightness: Math.random(),
      })
    }

    // Shooting stars
    const shootingStars: { x: number; y: number; vx: number; vy: number; life: number }[] = []

    const animate = () => {
      ctx.fillStyle = '#030811'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw gradient background
      const gradient = ctx.createRadialGradient(
        canvas.width / 2,
        0,
        0,
        canvas.width / 2,
        0,
        canvas.width
      )
      gradient.addColorStop(0, '#0c1222')
      gradient.addColorStop(0.5, '#030811')
      gradient.addColorStop(1, '#010408')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Center origin
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)

      // Draw stars
      stars.forEach((star) => {
        const size = (1 - star.z / canvas.width) * 2
        const alpha = star.brightness * (1 - star.z / canvas.width)

        ctx.beginPath()
        ctx.arc(star.x, star.y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      })

      ctx.restore()

      // Random shooting star
      if (Math.random() < 0.005) {
        shootingStars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.3,
          vx: -2 - Math.random() * 3,
          vy: 1 + Math.random() * 2,
          life: 1,
        })
      }

      // Update and draw shooting stars
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i]
        star.x += star.vx
        star.y += star.vy
        star.life -= 0.02

        if (star.life <= 0) {
          shootingStars.splice(i, 1)
          continue
        }

        ctx.beginPath()
        ctx.moveTo(star.x, star.y)
        ctx.lineTo(star.x - star.vx * 20, star.y - star.vy * 20)
        ctx.strokeStyle = `rgba(34, 211, 238, ${star.life})`
        ctx.lineWidth = 2
        ctx.stroke()
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const onSubmit = useCallback(async (data: SubscribeFormData) => {
    setStatus('loading')
    setMessage('')

    try {
      await subscriptionApi.earlyAccess(data.email, data.invite_code)
      setStatus('success')
      setMessage('Спасибо! Вы подписаны.')
      reset()
    } catch (error: unknown) {
      setStatus('error')
      const err = error as { response?: { data?: { detail?: string } } }
      setMessage(err.response?.data?.detail || 'Ошибка при подписке. Попробуйте позже.')
    }
  }, [reset])

  return (
    <div className="relative min-h-screen">
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-8">
        {/* Logo */}
        <div className="mb-8 animate-fade-in">
          <svg width="120" height="120" viewBox="0 0 100 100" className="drop-shadow-[0_0_30px_rgba(129,140,248,0.3)]">
            <defs>
              <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
              <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.7" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle cx="50" cy="50" r="8" fill="url(#coreGradient)" filter="url(#glow)">
              <animate attributeName="r" values="7;9;7" dur="3s" repeatCount="indefinite" />
            </circle>

            <circle cx="50" cy="50" r="20" fill="none" stroke="url(#orbitGradient)" strokeWidth="1.2" strokeDasharray="4 3">
              <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="25s" repeatCount="indefinite" />
            </circle>

            <circle cx="50" cy="50" r="32" fill="none" stroke="url(#orbitGradient)" strokeWidth="1" strokeDasharray="3 4">
              <animateTransform attributeName="transform" type="rotate" from="360 50 50" to="0 50 50" dur="40s" repeatCount="indefinite" />
            </circle>

            <circle cx="50" cy="50" r="44" fill="none" stroke="url(#orbitGradient)" strokeWidth="0.6" strokeDasharray="2 5">
              <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="60s" repeatCount="indefinite" />
            </circle>

            <circle cx="70" cy="50" r="3" fill="#a78bfa" filter="url(#glow)">
              <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="25s" repeatCount="indefinite" />
            </circle>

            <circle cx="82" cy="50" r="2" fill="#22d3ee" filter="url(#glow)">
              <animateTransform attributeName="transform" type="rotate" from="360 50 50" to="0 50 50" dur="40s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        {/* Title */}
        <h1 className="animate-fade-in mb-4 text-center text-3xl font-semibold tracking-tight text-gradient sm:text-4xl lg:text-5xl">
          Продолжение следует
        </h1>

        <p className="animate-fade-in mb-6 text-center text-lg text-gray-400">
          Что-то готовится. Оставайтесь на связи.
        </p>

        {/* Subscribe Form */}
        <div className="w-full max-w-xs animate-fade-in">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-1">Узнайте первыми</h2>
            <p className="text-sm text-gray-400">
              Получите <span className="text-secondary-400 font-semibold">1 месяц Premium</span> при запуске
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
            <input
              type="email"
              placeholder="Ваш email"
              {...register('email', {
                required: 'Email обязателен',
                pattern: {
                  value: /^[\w.-]+@[\w.-]+\.\w+$/,
                  message: 'Некорректный email',
                },
              })}
              className={cn(
                'h-12 w-full rounded-md border bg-white/5 px-4 text-white placeholder-gray-500',
                'transition-all duration-200',
                'hover:border-white/40',
                'focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20',
                'disabled:opacity-50',
                errors.email ? 'border-red-500' : 'border-white/20'
              )}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}

            <input
              type="text"
              placeholder="Код приглашения (если есть)"
              {...register('invite_code')}
              className={cn(
                'h-12 w-full rounded-md border bg-white/5 px-4 text-white placeholder-gray-500',
                'transition-all duration-200',
                'hover:border-white/40',
                'focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20',
                'border-white/20'
              )}
            />

            <button
              type="submit"
              disabled={status === 'loading'}
              className={cn(
                'h-12 w-full rounded-md bg-secondary-400 px-6 font-semibold text-gray-900',
                'transition-all duration-200',
                'hover:bg-secondary-300 hover:-translate-y-0.5 hover:shadow-lg',
                'active:translate-y-0 bg-secondary-500',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0'
              )}
            >
              {status === 'loading' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
                  Подписка...
                </span>
              ) : (
                'Подписаться'
              )}
            </button>
          </form>

          {/* Message */}
          {message && (
            <div
              className={cn(
                'mt-3 rounded-md border px-3 py-2 text-sm',
                status === 'success' && 'border-green-500/30 bg-green-500/10 text-green-500',
                status === 'error' && 'border-red-500/30 bg-red-500/10 text-red-500'
              )}
            >
              {message}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6">
        <div className="flex justify-center">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-gradient">ORBITRON</span>
            <span className="text-xs text-gray-500">2026</span>
          </div>
        </div>
      </footer>
    </div>
  )
}