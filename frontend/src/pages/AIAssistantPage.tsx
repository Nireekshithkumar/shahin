import React, { useState } from 'react';
import {
  Sparkles, Send, Bot, User, ShieldCheck, ExternalLink,
  HelpCircle, AlertCircle, RefreshCw, BookOpen
} from 'lucide-react';
import { aiAssistantService } from '../services/scholarsetuService';
import { ChatMessageItem, RAGCitation } from '../types';

export const AIAssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      role: 'assistant',
      content:
        'Namaste! I am your ScholarSetu AI Assistant. I can help you discover genuine Indian scholarships, explain income ceiling certificates, list required documents, and guide you through official application portals. What would you like to know?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();

  const samplePrompts = [
    'Show scholarships for engineering students in India',
    'Which scholarships have upcoming deadlines this month?',
    'What documents are required for Post-Matric SC scholarship?',
    'Explain the AICTE Pragati scholarship for girls',
    'What is the family income limit for Central Sector Scheme?',
  ];

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessageItem = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiAssistantService.sendMessage(text, conversationId);
      if (res.conversation_id) {
        setConversationId(res.conversation_id);
      }
      const assistantMsg: ChatMessageItem = {
        role: 'assistant',
        content: res.answer,
        citations: res.citations || [],
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an issue retrieving the official records. Please verify that the backend server is running.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-900 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
              ScholarSetu AI Assistant
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                RAG Grounded
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Strictly grounded in verified guidelines from official government portals
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Zero Hallucination
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Citations section if present */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-brand-600" /> Official Source Citations:
                  </p>
                  <div className="space-y-1.5">
                    {msg.citations.map((cite: RAGCitation, cIdx: number) => (
                      <div
                        key={cIdx}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{cite.title}</p>
                          <p className="text-[10px] text-slate-500">
                            {cite.provider} • Verified {cite.verification_date}
                          </p>
                        </div>
                        {cite.source_url && (
                          <a
                            href={cite.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 font-bold hover:underline flex items-center gap-1 flex-shrink-0"
                          >
                            Open Portal <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 items-center text-xs text-slate-500 py-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-600" />
              Retrieving verified ministry records...
            </div>
          </div>
        )}
      </div>

      {/* Sample prompt pills */}
      <div className="py-2 flex gap-1.5 overflow-x-auto scrollbar-none">
        {samplePrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p)}
            className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 whitespace-nowrap transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="mt-2 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask any question about scholarships, income limits, or required documents..."
          className="flex-1 px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition-all"
        >
          Send <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
