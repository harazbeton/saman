import React, { useState, useEffect } from 'react';
import { globalPluginRegistry } from '../../core/kernel/plugin-registry';
import { PluginManifest } from '../../core/kernel/types';
import {
  ShieldCheck,
  Blocks,
  Power,
  Layers,
  Users,
  CheckSquare,
  Square,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  UserCheck,
} from 'lucide-react';
import { getAuthToken, ensureAuthenticated } from '../../infrastructure/auth/auth-token-store';
import { globalEventBus } from '../../core/kernel/event-bus';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  visiblePanels: string[] | null;
}

const AVAILABLE_PANELS = [
  { id: 'reception', label: 'پذیرش (Reception)', color: 'blue' },
  { id: 'patient', label: 'مراجع (Patient)', color: 'emerald' },
  { id: 'therapist', label: 'درمانگر (Therapist)', color: 'indigo' },
];

export const AdminView: React.FC = () => {
  const [manifests, setManifests] = useState<PluginManifest[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ [userId: string]: 'saved' | 'error' }>({});
  const [pendingPanels, setPendingPanels] = useState<{ [userId: string]: string[] }>({});
  const [pendingAdmin, setPendingAdmin] = useState<{ [userId: string]: boolean }>({});

  const refreshManifests = () => {
    setManifests(globalPluginRegistry.getAllManifests());
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = await ensureAuthenticated();
      const res = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data: UserItem[] = await res.json();
        setUsers(data);
        const panelsMap: { [userId: string]: string[] } = {};
        const adminMap: { [userId: string]: boolean } = {};
        data.forEach((u) => {
          panelsMap[u.id] = u.visiblePanels ? [...u.visiblePanels] : [];
          adminMap[u.id] = Boolean(u.isAdmin);
        });
        setPendingPanels(panelsMap);
        setPendingAdmin(adminMap);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    refreshManifests();
    fetchUsers();
  }, []);

  const handleToggle = (id: string) => {
    globalPluginRegistry.togglePlugin(id);
    refreshManifests();
  };

  const handlePanelCheckToggle = (userId: string, panelId: string) => {
    setPendingPanels((prev) => {
      const current = prev[userId] || [];
      const updated = current.includes(panelId)
        ? current.filter((p) => p !== panelId)
        : [...current, panelId];
      return { ...prev, [userId]: updated };
    });
  };

  const handleAdminToggle = (userId: string) => {
    setPendingAdmin((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const handleSaveUserPanels = async (user: UserItem) => {
    setSavingUserId(user.id);
    setSaveStatus((prev) => ({ ...prev, [user.id]: 'saved' }));

    try {
      const token = await ensureAuthenticated();
      const panelsToSave =
        pendingPanels[user.id] && pendingPanels[user.id].length > 0
          ? pendingPanels[user.id]
          : null;
      const adminToSave = pendingAdmin[user.id];

      const res = await fetch(`/api/users/${user.id}/panels`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          visiblePanels: panelsToSave,
          isAdmin: adminToSave,
        }),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updatedUser } : u)));
        setSaveStatus((prev) => ({ ...prev, [user.id]: 'saved' }));

        // Notify app if current user was modified
        const activeUser = globalPluginRegistry.getUserContext();
        if (activeUser && activeUser.id === user.id) {
          const newContext = {
            ...activeUser,
            isAdmin: adminToSave,
            visiblePanels: panelsToSave,
          };
          globalPluginRegistry.setUserContext(newContext);
          globalEventBus.publish({
            id: `evt-${Date.now()}`,
            type: 'user.context.updated',
            aggregateId: user.id,
            aggregateType: 'User',
            timestamp: new Date().toISOString(),
            version: 1,
            payload: newContext,
          });
        }

        setTimeout(() => {
          setSaveStatus((prev) => {
            const next = { ...prev };
            delete next[user.id];
            return next;
          });
        }, 3000);
      } else {
        setSaveStatus((prev) => ({ ...prev, [user.id]: 'error' }));
      }
    } catch (err) {
      console.error('Failed to save user panels:', err);
      setSaveStatus((prev) => ({ ...prev, [user.id]: 'error' }));
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-700/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-full inline-flex items-center gap-1">
              <Blocks className="w-3.5 h-3.5" />
              مدیریت اکوسیستم و دسترسی کاربران (Micro-Kernel Admin)
            </span>
            <h2 className="text-xl font-bold tracking-tight">کنترل پلتفرم، ماژول‌ها و رویت‌پذیری پنل‌ها</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              مدیریت دسترسی چندپنله کاربران، فعال/غیرفعال‌سازی ماژول‌ها و کنترل سطح دسترسی ادمین
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs bg-slate-800/80 p-3 rounded-2xl border border-slate-700">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="font-bold block">کنترل تفکیک‌پذیری پنل‌ها</span>
              <span className="text-slate-400 text-[11px]">Panel-Level Visibility Override</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: Per-User Panel Visibility Checklist */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              مدیریت دسترسی و رویت‌پذیری پنل‌های کاربران (Panel Visibility Override)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              تعیین پنل‌های قابل‌مشاهده برای هر کاربر علاوه بر نقش پایه وی. دسترسی پنل مدیریت منحصراً توسط تیک isAdmin کنترل می‌شود.
            </p>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">
            {users.length} کاربر تعریف‌شده
          </span>
        </div>

        {loadingUsers ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            در حال بارگذاری لیست کاربران...
          </div>
        ) : (
          <div className="space-y-4">
            {users.map((u) => {
              const currentPanels = pendingPanels[u.id] || [];
              const isAdminChecked = Boolean(pendingAdmin[u.id]);
              const isSaving = savingUserId === u.id;
              const status = saveStatus[u.id];

              return (
                <div
                  key={u.id}
                  className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* User Info */}
                  <div className="space-y-1 min-w-[220px]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{u.name}</span>
                      <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                        {u.role}
                      </span>
                      {u.isAdmin && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <Shield className="w-3 h-3" />
                          Admin
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 block">{u.email}</span>
                    <span className="text-[11px] text-slate-400 font-mono block">شناسه: {u.id}</span>
                  </div>

                  {/* Operational Panels Checklist */}
                  <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-bold text-slate-600 block mb-2">
                      پنل‌های مجاز کاربر (Operational Panels):
                    </span>
                    <div className="flex flex-wrap items-center gap-4">
                      {AVAILABLE_PANELS.map((panel) => {
                        const isChecked = currentPanels.includes(panel.id);
                        const isBaseRole = panel.id === u.role;

                        return (
                          <label
                            key={panel.id}
                            className={`flex items-center gap-2 text-xs font-semibold cursor-pointer select-none px-2.5 py-1.5 rounded-lg border transition-all ${
                              isChecked
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handlePanelCheckToggle(u.id, panel.id)}
                              className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <span>{panel.label}</span>
                            {isBaseRole && (
                              <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded">
                                نقش پایه
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Admin Flag Toggle (Separate & Explicit) */}
                  <div className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-xl min-w-[170px]">
                    <span className="text-[11px] font-bold text-amber-900 block mb-1.5 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-amber-600" />
                      سطح دسترسی سیستم:
                    </span>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-slate-800">
                      <input
                        type="checkbox"
                        checked={isAdminChecked}
                        onChange={() => handleAdminToggle(u.id)}
                        className="w-4 h-4 rounded text-amber-600 accent-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span>دسترسی مدیر (isAdmin)</span>
                    </label>
                  </div>

                  {/* Save Action Button */}
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => handleSaveUserPanels(u)}
                      disabled={isSaving}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        status === 'saved'
                          ? 'bg-emerald-600 text-white'
                          : status === 'error'
                          ? 'bg-rose-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                      }`}
                    >
                      {isSaving ? (
                        <span className="animate-spin text-xs">⏳</span>
                      ) : status === 'saved' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : status === 'error' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>
                        {status === 'saved'
                          ? 'ذخیره شد'
                          : status === 'error'
                          ? 'خطا در ذخیره'
                          : 'ذخیره دسترسی'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 2: Installed Plugins Grid (Micro-Kernel Plugin System) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            لیست پلاگین‌های فعال اکوسیستم سامان (Micro-Kernel Plugins)
          </h3>
          <span className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">
            {manifests.filter((m) => m.enabled).length} از {manifests.length} پلاگین فعال
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {manifests.map((m) => (
            <div
              key={m.id}
              className={`p-4 rounded-2xl border transition-all ${
                m.enabled
                  ? 'bg-slate-50/80 border-slate-200 shadow-sm'
                  : 'bg-slate-100/50 border-slate-200/50 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{m.name}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                      v{m.version}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{m.id}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggle(m.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    m.enabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-300 hover:bg-slate-400 text-slate-800'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {m.enabled ? 'فعال' : 'غیرفعال'}
                </button>
              </div>

              <p className="text-xs text-slate-600 mb-3">{m.description}</p>

              {/* Manifest Metadata */}
              <div className="space-y-2 pt-2 border-t border-slate-200/60 text-[11px]">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">اسلات‌های تزریق UI:</span>
                  <div className="flex flex-wrap gap-1">
                    {m.slots.map((s, idx) => (
                      <span
                        key={idx}
                        className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono text-[10px]"
                      >
                        {s.target} (P:{s.priority})
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-1">مجوزهای امنیتی (Permissions):</span>
                  <div className="flex flex-wrap gap-1">
                    {m.permissions.map((p, idx) => (
                      <span
                        key={idx}
                        className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-mono text-[10px]"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
