import { useState, useCallback, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { apiStream } from '../../api/client';
import { type CharacterDraft } from '../../store/characterStore';
import { type Message } from './ChatMessage';
import type { A2UIMessage } from '@a2ui-sdk/react/0.8';

interface UseSidekickOptions {
  draft: CharacterDraft;
  step: string;
}

interface UseSidekickReturn {
  messages: Message[];
  a2uiMessages: A2UIMessage[];
  streaming: boolean;
  error: string | null;
  sendMessage: (text: string) => void;
  clearError: () => void;
}

let _idSeq = 0;
const nextMsgId = () => { _idSeq += 1; return _idSeq; };

/**
 * Manages the AI sidekick chat state.
 * Sends the current wizard step + character draft as context with every message.
 * Streams the assistant response via SSE.
 * Exposes a2uiMessages: the latest A2UI v0.8 surface messages from the agent,
 * ready to be passed to <A2UIProvider messages={a2uiMessages}>.
 */
export function useSidekick({ draft, step }: UseSidekickOptions): UseSidekickReturn {
  const { getAccessTokenSilently } = useAuth0();
  const [messages, setMessages] = useState<Message[]>([]);
  const [a2uiMessages, setA2uiMessages] = useState<A2UIMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;

      abortRef.current?.();
      abortRef.current = null;

      const userMsg: Message = { id: nextMsgId(), role: 'user', content: text.trim() };
      const assistantId = nextMsgId();

      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: assistantId, role: 'assistant', content: '' },
      ]);
      setStreaming(true);
      setError(null);
      // Clear the previous surface while the new response is being generated
      setA2uiMessages([]);

      try {
        const token = await getAccessTokenSilently();

        // Snapshot completed turns (exclude the empty assistant placeholder)
        const history = messages
          .filter((m) => m.content)
          .map((m) => ({ role: m.role, content: m.content }));

        const abort = apiStream(
          '/api/sidekick/chat',
          { message: text.trim(), draft, step, history },
          token,
          (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m,
              ),
            );
          },
          () => {
            setStreaming(false);
            abortRef.current = null;
          },
          (err) => {
            setError(err.message);
            setStreaming(false);
            abortRef.current = null;
          },
          (eventType, data) => {
            if (eventType === 'a2ui') {
              try {
                setA2uiMessages(JSON.parse(data) as A2UIMessage[]);
              } catch {
                // malformed JSON — ignore
              }
            }
          },
        );

        abortRef.current = abort;
      } catch (err) {
        setError((err as Error).message);
        setStreaming(false);
      }
    },
    [draft, step, streaming, getAccessTokenSilently],
  );

  const sendMessage = useCallback(
    (text: string) => { void handleSend(text); },
    [handleSend],
  );

  return {
    messages,
    a2uiMessages,
    streaming,
    error,
    sendMessage,
    clearError: () => setError(null),
  };
}
