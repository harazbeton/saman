import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getSqliteDb, closeSqliteDb, persistDbToDisk, decryptBuffer } from '../src/server/db/sqlite-db';
import { patientRepository } from '../src/server/repositories/patient.repository';
import { clinicalNoteRepository } from '../src/server/repositories/clinical-note.repository';

async function runDatabaseEncryptionTests() {
  console.log('================================================================');
  console.log(' STARTING SQLITE AES-256-GCM DATABASE ENCRYPTION AT REST TESTS ');
  console.log('================================================================\n');

  const encDbPath = path.join(process.cwd(), 'data', 'saman_encrypted_test.db');

  if (fs.existsSync(encDbPath)) {
    fs.unlinkSync(encDbPath);
  }

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
    // 1. Initialize SQLite database instance
    console.log('[1/4] Initializing encrypted SQLite DB instance...');
    const db = await getSqliteDb(encDbPath);

    // Save test clinical records
    await patientRepository.save({
      id: 'pat-enc-101',
      fullName: 'مریم حسینی (اطلاعات محرمانه مراجع)',
      nationalCode: '1234567890',
    });

    await clinicalNoteRepository.save({
      id: 'note-enc-201',
      patientId: 'pat-enc-101',
      subjective: 'محتوای بسیار محرمانه یادداشت بالینی SOAP جهت ارزیابی رمزنگاری دیسک',
    });

    persistDbToDisk(db, encDbPath);

    // 2. Read raw binary file from disk
    console.log('[2/4] Inspecting raw binary database file on disk...');
    const diskBuffer = fs.readFileSync(encDbPath);

    const isPlainHeader =
      diskBuffer.length >= 15 && diskBuffer.subarray(0, 15).toString() === 'SQLite format 3';
    assert(!isPlainHeader, 'Database file on disk does NOT contain unencrypted SQLite header ("SQLite format 3")');

    const fileText = diskBuffer.toString('utf8');
    const containsPlainPatientName = fileText.includes('مریم حسینی');
    const containsPlainNoteContent = fileText.includes('محتوای بسیار محرمانه');
    const containsPlainTableNames = fileText.includes('clinical_notes');

    assert(
      !containsPlainPatientName && !containsPlainNoteContent && !containsPlainTableNames,
      'Raw binary file on disk contains NO plain text patient data, clinical notes, or table names (AES-256-GCM verified)'
    );

    // 3. Re-open DB from encrypted disk file and verify data decryption
    console.log('[3/4] Testing database recovery & decryption from encrypted file on disk...');
    closeSqliteDb();
    await getSqliteDb(encDbPath);

    const retrievedPatient = await patientRepository.findById('pat-enc-101');
    const retrievedNote = await clinicalNoteRepository.findById('note-enc-201');

    assert(
      retrievedPatient?.fullName === 'مریم حسینی (اطلاعات محرمانه مراجع)' &&
        retrievedNote?.subjective.includes('محتوای بسیار محرمانه'),
      'Decrypted DB successfully restored plain patient records and clinical notes'
    );

    // 4. Test decryption failure with corrupted or altered payload
    console.log('[4/4] Testing integrity & auth tag verification failure on tampered file...');
    const tamperedBuffer = Buffer.from(diskBuffer);
    tamperedBuffer[30] ^= 0xff; // Corrupt ciphertext byte

    let decryptionFailed = false;
    try {
      decryptBuffer(tamperedBuffer);
    } catch {
      decryptedBuffer: decryptionFailed = true;
    }
    assert(decryptionFailed, 'AES-256-GCM Auth Tag correctly rejects tampered/corrupted encrypted file');

  } catch (err: any) {
    console.error('❌ Encryption test error:', err);
    failed++;
  } finally {
    closeSqliteDb();
    if (fs.existsSync(encDbPath)) {
      fs.unlinkSync(encDbPath);
    }
  }

  console.log('\n================================================================');
  console.log(` ENCRYPTION TEST RESULTS: ${passed} PASSED, ${failed} FAILED.`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
}

runDatabaseEncryptionTests();
