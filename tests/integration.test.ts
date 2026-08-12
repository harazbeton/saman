import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';

import { authMiddleware, handleLogin, generateToken } from '../src/server/auth';
import { patientRepository } from '../src/server/repositories/patient.repository';
import { clinicalNoteRepository } from '../src/server/repositories/clinical-note.repository';
import { moodLogRepository } from '../src/server/repositories/mood-log.repository';
import { appointmentRepository } from '../src/server/repositories/appointment.repository';
import { auditLogRepository } from '../src/server/repositories/audit-log.repository';
import { getSqliteDb, closeSqliteDb } from '../src/server/db/sqlite-db';

async function runIntegrationTests() {
  console.log('=============== STARTING SAMAN INTEGRATION TESTS ===============\n');

  const testDbPath = path.join(process.cwd(), 'data', 'saman_test.db');

  // Clean up previous test database if exists
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Initialize SQLite with test path
  await getSqliteDb(testDbPath);

  // Setup Test Express App
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', storage: 'SQLite ./data/saman_test.db' });
  });

  app.post('/api/login', handleLogin);

  app.post('/api/ai/gateway', (req, res) => {
    const { action } = req.body;
    res.json({ result: `Test response for ${action}` });
  });

  app.post('/api/sync/outbox', async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });

    const syncedIds: string[] = [];

    for (const item of items) {
      try {
        if (item.aggregateType === 'Patient') {
          await patientRepository.save(item.payload);
          syncedIds.push(item.id);
        } else if (item.aggregateType === 'ClinicalNote') {
          await clinicalNoteRepository.save(item.payload);
          syncedIds.push(item.id);
        } else if (item.aggregateType === 'MoodLog') {
          await moodLogRepository.save(item.payload);
          syncedIds.push(item.id);
        } else if (item.aggregateType === 'Appointment') {
          await appointmentRepository.save(item.payload);
          syncedIds.push(item.id);
        } else {
          console.error(
            `[TEST LOG] Unrecognized aggregate type for outbox item ${item.id}: '${item.aggregateType}'`
          );
        }
      } catch (err: any) {
        console.error(`Failed to persist item ${item.id}:`, err);
      }
    }

    res.json({ status: 'success', syncedIds });
  });

  app.post('/api/audit-logs', async (req, res) => {
    await auditLogRepository.save(req.body);
    res.json({ status: 'logged', id: req.body.id });
  });

  app.get('/api/audit-logs', async (req, res) => {
    const logs = await auditLogRepository.findAll();
    res.json(logs);
  });

  // Start HTTP Server on port 3001
  const TEST_PORT = 3001;
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(TEST_PORT, resolve));

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
    // TEST 1: GET /api/health (Public)
    console.log('[1/8] Testing GET /api/health (Public Endpoint)...');
    const res1 = await fetch(`${baseUrl}/api/health`);
    const data1 = await res1.json();
    assert(
      res1.status === 200 && data1.status === 'ok' && data1.storage.includes('saman_test.db'),
      'Health endpoint returned 200 and SQLite storage info'
    );

    // TEST 2: Unauthenticated Request Rejection (401)
    console.log('[2/8] Testing Unauthenticated Request Rejection (401)...');
    const res2 = await fetch(`${baseUrl}/api/sync/outbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });
    assert(res2.status === 401, 'Protected endpoint /api/sync/outbox rejects missing token with 401');

    // TEST 3: Invalid Login Request (401)
    console.log('[3/8] Testing POST /api/login with invalid password...');
    const res3 = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrongpassword' }),
    });
    assert(res3.status === 401, 'Login rejects invalid password with 401');

    // TEST 4: Valid Login Request (200 & JWT Token)
    console.log('[4/8] Testing POST /api/login with valid password...');
    const res4 = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'saman123' }),
    });
    const data4 = await res4.json();
    const token = data4.token;
    assert(
      res4.status === 200 && typeof token === 'string' && token.length > 20,
      'Login succeeds and returns valid JWT session token'
    );

    // TEST 5: Authenticated POST /api/ai/gateway
    console.log('[5/8] Testing Authenticated POST /api/ai/gateway...');
    const res5 = await fetch(`${baseUrl}/api/ai/gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'chatCompanion', payload: { patientName: 'سارا' } }),
    });
    assert(res5.status === 200, 'Authenticated AI Gateway endpoint returns 200 OK');

    // TEST 6: Outbox Sync Bug Fix & Multi-Aggregate Persistence
    console.log('[6/8] Testing Outbox Sync with Patient, ClinicalNote, MoodLog, Appointment, and Unrecognized type...');
    const testItems = [
      { id: 'outbox-p1', aggregateType: 'Patient', payload: { id: 'patient-101', name: 'سارا احمدی' } },
      { id: 'outbox-n1', aggregateType: 'ClinicalNote', payload: { id: 'note-201', content: 'جلسه CBT بررسی اضطراب' } },
      { id: 'outbox-m1', aggregateType: 'MoodLog', payload: { id: 'mood-301', score: 8 } },
      { id: 'outbox-a1', aggregateType: 'Appointment', payload: { id: 'apt-401', date: '2026-08-15' } },
      { id: 'outbox-x1', aggregateType: 'UnknownType', payload: { id: 'unk-999' } },
    ];

    const res6 = await fetch(`${baseUrl}/api/sync/outbox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: testItems }),
    });
    const data6 = await res6.json();
    const syncedIds: string[] = data6.syncedIds || [];

    const p1Saved = await patientRepository.findById('patient-101');
    const n1Saved = await clinicalNoteRepository.findById('note-201');
    const m1Saved = await moodLogRepository.findById('mood-301');
    const a1Saved = await appointmentRepository.findById('apt-401');

    assert(
      syncedIds.includes('outbox-p1') &&
        syncedIds.includes('outbox-n1') &&
        syncedIds.includes('outbox-m1') &&
        syncedIds.includes('outbox-a1') &&
        !syncedIds.includes('outbox-x1'),
      'Outbox sync correctly handles all 4 aggregate types and REJECTS unrecognized type'
    );

    assert(
      p1Saved?.name === 'سارا احمدی' &&
        n1Saved?.content === 'جلسه CBT بررسی اضطراب' &&
        m1Saved?.score === 8 &&
        a1Saved?.date === '2026-08-15',
      'All 4 aggregate types were correctly persisted to SQLite via repositories'
    );

    // TEST 7: Audit Log Persistence & Retrieval
    console.log('[7/8] Testing Audit Log Persistence & Retrieval...');
    const auditEntry = {
      id: 'audit-test-01',
      userId: 'therapist-01',
      userName: 'دکتر محمدی',
      userRole: 'therapist',
      action: 'READ_CLINICAL_NOTE',
      resourceType: 'ClinicalNote',
      resourceId: 'note-201',
      details: { patientId: 'patient-101' },
      timestamp: new Date().toISOString(),
    };

    await fetch(`${baseUrl}/api/audit-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(auditEntry),
    });

    const res7 = await fetch(`${baseUrl}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const logs7 = await res7.json();
    assert(
      Array.isArray(logs7) && logs7.some((l: any) => l.id === 'audit-test-01'),
      'Audit log persisted to SQLite and retrieved via GET endpoint'
    );

    // TEST 8: Hard Restart & SQLite Disk Persistence Verification
    console.log('[8/9] Testing Hard Restart & SQLite Disk Persistence...');
    closeSqliteDb();
    // Re-open SQLite from disk file
    await getSqliteDb(testDbPath);

    const noteAfterRestart = await clinicalNoteRepository.findById('note-201');
    assert(
      noteAfterRestart !== null && noteAfterRestart.content === 'جلسه CBT بررسی اضطراب',
      'Data persisted to SQLite disk file survives server DB restart'
    );

    // TEST 9: Expired JWT Token Rejection (401)
    console.log('[9/9] Testing Expired JWT Token Rejection (401)...');
    const expiredToken = generateToken({ role: 'therapist', user: 'dr_mohammadi' }, '-1s');
    const res9 = await fetch(`${baseUrl}/api/sync/outbox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expiredToken}`,
      },
      body: JSON.stringify({ items: [] }),
    });
    assert(
      res9.status === 401,
      'Expired JWT token is rejected with status 401 Unauthorized'
    );

  } catch (err: any) {
    console.error('Test execution error:', err);
    failedCount++;
  } finally {
    server.close();
    closeSqliteDb();
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

runIntegrationTests();
