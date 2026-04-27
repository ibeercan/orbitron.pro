import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Square, Copy, Check, Star, Sparkles, X } from 'lucide-react';
import { useThread, useComposerRuntime, type ThreadMessage } from '@assistant-ui/react';
import { OrbitronRuntimeProvider } from './OrbitronRuntimeProvider';
import { WelcomeMessage } from '@/components/ui/WelcomeMessage';
import { cn } from '@/lib/utils';

interface AssistantChatProps {
  chartId: string;
  sessionId: number | null;
  onSessionCreated: (sessionId: number) => void;
  fullscreen?: boolean;
  onExitFullscreen?: () => void;
  showWelcome?: boolean;
  onWelcomeDismiss?: () => void;
  chartType?: string;
}

/* ── Mini animated orb logo ── */
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
    <div className="flex items-center gap-1.5 px-1 py-1">
      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-typing-1" />
      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-typing-2" />
      <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-typing-3" />
    </div>
  );
}

/* ── Copy button ── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* ignore */}
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      title="Копировать"
      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded-md hover:bg-[rgba(212,175,55,0.1)] text-[#4A3F6A] hover:text-[#D4AF37]"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-[#10b981]" />
        : <Copy className="w-3.5 h-3.5" />
      }
    </button>
  );
}

/* ── Markdown renderer for AI messages ── */
function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ children }) => (
          <h1 className="font-serif text-lg font-semibold text-[#F0C842] mt-4 mb-2 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-serif text-base font-semibold text-[#F0C842] mt-3 mb-1.5 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-serif text-sm font-semibold text-[#D4AF37] mt-3 mb-1 first:mt-0 uppercase tracking-wide">{children}</h3>
        ),
        // Paragraphs
        p: ({ children }) => (
          <p className="text-[#D4CCBD] text-sm leading-relaxed mb-2 last:mb-0">{children}</p>
        ),
        // Bold & italic
        strong: ({ children }) => (
          <strong className="font-semibold text-[#F0EAD6]">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-[#B8AAD6]">{children}</em>
        ),
        // Lists
        ul: ({ children }) => (
          <ul className="space-y-1 mb-2 pl-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="space-y-1 mb-2 pl-1 list-decimal list-inside">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-sm text-[#D4CCBD] leading-relaxed flex gap-2 items-start">
            <span className="text-[#D4AF37] mt-1 shrink-0 text-[10px]">✦</span>
            <span>{children}</span>
          </li>
        ),
        // Horizontal rule
        hr: () => (
          <hr className="border-none h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.2)] to-transparent my-3" />
        ),
        // Code
        code: ({ children }) => (
          <code className="bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.15)] rounded px-1 py-0.5 text-xs text-[#F0C842] font-mono">{children}</code>
        ),
        // Blockquote
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-[rgba(212,175,55,0.3)] pl-3 my-2 text-[#8B7FA8] italic text-sm">{children}</blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/* ── Message content ── */
function MessageContent({ message }: { message: ThreadMessage }) {
  const isAssistant = message.role === 'assistant';
  const content = message.content;

  let text = '';
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    text = content.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('');
  }

  if (!text) return null;

  if (isAssistant) {
    return <MarkdownMessage content={text} />;
  }

  return (
    <span className="whitespace-pre-wrap leading-relaxed text-sm">{text}</span>
  );
}

const CHART_SUGGESTIONS: Record<string, { title: string; subtitle: string; questions: string[] }> = {
  natal: {
    title: 'Задайте вопрос астрологу',
    subtitle: 'Я отвечу в контексте вашей натальной карты',
    questions: [
      'Расскажи о моём солнечном знаке',
      'Какие сильные стороны у моей карты?',
      'Что означает мой асцендент?',
      'Расскажи о натальной Луне',
    ],
  },
  synastry: {
    title: 'Совместимость пары',
    subtitle: 'Я проанализирую взаимодействие ваших карт',
    questions: [
      'Насколько мы совместимы?',
      'Где зоны напряжения в нашей паре?',
      'В чём наша эмоциональная связь?',
      'Какие советы для гармонии?',
    ],
  },
  transit: {
    title: 'Текущие влияния',
    subtitle: 'Я объясню, какие энергии сейчас активны',
    questions: [
      'Какие темы сейчас активированы?',
      'Когда влияние усилится?',
      'На что обратить внимание сейчас?',
      'Какой период длится дольше всего?',
    ],
  },
  solar_return: {
    title: 'Годовой прогноз',
    subtitle: 'Я выделю ключевые темы вашего года',
    questions: [
      'Какие темы будут ключевыми в этом году?',
      'Где фокус событий?',
      'Что принесёт управитель года?',
    ],
  },
  lunar_return: {
    title: 'Месячный прогноз',
    subtitle: 'Я расскажу об эмоциональных темах месяца',
    questions: [
      'Какие эмоциональные темы этого месяца?',
      'На чём сосредоточиться в быту?',
      'Как протекает внутрисемейная динамика?',
    ],
  },
  profection: {
    title: 'Профекция года',
    subtitle: 'Я интерпретирую управителя и темы года',
    questions: [
      'Какие темы активирует профекционный дом?',
      'Что означает управитель года в моём гороскопе?',
      'Дай практические советы на этот год',
    ],
  },
  solar_arc: {
    title: 'Дирекции',
    subtitle: 'Я интерпретирую дирекционные аспекты и ключевые события',
    questions: [
      'Какие события активируют дирекции?',
      'Что означает дирекционный аспект к моему Солнцу?',
      'Дай интерпретацию всех дирекционных аспектов',
    ],
  },
  progression: {
    title: 'Вторичные прогрессии',
    subtitle: 'Я проанализирую внутреннюю эволюцию и психологические изменения',
    questions: [
      'Как изменилась моя личность с возрастом?',
      'Что означает прогрессное Солнце в новом знаке?',
      'Дай интерпретацию всех прогрессных аспектов',
    ],
  },
  composite: {
    title: 'Композитная карта',
    subtitle: 'Я проанализирую энергию отношений как единого целого',
    questions: [
      'Какие энергии доминируют в наших отношениях?',
      'Что показывает композитное Солнце и Луна?',
      'Дай полную интерпретацию аспектов композита',
    ],
  },
  davison: {
    title: 'Карта Давидсона',
    subtitle: 'Я проинтерпретирую реальный момент встречи судеб',
    questions: [
      'Какой момент и место связывают нас?',
      'Что показывает карта Давидсона о наших отношениях?',
      'Дай интерпретацию планет и домов Давидсона',
    ],
  },
horary: {
    title: 'Хорарная карта',
    subtitle: 'Я отвечу на ваш вопрос, используя традиционные хорарные правила',
    questions: [
      'Да или нет на мой вопрос?',
      'Когда произойдёт событие?',
      'Найду ли я пропажу?',
      'Каков исход ситуации?',
    ],
  },
  electional: {
    title: 'Элективная карта',
    subtitle: 'Я помогу найти наилучший момент для вашего начинания',
    questions: [
      'Какой момент лучший для начала проекта?',
      'Когда лучше заключить контракт?',
      'Найди благоприятное время для свидания',
      'Какие условия больше всего влияют на выбор момента?',
    ],
  },
  planetary_return: {
    title: 'Планетарный возврат',
    subtitle: 'Я проинтерпретирую возвращение планеты в натальное положение',
    questions: [
      'Какие темы активирует этот возврат?',
      'Что означает дом возвратной планеты?',
      'Как возвратная планета взаимодействует с натальной картой?',
    ],
  },
  planner: {
    title: 'Астрологический планер',
    subtitle: 'Я помогу разобраться в транзитах и фазах вашего планера',
    questions: [
      'Какие ключевые транзиты на этот месяц?',
      'Когда Луна без курса в этом месяце?',
      'На какие дни обратить внимание?',
    ],
  },
}

/* ── Chat content (inside runtime) ── */
function ChatContent({ showWelcome, onWelcomeDismiss, chartType }: { showWelcome?: boolean; onWelcomeDismiss?: () => void; chartType?: string }) {
  const threadState = useThread();
  const composer = useComposerRuntime({ optional: true });
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgContentRef = useRef('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const messages = threadState.messages ?? [];
  const isRunning = threadState.isRunning ?? false;
  const isLoading = threadState.isLoading ?? false;

  /* iOS keyboard fix via visualViewport:
     When soft keyboard opens, visualViewport shrinks but window.innerHeight doesn't.
     We watch the height diff and apply a CSS variable to push the input up. */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const handleResize = () => {
      if (!containerRef.current) return;
      const keyboardHeight = window.innerHeight - vv.height - vv.offsetTop;
      containerRef.current.style.setProperty(
        '--keyboard-offset',
        `${Math.max(0, keyboardHeight)}px`
      );
    };

    vv.addEventListener('resize', handleResize);
    vv.addEventListener('scroll', handleResize);
    return () => {
      vv.removeEventListener('resize', handleResize);
      vv.removeEventListener('scroll', handleResize);
    };
  }, []);

  /* Scroll on new messages AND during streaming (content changes) */
  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last) return;
    const lastContent = Array.isArray(last.content)
      ? last.content.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('')
      : String(last.content ?? '');

    if (lastContent !== lastMsgContentRef.current) {
      lastMsgContentRef.current = lastContent;
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  });

  const sendMessage = useCallback((text: string) => {
    if (!text.trim() || isRunning || !composer) return;
    setInput('');
    composer.setText(text.trim());
    composer.send();
  }, [isRunning, composer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleStop = useCallback(() => {
    // @ts-expect-error cancel may exist on runtime-specific ThreadState
    threadState.cancel?.();
  }, [threadState]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col overflow-hidden"
      style={{
        /* On iOS: shrink to viewport - keyboard height */
        height: 'calc(100% - var(--keyboard-offset, 0px))',
        transition: 'height 0.15s ease',
      }}
    >

      {/* Messages */}
      <div className={cn(
        'flex-1 overflow-y-auto py-4 space-y-4 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[rgba(212,175,55,0.15)]',
        'px-4'
      )}>
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col h-full justify-center gap-4 px-2">
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-xl shrink-0 mr-2.5 mt-1 bg-[rgba(212,175,55,0.06)] animate-pulse" />
              <div className="max-w-[88%] space-y-2 px-4 py-3 rounded-2xl rounded-tl-sm bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.08)]">
                <div className="h-3 w-3/4 rounded bg-[rgba(212,175,55,0.08)] animate-pulse" />
                <div className="h-3 w-1/2 rounded bg-[rgba(212,175,55,0.08)] animate-pulse" />
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[60%] space-y-2 px-4 py-3 rounded-2xl rounded-tr-sm bg-[rgba(74,63,106,0.3)] border border-[rgba(212,175,55,0.1)]">
                <div className="h-3 w-2/3 rounded bg-[rgba(139,127,168,0.12)] animate-pulse" />
              </div>
            </div>
            <div className="flex justify-start">
              <div className="w-7 h-7 rounded-xl shrink-0 mr-2.5 mt-1 bg-[rgba(212,175,55,0.06)] animate-pulse" />
              <div className="max-w-[88%] space-y-2 px-4 py-3 rounded-2xl rounded-tl-sm bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.08)]">
                <div className="h-3 w-4/5 rounded bg-[rgba(212,175,55,0.08)] animate-pulse" />
                <div className="h-3 w-2/3 rounded bg-[rgba(212,175,55,0.08)] animate-pulse" />
              </div>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col h-full justify-center">
            {showWelcome && onWelcomeDismiss ? (
              <WelcomeMessage onDismiss={onWelcomeDismiss} />
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.12)] flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                  </div>
                  <p className="text-sm font-medium text-[#F0EAD6] mb-1">{(CHART_SUGGESTIONS[chartType || 'natal'] ?? CHART_SUGGESTIONS.natal).title}</p>
                  <p className="text-xs text-[#8B7FA8]">{(CHART_SUGGESTIONS[chartType || 'natal'] ?? CHART_SUGGESTIONS.natal).subtitle}</p>
                </div>
                <div className="space-y-2">
                  {(CHART_SUGGESTIONS[chartType || 'natal'] ?? CHART_SUGGESTIONS.natal).questions.map((s) => (
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
              </>
            )}
          </div>
        ) : (
          messages.map((msg: ThreadMessage, idx: number) => {
            const isUser = msg.role === 'user';
            const isLast = idx === messages.length - 1;
            const isStreaming = isRunning && isLast && !isUser;

            // Extract plain text for copy button
            const plainText = Array.isArray(msg.content)
              ? msg.content.filter((p) => p.type === 'text').map((p) => (p as { text: string }).text).join('')
              : String(msg.content ?? '');

            return (
              <div
                key={msg.id ?? idx}
                className={cn(
                  'flex animate-fade-in-fast',
                  isUser ? 'justify-end' : 'justify-start'
                )}
              >
                {/* AI avatar */}
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl shrink-0 mr-2.5 mt-1 overflow-hidden">
                    <AstrologerAvatar size={28} />
                  </div>
                )}

                <div className={cn(
                  'group relative',
                  isUser ? 'max-w-[80%]' : 'max-w-[88%]',
                )}>
                  <div className={cn(
                    'w-fit max-w-full text-sm leading-relaxed px-4 py-3',
                    isUser ? 'msg-user ml-auto' : 'msg-ai'
                  )}>
                    {isStreaming && !plainText ? (
                      <TypingDots />
                    ) : (
                      <MessageContent message={msg} />
                    )}
                    {/* Streaming cursor */}
                    {isStreaming && plainText && (
                      <span className="inline-block w-0.5 h-3.5 bg-[#D4AF37] ml-0.5 animate-pulse align-middle" />
                    )}
                  </div>

                  {/* Copy button for AI messages */}
                  {!isUser && plainText && !isStreaming && (
                    <div className="flex justify-end mt-1 pr-1">
                      <CopyButton text={plainText} />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator when AI starts (before first chunk) */}
        {isRunning && (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
          <div className="flex justify-start animate-fade-in-fast">
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
      <div className={cn(
        'shrink-0 pt-3 pb-4 border-t border-[rgba(212,175,55,0.07)]',
        'px-4'
      )}>
        <form onSubmit={handleSubmit} className="flex items-end gap-2.5">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              // Auto-grow
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="Спросите об астрологии…"
            disabled={isRunning}
            className="luxury-input flex-1 min-h-[40px] max-h-[120px] px-4 py-2.5 text-sm resize-none overflow-y-auto scrollbar-none leading-relaxed"
            style={{ height: '40px' }}
          />

          {isRunning ? (
            <button
              type="button"
              onClick={handleStop}
              title="Остановить"
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.25)] text-red-400 hover:bg-[rgba(239,68,68,0.2)] transition-all"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all',
                !input.trim()
                  ? 'bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.1)] text-[#4A3F6A] cursor-not-allowed'
                  : 'btn-gold hover:scale-105 active:scale-95'
              )}
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
        <p className="text-[10px] text-[#4A3F6A] mt-2 text-center">
          Enter — отправить · Shift+Enter — перенос строки
        </p>
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
      <h3 className="font-serif text-xl font-semibold text-[#F0EAD6] mb-2">ИИ Астролог</h3>
      <p className="text-sm text-[#8B7FA8] leading-relaxed max-w-[200px]">
        Выберите натальную карту, чтобы начать диалог
      </p>
      <div className="mt-6 flex items-center gap-2 text-[#4A3F6A]">
        <Star className="w-3 h-3" />
        <span className="text-xs">Интерпретация · Анализ · Прогнозы</span>
        <Star className="w-3 h-3" />
      </div>
    </div>
  );
}

/* ── Main export ── */
export function AssistantChat({
  chartId,
  sessionId,
  onSessionCreated,
  fullscreen = false,
  onExitFullscreen,
  showWelcome = false,
  onWelcomeDismiss,
  chartType,
}: AssistantChatProps) {
  const baseUrl = import.meta.env.VITE_API_URL || 'https://api.orbitron.pro/api/v1';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(212,175,55,0.08)] shrink-0">
        <div className="w-9 h-9 shrink-0 overflow-hidden rounded-xl">
          <AstrologerAvatar size={36} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-base font-semibold text-[#F0EAD6] leading-tight">ИИ Астролог</h3>
          <p className="text-[11px] text-[#8B7FA8] flex items-center gap-1 mt-0.5">
            <span className={cn(
              'w-1.5 h-1.5 rounded-full',
              chartId ? 'bg-[#10b981] shadow-[0_0_4px_rgba(16,185,129,0.6)]' : 'bg-[#4A3F6A]'
            )} />
            {chartId ? 'Готов к интерпретации' : 'Ожидает карту'}
          </p>
        </div>

        {/* Fullscreen toggle button */}
        {fullscreen ? (
          <button
            onClick={onExitFullscreen}
            title="Выйти из режима астролога"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8B7FA8] hover:text-[#D4AF37] hover:bg-[rgba(212,175,55,0.08)] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          chartId && (
            <button
              onClick={() => {/* handled in parent via prop */}}
              title="Режим астролога"
              className="hidden"
              id="open-astrologer-mode"
            />
          )
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {!chartId ? (
          <NoChartState />
        ) : (
          <OrbitronRuntimeProvider
            key={chartId}
            baseUrl={baseUrl}
            sessionId={sessionId}
            chartId={chartId}
            onSessionCreated={onSessionCreated}
          >
            <ChatContent showWelcome={showWelcome} onWelcomeDismiss={onWelcomeDismiss} chartType={chartType} />
          </OrbitronRuntimeProvider>
        )}
      </div>
    </div>
  );
}
