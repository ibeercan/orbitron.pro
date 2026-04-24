import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { subscriptionApi, authApi } from '@/lib/api/client'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { ArrowRight, Star, Sparkles, Shield, Loader2, ChevronLeft, Users } from 'lucide-react'

interface SubscribeFormData {
  email: string
  invite_code?: string
}

interface PasswordFormData {
  password: string
}

type Step = 'email' | 'login' | 'check' | 'register' | 'success'

function OrbitronLogo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="coreGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0C842" />
          <stop offset="100%" stopColor="#B8960F" />
        </linearGradient>
        <linearGradient id="orbitGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.3" />
          <stop offset="40%" stopColor="#F0C842" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#D4AF37" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="orbitPurple" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7B2FBE" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#9D50E0" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#7B2FBE" stopOpacity="0.2" />
        </linearGradient>
        <filter id="goldGlow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="coreGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <ellipse cx="50" cy="50" rx="40" ry="16" fill="none"
        stroke="url(#orbitPurple)" strokeWidth="1.2"
        transform="rotate(-25 50 50)"
        strokeDasharray="5 3">
        <animateTransform attributeName="transform" type="rotate"
          from="0 50 50" to="360 50 50" dur="45s" additive="sum" repeatCount="indefinite" />
      </ellipse>

      <ellipse cx="50" cy="50" rx="28" ry="10" fill="none"
        stroke="url(#orbitGold)" strokeWidth="1.4"
        transform="rotate(15 50 50)">
        <animateTransform attributeName="transform" type="rotate"
          from="360 50 50" to="0 50 50" dur="28s" additive="sum" repeatCount="indefinite" />
      </ellipse>

      <circle cx="78" cy="50" r="3.5" fill="#D4AF37" filter="url(#goldGlow)">
        <animateTransform attributeName="transform" type="rotate"
          from="0 50 50" to="360 50 50" dur="28s" repeatCount="indefinite" />
      </circle>

      <circle cx="50" cy="10" r="2.5" fill="#9D50E0" filter="url(#goldGlow)">
        <animateTransform attributeName="transform" type="rotate"
          from="0 50 50" to="360 50 50" dur="45s" repeatCount="indefinite" />
      </circle>

      <circle cx="50" cy="50" r="9" fill="url(#coreGold)" filter="url(#coreGlow)">
        <animate attributeName="r" values="8;10;8" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.85;1;0.85" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="50" r="5" fill="#FFF8DC" opacity="0.6" />
    </svg>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [isPremium, setIsPremium] = useState(false)
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuth()

  useEffect(() => {
    document.body.classList.add('landing-page')
    return () => document.body.classList.remove('landing-page')
  }, [])

  const {
    register: registerEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
    reset: resetEmail,
  } = useForm<SubscribeFormData>()

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<PasswordFormData>()

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

    type Star = { x: number; y: number; r: number; alpha: number; twinkleSpeed: number; twinkleOffset: number }
    const stars: Star[] = Array.from({ length: 280 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.2,
      alpha: Math.random() * 0.6 + 0.1,
      twinkleSpeed: Math.random() * 0.015 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
    }))

    type Meteor = { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string }
    const meteors: Meteor[] = []

    let t = 0

    const animate = () => {
      t += 0.016

      ctx.fillStyle = '#0A0612'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const g1 = ctx.createRadialGradient(canvas.width * 0.15, canvas.height * 0.3, 0, canvas.width * 0.15, canvas.height * 0.3, canvas.width * 0.35)
      g1.addColorStop(0, 'rgba(123,47,190,0.06)')
      g1.addColorStop(1, 'transparent')
      ctx.fillStyle = g1
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const g2 = ctx.createRadialGradient(canvas.width * 0.85, canvas.height * 0.7, 0, canvas.width * 0.85, canvas.height * 0.7, canvas.width * 0.3)
      g2.addColorStop(0, 'rgba(212,175,55,0.04)')
      g2.addColorStop(1, 'transparent')
      ctx.fillStyle = g2
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      stars.forEach((s) => {
        const pulse = Math.sin(t * s.twinkleSpeed * 60 + s.twinkleOffset) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(240, 234, 214, ${s.alpha * pulse})`
        ctx.fill()
      })

      if (Math.random() < 0.007) {
        const isGold = Math.random() > 0.5
        meteors.push({
          x: Math.random() * canvas.width * 0.7 + canvas.width * 0.1,
          y: Math.random() * canvas.height * 0.4,
          vx: -(2.5 + Math.random() * 3),
          vy: 1.2 + Math.random() * 2,
          life: 1,
          maxLife: 1,
          color: isGold ? '#D4AF37' : '#9D50E0',
        })
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        m.x += m.vx
        m.y += m.vy
        m.life -= 0.018

        if (m.life <= 0) { meteors.splice(i, 1); continue }

        const tailLen = 24 + (1 - m.life) * 12
        const grad = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * tailLen, m.y - m.vy * tailLen)
        grad.addColorStop(0, m.color + Math.round(m.life * 255).toString(16).padStart(2, '0'))
        grad.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(m.x - m.vx * tailLen, m.y - m.vy * tailLen)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.8 * m.life
        ctx.lineCap = 'round'
        ctx.stroke()

        ctx.beginPath()
        ctx.arc(m.x, m.y, 1.5 * m.life, 0, Math.PI * 2)
        ctx.fillStyle = m.color
        ctx.globalAlpha = m.life * 0.8
        ctx.fill()
        ctx.globalAlpha = 1
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  const checkEmail = useCallback(async (data: SubscribeFormData) => {
    setIsLoading(true)
    setEmail(data.email)
    setInviteCode(data.invite_code || '')
    setMessage('')

    try {
      const res = await subscriptionApi.checkEmail(data.email)
      const { exists, is_subscriber, message: emailMsg } = res.data

      if (exists) {
        setStep('login')
      } else if (is_subscriber) {
        setMessage(emailMsg)
        if (data.invite_code) {
          const inviteRes = await subscriptionApi.checkInvite(data.email, data.invite_code)
          const { can_register, is_premium, message: inviteMsg } = inviteRes.data
          setMessage(inviteMsg)
          setIsPremium(is_premium)
          if (can_register) setStep('register')
        } else {
          setStep('email')
        }
      } else {
        if (data.invite_code) {
          const inviteRes = await subscriptionApi.checkInvite(data.email, data.invite_code)
          const { can_register, is_premium, message: inviteMsg } = inviteRes.data
          setMessage(inviteMsg)
          setIsPremium(is_premium)
          if (can_register) setStep('register')
          else setStep('check')
        } else {
          setStep('check')
          setMessage('Подпишитесь на рассылку, чтобы получить ранний доступ')
        }
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      setMessage(err.response?.data?.detail || 'Ошибка проверки')
      setStep('check')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const onSubscribe = useCallback(async () => {
    setIsLoading(true)
    setMessage('')
    try {
      await subscriptionApi.earlyAccess(email)
      setStep('success')
      setMessage('Спасибо за подписку!')
      setTimeout(() => goBack(), 2500)
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      setMessage(err.response?.data?.detail || 'Ошибка подписки')
    } finally {
      setIsLoading(false)
    }
  }, [email])

  const onLogin = useCallback(async (data: PasswordFormData) => {
    setIsLoading(true)
    setMessage('')
    try {
      await login(email, data.password)
      navigate('/dashboard')
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } }
      setMessage(err.response?.data?.detail || 'Неверный пароль')
    } finally {
      setIsLoading(false)
    }
  }, [email, navigate, login])

  const onRegister = useCallback(async (data: PasswordFormData) => {
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
    setStep('email')
    setMessage('')
    resetEmail()
    resetPassword()
  }

  const formTitle = {
    email:    { title: 'Добро пожаловать',   subtitle: 'Войдите или зарегистрируйтесь' },
    login:    { title: 'С возвращением',      subtitle: 'Введите пароль от аккаунта' },
    check:    { title: 'Ранний доступ',       subtitle: 'Подпишитесь, чтобы не пропустить запуск' },
    register: { title: 'Создать аккаунт',     subtitle: isPremium ? 'Вы получите Premium навсегда' : 'Добро пожаловать в Orbitron' },
    success:  { title: 'Добро пожаловать!',   subtitle: 'Переходим в личный кабинет...' },
  }[step]

  return (
    <div className="relative min-h-screen overflow-hidden">
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />

      <div className="fixed inset-0 z-[1] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A0612]/60 via-transparent to-[#0D0919]/40" />
      </div>

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">

            {/* Logo — centered above everything */}
            <div className="flex flex-col items-center animate-in mb-8">
              <div className="animate-float mb-5">
                <OrbitronLogo size={64} />
              </div>
              <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-center leading-tight">
                <span className="text-[#F0EAD6]">Познайте себя</span>
                <br />
                <span className="gold-shimmer-text">через звёзды</span>
              </h1>
            </div>

            {/* Form + Feature pills row — left spacer balances pills to keep form centered */}
            <div className="w-full max-w-5xl flex flex-col sm:flex-row items-start justify-center gap-6 sm:gap-8">

              {/* Left spacer — invisible, same width as pills */}
              <div className="hidden sm:block sm:w-72 sm:shrink-0" />

              {/* Form card — visually centered */}
              <div className="w-full sm:w-96 sm:shrink-0 animate-in animate-in-delay-1">
                {step === 'success' ? (
                  <div className="luxury-card p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[rgba(212,175,55,0.12)] flex items-center justify-center">
                      <OrbitronLogo size={40} />
                    </div>
                    <h2 className="font-serif text-2xl font-semibold text-[#F0EAD6] mb-2">
                      Добро пожаловать!
                    </h2>
                    <p className="text-[#8B7FA8] text-sm">Переходим в личный кабинет...</p>
                    <div className="mt-6 flex justify-center">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-typing-1" />
                        <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-typing-2" />
                        <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-typing-3" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="luxury-card overflow-hidden">
                <div className="px-7 pt-7 pb-5 border-b border-[rgba(212,175,55,0.08)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-serif text-2xl font-semibold text-[#F0EAD6]">
                        {formTitle.title}
                      </h2>
                      <p className="text-[#8B7FA8] text-sm mt-1">{formTitle.subtitle}</p>
                    </div>
                    {(step === 'login' || step === 'register' || step === 'check') && (
                      <button
                        onClick={goBack}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8B7FA8] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isPremium && (step === 'register' || step === 'email') && (
                    <div className="mt-3">
                      <span className="badge-gold">Premium навсегда</span>
                    </div>
                  )}
                </div>

                <div className="px-7 py-6">
                  {step !== 'email' && (
                    <div className="mb-5 flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.15)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0" />
                      <span className="text-sm text-[#D4AF37] font-medium truncate">{email}</span>
                    </div>
                  )}

                  {step === 'email' && (
                    <form onSubmit={handleEmailSubmit(checkEmail)} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#8B7FA8] mb-1.5 uppercase tracking-wide">
                          Email
                        </label>
                        <input
                          type="email"
                          placeholder="you@example.com"
                          {...registerEmail('email', {
                            required: 'Email обязателен',
                            pattern: { value: /^[\w.-]+@[\w.-]+\.\w+$/, message: 'Некорректный email' },
                          })}
                          className={cn('luxury-input w-full h-11 px-4', emailErrors.email && 'error')}
                        />
                        {emailErrors.email && (
                          <p className="text-xs text-red-400 mt-1.5">{emailErrors.email.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#8B7FA8] mb-1.5 uppercase tracking-wide">
                          Код приглашения <span className="text-[#4A3F6A] normal-case tracking-normal font-normal">(если есть)</span>
                        </label>
                        <input
                          type="text"
                          placeholder="XXXX-XXXX"
                          {...registerEmail('invite_code')}
                          className="luxury-input w-full h-11 px-4"
                        />
                      </div>

                      {message && (
                        <div className="px-4 py-3 rounded-lg bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.2)] text-sm text-[#D4AF37]">
                          {message}
                        </div>
                      )}

                      <button type="submit" disabled={isLoading} className="btn-gold h-11 w-full flex items-center justify-center gap-2 mt-1">
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            Продолжить
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  {step === 'login' && (
                    <form onSubmit={handlePasswordSubmit(onLogin)} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#8B7FA8] mb-1.5 uppercase tracking-wide">
                          Пароль
                        </label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          autoFocus
                          {...registerPassword('password', { required: 'Пароль обязателен' })}
                          className={cn('luxury-input w-full h-11 px-4', passwordErrors.password && 'error')}
                        />
                        {passwordErrors.password && (
                          <p className="text-xs text-red-400 mt-1.5">{passwordErrors.password.message}</p>
                        )}
                      </div>

                      {message && (
                        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                          {message}
                        </div>
                      )}

                      <button type="submit" disabled={isLoading} className="btn-gold h-11 w-full flex items-center justify-center gap-2">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Войти'}
                      </button>
                    </form>
                  )}

                  {step === 'check' && (
                    <div className="flex flex-col gap-4">
                      {message && (
                        <p className="text-sm text-[#8B7FA8] leading-relaxed">{message}</p>
                      )}
                      <button
                        onClick={onSubscribe}
                        disabled={isLoading}
                        className="btn-gold h-11 w-full flex items-center justify-center gap-2"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Подписаться на рассылку'}
                      </button>
                    </div>
                  )}

                  {step === 'register' && (
                    <form onSubmit={handlePasswordSubmit(onRegister)} className="flex flex-col gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#8B7FA8] mb-1.5 uppercase tracking-wide">
                          Придумайте пароль
                        </label>
                        <input
                          type="password"
                          placeholder="Минимум 6 символов"
                          autoFocus
                          {...registerPassword('password', {
                            required: 'Пароль обязателен',
                            minLength: { value: 6, message: 'Минимум 6 символов' },
                          })}
                          className={cn('luxury-input w-full h-11 px-4', passwordErrors.password && 'error')}
                        />
                        {passwordErrors.password && (
                          <p className="text-xs text-red-400 mt-1.5">{passwordErrors.password.message}</p>
                        )}
                      </div>

                      {message && (
                        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                          {message}
                        </div>
                      )}

                      <button type="submit" disabled={isLoading} className="btn-gold h-11 w-full flex items-center justify-center gap-2">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Создать аккаунт'}
                      </button>
                    </form>
                  )}
                </div>

                <div className="px-7 pb-6">
                  <p className="text-xs text-[#4A3F6A] text-center">
                    Продолжая, вы соглашаетесь с условиями использования сервиса
                  </p>
                </div>
              </div>
            )}
              </div>

              {/* Feature pills — vertical column on desktop, right of form */}
              <div className="w-full sm:w-72 sm:shrink-0 flex flex-col sm:flex-col gap-3 animate-in animate-in-delay-2">
                <div className="feature-pill">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(212,175,55,0.12)] flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[#F0EAD6]">Натальная карта</span>
                    <p className="text-xs text-[#8B7FA8] mt-0.5">Профессиональные расчёты с ИИ-интерпретацией</p>
                  </div>
                </div>
                <div className="feature-pill">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(212,175,55,0.12)] flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[#F0EAD6]">Синастрия и транзиты</span>
                    <p className="text-xs text-[#8B7FA8] mt-0.5">Совместимость, текущие и будущие влияния планет</p>
                  </div>
                </div>
                <div className="feature-pill">
                  <div className="w-8 h-8 rounded-lg bg-[rgba(212,175,55,0.12)] flex items-center justify-center shrink-0">
                    <Shield className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[#F0EAD6]">Прогностика</span>
                    <p className="text-xs text-[#8B7FA8] mt-0.5">Соляры, лунары, профекции — прогнозы по вашей карте</p>
                  </div>
                </div>
                <div
                  className="feature-pill py-4 relative overflow-hidden"
                  style={{
                    borderColor: 'rgba(139,92,246,0.3)',
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(16,11,30,0.95) 50%, rgba(212,175,55,0.04) 100%)',
                    boxShadow: '0 0 20px rgba(139,92,246,0.12), 0 0 40px rgba(139,92,246,0.06)',
                  }}
                >
                  <div className="absolute inset-0 pointer-events-none opacity-30">
                    <div
                      className="absolute -top-4 -right-4 w-24 h-24 rounded-full"
                      style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)' }}
                    />
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-[rgba(139,92,246,0.15)] flex items-center justify-center shrink-0 relative">
                    <Users className="w-4 h-4 text-[#A78BFA]" />
                  </div>
                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#C4B5FD]">Звёздный двойник</span>
                      <span
                        className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                        style={{
                          background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(212,175,55,0.15))',
                          border: '1px solid rgba(139,92,246,0.3)',
                          color: '#C4B5FD',
                        }}
                      >
                        New
                      </span>
                    </div>
                    <p className="text-xs text-[#8B7FA8] mt-0.5">Найди знаменитостей с похожей натальной картой</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom decorative text */}
            <div className="flex items-center gap-3 mt-8 animate-in animate-in-delay-3">
              <div className="gold-divider w-12" />
              <span className="text-xs text-[#4A3F6A] tracking-widest uppercase font-medium">
                Orbitron · Ранний доступ · 2026
              </span>
            </div>
          </main>
    </div>
  )
}