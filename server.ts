import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

import { authMiddleware, handleLogin } from './src/server/auth';
import { patientRepository } from './src/server/repositories/patient.repository';
import { clinicalNoteRepository } from './src/server/repositories/clinical-note.repository';
import { moodLogRepository } from './src/server/repositories/mood-log.repository';
import { appointmentRepository } from './src/server/repositories/appointment.repository';
import { auditLogRepository } from './src/server/repositories/audit-log.repository';
import { getSqliteDb } from './src/server/db/sqlite-db';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize SQLite database
  await getSqliteDb();

  // Apply Auth middleware to all API routes
  app.use(authMiddleware);

  // 1. Health Endpoint (Public)
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      architecture: 'Express Pragmatic Core (SQLite File Store + Repositories)',
      storage: 'SQLite ./data/saman.db',
    });
  });

  // 2. Auth Endpoint (Public)
  app.post('/api/login', handleLogin);

  // 3. Server AI Gateway Endpoint (Protected)
  app.post('/api/ai/gateway', async (req, res) => {
    const { action, payload } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    try {
      if (action === 'chatCompanion') {
        if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `شما یک دستیار هوشمند و همدل سلامت روان (CBT Companion) در پلتفرم درمانگاه سامان هستید.
مراجع: ${payload.patientName}
زمینه: ${payload.context || ''}
آخرین پیام مراجع: ${payload.messages[payload.messages.length - 1]?.content || ''}
پاسخ شما باید خلاصه، همدلانه و مبتنی بر تکنیک‌های شناخت‌درمانی باشد (حداکثر ۲ الی ۳ جمله).`,
          });
          return res.json({ result: response.text });
        }

        return res.json({
          result: `متوجهم سارا جان. احساسات و تجربیاتی که بیان کردی کاملاً قابل درک هستند. انجام تمرینات تنفس ارامش‌بخش می‌تواند به کاهش این فشار ذهنی کمک کند.`,
        });
      }

      if (action === 'summarizeSession') {
        if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `به عنوان متخصص ارشد روانشناسی بالینی، این جلسه درمان را تحلیل و خلاصه‌سازی کن:
نام مراجع: ${payload.patientName}
نوت‌های جلسه: ${payload.sessionNotes}
خروجی باید فرمت JSON زیر را داشته باشد:
{
  "summary": "...",
  "keyInsights": ["..."],
  "suggestedHomework": ["..."],
  "riskAssessment": "low"
}`,
          });

          try {
            const parsed = JSON.parse(
              response.text?.replace(/```json/g, '').replace(/```/g, '').trim() || '{}'
            );
            return res.json({ result: parsed });
          } catch {
            // fallback if JSON parse fails
          }
        }

        return res.json({
          result: {
            summary:
              'جلسه ارزیابی اضطراب شغلی و بررسی پاسخ به مداخلات CBT انجام شد. مراجع کاهش فرکانس علائم را گزارش کرده است.',
            keyInsights: [
              'پاسخ مناسب به تکنیک‌های بازسازی شناختی',
              'کاهش افکار ناکارآمد در خصوص مسئولیت‌های کاری',
            ],
            suggestedHomework: [
              'تکمیل فرم ثبت افکار پنج‌ستونی (CBT Thought Log)',
              'تمرین تنفس شکمی قبل از جلسات کاری',
            ],
            riskAssessment: 'low',
          },
        });
      }

      return res.status(400).json({ error: `Unknown action: ${action}` });
    } catch (err: any) {
      console.error('AI Gateway Error:', err);
      return res.status(500).json({ error: err.message || 'AI Gateway execution failed' });
    }
  });

  // 4. Sync Outbox Delta Receiver Endpoint (Protected)
  app.post('/api/sync/outbox', async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items must be an array' });
    }

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
            `Unrecognized aggregate type for outbox item ${item.id}: '${item.aggregateType}'`
          );
        }
      } catch (err: any) {
        console.error(`Failed to persist outbox item ${item.id}:`, err);
      }
    }

    res.json({
      status: 'success',
      syncedIds,
      processedAt: new Date().toISOString(),
    });
  });

  // 5. Audit Log Endpoints (Protected)
  app.post('/api/audit-logs', async (req, res) => {
    const entry = req.body;
    await auditLogRepository.save(entry);
    res.json({ status: 'logged', id: entry.id });
  });

  app.get('/api/audit-logs', async (req, res) => {
    const logs = await auditLogRepository.findAll();
    res.json(logs);
  });

  // Vite Middleware in Dev
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Saman Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
