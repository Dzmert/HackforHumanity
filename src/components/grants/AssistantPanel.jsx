import { useEffect, useRef, useState } from 'react';
import { X, Send, Sparkles, Lock } from 'lucide-react';
import AssistantMessage from '@/components/grants/AssistantMessage';
import { grantsApi } from '@/lib/grants';

const SUGGESTIONS = ['Upcoming deadlines', 'Overdue actions', 'Renewals this month', 'Total active funding'];

const WELCOME = {
  role: 'assistant',
  text: 'Ask me anything about your grants — deadlines, acquittals, funding totals or who is responsible. I can only read your records, never change them.',
  references: []
};

export default function AssistantPanel({ onClose, onOpenGrant }) {
  const [messages, setMessages] = useState([WELCOME]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const ask = async (text) => {
    const asked = text.trim();
    if (!asked || loading) return;
    setQuestion('');
    setMessages(current => [...current, { role: 'user', text: asked }]);
    setLoading(true);
    try {
      const result = await grantsApi.askAssistant(asked);
      setMessages(current => [...current, {
        role: 'assistant',
        text: result.answer || "I couldn't find that information in the current grant records.",
        references: result.references || []
      }]);
    } catch (error) {
      setMessages(current => [...current, {
        role: 'assistant',
        failed: true,
        text: error.message || 'The assistant is unavailable just now. Please try again in a moment.',
        references: []
      }]);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close assistant" onClick={onClose} className="absolute inset-0 bg-[#3D342F]/30" />

      <aside className="relative flex h-full w-full max-w-md flex-col border-l border-[#E5D6C8] bg-[#FDFBF7] shadow-xl sm:w-[26rem]">
        <header className="flex items-start justify-between gap-3 border-b border-[#EFE3D6] p-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#3D342F]">
              <Sparkles size={18} className="text-[#A45846]" /> Grant Assistant
            </h2>
            <p className="flex items-center gap-1.5 text-xs text-[#756760]"><Lock size={12} /> Read-only — answers come from your grant records</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-[#756760]"><X size={20} /></button>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid gap-4">
            {messages.map((message, index) => (
              <AssistantMessage key={index} message={message} onOpenGrant={onOpenGrant} />
            ))}
            {loading && (
              <p className="flex items-center gap-2 text-sm text-[#756760]">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#E5D6C8] border-t-[#A45846]" />
                Checking your grant records…
              </p>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="border-t border-[#EFE3D6] p-4">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => ask(suggestion)}
                disabled={loading}
                className="rounded-full border border-[#E5D6C8] bg-white px-3 py-1.5 text-xs text-[#7D4037] disabled:opacity-60"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form onSubmit={e => { e.preventDefault(); ask(question); }} className="mt-3 flex items-center gap-2">
            <input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask about your grants…"
              className="flex-1 rounded-xl border border-[#E5D6C8] bg-white p-3 text-sm text-[#3D342F] focus:border-[#A45846] focus:outline-none"
            />
            <button disabled={loading || !question.trim()} aria-label="Send" className="rounded-xl bg-[#A45846] p-3 text-white disabled:opacity-50">
              <Send size={18} />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
}