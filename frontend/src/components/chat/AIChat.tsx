import { useState, useRef, useEffect } from 'react'
import { chatApi } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Send, Loader2, MessageCircle, Sparkles } from 'lucide-react'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface AIChatProps {
  chartId: string
  sessionId: number | null
  onSessionCreated: (sessionId: number) => void
}

export function AIChat({ chartId, sessionId, onSessionCreated }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(sessionId)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sessionId && sessionId !== currentSessionId) {
      setCurrentSessionId(sessionId)
      loadSession(sessionId)
    }
  }, [sessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSession = async (sid: number) => {
    try {
      const res = await chatApi.getSession(sid)
      setMessages(res.data.messages || [])
    } catch (err) {
      console.error('Failed to load session:', err)
    }
  }

  const startChat = async () => {
    try {
      const res = await chatApi.startChat(chartId)
      const newSessionId = res.data.id
      setCurrentSessionId(newSessionId)
      onSessionCreated(newSessionId)
      setMessages([])
    } catch (err) {
      console.error('Failed to start chat:', err)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const sid = currentSessionId || (await chatApi.startChat(chartId)).data.id
      if (!currentSessionId) {
        setCurrentSessionId(sid)
        onSessionCreated(sid)
      }

      const res = await chatApi.sendMessage(sid, userMessage.content)
      setMessages(res.data.session.messages || [])
    } catch (err) {
      console.error('Failed to send message:', err)
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Произошла ошибка. Попробуйте позже.',
        created_at: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentSessionId) {
    return (
      <div className="floating-card h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary-400/10 flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-secondary-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">AI Астролог</h3>
        <p className="text-gray-400 text-sm mb-6">
          Начните чат с AI астрологом для интерпретации вашей натальной карты
        </p>
        <button
          onClick={startChat}
          className="px-6 py-3 rounded-xl bg-secondary-400 font-medium text-gray-900 hover:bg-secondary-300 transition-colors"
        >
          Начать чат
        </button>
      </div>
    )
  }

  return (
    <div className="floating-card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-secondary-400/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-secondary-400" />
        </div>
        <div>
          <h3 className="font-medium text-white">AI Астролог</h3>
          <p className="text-xs text-gray-500">Интерпретация натальной карты</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Задайте вопрос о вашей карте</p>
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3",
              msg.role === 'user'
                ? "ml-auto bg-secondary-400/20 text-white"
                : "mr-auto bg-white/5 text-gray-300"
            )}
          >
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Думаю...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Задайте вопрос..."
            disabled={isLoading}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-secondary-400 focus:outline-none focus:ring-1 focus:ring-secondary-400/20 disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="p-3 rounded-xl bg-secondary-400 text-gray-900 hover:bg-secondary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}