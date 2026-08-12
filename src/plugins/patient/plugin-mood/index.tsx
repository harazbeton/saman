import React, { useState, useEffect } from 'react';
import { PluginManifest } from '../../../core/kernel/types';
import { globalSlotRegistry } from '../../../core/kernel/slot-registry';

import { moodRepository } from '../../../infrastructure/storage/repositories';
import { globalEventBus } from '../../../core/kernel/event-bus';
import { MoodLog } from '../../../domain/entities/Patient';
import { Smile, Frown, Meh, Heart, Zap, Sparkles, CheckCircle2 } from 'lucide-react';

export const moodPluginManifest: PluginManifest = {
  id: 'patient.mood',
  name: 'ثبت و تحلیل خلق‌ و خو (Mood & Emotion)',
  version: '1.0.0',
  description: 'ماژول ارزیابی روزانه احوالات و محرک‌های روانی بیمار',
  role: 'patient',
  enabled: true,
  permissions: ['patient.mood.read', 'patient.mood.write'],
  capabilities: ['mood.tracking', 'chart.visualization'],
  slots: [
    {
      target: 'patient.mood.widget',
      componentId: 'MoodWidgetComponent',
      title: 'ثبت خلق امروز',
      priority: 10,
    },
    {
      target: 'patient.overview.main',
      componentId: 'MoodHistoryComponent',
      title: 'تاریخچه حس و حال',
      priority: 5,
    },
  ],
  events: {
    subscribes: [],
    publishes: ['mood.updated'],
  },
};

const EMOTION_OPTIONS = ['آرام', 'امیدوار', 'مضطرب', 'خسته', 'پرانرژی', 'غمگین', 'عصبانی', 'باانگیزه'];

export const MoodWidgetComponent: React.FC = () => {
  const [score, setScore] = useState<number>(3);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const toggleEmotion = (emo: string) => {
    setSelectedEmotions((prev) =>
      prev.includes(emo) ? prev.filter((e) => e !== emo) : [...prev, emo]
    );
  };

  const handleSave = async () => {
    const newLog: MoodLog = {
      id: `mood-${Date.now()}`,
      patientId: 'pat-101',
      score,
      emotions: selectedEmotions,
      triggers,
      note,
      tenantId: 'clinic-main',
      version: 1,
      syncStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await moodRepository.save(newLog);

    await globalEventBus.publish({
      id: `evt-${Date.now()}`,
      type: 'mood.updated',
      aggregateId: newLog.id,
      aggregateType: 'MoodLog',
      timestamp: new Date().toISOString(),
      version: 1,
      payload: newLog,
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">ارزیابی و ثبت حس و حال امروز</h3>
        </div>
        <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-medium">
          پلاگین فعال
        </span>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        امروز چطور سپری شد؟ با ثبت روزانه، درمانگر شما روند بهبودی را بهتر ارزیابی می‌کند.
      </p>

      {/* Mood Score Selector */}
      <div className="flex justify-around items-center bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100">
        {[
          { val: 1, label: 'خیلی بد', icon: Frown, color: 'text-rose-500' },
          { val: 2, label: 'نامساعد', icon: Frown, color: 'text-amber-500' },
          { val: 3, label: 'معمولی', icon: Meh, color: 'text-slate-500' },
          { val: 4, label: 'خوب', icon: Smile, color: 'text-emerald-500' },
          { val: 5, label: 'عالی', icon: Heart, color: 'text-indigo-500' },
        ].map((item) => {
          const Icon = item.icon;
          const isSelected = score === item.val;
          return (
            <button
              key={item.val}
              type="button"
              onClick={() => setScore(item.val)}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                isSelected
                  ? 'bg-white shadow-md scale-105 ring-2 ring-emerald-500'
                  : 'hover:bg-slate-200/50 opacity-70'
              }`}
            >
              <Icon className={`w-7 h-7 ${item.color}`} />
              <span className="text-xs font-medium text-slate-700">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Emotion Chips */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-slate-600 mb-2">احساسات فعلی:</label>
        <div className="flex wrap gap-2">
          {EMOTION_OPTIONS.map((emo) => {
            const active = selectedEmotions.includes(emo);
            return (
              <button
                key={emo}
                type="button"
                onClick={() => toggleEmotion(emo)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  active
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {emo}
              </button>
            );
          })}
        </div>
      </div>

      {/* Triggers & Notes */}
      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            محرک‌ها یا اتفاقات تاثیرگذار (اختیاری):
          </label>
          <input
            type="text"
            value={triggers}
            onChange={(e) => setTriggers(e.target.value)}
            placeholder="مثلا: استرس شغلی، جلسات کاری پیاپی..."
            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-400">ذخیره آفلاین محلی + صف همگام‌سازی Sync</span>
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95"
        >
          {savedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          {savedSuccess ? 'ثبت شد!' : 'ذخیره در پرونده'}
        </button>
      </div>
    </div>
  );
};

export const MoodHistoryComponent: React.FC = () => {
  const [logs, setLogs] = useState<MoodLog[]>([]);

  const loadLogs = async () => {
    const list = await moodRepository.getByPatient('pat-101');
    setLogs(list);
  };

  useEffect(() => {
    loadLogs();
    const unsub = globalEventBus.subscribe('mood.updated', () => loadLogs());
    return () => unsub();
  }, []);

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
      <h3 className="font-bold text-slate-800 text-base mb-3 flex items-center gap-2">
        <Smile className="w-5 h-5 text-emerald-600" />
        تاریخچه ثبت خلق‌وخو
      </h3>
      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-slate-700">امتیاز خلق: {log.score} از ۵</span>
              <span className="text-slate-400">
                {new Date(log.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {log.emotions?.length > 0 && (
              <div className="flex wrap gap-1 mb-1">
                {log.emotions.map((e, idx) => (
                  <span key={idx} className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px]">
                    {e}
                  </span>
                ))}
              </div>
            )}
            {log.triggers && <p className="text-slate-500">محرک: {log.triggers}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export function registerMoodPlugin() {
  globalSlotRegistry.registerSlotComponent('patient.mood', moodPluginManifest.slots[0], MoodWidgetComponent);
  globalSlotRegistry.registerSlotComponent('patient.mood', moodPluginManifest.slots[1], MoodHistoryComponent);
}
