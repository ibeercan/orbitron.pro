import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { authApi } from '@/lib/api/client'
import { Loader2 } from 'lucide-react'

type VerifyState = 'loading' | 'success' | 'error' | 'expired'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [state, setState] = useState<VerifyState>('loading')
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setState('error')
      return
    }
    authApi.verifyEmail(token)
      .then(() => {
        setState('success')
      })
      .catch((err) => {
        const detail = err.response?.data?.detail
        if (detail?.includes('устарел') || detail?.includes('expired')) {
          setState('expired')
        } else {
          setState('error')
        }
      })
  }, [token])

  const handleResend = async () => {
    const email = prompt('Введите ваш email:')
    if (!email) return
    setResendStatus('sending')
    try {
      await authApi.resendVerification(email)
      setResendStatus('sent')
    } catch {
      setResendStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0612] flex items-center justify-center px-4">
      <div className="w-full max-w-sm luxury-card p-8 text-center">
        {state === 'loading' && (
          <>
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[rgba(139,92,246,0.15)] flex items-center justify-center">
              <Loader2 className="w-7 h-7 text-[#A78BFA] animate-spin" />
            </div>
            <h2 className="font-serif text-2xl font-semibold text-[#F0EAD6] mb-2">Подтверждение email</h2>
            <p className="text-[#8B7FA8] text-sm">Проверяем...</p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[rgba(52,211,153,0.12)] flex items-center justify-center">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-[#F0EAD6] mb-2">Email подтверждён!</h2>
            <p className="text-[#8B7FA8] text-sm mb-6">Теперь вы можете войти в аккаунт.</p>
            <button onClick={() => navigate('/')} className="btn-gold h-11 w-full flex items-center justify-center">
              Войти
            </button>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <span className="text-2xl">✗</span>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-[#F0EAD6] mb-2">Ошибка подтверждения</h2>
            <p className="text-[#8B7FA8] text-sm mb-6">Ссылка недействительна. Возможно, вы уже подтвердили email.</p>
            <button onClick={() => navigate('/')} className="btn-gold h-11 w-full flex items-center justify-center">
              На главную
            </button>
          </>
        )}

        {state === 'expired' && (
          <>
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-[rgba(212,175,55,0.1)] flex items-center justify-center">
              <span className="text-2xl">⏱</span>
            </div>
            <h2 className="font-serif text-2xl font-semibold text-[#F0EAD6] mb-2">Ссылка устарела</h2>
            <p className="text-[#8B7FA8] text-sm mb-6">Срок действия ссылки подтверждения истёк (24 часа).</p>
            {resendStatus === 'idle' && (
              <button onClick={handleResend} className="btn-gold h-11 w-full flex items-center justify-center">
                Отправить повторно
              </button>
            )}
            {resendStatus === 'sending' && (
              <button disabled className="btn-gold h-11 w-full flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </button>
            )}
            {resendStatus === 'sent' && (
              <p className="text-sm text-[#34D399]">Письмо отправлено повторно. Проверьте почту.</p>
            )}
            {resendStatus === 'error' && (
              <p className="text-sm text-red-400">Ошибка отправки. Попробуйте позже.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}