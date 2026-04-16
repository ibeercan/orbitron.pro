import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { subscriptionApi, authApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'

interface SubscribeFormData {
  email: string
  invite_code?: string
}

interface RegisterFormData {
  password: string
  confirm_password: string
}

type Step = 'subscribe' | 'check' | 'register' | 'success'

export default function Landing() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  
  const [step, setStep] = useState<Step>('subscribe')
  const [email, setEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { register: registerSubscribe, handleSubmit: handleSubscribeSubmit, formState: { errors: subscribeErrors }, reset: resetSubscribe } = useForm<SubscribeFormData>()
  const { register: registerForm, handleSubmit: handleRegisterSubmit, formState: { errors: registerErrors }, watch, reset: resetRegister } = useForm<RegisterFormData>()
  const password = watch('password')

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

    const shootingStars: { x: number; y: number; vx: number; vy: number; life: number }[] = []

    const animate = () => {
      ctx.fillStyle = '#030811'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const gradient = ctx.createRadialGradient(
        canvas.width / 2, 0, 0,
        canvas.width / 2, 0, canvas.width
      )
      gradient.addColorStop(0, '#0c1222')
      gradient.addColorStop(0.5, '#030811')
      gradient.addColorStop(1, '#010408')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)

      stars.forEach((star) => {
        const size = (1 - star.z / canvas.width) * 2
        const alpha = star.brightness * (1 - star.z / canvas.width)
        ctx.beginPath()
        ctx.arc(star.x, star.y, size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        ctx.fill()
      })

      ctx.restore()

      if (Math.random() < 0.005) {
        shootingStars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.3,
          vx: -2 - Math.random() * 3,
          vy: 1 + Math.random() * 2,
          life: 1,
        })
      }

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

  const checkInvite = useCallback(async (data: SubscribeFormData) => {
    setIsLoading(true)
    setEmail(data.email)
    setInviteCode(data.invite_code || '')

    try {
      const res = await subscriptionApi.checkInvite(data.email, data.invite_code)
      const { can_register, is_premium, message: msg } = res.data
      
      setMessage(msg)
      setIsPremium(is_premium)
      
      if (can_register) {
        setStep('register')
      } else {
        setStep('check')
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      setMessage(err.response?.data?.detail || 'Ошибка проверки')
      setStep('check')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const onRegister = useCallback(async (data: RegisterFormData) => {
    setIsLoading(true)
    setMessage('')

    try {
      await authApi.register(email, data.password, inviteCode || undefined)
      setStep('success')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      setMessage(err.response?.data?.detail || 'Ошибка регистрации')
    } finally {
      setIsLoading(false)
    }
  }, [email, inviteCode, navigate])

  const goBack = () => {
    setStep('subscribe')
    setMessage('')
    resetSubscribe()
    resetRegister()
  }

  return (
    <div className="relative min-h-screen">
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-8">
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
            <circle cx="70" cy="50" r="3" fill="#a78bfa" filter="url(#glow)">
              <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="25s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        {step === 'success' ? (
          <div className="text-center animate-fade-in">
            <h2 className="text-2xl font-semibold text-green-400 mb-2">Добро пожаловать!</h2>
            <p className="text-gray-400">Перенаправляем в личный кабинет...</p>
          </div>
        ) : (
          <div className="w-full max-w-xs animate-fade-in">
            {step === 'subscribe' && (
              <>
                <div className="mb-6 text-center">
                  <h2 className="text-xl font-semibold text-white mb-1">Узнайте первыми</h2>
                  <p className="text-sm text-gray-400">
                    {isPremium ? (
                      <span className="text-secondary-400 font-semibold">Premium аккаунт при регистрации</span>
                    ) : (
                      <>Получите <span className="text-secondary-400 font-semibold">Premium</span> по приглашению</>
                    )}
                  </p>
                </div>

                <form onSubmit={handleSubscribeSubmit(checkInvite)} className="flex flex-col gap-3">
                  <input
                    type="email"
                    placeholder="Ваш email"
                    {...registerSubscribe('email', {
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
                      subscribeErrors.email ? 'border-red-500' : 'border-white/20'
                    )}
                  />
                  {subscribeErrors.email && (
                    <p className="text-sm text-red-500">{subscribeErrors.email.message}</p>
                  )}

                  <input
                    type="text"
                    placeholder="Код приглашения (если есть)"
                    {...registerSubscribe('invite_code')}
                    className="h-12 w-full rounded-md border border-white/20 bg-white/5 px-4 text-white placeholder-gray-500 transition-all duration-200 hover:border-white/40 focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20"
                  />

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="h-12 w-full rounded-md bg-secondary-400 px-6 font-semibold text-gray-900 transition-all duration-200 hover:bg-secondary-300 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
                        Проверка...
                      </span>
                    ) : (
                      'Продолжить'
                    )}
                  </button>
                </form>
              </>
            )}

            {step === 'check' && (
              <div className="text-center">
                <div className="mb-4 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-yellow-400">
                  {message || 'Проверьте введенные данные'}
                </div>
                <button
                  onClick={goBack}
                  className="text-secondary-400 hover:underline"
                >
                  Назад
                </button>
              </div>
            )}

            {step === 'register' && (
              <>
                <div className="mb-6 text-center">
                  <h2 className="text-xl font-semibold text-white mb-1">Создать аккаунт</h2>
                  <p className="text-sm text-gray-400">
                    {isPremium ? (
                      <span className="text-secondary-400 font-semibold">Premium подписка навсегда</span>
                    ) : (
                      'Зарегистрируйтесь'
                    )}
                  </p>
                </div>

                <div className="mb-4 rounded-md border border-secondary-500/30 bg-secondary-500/10 px-3 py-2 text-sm text-secondary-400">
                  {email}
                </div>

                <form onSubmit={handleRegisterSubmit(onRegister)} className="flex flex-col gap-3">
                  <input
                    type="password"
                    placeholder="Пароль"
                    {...registerForm('password', {
                      required: 'Пароль обязателен',
                      minLength: {
                        value: 6,
                        message: 'Минимум 6 символов',
                      },
                    })}
                    className={cn(
                      'h-12 w-full rounded-md border bg-white/5 px-4 text-white placeholder-gray-500',
                      'transition-all duration-200',
                      'hover:border-white/40',
                      'focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20',
                      registerErrors.password ? 'border-red-500' : 'border-white/20'
                    )}
                  />
                  {registerErrors.password && (
                    <p className="text-sm text-red-500">{registerErrors.password.message}</p>
                  )}

                  <input
                    type="password"
                    placeholder="Подтвердите пароль"
                    {...registerForm('confirm_password', {
                      required: 'Подтвердите пароль',
                      validate: (value) =>
                        value === password || 'Пароли не совпадают',
                    })}
                    className={cn(
                      'h-12 w-full rounded-md border bg-white/5 px-4 text-white placeholder-gray-500',
                      'transition-all duration-200',
                      'hover:border-white/40',
                      'focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20',
                      registerErrors.confirm_password ? 'border-red-500' : 'border-white/20'
                    )}
                  />
                  {registerErrors.confirm_password && (
                    <p className="text-sm text-red-500">{registerErrors.confirm_password.message}</p>
                  )}

                  {message && (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                      {message}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={goBack}
                      className="h-12 flex-1 rounded-md border border-white/20 px-4 text-gray-400 transition-all hover:border-white/40 hover:text-white"
                    >
                      Назад
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="h-12 flex-1 rounded-md bg-secondary-400 px-6 font-semibold text-gray-900 transition-all duration-200 hover:bg-secondary-300 disabled:opacity-50"
                    >
                      {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}
      </main>

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