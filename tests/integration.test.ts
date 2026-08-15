import 'reflect-metadata';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/server/app.module';
import { generateToken } from '../src/server/auth';
import { patientRepository } from '../src/server/repositories/patient.repository';
import { clinicalNoteRepository } from '../src/server/repositories/clinical-note.repository';
import { moodLogRepository } from '../src/server/repositories/mood-log.repository';
import { appointmentRepository } from '../src/server/repositories/appointment.repository';
import { auditLogRepository } from '../src/server/repositories/audit-log.repository';
import { getSqliteDb, closeSqliteDb } from '../src/server/db/sqlite-db';

async function runIntegrationTests() {
  console.log('=============== STARTING SAMAN INTEGRATION TESTS (NestJS) ===============\n');

  const testDbPath = path.join(process.cwd(), 'data', 'saman_test.db');

  // Clean up previous test database if exists
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Initialize SQLite with test path
  await getSqliteDb(testDbPath);

  // Setup Test NestJS App
  const app = await NestFactory.create(AppModule, { logger: false });
  const TEST_PORT = 3001;
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
    // TEST 1: GET /api/health (Public)
    console.log('[1/10] Testing GET /api/health (Public Endpoint)...');
    const res1 = await fetch(`${baseUrl}/api/health`);
    const data1 = await res1.json();
    assert(
      res1.status === 200 && data1.status === 'ok' && data1.storage.includes('saman_test.db'),
      'Health endpoint returned 200 and SQLite storage info'
    );

    // TEST 2: Unauthenticated Request Rejection (401)
    console.log('[2/10] Testing Unauthenticated Request Rejection (401)...');
    const res2 = await fetch(`${baseUrl}/api/sync/outbox`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: [] }),
    });
    assert(res2.status === 401, 'Protected endpoint /api/sync/outbox rejects missing token with 401');

    // TEST 3: Invalid Login Request (401)
    console.log('[3/10] Testing POST /api/login with invalid password...');
    const res3 = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrongpassword' }),
    });
    assert(res3.status === 401, 'Login rejects invalid password with 401');

    // TEST 4: Valid Login Request (200 & JWT Token)
    console.log('[4/10] Testing POST /api/login with valid password...');
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

    // TEST 5: Authenticated Live Gemini AI Gateway Calls (Chat & Summarize)
    console.log('[5/10] Testing Authenticated Live Gemini AI Gateway Calls (Chat & Summarize)...');
    const resChat = await fetch(`${baseUrl}/api/ai/gateway`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'chatCompanion',
        payload: {
          patientName: 'سارا',
          messages: [{ role: 'user', content: 'سلام، امروز کمی مضطرب هستم.' }],
        },
      }),
    });
    const dataChat = await resChat.json();
    const hasApiKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';

    if (hasApiKey) {
      assert(
        resChat.status === 200 &&
          dataChat.source === 'gemini' &&
          typeof dataChat.result === 'string' &&
          dataChat.result.length > 0,
        'Live Gemini API Chat: Confirmed genuine response (source: "gemini")'
      );

      const resSum = await fetch(`${baseUrl}/api/ai/gateway`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'summarizeSession',
          payload: {
            patientName: 'سارا',
            sessionNotes: 'مراجع از علائم اضطراب در محیط کار صحبت کرد.',
          },
        }),
      });
      const dataSum = await resSum.json();
      assert(
        resSum.status === 200 &&
          dataSum.source === 'gemini' &&
          typeof dataSum.result === 'object' &&
          !!dataSum.result.summary,
        'Live Gemini API Summarization: Confirmed genuine response (source: "gemini")'
      );
    } else {
      assert(resChat.status === 200 && dataChat.source === 'fallback', 'AI Gateway fallback triggered gracefully');
    }

    // TEST 6: Dedicated AI Gateway Fallback Path Verification
    console.log('[6/10] Testing Dedicated AI Gateway Fallback Path Verification...');
    const originalApiKey = process.env.GEMINI_API_KEY;
    try {
      // Temporarily clear API key to simulate missing key/offline scenario
      delete process.env.GEMINI_API_KEY;
      const resFallback = await fetch(`${baseUrl}/api/ai/gateway`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'chatCompanion',
          payload: { patientName: 'سارا' },
        }),
      });
      const dataFallback = await resFallback.json();
      assert(
        resFallback.status === 200 &&
          dataFallback.source === 'fallback' &&
          typeof dataFallback.result === 'string' &&
          dataFallback.result.includes('متوجهم سارا') &&
          dataFallback.result.includes('احساسات و تجربیاتی'),
        'Dedicated Fallback Path: Verified deterministic fallback response (source: "fallback")'
      );
    } finally {
      process.env.GEMINI_API_KEY = originalApiKey;
    }

    // TEST 7: Outbox Sync Bug Fix & Multi-Aggregate Persistence
    console.log('[7/10] Testing Outbox Sync with Patient, ClinicalNote, MoodLog, Appointment, and Unrecognized type...');
    const testItems = [
      { id: 'outbox-p1', aggregateType: 'Patient', payload: { id: 'patient-101', name: 'سارا احمدی' } },
      { id: 'outbox-n1', aggregateType: 'ClinicalNote', payload: { id: 'note-201', content: 'جلسه CBT بررسی اضطراب' } },
      { id: 'outbox-m1', aggregateType: 'MoodLog', payload: { id: 'mood-301', score: 8 } },
      { id: 'outbox-a1', aggregateType: 'Appointment', payload: { id: 'apt-401', date: '2026-08-15' } },
      { id: 'outbox-x1', aggregateType: 'UnknownType', payload: { id: 'unk-999' } },
    ];

    const res7 = await fetch(`${baseUrl}/api/sync/outbox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: testItems }),
    });
    const data7 = await res7.json();
    const syncedIds: string[] = data7.syncedIds || [];

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

    // TEST 8: Audit Log Persistence & Retrieval
    console.log('[8/10] Testing Audit Log Persistence & Retrieval...');
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

    const res8 = await fetch(`${baseUrl}/api/audit-logs`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const logs8 = await res8.json();
    assert(
      Array.isArray(logs8) && logs8.some((l: any) => l.id === 'audit-test-01'),
      'Audit log persisted to SQLite and retrieved via GET endpoint'
    );

    // TEST 9: Hard Restart & SQLite Disk Persistence Verification
    console.log('[9/10] Testing Hard Restart & SQLite Disk Persistence...');
    closeSqliteDb();
    // Re-open SQLite from disk file
    await getSqliteDb(testDbPath);

    const noteAfterRestart = await clinicalNoteRepository.findById('note-201');
    assert(
      noteAfterRestart !== null && noteAfterRestart.content === 'جلسه CBT بررسی اضطراب',
      'Data persisted to SQLite disk file survives server DB restart'
    );

    // TEST 10: Expired JWT Token Rejection (401)
    console.log('[10/10] Testing Expired JWT Token Rejection (401)...');
    const expiredToken = generateToken({ role: 'therapist', user: 'dr_mohammadi' }, '-1s');
    const res10 = await fetch(`${baseUrl}/api/sync/outbox`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expiredToken}`,
      },
      body: JSON.stringify({ items: [] }),
    });
    assert(
      res10.status === 401,
      'Expired JWT token is rejected with status 401 Unauthorized'
    );

  } catch (err: any) {
    console.error('Test execution error:', err);
    failedCount++;
  } finally {
    await app.close();
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
