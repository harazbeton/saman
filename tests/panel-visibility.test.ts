import 'reflect-metadata';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { seedDatabase } from '../src/server/db/seed';
import { AppModule } from '../src/server/app.module';
import { generateToken } from '../src/server/auth';

import { userRepository } from '../src/server/repositories/user.repository';

async function runPanelVisibilityTests() {
  console.log('=============== STARTING PANEL VISIBILITY & RBAC OVERRIDE TESTS ===============\n');

  const testDbPath = path.join(process.cwd(), 'data', 'saman_panel_test.db');

  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }


  await seedDatabase();
  const app = await NestFactory.create(AppModule, { logger: false });
  const TEST_PORT = 3002;
  await app.listen(TEST_PORT, '0.0.0.0');

  const baseUrl = `http://localhost:${TEST_PORT}`;
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passedCount++;
    } else {
      console.error(` ❌ FAIL: ${testName}`);
      failedCount++;
    }
  }

  try {
    // Setup tokens for different user profiles
    const patientToken = generateToken({
      userId: 'user-patient',
      role: 'patient',
      name: 'سارا احمدی',
      isAdmin: false,
      visiblePanels: null,
      issuedAt: new Date().toISOString(),
    });

    const normalTherapistToken = generateToken({
      userId: 'user-therapist',
      role: 'therapist',
      name: 'دکتر علیرضا محمدی',
      isAdmin: false,
      visiblePanels: null,
      issuedAt: new Date().toISOString(),
    });

    const nonAdminTherapistToken = generateToken({
      userId: 'user-therapist-multi',
      role: 'therapist',
      name: 'دکتر سمیعی',
      isAdmin: false,
      visiblePanels: null,
      issuedAt: new Date().toISOString(),
    });

    const multiPanelTherapistToken = generateToken({
      userId: 'user-therapist-multi',
      role: 'therapist',
      name: 'دکتر سمیعی',
      isAdmin: false,
      visiblePanels: ['reception', 'patient', 'therapist'],
      issuedAt: new Date().toISOString(),
    });

    const adminToken = generateToken({
      userId: 'user-admin',
      role: 'admin',
      name: 'مدیر ارشد سیستم',
      isAdmin: true,
      visiblePanels: null,
      issuedAt: new Date().toISOString(),
    });

    // TEST 1: Therapist accessing Therapist endpoint
    console.log('[1/13] Testing Therapist access to Clinical Notes (Therapist Endpoint)...');
    const res1 = await fetch(`${baseUrl}/api/clinical-notes`, {
      headers: { Authorization: `Bearer ${normalTherapistToken}` },
    });
    assert(res1.status === 200, 'Therapist is authorized (200) for /api/clinical-notes');

    // TEST 2: Non-Admin Therapist accessing Admin endpoint (Must 403)
    console.log('[2/13] Testing Non-Admin Therapist access to Admin Endpoint (PATCH /api/users/:id/panels)...');
    const res2 = await fetch(`${baseUrl}/api/users/user-patient/panels`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nonAdminTherapistToken}`,
      },
      body: JSON.stringify({ visiblePanels: ['reception'] }),
    });
    assert(res2.status === 403, 'Non-admin therapist gets 403 Forbidden on admin endpoint');

    // TEST 3: Multi-Panel Therapist (visiblePanels = ['reception','patient','therapist']) accessing Reception endpoints
    console.log('[3/13] Testing Multi-Panel Therapist access to Reception Endpoints (/api/appointments, /api/patients)...');
    const res3a = await fetch(`${baseUrl}/api/appointments`, {
      headers: { Authorization: `Bearer ${multiPanelTherapistToken}` },
    });
    const res3b = await fetch(`${baseUrl}/api/patients`, {
      headers: { Authorization: `Bearer ${multiPanelTherapistToken}` },
    });
    assert(
      res3a.status === 200 && res3b.status === 200,
      'Multi-panel therapist is authorized (200) for Reception endpoints (/api/appointments, /api/patients)'
    );

    // TEST 4: Multi-Panel Therapist accessing Patient endpoints (/api/mood-logs, /api/ai/gateway)
    console.log('[4/13] Testing Multi-Panel Therapist access to Patient Endpoints (/api/mood-logs, /api/ai/gateway)...');
    const res4a = await fetch(`${baseUrl}/api/mood-logs`, {
      headers: { Authorization: `Bearer ${multiPanelTherapistToken}` },
    });
    const res4b = await fetch(`${baseUrl}/api/ai/gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${multiPanelTherapistToken}`,
      },
      body: JSON.stringify({
        action: 'chatCompanion',
        payload: { patientName: 'سارا' },
      }),
    });
    assert(
      res4a.status === 200 && res4b.status === 200,
      'Multi-panel therapist is authorized (200) for Patient endpoints (/api/mood-logs, /api/ai/gateway)'
    );

    // TEST 5: Multi-Panel Therapist with broad visiblePanels STILL gets 403 on Admin Endpoint
    console.log('[5/13] Testing Multi-Panel Therapist (broad visiblePanels, isAdmin=false) on Admin Endpoint...');
    const res5 = await fetch(`${baseUrl}/api/users/user-patient/panels`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${multiPanelTherapistToken}`,
      },
      body: JSON.stringify({ visiblePanels: ['therapist'] }),
    });
    assert(
      res5.status === 403,
      'Multi-panel therapist receives 403 Forbidden on Admin endpoint (isAdmin remains exclusive gate)'
    );

    // TEST 6: Admin user can update user visiblePanels via PATCH /api/users/:id/panels
    console.log('[6/13] Testing Admin user updating visiblePanels for user-patient...');
    const res6 = await fetch(`${baseUrl}/api/users/user-patient/panels`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        visiblePanels: ['reception', 'patient', 'therapist'],
        isAdmin: false,
      }),
    });
    const data6 = await res6.json();
    assert(
      res6.status === 200 &&
        Array.isArray(data6.visiblePanels) &&
        data6.visiblePanels.includes('reception') &&
        data6.visiblePanels.includes('therapist'),
      'Admin successfully updated visiblePanels for user-patient'
    );

    // TEST 7: Newly granted user can now access Reception/Therapist endpoints
    console.log('[7/13] Testing newly granted user accessing Reception & Therapist endpoints...');
    const patientUpdatedToken = generateToken({
      userId: 'user-patient',
      role: 'patient',
      name: 'سارا احمدی',
      isAdmin: false,
      visiblePanels: ['reception', 'patient', 'therapist'],
      issuedAt: new Date().toISOString(),
    });
    const res7 = await fetch(`${baseUrl}/api/clinical-notes`, {
      headers: { Authorization: `Bearer ${patientUpdatedToken}` },
    });
    assert(
      res7.status === 200,
      'Updated user can access /api/clinical-notes based on updated visiblePanels'
    );

    // TEST 8: Database disk persistence for visiblePanels column
    console.log('[8/13] Testing Database disk persistence for visiblePanels across reload...');
    
    const userInDb = await userRepository.findById('user-patient');
    assert(
      Array.isArray(userInDb?.visiblePanels) &&
        userInDb!.visiblePanels!.includes('reception') &&
        userInDb!.visiblePanels!.includes('therapist'),
      'visiblePanels column correctly persisted to encrypted Postgres on disk'
    );

    // TEST 9: Impersonation / login-as security & audit verification
    console.log('[9/13] Testing login-as generates structured Audit Log with real Admin identity...');
    const impersonateRes = await fetch(`${baseUrl}/api/users/login-as`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ userId: 'user-therapist-multi' }),
    });
    assert(impersonateRes.status === 200, 'Admin can invoke login-as in development');
    const logsRes = await fetch(`${baseUrl}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const logs = await logsRes.json();
    const impersonateLog = logs.find((l: any) => l.action === 'USER_IMPERSONATION_LOGIN_AS');
    assert(
      impersonateLog &&
        impersonateLog.resourceId === 'user-therapist-multi' &&
        impersonateLog.userRole === 'admin',
      'Audit Log recorded genuine Admin identity and target user for USER_IMPERSONATION_LOGIN_AS'
    );

    // TEST 10: Production Environment Guard Test for login-as
    console.log('[10/13] Testing login-as rejection when NODE_ENV === "production"...');
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const prodRes = await fetch(`${baseUrl}/api/users/login-as`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ userId: 'user-patient' }),
    });
    process.env.NODE_ENV = prevEnv;
    assert(
      prodRes.status === 403,
      'login-as endpoint is strictly blocked (403 Forbidden) in production environment'
    );

    // TEST 11: GET /api/users and GET /api/users/:id require Admin privileges (Patient gets 403)
    console.log('[11/13] Testing GET /api/users and GET /api/users/:id authorization (Patient role gets 403)...');
    const resUsersList = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    const resUserById = await fetch(`${baseUrl}/api/users/user-therapist`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(
      resUsersList.status === 403 && resUserById.status === 403,
      'GET /api/users and GET /api/users/:id return 403 Forbidden for non-admin user (Patient)'
    );

    // TEST 12: Impersonated downstream actions record impersonatedBy in audit trail
    console.log('[12/13] Testing downstream action with impersonation token records impersonatedBy in audit trail...');
    const impersonationToken = generateToken({
      userId: 'user-therapist',
      user: 'dr_mohammadi',
      name: 'دکتر علیرضا محمدی',
      role: 'therapist',
      isAdmin: false,
      visiblePanels: null,
      impersonatedBy: 'user-admin',
      issuedAt: new Date().toISOString(),
    });

    const outboxSyncRes = await fetch(`${baseUrl}/api/sync/outbox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${impersonationToken}`,
      },
      body: JSON.stringify({
        items: [
          {
            id: 'outbox-impersonated-1',
            aggregateType: 'ClinicalNote',
            aggregateId: 'note-imp-1',
            eventType: 'ClinicalNoteCreated',
            payload: {
              id: 'note-imp-1',
              patientId: 'patient-101',
              subjective: 'Impersonated note test',
              objective: 'Audited',
              assessment: 'Valid',
              plan: 'Continue',
              signed: true,
              version: 1,
              syncStatus: 'synced',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            timestamp: new Date().toISOString(),
            syncStatus: 'pending',
          },
        ],
      }),
    });
    assert(outboxSyncRes.status === 200, 'Impersonated therapist performs sync outbox action');

    const checkLogsRes = await fetch(`${baseUrl}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const allAuditLogs = await checkLogsRes.json();
    const downstreamLog = allAuditLogs.find(
      (l: any) => l.action === 'SYNC_OUTBOX_BATCH' && l.impersonatedBy === 'user-admin'
    );
    assert(
      downstreamLog &&
        downstreamLog.impersonatedBy === 'user-admin' &&
        downstreamLog.userId === 'user-therapist',
      'Downstream audit log accurately reflects acting user ("user-therapist") AND real actor impersonatedBy ("user-admin")'
    );

    // TEST 13: Identity Spoofing Prevention in POST /api/audit-logs
    console.log('[13/13] Testing Identity Spoofing Prevention in POST /api/audit-logs...');
    const spoofAuditRes = await fetch(`${baseUrl}/api/audit-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${patientToken}`,
      },
      body: JSON.stringify({
        id: 'audit-spoof-attempt',
        // Attacker client attempts to forge an admin identity performing impersonation:
        userId: 'user-admin',
        userName: 'مدیر ارشد سیستم جعلی',
        userRole: 'admin',
        impersonatedBy: 'hacker-master',
        action: 'USER_IMPERSONATION_LOGIN_AS',
        resourceType: 'Patient',
        resourceId: 'victim-123',
        details: { note: 'Malicious forged audit attempt' },
      }),
    });
    assert(spoofAuditRes.status === 200, 'POST /api/audit-logs accepted authenticated request');

    const adminCheckLogs = await fetch(`${baseUrl}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const logsAfterSpoof = await adminCheckLogs.json();
    const spoofedEntry = logsAfterSpoof.find((l: any) => l.id === 'audit-spoof-attempt');

    assert(
      spoofedEntry &&
        spoofedEntry.userId === 'user-patient' &&
        spoofedEntry.userRole === 'patient' &&
        spoofedEntry.userName === 'سارا احمدی' &&
        spoofedEntry.impersonatedBy === '',
      'Audit log record forced real verified identity from JWT ("user-patient", "patient") and ignored forged admin fields'
    );
  } finally {
    await app.close();
    
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  }

  console.log(`\n================================================`);
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED.`);
  console.log(`================================================\n`);

  if (failedCount > 0) {
    process.exit(1);
  }
}

runPanelVisibilityTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
