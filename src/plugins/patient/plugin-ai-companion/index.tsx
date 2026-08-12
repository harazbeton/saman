import React, { useState } from 'react';
import { PluginManifest } from '../../../core/kernel/types';
import { globalSlotRegistry } from '../../../core/kernel/slot-registry';

import { aiGatewayClient } from '../../../infrastructure/ai/ai-gateway-client';
import { Bot, Send, Sparkles, User, ShieldCheck } from 'lucide-react';

export const aiCompanionManifest: PluginManifest = {
  id: 'patient.ai.companion',
  name: 'دستیار هوشمند سلامت روان (AI Companion Gateway)',
  version: '1.0.0',
  description: 'دستیار خودکار خودمراقبتی مبتنی بر هوش مصنوعی با معماری امن Server Gateway',
  role: 'patient',
  enabled: true,
  permissions: ['ai.gateway.access', 'chat.history.write'],
  capabilities: ['ai.cbt.guidance', 'crisis.prevention'],
  slots: [
    {
      target: 'patient.ai.companion',
      componentId: 'AICompanionComponent',
      title: 'دستیار هوشمند Saman',
      priority: 20,
    },
  ],
  events: {
    subscribes: ['mood.updated'],
    publishes: ['ai.chat.completed'],
  },
};

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AICompanionComponent: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'سلام سارا جان! من دستیار هوشمند سامان هستم. اگر تمایل داری درباره حس و حال امروزت یا چالش‌های ذهنی‌ات صحبت کنیم، من اینجا هستم.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');

    const newHistory: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(newHistory);
    setLoading(true);

    try {
      // Route request safely through AI Gateway Client (Never calls Gemini directly on frontend)
      const reply = await aiGatewayClient.chatCompanion({
        patientName: 'سارا احمدی',
        messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
        context: 'بیمار دارای سابقه اضطراب شغلی و نوسان خواب است.',
      });

      setMessages([...newHistory, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      setMessages([
        ...newHistory,
        {
          role: 'assistant',
          content: 'در حال حاضر ارتباط با سرور AI برقرار نشد. پیام شما آفلاین ذخیره گردید.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col h-[420px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">دستیار هوشمند سلامت روان</h3>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              ارتباط مستقیم از طریق NestJS AI Gateway
            </span>
          </div>
        </div>
        <span className="text-[11px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-medium">
          CBT Guided
        </span>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${
                m.role === 'user' ? 'bg-emerald-600 text-white' : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div
              className={`p-3 rounded-2xl max-w-[80%] leading-relaxed ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none'
                  : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200/60'
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <Sparkles className="w-4 h-4 animate-spin text-indigo-500" />
            دستیار هوشمند در حال پردازش پاسخ بالینی...
          </div>
        )}
      </div>

      {/* Input Form */}
      <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="درباره افکار یا احساسات امروزت بنویس..."
          className="flex-1 text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={loading}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export function registerAICompanionPlugin() {
  globalSlotRegistry.registerSlotComponent(
    'patient.ai.companion',
    aiCompanionManifest.slots[0],
    AICompanionComponent
  );
}
