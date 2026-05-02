import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  useExternalStoreRuntime,
  ThreadMessageLike,
  AppendMessage,
  AssistantRuntimeProvider,
} from '@assistant-ui/react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

type ApiMessage = {
  id: number;
  role: string;
  content: string;
  created_at: string;
};

function toChatMessage(m: ApiMessage): ChatMessage {
  return {
    id: String(m.id),
    role: m.role as 'user' | 'assistant',
    content: m.content,
    createdAt: new Date(m.created_at),
  };
}

function convertMessage(message: ChatMessage): ThreadMessageLike {
  return {
    role: message.role,
    content: [{ type: 'text' as const, text: message.content }],
    id: message.id,
    createdAt: message.createdAt,
  };
}

export interface OrbitronRuntimeHandle {
  sendAnalysisMessage: (content: string, analysisTypes: string[], statusMessage?: string) => void;
}

interface OrbitronRuntimeProviderProps {
  children: React.ReactNode;
  baseUrl: string;
  sessionId: number | null;
  chartId: string;
  onSessionCreated?: (sessionId: number) => void;
}

function useOrbitronChatRuntime({
  baseUrl,
  sessionId: initialSessionId,
  chartId,
  onSessionCreated,
}: {
  baseUrl: string;
  sessionId: number | null;
  chartId: string;
  onSessionCreated?: (sessionId: number) => void;
}) {
  const baseApiUrl = baseUrl.replace(/\/$/, '');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(initialSessionId);
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedSessionRef = useRef<number | null>(null);
  const statusMessageIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef(sessionId);
  const chartIdRef = useRef(chartId);
  const isRunningRef = useRef(false);

  sessionIdRef.current = sessionId;
  chartIdRef.current = chartId;
  isRunningRef.current = isRunning;

  useEffect(() => {
    setMessages([]);
    setSessionId(initialSessionId);
    loadedSessionRef.current = initialSessionId ? null : null;
    abortControllerRef.current?.abort();
  }, [chartId]);

  useEffect(() => {
    if (initialSessionId === sessionId) return;
    setSessionId(initialSessionId);
    if (!initialSessionId) {
      setMessages([]);
      loadedSessionRef.current = null;
    } else if (loadedSessionRef.current !== initialSessionId) {
      setMessages([]);
    }
  }, [initialSessionId]);

  useEffect(() => {
    if (sessionId && sessionId !== initialSessionId) {
      onSessionCreated?.(sessionId);
    }
  }, [sessionId, initialSessionId, onSessionCreated]);

  useEffect(() => {
    if (!sessionId || loadedSessionRef.current === sessionId) return;

    let cancelled = false;
    const loadHistory = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`${baseApiUrl}/chat/${sessionId}`, {
          credentials: 'include',
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const history: ChatMessage[] = (data.messages ?? []).map(toChatMessage);
        if (!cancelled) {
          setMessages(history);
          loadedSessionRef.current = sessionId;
        }
      } catch {
        // history is optional — silent fail
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    loadHistory();
    return () => { cancelled = true; };
  }, [sessionId, baseApiUrl]);

  const _sendStreamRequest = useCallback(async (
    assistantMessageId: string,
    userText: string,
    activeSessionId: number,
    analysisTypes?: string[] | null,
    statusMessage?: string | null,
  ) => {
    const body: Record<string, unknown> = { content: userText };
    if (analysisTypes && analysisTypes.length > 0) {
      body.analysis_types = analysisTypes;
    }

    const response = await fetch(`${baseApiUrl}/chat/${activeSessionId}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'include',
      signal: abortControllerRef.current?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as { detail?: string }).detail || 'Request failed');
    }

    if (!response.body) throw new Error('No response body');

    let firstContentReceived = !statusMessage;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6)) as { type: string; content?: string; error?: string };

          if (data.type === 'content') {
            if (!firstContentReceived) {
              firstContentReceived = true;
              statusMessageIdRef.current = null;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: data.content ?? '' }
                    : m
                )
              );
            } else {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: m.content + (data.content ?? '') }
                    : m
                )
              );
            }
          } else if (data.type === 'error') {
            statusMessageIdRef.current = null;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? { ...m, content: m.content || `Ошибка: ${data.error}` }
                  : m
              )
            );
          }
        } catch {}
      }
    }
  }, [baseApiUrl]);

  const _ensureSession = useCallback(async (): Promise<number | null> => {
    let activeSessionId = sessionIdRef.current;

    if (!activeSessionId) {
      const currentChartId = chartIdRef.current;
      if (!currentChartId) return null;

      const startRes = await fetch(`${baseApiUrl}/chat/chart/${currentChartId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
        credentials: 'include',
      });
      if (!startRes.ok) throw new Error('Failed to create session');
      const sessionData = await startRes.json();
      activeSessionId = sessionData.id;
      setSessionId(activeSessionId);
      sessionIdRef.current = activeSessionId;

      const existing: ChatMessage[] = (sessionData.messages ?? []).map(toChatMessage);
      if (existing.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(existing.map((m) => m.id));
          const newOnly = prev.filter((m) => !existingIds.has(m.id));
          return [...existing, ...newOnly];
        });
      }
      loadedSessionRef.current = activeSessionId;
    }

    return activeSessionId;
  }, [baseApiUrl]);

  const handleNewMessage = useCallback(async (message: AppendMessage) => {
    const currentChartId = chartIdRef.current;
    if (!currentChartId) return;

    const textContent = message.content[0];
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Only text messages are supported');
    }

    const userText = textContent.text;
    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: userText,
      createdAt: new Date(),
    };
    const statusText = '🔄 Думаю…';
    const assistantMsg: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: statusText,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsRunning(true);
    statusMessageIdRef.current = assistantMessageId;
    abortControllerRef.current = new AbortController();

    try {
      const activeSessionId = await _ensureSession();
      if (!activeSessionId) return;

      await _sendStreamRequest(assistantMessageId, userText, activeSessionId, null, statusText);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: m.content || `Ошибка: ${err.message}` }
              : m
          )
        );
      }
    } finally {
      setIsRunning(false);
    }
  }, [_ensureSession, _sendStreamRequest]);

  const sendAnalysisMessage = useCallback(async (content: string, analysisTypes: string[], statusMessage?: string) => {
    if (isRunningRef.current || !chartIdRef.current) return;

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    const statusText = statusMessage || '🔄 Думаю…';
    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content,
      createdAt: new Date(),
    };
    const assistantMsg: ChatMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: statusText,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsRunning(true);
    statusMessageIdRef.current = assistantMessageId;
    abortControllerRef.current = new AbortController();

    try {
      const activeSessionId = await _ensureSession();
      if (!activeSessionId) return;

      await _sendStreamRequest(assistantMessageId, content, activeSessionId, analysisTypes, statusText);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, content: m.content || `Ошибка: ${err.message}` }
              : m
          )
        );
      }
    } finally {
      setIsRunning(false);
    }
  }, [_ensureSession, _sendStreamRequest]);

  const handleCancel = useCallback(async () => {
    abortControllerRef.current?.abort();
    setIsRunning(false);
  }, []);

  const runtime = useExternalStoreRuntime<ChatMessage>({
    messages,
    isRunning,
    isLoading,
    onNew: handleNewMessage,
    onCancel: handleCancel,
    convertMessage: (message) => convertMessage(message),
  });

  return { runtime, sendAnalysisMessage };
}

export const OrbitronRuntimeProvider = forwardRef<OrbitronRuntimeHandle, OrbitronRuntimeProviderProps>(
  ({ children, baseUrl, sessionId, chartId, onSessionCreated }, ref) => {
    const { runtime, sendAnalysisMessage } = useOrbitronChatRuntime({
      baseUrl,
      sessionId,
      chartId,
      onSessionCreated,
    });

    useImperativeHandle(ref, () => ({
      sendAnalysisMessage,
    }), [sendAnalysisMessage]);

    return (
      <AssistantRuntimeProvider runtime={runtime}>
        {children}
      </AssistantRuntimeProvider>
    );
  }
);