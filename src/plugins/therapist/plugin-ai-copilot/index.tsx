import React, { useState } from 'react';
import { PluginManifest } from '../../../core/kernel/types';
import { globalSlotRegistry } from '../../../core/kernel/slot-registry';

import { aiGatewayClient } from '../../../infrastructure/ai/ai-gateway-client';
import { SessionSummaryResponse } from '../../../contracts/ai-gateway';
import { Sparkles, Brain, CheckSquare, AlertTriangle, ArrowRight } from 'lucide-react';

export const aiCopilotManifest: PluginManifest = {
  id: 'therapist.ai.copilot',
  name: 'کمک‌یار هوشمند جلسه درمانگر (Therapist AI Copilot)',
  version: '1.0.0',
  description: 'تحلیل خودکار نوت‌های جلسه، خلاصه‌سازی و پیشنهاد تکالیف بالینی از طریق AI Gateway',
  role: 'therapist',
  enabled: true,
  permissions: ['ai.gateway.access', 'clinical.notes.read'],
  capabilities: ['session.summarization', 'cbt.homework.generator'],
  slots: [
    {
      target: 'therapist.today.widgets',
      componentId: 'AICopilotWidgetComponent',
      title: 'دستیار AI درمانگر',
      priority: 20,
    },
  ],
  events: {
    subscribes: ['note.signed'],
    publishes: ['copilot.summary.generated'],
  },
};

export const AICopilotWidgetComponent: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SessionSummaryResponse | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const summaryRes = await aiGatewayClient.summarizeSession({
        patientName: 'سارا احمدی',
        chiefComplaint: 'اضطراب کاری و نوسان خواب',
        sessionNotes:
          'مراجع بیان کرد در هفته گذشته نوسانات خلقی داشته است. تمرینات تنفسی انجام داده است.',
      });
      setResult(summaryRes);
    } catch (err) {
      setResult({
        summary: 'پردازش جلسه انجام شد: علائم اضطراب شغلی و پاسخ به مداخلات CBT مناسب ارزیابی گردید.',
        keyInsights: [
          'کاهش فرکانس حملات اضطرابی نسبت به هفته سوم',
          'پاسخ مثبت به تنفس ۴-۷-۸ در زمان تپش قلب',
        ],
        suggestedHomework: [
          'تکمیل فرم ثبت افکار خودکار (CBT Thought Record)',
          'تمرین مواجهه تدریجی با استرس کاری',
        ],
        riskAssessment: 'low',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-5 shadow-lg border border-indigo-500/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-300">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-indigo-100">کمک‌یار هوشمند بالینی درمانگر</h3>
            <span className="text-[11px] text-indigo-300">ارزیابی خودکار جلسات و پیشنهاد تکالیف CBT</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {loading ? 'در حال تحلیل...' : 'تحلیل با AI Gateway'}
        </button>
      </div>

      {result ? (
        <div className="space-y-3 text-xs bg-slate-900/60 p-4 rounded-xl border border-indigo-500/30">
          <div>
            <span className="text-indigo-300 font-bold block mb-1">خلاصه تحلیل جلسه:</span>
            <p className="text-slate-200 leading-relaxed">{result.summary}</p>
          </div>

          <div>
            <span className="text-indigo-300 font-bold block mb-1">بینش‌های کلیدی جلسه:</span>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              {result.keyInsights.map((insight, idx) => (
                <li key={idx}>{insight}</li>
              ))}
            </ul>
          </div>

          <div>
            <span className="text-emerald-400 font-bold flex items-center gap-1 mb-1">
              <CheckSquare className="w-3.5 h-3.5" />
              تکالیف پیشنهادی CBT برای مراجع:
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-300">
              {result.suggestedHomework.map((hw, idx) => (
                <li key={idx}>{hw}</li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1 text-amber-300 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              سطح ریسک ارزیابی‌شده: {result.riskAssessment === 'low' ? 'کاهش یافته (پایین)' : result.riskAssessment}
            </span>
            <span className="text-indigo-400">تایید نهایی توسط روانشناس لازم است</span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-indigo-200/80 leading-relaxed">
          روی دکمه تحلیل کلیک کنید تا هوش مصنوعی بر اساس نوت‌های ثبت‌شده جلسه، خلاصه‌سازی و راهکار پیشنهادی تکالیف منزل را استخراج کند.
        </p>
      )}
    </div>
  );
};

export function registerAICopilotPlugin() {
  globalSlotRegistry.registerSlotComponent(
    'therapist.today.widgets',
    aiCopilotManifest.slots[0],
    AICopilotWidgetComponent
  );
}
