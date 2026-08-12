import {
  IAIGateway,
  SessionSummaryRequest,
  SessionSummaryResponse,
  MoodAnalysisRequest,
  MoodAnalysisResponse,
  AIChatRequest,
} from '../../contracts/ai-gateway';
import { ensureAuthenticated } from '../auth/auth-token-store';

export class AIGatewayClient implements IAIGateway {
  private static instance: AIGatewayClient;

  private constructor() {}

  public static getInstance(): AIGatewayClient {
    if (!AIGatewayClient.instance) {
      AIGatewayClient.instance = new AIGatewayClient();
    }
    return AIGatewayClient.instance;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await ensureAuthenticated();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  async summarizeSession(request: SessionSummaryRequest): Promise<SessionSummaryResponse> {
    const headers = await this.getHeaders();
    const res = await fetch('/api/ai/gateway', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'summarizeSession', payload: request }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'AI Gateway summarizeSession failed');
    }

    const data = await res.json();
    return data.result;
  }

  async analyzeMoodTrends(request: MoodAnalysisRequest): Promise<MoodAnalysisResponse> {
    const headers = await this.getHeaders();
    const res = await fetch('/api/ai/gateway', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'analyzeMoodTrends', payload: request }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'AI Gateway analyzeMoodTrends failed');
    }

    const data = await res.json();
    return data.result;
  }

  async chatCompanion(request: AIChatRequest): Promise<string> {
    const headers = await this.getHeaders();
    const res = await fetch('/api/ai/gateway', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'chatCompanion', payload: request }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'AI Gateway chatCompanion failed');
    }

    const data = await res.json();
    return data.result;
  }
}

export const aiGatewayClient = AIGatewayClient.getInstance();
