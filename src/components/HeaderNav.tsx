import React, { useState, useEffect } from 'react';
import { PluginRole, UserContext } from '../core/kernel/types';
import { outboxSyncEngine } from '../infrastructure/sync/outbox-sync-engine';
import { setAuthToken, ensureAuthenticated } from '../infrastructure/auth/auth-token-store';
import {
  HeartHandshake,
  User,
  Stethoscope,
  ClipboardList,
  ShieldCheck,
  RefreshCw,
  FileCheck2,
  HardDriveUpload,
  Wifi,
  ChevronDown,
  UserCheck,
  Shield,
  LogOut,
} from 'lucide-react';

export interface PanelDefinition {
  id: PluginRole;
  label: string;
  icon: any;
  requiredRoleOrPanel?: string;
  adminOnly?: boolean;
}

export const ALL_PANELS: PanelDefinition[] = [
  { id: 'patient', label: 'مراجع (Patient)', icon: User, requiredRoleOrPanel: 'patient' },
  { id: 'therapist', label: 'درمانگر (Therapist)', icon: Stethoscope, requiredRoleOrPanel: 'therapist' },
  { id: 'receptionist', label: 'پذیرش (Reception)', icon: ClipboardList, requiredRoleOrPanel: 'reception' },
  { id: 'admin', label: 'مدیریت و پلاگین‌ها', icon: ShieldCheck, adminOnly: true },
];

export function computeAllowedPanels(user: UserContext): PanelDefinition[] {
  const allowed: PanelDefinition[] = [];
  const baseRole = user.role;

  if (baseRole === 'patient') {
    allowed.push(ALL_PANELS.find((p) => p.id === 'patient')!);
  } else if (baseRole === 'therapist') {
    allowed.push(ALL_PANELS.find((p) => p.id === 'therapist')!);
  }

  if (user.visiblePanels && Array.isArray(user.visiblePanels)) {
    for (const panelName of user.visiblePanels) {
      if (panelName === 'reception' && !allowed.some((p) => p.id === 'receptionist')) {
        allowed.push(ALL_PANELS.find((p) => p.id === 'receptionist')!);
      }
      if (panelName === 'patient' && !allowed.some((p) => p.id === 'patient')) {
        allowed.push(ALL_PANELS.find((p) => p.id === 'patient')!);
      }
      if (panelName === 'therapist' && !allowed.some((p) => p.id === 'therapist')) {
        allowed.push(ALL_PANELS.find((p) => p.id === 'therapist')!);
      }
    }
  }

  if (user.isAdmin) {
    allowed.push(ALL_PANELS.find((p) => p.id === 'admin')!);
  }

  return allowed;
}

interface HeaderNavProps {
  currentUser: UserContext;
  currentRole: PluginRole;
  onUserChange: (user: UserContext) => void;
  onRoleChange: (role: PluginRole) => void;
  onOpenAuditLogs: () => void;
  onOpenSyncQueue: () => void;
  onLogout?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentUser,
  currentRole,
  onUserChange,
  onRoleChange,
  onOpenAuditLogs,
  onOpenSyncQueue,
  onLogout,
}) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<UserContext[]>([]);

  const isDevelopment = Boolean((import.meta as any).env?.DEV ?? true);

  useEffect(() => {
    const updateCount = () => {
      setPendingCount(outboxSyncEngine.getPendingCount());
    };
    updateCount();

    const fetchUsers = async () => {
      try {
        const token = ensureAuthenticated();
        const res = await fetch('/api/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAllUsers(data);
        }
      } catch {}
    };

    if (isDevelopment && currentUser.isAdmin) {
      fetchUsers();
    }

    const unsub = outboxSyncEngine.subscribe(() => updateCount());
    return () => unsub();
  }, [currentUser.isAdmin, isDevelopment]);

  const handleManualSync = async () => {
    setSyncing(true);
    await outboxSyncEngine.processSyncQueue();
    setSyncing(false);
  };

  const handleSelectUser = async (user: UserContext) => {
    if (!isDevelopment) return;
    setUserMenuOpen(false);
    try {
      const token = await ensureAuthenticated();
      const res = await fetch('/api/users/login-as', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setAuthToken(data.token);
        onUserChange({
          ...user,
          ...data.user,
          token: data.token,
        });
      }
    } catch {}
  };

  const visiblePanels = computeAllowedPanels(currentUser);

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-2">
              سامان
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Saman Platform v1.0
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              پلتفرم ماژولار سلامت روان • Per-User Panel Visibility Override
            </p>
          </div>
        </div>

        {/* User Account Switcher Dropdown (RENDER ONLY IN DEVELOPMENT) */}
        {isDevelopment && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 rounded-2xl text-xs transition-all shadow-sm"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="text-right">
                <span className="font-bold block text-slate-100 text-xs flex items-center gap-1">
                  {currentUser.name}
                  {currentUser.isAdmin && (
                    <Shield className="w-3 h-3 text-amber-400" title="Admin" />
                  )}
                </span>
                <span className="text-[10px] text-slate-400">
                  نقش: {currentUser.role} {currentUser.visiblePanels ? `(+${currentUser.visiblePanels.length} پنل)` : ''}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute left-0 right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-2xl shadow-xl z-50 py-2 divide-y divide-slate-700/50">
                <div className="px-3 py-2 text-[11px] font-bold text-slate-400">
                  انتخاب حساب کاربری برای آزمایش دسترسی (Dev Mode):
                </div>
                <div className="py-1 max-h-64 overflow-y-auto">
                  {allUsers.map((u) => {
                    const isCurrent = u.id === currentUser.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectUser(u as UserContext)}
                        className={`w-full text-right px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-700 transition-colors ${
                          isCurrent ? 'bg-indigo-900/40 text-indigo-200' : 'text-slate-200'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold flex items-center gap-1.5">
                            {u.name}
                            {u.isAdmin && (
                              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {u.role} • {u.visiblePanels ? `پنل‌ها: [${u.visiblePanels.join(', ')}]` : 'پنل پیش‌فرض'}
                          </div>
                        </div>
                        {isCurrent && <UserCheck className="w-4 h-4 text-emerald-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Role / Panel Navigation Switcher */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-2xl border border-slate-700">
          {visiblePanels.map((item) => {
            const Icon = item.icon;
            const active = currentRole === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onRoleChange(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* System Outbox & Security Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* Outbox Pending Counter */}
          <button
            type="button"
            onClick={onOpenSyncQueue}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs transition-all ${
              pendingCount > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-pulse'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <HardDriveUpload className="w-3.5 h-3.5" />
            <span>صف Outbox:</span>
            <span className="font-bold px-1.5 py-0.2 rounded bg-slate-700 text-white">
              {pendingCount}
            </span>
          </button>

          {/* Sync Trigger */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncing}
            className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl transition-all"
            title="همگام‌سازی دستی با سرور"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          {/* Audit Logs Trigger */}
          <button
            type="button"
            onClick={onOpenAuditLogs}
            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 rounded-xl transition-all"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            لاگ (Audit)
          </button>

          {/* Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 rounded-xl transition-all"
              title="خروج از حساب کاربری"
            >
              <LogOut className="w-3.5 h-3.5" />
              خروج
            </button>
          )}

          <span className="flex items-center gap-1 text-[11px] bg-slate-800 px-2.5 py-1.5 rounded-xl text-emerald-400 border border-slate-700">
            <Wifi className="w-3 h-3" />
            آفلاین
          </span>
        </div>
      </div>
    </header>
  );
};
