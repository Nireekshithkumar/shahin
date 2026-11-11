import React, { useState, useEffect, useRef } from 'react';
import {
  Send, Bot, User, ShieldCheck, ExternalLink,
  Mic, MicOff, Volume2, VolumeX, RefreshCw, BookOpen, Globe
} from 'lucide-react';
import { aiAssistantService } from '../services/scholarsetuService';
import { ChatMessageItem, RAGCitation } from '../types';

export const AIAssistantPage: React.FC = () => {
  const [language, setLanguage] = useState<'english' | 'kannada' | 'hindi'>('english');
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      role: 'assistant',
      content:
        'Namaste. I am your ScholarSetu AI Voice & Text Assistant. I can assist you with discovering scholarships, understanding income certificate rules, reviewing document requirements, and navigating official portals in English, Kannada, and Hindi. What would you like to know?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isListening, setIsListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        handleSendVoice(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      const langCodes: Record<string, string> = {
        english: 'en-IN',
        kannada: 'kn-IN',
        hindi: 'hi-IN',
      };
      recognitionRef.current.lang = langCodes[language] || 'en-IN';
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSpeak = (text: string, index: number) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported on this browser.');
      return;
    }

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langCodes: Record<string, string> = {
      english: 'en-IN',
      kannada: 'kn-IN',
      hindi: 'hi-IN',
    };
    utterance.lang = langCodes[language] || 'en-IN';
    utterance.rate = 0.95;

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const samplePromptsByLang: Record<string, string[]> = {
    english: [
      'Show scholarships for engineering students in India',
      'Which scholarships have upcoming deadlines this month?',
      'What documents are required for Post-Matric SC scholarship?',
      'Explain AICTE Pragati scholarship guidelines',
    ],
    kannada: [
      'ವಿದ್ಯಾರ್ಥಿವೇತನಕ್ಕೆ ಯಾವ ದಾಖಲೆಗಳು ಬೇಕು?',
      'ಕರ್ನಾಟಕ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಯಾವ ಸ್ಕಾಲರ್‌ಶಿಪ್ ಲಭ್ಯವಿದೆ?',
      'ಆದಾಯ ಮಿತಿ ಮತ್ತು ಜಾತಿ ಪ್ರಮಾಣಪತ್ರದ ನಿಯಮಗಳು ತಿಳಿಸಿ',
    ],
    hindi: [
      'इंजीनियरिंग छात्रों के लिए कौन सी छात्रवृत्तियां हैं?',
      'पोस्ट मैट्रिक छात्रवृत्ति के लिए कौन से दस्तावेज चाहिए?',
      'आय सीमा और जाति प्रमाण पत्र के क्या नियम हैं?',
    ],
  };

  const samplePrompts = samplePromptsByLang[language] || samplePromptsByLang.english;

  const handleSendVoice = async (speechText: string) => {
    if (!speechText.trim() || loading) return;

    const userMsg: ChatMessageItem = { role: 'user', content: speechText };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await aiAssistantService.voiceAssistant(speechText, language);
      const assistantMsg: ChatMessageItem = {
        role: 'assistant',
        content: res.answer,
      };
      setMessages((prev) => [...prev, assistantMsg]);

      if ('speechSynthesis' in window) {
        handleSpeak(res.answer, messages.length + 1);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to process voice request. Please verify the backend service is running.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: ChatMessageItem = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      if (language === 'kannada' || language === 'hindi') {
        const res = await aiAssistantService.voiceAssistant(text, language);
        const assistantMsg: ChatMessageItem = {
          role: 'assistant',
          content: res.answer,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
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
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to retrieve ministry records. Please verify connectivity.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col h-[calc(100vh-8rem)] text-[#000000]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#D2D2D4] mb-4 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#000000]">
              Voice & Text Government Assistant
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4]">
              RAG Grounded
            </span>
          </div>
          <p className="text-xs text-[#000000]/60 mt-0.5">
            Real-time speech in Kannada, Hindi, and English • Grounded strictly in official circulars
          </p>
        </div>

        {/* Language selector */}
        <div className="flex items-center bg-[#E7E7E7] p-1 rounded-lg border border-[#D2D2D4] text-xs">
          <Globe className="w-3.5 h-3.5 text-[#000000]/60 ml-1 mr-1.5" />
          <button
            onClick={() => setLanguage('english')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
              language === 'english'
                ? 'bg-[#FF634A] text-[#FFFFFF]'
                : 'text-[#000000] hover:bg-[#D2D2D4]'
            }`}
          >
            English
          </button>
          <button
            onClick={() => setLanguage('kannada')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
              language === 'kannada'
                ? 'bg-[#FF634A] text-[#FFFFFF]'
                : 'text-[#000000] hover:bg-[#D2D2D4]'
            }`}
          >
            ಕನ್ನಡ
          </button>
          <button
            onClick={() => setLanguage('hindi')}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors ${
              language === 'hindi'
                ? 'bg-[#FF634A] text-[#FFFFFF]'
                : 'text-[#000000] hover:bg-[#D2D2D4]'
            }`}
          >
            हिंदी
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-md bg-[#000000] text-[#FFFFFF] flex items-center justify-center flex-shrink-0 mt-1">
                <Bot className="w-4 h-4 text-[#FF634A]" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#000000] text-[#FFFFFF]'
                  : 'bg-[#E7E7E7] border border-[#D2D2D4] text-[#000000]'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {msg.role === 'assistant' && (
                <div className="mt-3 pt-2 border-t border-[#D2D2D4] flex items-center justify-between">
                  <button
                    onClick={() => handleSpeak(msg.content, idx)}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#FF634A] hover:underline"
                  >
                    {speakingIndex === idx ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" /> Stop Audio
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" /> Listen ({language.toUpperCase()})
                      </>
                    )}
                  </button>
                </div>
              )}

              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#D2D2D4] space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#000000]/60 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-[#FF634A]" /> Gazette Citations:
                  </p>
                  <div className="space-y-1">
                    {msg.citations.map((cite: RAGCitation, cIdx: number) => (
                      <div
                        key={cIdx}
                        className="p-2 rounded bg-[#FFFFFF] border border-[#D2D2D4] text-[11px] flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-bold text-[#000000]">{cite.title}</p>
                          <p className="text-[10px] text-[#000000]/60">{cite.provider}</p>
                        </div>
                        {cite.source_url && (
                          <a
                            href={cite.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#FF634A] font-bold hover:underline flex items-center gap-1"
                          >
                            Portal <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-md bg-[#E7E7E7] border border-[#D2D2D4] text-[#000000] flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 items-center text-xs text-[#000000]/60 py-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF634A]" />
            Retrieving verified guidelines from ministry databases...
          </div>
        )}
      </div>

      {/* Listening Banner */}
      {isListening && (
        <div className="mb-2 p-2.5 bg-[#E7E7E7] border border-[#FF634A] rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-[#000000]">
            <div className="w-2.5 h-2.5 rounded-full bg-[#FF634A]" />
            Listening in {language.toUpperCase()}... Speak into your microphone.
          </div>
          <button
            onClick={toggleListening}
            className="text-xs font-semibold text-[#FF634A] hover:underline"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Sample prompt pills */}
      <div className="py-2 flex gap-1 overflow-x-auto scrollbar-none">
        {samplePrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p)}
            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#E7E7E7] text-[#000000] border border-[#D2D2D4] hover:border-[#000000] whitespace-nowrap transition-colors"
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
        className="mt-1 flex gap-2"
      >
        <button
          type="button"
          onClick={toggleListening}
          className={`p-2.5 rounded-lg border transition-colors flex items-center justify-center ${
            isListening
              ? 'bg-[#FF634A] text-[#FFFFFF] border-[#FF634A]'
              : 'bg-[#E7E7E7] border-[#D2D2D4] text-[#000000] hover:bg-[#D2D2D4]'
          }`}
          title={isListening ? 'Stop' : 'Voice Input'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-[#FF634A]" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            language === 'kannada'
              ? 'ವಿದ್ಯಾರ್ಥಿವೇತನ ಅಥವಾ ನಿಯಮಗಳ ಬಗ್ಗೆ ಕೇಳಿ...'
              : language === 'hindi'
              ? 'छात्रवृत्ति या नियमों के बारे में पूछें...'
              : 'Type or speak your query...'
          }
          className="flex-1 px-3 py-2 text-xs bg-[#FFFFFF] border border-[#D2D2D4] rounded-lg focus:border-[#FF634A] focus:outline-none"
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-lg bg-[#FF634A] hover:bg-[#E5533D] disabled:opacity-50 text-[#FFFFFF] font-bold text-xs flex items-center gap-1.5 transition-colors"
        >
          Send <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
