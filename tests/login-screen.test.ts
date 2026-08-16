import 'reflect-metadata';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { NestFactory } from '@nestjs/core';
import { seedDatabase } from '../src/server/db/seed';
import { AppModule } from '../src/server/app.module';


async function runLoginScreenTests() {
  console.log('=============== STARTING LOGIN SCREEN & RBAC TESTS ===============\n');

  

  await seedDatabase();
  const app = await NestFactory.create(AppModule, { logger: false });
  const TEST_PORT = 3006;
  await app.listen(TEST_PORT, '0.0.0.0');
  const baseUrl = `http://localhost:${TEST_PORT}`;

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(` ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    // 1. Test unauthenticated API access or login with missing credentials
    const badLoginRes = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@saman.ir', password: 'wrong' }),
    });
    assert(badLoginRes.status === 401, 'Invalid login attempt correctly rejected with 401 Unauthorized');

    // 2. Test successful patient login
    const patientLoginRes = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'patient@saman.ir', password: 'saman123' }),
    });
    const patientData = await patientLoginRes.json();
    assert(patientLoginRes.ok && patientData.token && patientData.user.role === 'patient', 'Patient login succeeds and returns token & role patient');
    assert(patientData.user.isAdmin === false, 'Patient account is not admin');

    // 3. Test successful admin therapist login
    const adminLoginRes = await fetch(`${baseUrl}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'therapist@saman.ir', password: 'saman123' }),
    });
    const adminData = await adminLoginRes.json();
    assert(adminLoginRes.ok && adminData.token && adminData.user.isAdmin === true, 'Admin therapist login succeeds, returns token & isAdmin = true');

    // 4. Test accessing admin endpoint with admin token vs patient token
    const adminToken = adminData.token;
    const patientToken = patientData.token;

    const adminAccessAsAdmin = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAccessAsAdmin.status === 200, 'Admin user can access /api/users (200 OK)');

    const adminAccessAsPatient = await fetch(`${baseUrl}/api/users`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(adminAccessAsPatient.status === 403, 'Patient user is forbidden (403 Forbidden) from accessing admin /api/users');

    // 5. Test patient endpoint access with patient token
    const patientMoodAccess = await fetch(`${baseUrl}/api/mood-logs`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(patientMoodAccess.status === 200, 'Patient user can access patient mood-logs endpoint (200 OK)');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await app.close();
    
  }

  console.log(`\n================================================`);
  console.log(`LOGIN SCREEN & RBAC TEST RESULTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log(`================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runLoginScreenTests();
