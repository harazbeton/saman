import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

const SUPPORTED_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.7-flash', 'gemini-flash-latest'];

@Injectable()
export class AiGatewayService {
  private async callGeminiWithRetry(
    ai: GoogleGenAI,
    contents: string,
    responseJson = false
  ): Promise<string | null> {
    for (const model of SUPPORTED_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: responseJson ? { responseMimeType: 'application/json' } : undefined,
        });
        if (response?.text) {
          return response.text;
        }
      } catch (err: any) {
        console.warn(`Gemini generation with ${model} failed (${err.status || err.message}). Trying fallback model.`);
      }
    }
    return null;
  }

  async execute(action: string, payload: any = {}) {
    const apiKey = process.env.GEMINI_API_KEY;

    try {
      if (action === 'chatCompanion') {
        if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `شما یک دستیار هوشمند و همدل سلامت روان (CBT Companion) در پلتفرم درمانگاه سامان هستید.
مراجع: ${payload.patientName || 'مراجع'}
زمینه: ${payload.context || ''}
آخرین پیام مراجع: ${payload.messages?.[payload.messages.length - 1]?.content || ''}
پاسخ شما باید خلاصه، همدلانه و مبتنی بر تکنیک‌های شناخت‌درمانی باشد (حداکثر ۲ الی ۳ جمله).`;

          const text = await this.callGeminiWithRetry(ai, prompt, false);
          if (text) {
            return { result: text, source: 'gemini' };
          }
        }

        return {
          result: `متوجهم ${payload.patientName || 'عزیز'}. احساسات و تجربیاتی که بیان کردی کاملاً قابل درک هستند. انجام تمرینات تنفس و زمین‌گیری می‌تواند به آرامش شما کمک کند.`,
          source: 'fallback',
        };
      }

      if (action === 'summarizeSession') {
        if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `به عنوان متخصص ارشد روانشناسی بالینی، این جلسه درمان را تحلیل و خلاصه‌سازی کن:
نام مراجع: ${payload.patientName || 'نامشخص'}
نوت‌های جلسه: ${payload.sessionNotes || ''}
خروجی باید یک شیء JSON با ساختار زیر باشد:
{
  "summary": "خلاصه جلسه بالینی",
  "keyInsights": ["نکته کلیدی ۱", "نکته کلیدی ۲"],
  "suggestedHomework": ["تکلیف ۱", "تکلیف ۲"],
  "riskAssessment": "low"
}`;

          const text = await this.callGeminiWithRetry(ai, prompt, true);
          if (text) {
            try {
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              const jsonStr = jsonMatch ? jsonMatch[0] : text;
              const parsed = JSON.parse(jsonStr);
              if (parsed && typeof parsed === 'object') {
                return { result: parsed, source: 'gemini' };
              }
            } catch (pErr) {
              console.warn('Failed to parse Gemini JSON output, falling back:', pErr);
            }
          }
        }

        return {
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
          source: 'fallback',
        };
      }

      if (action === 'analyzeMoodTrends') {
        if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey.trim() !== '') {
          const ai = new GoogleGenAI({ apiKey });
          const prompt = `تحلیل روندهای خلق و خو برای مراجع:
داده‌های ثبت خلق: ${JSON.stringify(payload.moodLogs || [])}
خروجی JSON:
{
  "summary": "...",
  "trend": "improving",
  "recommendations": ["..."]
}`;

          const text = await this.callGeminiWithRetry(ai, prompt, true);
          if (text) {
            try {
              const jsonMatch = text.match(/\{[\s\S]*\}/);
              const jsonStr = jsonMatch ? jsonMatch[0] : text;
              const parsed = JSON.parse(jsonStr);
              if (parsed && typeof parsed === 'object') {
                return { result: parsed, source: 'gemini' };
              }
            } catch (pErr) {
              console.warn('Failed to parse Gemini mood trend output, falling back:', pErr);
            }
          }
        }

        return {
          result: {
            summary: 'روند کلی خلق پایدار همراه با نوسانات ملایم گزارش شده است.',
            trend: 'stable',
            recommendations: ['ادامه ثبت روزانه خلق', 'تمرین توجه‌آگاهی'],
          },
          source: 'fallback',
        };
      }

      throw new HttpException(
        { error: `Unknown action: ${action}` },
        HttpStatus.BAD_REQUEST
      );
    } catch (err: any) {
      if (err instanceof HttpException) {
        throw err;
      }
      console.error('AI Gateway Error:', err);
      throw new HttpException(
        { error: err.message || 'AI Gateway execution failed' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
