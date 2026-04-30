import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/api/client'
import { Loader2, Lock } from 'lucide-react'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const isValid = password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)
  const isMatch = password === confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (!isValid || !isMatch) return

    setLoading(true)
    setError('')
    try {
      await authApi.resetPassword(token, password)
      setSuccess(true)
    } catch (err: any) {
      const detail = err.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else {
        setError('Ошибка сброса пароля')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0A0612] flex items-center justify-center px-4">
        <div className="w-full max-w-sm luxury-card p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <Lock className="w-7 h-7 text-red-400" />
          </div>
          <h2 className="font-serif text-2xl font-semibold text-[#F0EAD6] mb-2">Ссылка недействительна</h2>
          <p className="text-[#8B7FA8] text-sm mb-6">Ссылка сброса пароля отсутствует или некорректна.</p>
          <button onClick={() => navigate('/')} className="btn-gold h-11 w-full flex items-center justify-center">
            На главную
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#0A0612] flex items-center justify-center px-4">
        <div className="w-full max-w-sm luxury-card p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[rgba(52,211,153,0.12)] flex items-center justify-center">
            <span className="text-2xl text-[#34D399]">✓</span>
          </div>
          <h2 className="font-serif text-2xl font-semibold text-[#F0EAD6] mb-2">Пароль изменён</h2>
          <p className="text-[#8B7FA8] text-sm mb-6">Вы автоматически вошли в аккаунт.</p>
          <button onClick={() => navigate('/dashboard')} className="btn-gold h-11 w-full flex items-center justify-center">
            Перейти в кабинет
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0612] flex items-center justify-center px-4">
      <div className="w-full max-w-sm luxury-card overflow-hidden">
        <div className="px-7 pt-7 pb-5 border-b border-[rgba(212,175,55,0.08)]">
          <h2 className="font-serif text-2xl font-semibold text-[#F0EAD6]">Новый пароль</h2>
          <p className="text-[#8B7FA8] text-sm mt-1">Придумайте новый пароль для аккаунта</p>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-[#8B7FA8] mb-1.5 uppercase tracking-wide">
              Новый пароль
            </label>
            <input
              type="password"
              placeholder="Минимум 8 символов"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="luxury-input w-full h-11 px-4"
            />
            {password && !isValid && (
              <p className="text-xs text-[#4A3F6A] mt-1.5">Заглавная, строчная буква и цифра</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8B7FA8] mb-1.5 uppercase tracking-wide">
              Подтвердите пароль
            </label>
            <input
              type="password"
              placeholder="Повторите пароль"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className={`luxury-input w-full h-11 px-4 ${confirmPassword && !isMatch ? 'error' : ''}`}
            />
            {confirmPassword && !isMatch && (
              <p className="text-xs text-red-400 mt-1.5">Пароли не совпадают</p>
            )}
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isValid || !isMatch}
            className="btn-gold h-11 w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Сбросить пароль'}
          </button>
        </form>
      </div>
    </div>
  )
}