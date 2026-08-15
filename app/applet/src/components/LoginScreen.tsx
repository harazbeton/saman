import React, { useState } from 'react';
import { UserContext } from '../core/kernel/types';
import { setAuthToken } from '../infrastructure/auth/auth-token-store';

interface LoginScreenProps {
  onLoginSuccess: (user: UserContext, token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('therapist@saman.ir');
  const [password, setPassword] = useState('saman123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.token) {
        throw new Error(data.error || 'ایمیل یا رمز عبور نامعتبر است.');
      }

      setAuthToken(data.token);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'خطا در ورود به سیستم. لطفا دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('saman123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 dir-rtl font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 space-y-6 border border-slate-800">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-emerald-500/30">
            س
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            سامان | ورود به سامانه
          </h1>
          <p className="text-xs text-slate-500">
            پلتفرم هوشمند مدیریت درمان و سلامت روان
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ایمیل کاربری
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all text-slate-900"
              placeholder="example@saman.ir"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رمز عبور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all text-slate-900"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all text-sm disabled:opacity-50"
          >
            {loading ? 'در حال ورود...' : 'ورود به حساب کاربری'}
          </button>
        </form>

        <div className="border-t border-slate-100 pt-4 space-y-2">
          <p className="text-[11px] text-slate-400 text-center font-medium">
            حساب‌های نمونه جهت تست سریع:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('therapist@saman.ir')}
              className="p-2 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all text-right truncate"
            >
              👨‍⚕️ دکتر محمدی (مدیر/پزشک)
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('patient@saman.ir')}
              className="p-2 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all text-right truncate"
            >
              🧑‍⚕️ سارا احمدی (بیمار)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
