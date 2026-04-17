import React, { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { useThread, useComposerRuntime, type ThreadMessage } from '@assistant-ui/react';
import { OrbitronRuntimeProvider } from './OrbitronRuntimeProvider';

interface AssistantChatProps {
  chartId: string;
  sessionId: number | null;
  onSessionCreated: (sessionId: number) => void;
}

function ChatContent() {
  const threadState = useThread();
  const composer = useComposerRuntime({ optional: true });
  const [input, setInput] = useState('');
  
  const messages = threadState.messages ?? [];
  const isRunning = threadState.isRunning ?? false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isRunning || !composer) return;

    const text = input.trim();
    setInput('');

    composer.setText(text);
    composer.send();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 rounded-2xl bg-secondary-400/10 flex items-center justify-center mb-4">
              <Sparkles className="h-7 w-7 text-secondary-400" />
            </div>
            <p className="text-gray-400 text-sm">Задайте вопрос об astrological chart</p>
          </div>
        ) : (
          messages.map((msg: ThreadMessage, idx: number) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id ?? idx} className={isUser ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    isUser
                      ? 'bg-secondary-400/20 text-white'
                      : 'bg-white/5 text-gray-300'
                  }`}
                >
                  <MessageContent message={msg} />
                  {msg.status?.type === 'running' && (
                    <Loader2 className="h-4 w-4 animate-spin inline ml-2" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-white/10 p-4">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Задайте вопрос..."
            disabled={isRunning}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-secondary-400 focus:outline-none focus:ring-1 focus:ring-secondary-400/20 disabled:opacity-50 transition-all"
          />
          <button
            type="submit"
            disabled={isRunning || !input.trim()}
            className="p-3 rounded-xl bg-secondary-400 text-gray-900 hover:bg-secondary-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            {isRunning ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </form>
    </div>
  );
}

function MessageContent({ message }: { message: ThreadMessage }) {
  const content = message.content;
  
  if (typeof content === 'string') {
    return <>{content}</>;
  }
  
  if (Array.isArray(content)) {
    return content.map((part, idx) => {
      if (part.type === 'text') {
        return <span key={idx}>{part.text}</span>;
      }
      return null;
    });
  }
  
  return null;
}

export function AssistantChat({ chartId, sessionId, onSessionCreated }: AssistantChatProps) {
  const baseUrl = import.meta.env.VITE_API_URL || 'https://api.orbitron.pro/api/v1';

  if (!chartId) {
    return (
      <div className="floating-card h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary-400/10 flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-secondary-400" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">AI Астролог</h3>
        <p className="text-gray-400 text-sm">
          Выберите карту чтобы начать чат с AI астрологом
        </p>
      </div>
    );
  }

  return (
    <div className="floating-card h-full flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <div className="w-10 h-10 rounded-xl bg-secondary-400/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-secondary-400" />
        </div>
        <div>
          <h3 className="font-medium text-white">AI Астролог</h3>
          <p className="text-xs text-gray-500">Интерпретация натальной карты</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <OrbitronRuntimeProvider
          baseUrl={baseUrl}
          sessionId={sessionId}
          chartId={chartId}
          onSessionCreated={onSessionCreated}
        >
          <ChatContent />
        </OrbitronRuntimeProvider>
      </div>
    </div>
  );
}