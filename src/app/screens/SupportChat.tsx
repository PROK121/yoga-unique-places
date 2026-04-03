import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Headphones } from 'lucide-react';
import { toast } from 'sonner';
import { Navigation } from '../components/Navigation';
import { useAuth } from '../context/AuthContext';
import { useSupport } from '../context/SupportContext';

export default function SupportChat() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const { messages, sendMessage, serverReachable } = useSupport();
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const submit = async () => {
    const t = draft.trim();
    if (!t || sending) return;
    setSending(true);
    try {
      await sendMessage(t);
      setDraft('');
    } catch {
      toast.error('Не удалось отправить');
    } finally {
      setSending(false);
    }
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <p className="text-gray-500">Загрузка…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="max-w-md mx-auto px-4 py-12 text-center">
          <Headphones className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Поддержка</h1>
          <p className="text-gray-600 mb-6">Войдите по телефону, чтобы написать в чат</p>
          <Link
            to="/auth?next=/support"
            className="inline-flex px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold"
          >
            Войти
          </Link>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100"
            aria-label="Назад"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">Поддержка</h1>
            <p className="text-xs text-gray-500 truncate">
              {!(import.meta.env.VITE_SUPPORT_API_URL as string | undefined)?.trim()
                ? 'Только на этом устройстве — задайте VITE_SUPPORT_API_URL для Telegram'
                : serverReachable === false
                  ? 'Сервер недоступен — сообщения только на устройстве'
                  : serverReachable === true
                    ? 'Сообщения уходят в Telegram'
                    : 'Проверка соединения…'}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-md mx-auto w-full px-4 py-4 space-y-3 overflow-y-auto">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-sm text-indigo-900">
          Опишите вопрос — ответ придёт здесь, когда администратор ответит в Telegram (через «Ответить»
          на ваше сообщение).
        </div>

        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                m.from === 'user'
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md shadow-sm'
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{m.text}</p>
              <p
                className={`text-[10px] mt-1.5 ${
                  m.from === 'user' ? 'text-indigo-200' : 'text-gray-400'
                }`}
              >
                {new Date(m.at).toLocaleString('ru-RU', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 left-0 right-0 bg-white border-t border-gray-200 pt-2 pb-3 max-w-md mx-auto w-full px-4">
        <div className="flex gap-2 pb-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Напишите сообщение…"
            rows={2}
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <button
            type="button"
            disabled={sending || !draft.trim()}
            onClick={() => void submit()}
            className="self-end shrink-0 w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center disabled:bg-gray-300"
            aria-label="Отправить"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      <Navigation />
    </div>
  );
}
