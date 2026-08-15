import React, { useState, useEffect } from 'react';
import { PluginRole, UserContext } from './core/kernel/types';
import { globalPluginRegistry } from './core/kernel/plugin-registry';
import { initializePluginEcosystem } from './plugins';
import { globalEventBus } from './core/kernel/event-bus';
import { HeaderNav, computeAllowedPanels } from './components/HeaderNav';
import { PatientView } from './components/views/PatientView';
import { TherapistView } from './components/views/TherapistView';
import { ReceptionView } from './components/views/ReceptionView';
import { AdminView } from './components/views/AdminView';
import { AuditLogDrawer } from './components/AuditLogDrawer';
import { SyncQueueModal } from './components/SyncQueueModal';
import { LoginScreen } from './components/LoginScreen';
import { getAuthToken, setAuthToken } from './infrastructure/auth/auth-token-store';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserContext | null>(null);
  const [currentRole, setCurrentRole] = useState<PluginRole>('therapist');
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [loadingInit, setLoadingInit] = useState(true);

  useEffect(() => {
    // 1. Initialize core plugin ecosystem
    initializePluginEcosystem();

    // 2. Check existing token on mount
    const token = getAuthToken();
    if (token) {
      fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          if (res.ok) {
            const users = await res.json();
            if (users && users.length > 0) {
              const defaultUser = users.find((u: any) => u.isAdmin) || users[0];
              setCurrentUser(defaultUser);
              globalPluginRegistry.setUserContext(defaultUser);
            }
          } else {
            setAuthToken('');
          }
        })
        .catch(() => {
          setAuthToken('');
        })
        .finally(() => {
          setLoadingInit(false);
        });
    } else {
      setLoadingInit(false);
    }

    const unsub = globalEventBus.subscribe('user.context.updated', (evt) => {
      if (evt.payload) {
        setCurrentUser(evt.payload);
      }
    });

    return () => unsub();
  }, []);

  const handleLoginSuccess = (user: UserContext) => {
    setCurrentUser(user);
    globalPluginRegistry.setUserContext(user);
    const allowed = computeAllowedPanels(user);
    if (allowed.length > 0) {
      setCurrentRole(allowed[0].id);
    }
  };

  const handleLogout = () => {
    setAuthToken('');
    setCurrentUser(null);
  };

  useEffect(() => {
    if (!currentUser) return;
    const allowed = computeAllowedPanels(currentUser);
    const isAllowed = allowed.some((p) => p.id === currentRole);
    if (!isAllowed && allowed.length > 0) {
      setCurrentRole(allowed[0].id);
    }
  }, [currentUser, currentRole]);

  if (loadingInit) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const handleUserChange = (user: UserContext) => {
    setCurrentUser(user);
    globalPluginRegistry.setUserContext(user);
    const allowed = computeAllowedPanels(user);
    if (!allowed.some((p) => p.id === currentRole) && allowed.length > 0) {
      setCurrentRole(allowed[0].id);
    }
  };

  const handleRoleChange = (role: PluginRole) => {
    setCurrentRole(role);
  };

  const allowedPanels = computeAllowedPanels(currentUser);
  const canRenderPatient = allowedPanels.some((p) => p.id === 'patient');
  const canRenderTherapist = allowedPanels.some((p) => p.id === 'therapist');
  const canRenderReceptionist = allowedPanels.some((p) => p.id === 'receptionist');
  const canRenderAdmin = allowedPanels.some((p) => p.id === 'admin') && Boolean(currentUser.isAdmin);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col selection:bg-emerald-500 selection:text-white dir-rtl">
      {/* Top Header Navigation */}
      <HeaderNav
        currentUser={currentUser}
        currentRole={currentRole}
        onUserChange={handleUserChange}
        onRoleChange={handleRoleChange}
        onOpenAuditLogs={() => setIsAuditOpen(true)}
        onOpenSyncQueue={() => setIsSyncModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {currentRole === 'patient' && canRenderPatient && <PatientView />}
        {currentRole === 'therapist' && canRenderTherapist && <TherapistView />}
        {currentRole === 'receptionist' && canRenderReceptionist && <ReceptionView />}
        {currentRole === 'admin' && canRenderAdmin && <AdminView />}

        {((currentRole === 'admin' && !canRenderAdmin) ||
          (currentRole === 'patient' && !canRenderPatient) ||
          (currentRole === 'therapist' && !canRenderTherapist) ||
          (currentRole === 'receptionist' && !canRenderReceptionist)) && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-6 text-center">
            <h3 className="font-bold text-base mb-1">عدم دسترسی به پنل انتخابی</h3>
            <p className="text-xs text-rose-600">
              حساب کاربری فعلی ({currentUser.name}) مجاز به مشاهده این پنل نیست.
            </p>
          </div>
        )}
      </main>

      {/* Audit Logs Drawer & Outbox Sync Queue Modal */}
      <AuditLogDrawer isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} />
      <SyncQueueModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />

      {/* Footer Status */}
      <footer className="bg-white border-t border-slate-200 py-3 text-center text-xs text-slate-500">
        سامان (Saman) — پلتفرم مدیریت آنلاین درمان و دستیار هوشمند سلامت روان • Modular Monolith Architecture
      </footer>
    </div>
  );
}
