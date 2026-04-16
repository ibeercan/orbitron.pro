import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'

export default function Register() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await register(email, password)
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } }
      setError(e.response?.data?.detail || 'Ошибка регистрации')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-gradient">Регистрация</h1>
          <p className="mt-2 text-gray-400">Создайте новый аккаунт</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={cn(
                'h-12 w-full rounded-md border bg-white/5 px-4 text-white placeholder-gray-500',
                'border-white/20 transition-all duration-200',
                'hover:border-white/40 focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20'
              )}
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={cn(
                'h-12 w-full rounded-md border bg-white/5 px-4 text-white placeholder-gray-500',
                'border-white/20 transition-all duration-200',
                'hover:border-white/40 focus:border-secondary-500 focus:ring-2 focus:ring-secondary-500/20'
              )}
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={cn(
              'h-12 w-full rounded-md bg-secondary-400 font-semibold text-gray-900',
              'transition-all duration-200',
              'hover:bg-secondary-300 hover:-translate-y-0.5 hover:shadow-lg',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-secondary-400 hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}