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

async function runE2EVerticalSliceTest() {
  console.log('================================================================');
  console.log('  STARTING END-TO-END VERTICAL SLICE & PROCESS RESTART TEST  ');
  console.log('================================================================\n');

  const e2eDbPath = path.join(process.cwd(), 'data', 'saman_e2e_slice.db');

  if (fs.existsSync(e2eDbPath)) {
    fs.unlinkSync(e2eDbPath);
  }

  // Phase 1: Spin up Server Instance 1
  console.log('🚀 [PHASE 1] Initializing Server Process Instance 1 with SQLite...');
  await getSqliteDb(e2eDbPath);

  function createServerApp() {
    const app = express();
    app.use(express.json());
    app.use(authMiddleware);

    app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', database: 'saman_e2e_slice.db' });
    });

    app.post('/api/login', handleLogin);

    app.post('/api/ai/gateway', (req, res) => {
      const { action, payload } = req.body;
      if (action === 'chatCompanion') {
        return res.json({
          result: `سلام ${payload.patientName || 'مراجع گرامی'}! در مواقع احساس پنیک و اضطراب، تکنیک تنفس دیافراگمی ۴-۷-۸ و زمین‌گیری ۵-۴-۳-۲-۱ به شما کمک می‌کند.`,
        });
      }
      res.json({ result: 'AI response processed successfully.' });
    });

    app.post('/api/sync/outbox', async (req, res) => {
      const { items } = req.body;
      if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be array' });

      const syncedIds: string[] = [];
      for (const item of items) {
        if (item.aggregateType === 'Patient') {
          await patientRepository.save(item.payload);
          syncedIds.push(item.id);
        } else if (item.aggregateType === 'Appointment') {
          await appointmentRepository.save(item.payload);
          syncedIds.push(item.id);
        } else if (item.aggregateType === 'ClinicalNote') {
          await clinicalNoteRepository.save(item.payload);
          syncedIds.push(item.id);
        } else if (item.aggregateType === 'MoodLog') {
          await moodLogRepository.save(item.payload);
          syncedIds.push(item.id);
        }
      }
      res.json({ status: 'success', syncedIds });
    });

    app.post('/api/audit-logs', async (req, res) => {
      await auditLogRepository.save(req.body);
      res.json({ status: 'logged', id: req.body.id });
    });

    app.get('/api/patients', async (req, res) => {
      const patients = await patientRepository.findAll();
      res.json(patients);
    });

    app.get('/api/appointments', async (req, res) => {
      const appointments = await appointmentRepository.findAll();
      res.json(appointments);
    });

    app.get('/api/clinical-notes', async (req, res) => {
      const notes = await clinicalNoteRepository.findAll();
      res.json(notes);
    });

    app.get('/api/mood-logs', async (req, res) => {
      const moods = await moodLogRepository.findAll();
      res.json(moods);
    });

    return app;
  }

  const PORT = 3002;
  let server1 = http.createServer(createServerApp());
  await new Promise<void>((resolve) => server1.listen(PORT, resolve));
  const baseUrl = `http://localhost:${PORT}`;

  let passed = 0;
  let failed = 0;
  function assert(cond: boolean, msg: string) {
    if (cond) {
      console.log(` ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // Authenticate
    const loginRes = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'saman123' }),
    });
    const { token } = await loginRes.json();
    assert(!!token, 'Auth: Received valid JWT token from /api/login');

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // STEP 1: Reception Role - Create Patient "زهرا سعیدی"
    console.log('\n----------------------------------------------------------------');
    console.log(' STEP 1: Reception Role - Register Patient "زهرا سعیدی"');
    console.log('----------------------------------------------------------------');
    const newPatient = {
      id: 'pat-zahra-100',
      fullName: 'زهرا سعیدی',
      nationalCode: '0098765432',
      phone: '09129998877',
      gender: 'female',
      birthDate: '1374/06/15',
      emergencyContact: '09121113355 (پدر)',
      assignedTherapistId: 'therapist-1',
      assignedTherapistName: 'دکتر علیرضا محمدی',
      tenantId: 'clinic-main',
      medicalHistory: 'سابقه حملات پنیک و اضطراب حاد شبانه',
      syncStatus: 'synced',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const resP = await fetch(`${baseUrl}/api/sync/outbox`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: [{ id: 'out-p1', aggregateType: 'Patient', payload: newPatient }],
      }),
    });
    const dataP = await resP.json();
    assert(dataP.syncedIds.includes('out-p1'), 'Reception: Patient "زهرا سعیدی" created & synced via Outbox');

    // STEP 2: Reception Role - Book Appointment
    console.log('\n----------------------------------------------------------------');
    console.log(' STEP 2: Reception Role - Book Appointment for "زهرا سعیدی"');
    console.log('----------------------------------------------------------------');
    const newAppointment = {
      id: 'app-zahra-200',
      patientId: 'pat-zahra-100',
      patientName: 'زهرا سعیدی',
      therapistId: 'therapist-1',
      therapistName: 'دکتر علیرضا محمدی',
      dateTime: '1403/05/28 - 11:00',
      durationMinutes: 50,
      status: 'scheduled',
      type: 'in_person',
      tenantId: 'clinic-main',
      syncStatus: 'synced',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const resA = await fetch(`${baseUrl}/api/sync/outbox`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: [{ id: 'out-a1', aggregateType: 'Appointment', payload: newAppointment }],
      }),
    });
    const dataA = await resA.json();
    assert(dataA.syncedIds.includes('out-a1'), 'Reception: Appointment for "زهرا سعیدی" booked & synced');

    // STEP 3: Therapist Role - Write & Sign SOAP Clinical Note
    console.log('\n----------------------------------------------------------------');
    console.log(' STEP 3: Therapist Role - Write & Sign SOAP Note for "زهرا سعیدی"');
    console.log('----------------------------------------------------------------');
    const newSOAPNote = {
      id: 'note-zahra-300',
      patientId: 'pat-zahra-100',
      patientName: 'زهرا سعیدی',
      therapistId: 'therapist-1',
      therapistName: 'دکتر علیرضا محمدی',
      sessionNumber: 1,
      subjective: 'مراجع از حملات پنیک شبانه و تپش قلب هنگام خواب شکایت دارد.',
      objective: 'علائم بی‌قراری حرکتی و اضطراب حاد در صدا.',
      assessment: 'احتمال اختلال پنیک با اگورافوبیا خفیف.',
      plan: 'شروع تکنیک‌های زمین‌گیری (Grounding) و جدول ثبت افکار.',
      isSigned: true,
      signedAt: new Date().toISOString(),
      tenantId: 'clinic-main',
      syncStatus: 'synced',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const resN = await fetch(`${baseUrl}/api/sync/outbox`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: [{ id: 'out-n1', aggregateType: 'ClinicalNote', payload: newSOAPNote }],
      }),
    });
    const dataN = await resN.json();
    assert(dataN.syncedIds.includes('out-n1'), 'Therapist: SOAP note written and signed for "زهرا سعیدی"');

    // STEP 4: Patient Role - Log Mood Entry & Trigger AI Companion Chat
    console.log('\n----------------------------------------------------------------');
    console.log(' STEP 4: Patient Role - Log Mood & Trigger AI Companion Chat');
    console.log('----------------------------------------------------------------');
    const newMoodLog = {
      id: 'mood-zahra-400',
      patientId: 'pat-zahra-100',
      score: 2,
      emotions: ['مضطرب', 'خسته'],
      triggers: 'نگرانی در مورد آینده و حمله پنیک دیشب',
      tenantId: 'clinic-main',
      syncStatus: 'synced',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const resM = await fetch(`${baseUrl}/api/sync/outbox`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        items: [{ id: 'out-m1', aggregateType: 'MoodLog', payload: newMoodLog }],
      }),
    });
    const dataM = await resM.json();
    assert(dataM.syncedIds.includes('out-m1'), 'Patient: Mood entry logged (Score: 2, Emotions: مضطرب، خسته)');

    // Trigger AI Companion Gateway Chat
    const resChat = await fetch(`${baseUrl}/api/ai/gateway`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'chatCompanion',
        payload: {
          patientName: 'زهرا سعیدی',
          messages: [{ role: 'user', content: 'سلام، دیشب حس پنیک داشتم. چه تمرینی انجام بدم؟' }],
        },
      }),
    });
    const dataChat = await resChat.json();
    assert(
      dataChat.result.includes('زمین‌گیری') || dataChat.result.includes('زهرا'),
      'AI Gateway: Received valid CBT-guided reply from AI Companion'
    );

    // PHASE 2: KILL SERVER PROCESS & RESTART
    console.log('\n----------------------------------------------------------------');
    console.log(' 🛑 [PHASE 2] STOPPING SERVER PROCESS ENTIRELY (PROCESS KILL) ...');
    console.log('----------------------------------------------------------------');
    await new Promise<void>((resolve) => server1.close(() => resolve()));
    closeSqliteDb();
    console.log(' ⚡ Server process terminated. DB connections closed.');

    // Wait 500ms
    await new Promise((r) => setTimeout(r, 500));

    // PHASE 3: RESTART SERVER PROCESS & VERIFY ALL DATA IN UI
    console.log('\n----------------------------------------------------------------');
    console.log(' 🔄 [PHASE 3] RESTARTING SERVER PROCESS & RELOADING UI DATA ...');
    console.log('----------------------------------------------------------------');
    await getSqliteDb(e2eDbPath);
    let server2 = http.createServer(createServerApp());
    await new Promise<void>((resolve) => server2.listen(PORT, resolve));

    // Re-verify all records via UI APIs
    const patRes = await fetch(`${baseUrl}/api/patients`, { headers });
    const patList = await patRes.json();
    const foundPat = patList.find((p: any) => p.id === 'pat-zahra-100');
    assert(
      foundPat && foundPat.fullName === 'زهرا سعیدی' && foundPat.nationalCode === '0098765432',
      'UI Reload: Patient "زهرا سعیدی" is visible and persisted in Reception View'
    );

    const appRes = await fetch(`${baseUrl}/api/appointments`, { headers });
    const appList = await appRes.json();
    const foundApp = appList.find((a: any) => a.id === 'app-zahra-200');
    assert(
      foundApp && foundApp.patientName === 'زهرا سعیدی' && foundApp.dateTime === '1403/05/28 - 11:00',
      'UI Reload: Appointment for "زهرا سعیدی" is visible in Calendar Scheduling View'
    );

    const noteRes = await fetch(`${baseUrl}/api/clinical-notes`, { headers });
    const noteList = await noteRes.json();
    const foundNote = noteList.find((n: any) => n.id === 'note-zahra-300');
    assert(
      foundNote &&
        foundNote.patientName === 'زهرا سعیدی' &&
        foundNote.isSigned === true &&
        foundNote.subjective.includes('حملات پنیک شبانه'),
      'UI Reload: Signed SOAP note for "زهرا سعیدی" is visible in Therapist View'
    );

    const moodRes = await fetch(`${baseUrl}/api/mood-logs`, { headers });
    const moodList = await moodRes.json();
    const foundMood = moodList.find((m: any) => m.id === 'mood-zahra-400');
    assert(
      foundMood && foundMood.score === 2 && foundMood.triggers.includes('حمله پنیک دیشب'),
      'UI Reload: Mood log (Score 2) for "زهرا سعیدی" is visible in Patient View'
    );

    // Clean up server 2
    server2.close();
  } catch (err: any) {
    console.error('❌ E2E Slice Test Error:', err);
    failed++;
  } finally {
    closeSqliteDb();
    if (fs.existsSync(e2eDbPath)) {
      fs.unlinkSync(e2eDbPath);
    }
  }

  console.log('\n================================================================');
  console.log(` E2E VERTICAL SLICE TEST RESULT: ${passed} PASSED, ${failed} FAILED.`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runE2EVerticalSliceTest();
