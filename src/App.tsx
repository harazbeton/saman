import React, { useState, useEffect } from 'react';
import { PluginRole } from './core/kernel/types';
import { globalPluginRegistry } from './core/kernel/plugin-registry';
import { initializePluginEcosystem } from './plugins';

import { HeaderNav } from './components/HeaderNav';
import { PatientView } from './components/views/PatientView';
import { TherapistView } from './components/views/TherapistView';
import { ReceptionView } from './components/views/ReceptionView';
import { AdminView } from './components/views/AdminView';
import { AuditLogDrawer } from './components/AuditLogDrawer';
import { SyncQueueModal } from './components/SyncQueueModal';

export default function App() {
  const [currentRole, setCurrentRole] = useState<PluginRole>('patient');
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  useEffect(() => {
    // 1. Initialize core plugin ecosystem
    initializePluginEcosystem();

    // 2. Set default active user context
    globalPluginRegistry.setUserContext({
      id: 'user-001',
      name: 'سارا احمدی',
      email: 'sara@saman.ir',
      role: 'patient',
      tenantId: 'clinic-main',
    });
  }, []);

  const handleRoleChange = (role: PluginRole) => {
    setCurrentRole(role);
    globalPluginRegistry.setUserContext({
      id: `user-${role}`,
      name:
        role === 'patient'
          ? 'سارا احمدی'
          : role === 'therapist'
          ? 'دکتر علیرضا محمدی'
          : role === 'receptionist'
          ? 'خانم شریفی (پذیرش)'
          : 'مدیر ارشد سیستم',
      email: `${role}@saman.ir`,
      role,
      tenantId: 'clinic-main',
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col selection:bg-emerald-500 selection:text-white dir-rtl">
      {/* Top Header Navigation */}
      <HeaderNav
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        onOpenAuditLogs={() => setIsAuditOpen(true)}
        onOpenSyncQueue={() => setIsSyncModalOpen(true)}
      />

      {/* Main Content Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {currentRole === 'patient' && <PatientView />}
        {currentRole === 'therapist' && <TherapistView />}
        {currentRole === 'receptionist' && <ReceptionView />}
        {currentRole === 'admin' && <AdminView />}
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
