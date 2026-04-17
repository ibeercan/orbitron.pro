import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Star, Sparkles } from 'lucide-react';
import { useThread, useComposerRuntime, type ThreadMessage } from '@assistant-ui/react';
import { OrbitronRuntimeProvider } from './OrbitronRuntimeProvider';
import { cn } from '@/lib/utils';

interface AssistantChatProps {
  chartId: string;
  sessionId: number | null;
  onSessionCreated: (sessionId: number) => void;
}

/* ── Mini animated orb logo for chat header ── */
function AstrologerAvatar({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="acGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0C842" />
          <stop offset="100%" stopColor="#B8960F" />
        </linearGradient>
        <linearGradient id="acOrbit" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D4AF37" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#D4AF37" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#D4AF37" stopOpacity="0.15" />
        </linearGradient>
        <filter id="acGlow">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx="50" cy="50" r="48" fill="rgba(16,11,30,0.9)" stroke="rgba(212,175,55,0.15)" strokeWidth="1" />
      <ellipse cx="50" cy="50" rx="36" ry="13" fill="none" stroke="url(#acOrbit)" strokeWidth="1.4">
        <animateTransform attributeName="transform" type="rotate"
          from="0 50 50" to="360 50 50" dur="20s" additive="sum" repeatCount="indefinite" />
      </ellipse>
      <circle cx="86" cy="50" r="3.5" fill="#D4AF37" filter="url(#acGlow)">
        <animateTransform attributeName="transform" type="rotate"
          from="0 50 50" to="360 50 50" dur="20s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="50" r="11" fill="url(#acGold)" filter="url(#acGlow)">
        <animate attributeName="r" values="10;12;10" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="50" r="6" fill="#FFF8DC" opacity="0.5" />
    </svg>
  );
}

/* ── Typing indicator ── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-typing-1" />
      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-typing-2" />
      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-typing-3" />
    </div>
  );
}

/* ── Message text content renderer ── */
function MessageContent({ message }: { message: ThreadMessage }) {
  const content = message.content;
  if (typeof content === 'string') return <>{content}</>;
  if (Array.isArray(content)) {
    return (
      <>
        {content.map((part, idx) =>
          part.type === 'text' ? (
            <span key={idx} className="whitespace-pre-wrap leading-relaxed">
              {part.text}
            </span>
          ) : null
        )}
      </>
    );
  }
  return null;
}

/* ── Prompt suggestions (empty state) ── */
const SUGGESTIONS = [
  'Расскажи о моём солнечном знаке',
  'Какие сильные стороны у моей карты?',
  'Что означает мой асцендент?',
  'Расскажи о натальной Луне',
];

/* ── Chat content (inside runtime) ── */
function ChatContent() {
  const threadState = useThread();
  const composer = useComposerRuntime({ optional: true });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const messages = threadState.messages ?? [];
  const isRunning = threadState.isRunning ?? false;

  /* Auto-scroll on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isRunning]);

  const sendMessage = (text: string) => {
    if (!text.trim() || isRunning || !composer) return;
    setInput('');
    composer.setText(text.trim());
    composer.send();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          /* Empty state with suggestions */
          <div className="flex flex-col h-full justify-center">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.12)] flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <p className="text-sm font-medium text-[#F0EAD6] mb-1">Задайте вопрос астрологу</p>
              <p className="text-xs text-[#8B7FA8]">Я отвечу в контексте вашей натальной карты</p>
            </div>

            {/* Suggestion chips */}
            <div className="space-y-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl text-sm text-[#8B7FA8] border border-[rgba(212,175,55,0.08)] bg-[rgba(212,175,55,0.03)] hover:bg-[rgba(212,175,55,0.07)] hover:border-[rgba(212,175,55,0.18)] hover:text-[#D4AF37] transition-all duration-200"
                >
                  <span className="text-[#4A3F6A] mr-2">→</span>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg: ThreadMessage, idx: number) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id ?? idx}
                className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
              >
                {/* AI avatar */}
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl shrink-0 mr-2.5 mt-0.5 overflow-hidden">
                    <AstrologerAvatar size={28} />
                  </div>
                )}

                <div
                  className={cn(
                    'max-w-[85%] text-sm leading-relaxed px-4 py-3',
                    isUser ? 'msg-user' : 'msg-ai'
                  )}
                >
                  <MessageContent message={msg} />
                  {msg.status?.type === 'running' && (
                    <TypingDots />
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Running indicator (AI typing) */}
        {isRunning && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-xl shrink-0 mr-2.5 overflow-hidden">
              <AstrologerAvatar size={28} />
            </div>
            <div className="msg-ai">
              <TypingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 pb-4 pt-3 border-t border-[rgba(212,175,55,0.07)]">
        <form onSubmit={handleSubmit} className="flex items-center gap-2.5">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Спросите об астрологии..."
            disabled={isRunning}
            className="luxury-input flex-1 h-10 px-4 text-sm"
          />
          <button
            type="submit"
            disabled={isRunning || !input.trim()}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all',
              isRunning || !input.trim()
                ? 'bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.1)] text-[#4A3F6A] cursor-not-allowed'
                : 'btn-gold hover:scale-105 active:scale-95'
            )}
          >
            {isRunning
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />
            }
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Empty state (no chart selected) ── */
function NoChartState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-8">
      <div className="animate-float mb-5">
        <AstrologerAvatar size={52} />
      </div>
      <h3 className="font-serif text-xl font-semibold text-[#F0EAD6] mb-2">
        ИИ Астролог
      </h3>
      <p className="text-sm text-[#8B7FA8] leading-relaxed max-w-[200px]">
        Выберите натальную карту, чтобы начать диалог
      </p>

      <div className="mt-6 flex items-center gap-2 text-[#4A3F6A]">
        <Star className="w-3 h-3" />
        <span className="text-xs">Интерпретация • Анализ • Прогнозы</span>
        <Star className="w-3 h-3" />
      </div>
    </div>
  );
}

/* ── Main export ── */
export function AssistantChat({ chartId, sessionId, onSessionCreated }: AssistantChatProps) {
  const baseUrl = import.meta.env.VITE_API_URL || 'https://api.orbitron.pro/api/v1';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(212,175,55,0.08)] shrink-0">
        <div className="w-9 h-9 shrink-0 overflow-hidden rounded-xl">
          <AstrologerAvatar size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-base font-semibold text-[#F0EAD6] leading-tight">
            ИИ Астролог
          </h3>
          <p className="text-[11px] text-[#8B7FA8] flex items-center gap-1 mt-0.5">
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                chartId ? 'bg-[#10b981] shadow-[0_0_4px_rgba(16,185,129,0.6)]' : 'bg-[#4A3F6A]'
              )}
            />
            {chartId ? 'Готов к интерпретации' : 'Ожидает карту'}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {!chartId ? (
          <NoChartState />
        ) : (
          <OrbitronRuntimeProvider
            baseUrl={baseUrl}
            sessionId={sessionId}
            chartId={chartId}
            onSessionCreated={onSessionCreated}
          >
            <ChatContent />
          </OrbitronRuntimeProvider>
        )}
      </div>
    </div>
  );
}
