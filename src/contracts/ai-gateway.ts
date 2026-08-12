export interface SessionSummaryRequest {
  patientName: string;
  chiefComplaint: string;
  sessionNotes: string;
  previousContext?: string;
}

export interface SessionSummaryResponse {
  summary: string;
  keyInsights: string[];
  suggestedHomework: string[];
  riskAssessment: 'low' | 'moderate' | 'high';
}

export interface MoodAnalysisRequest {
  patientName: string;
  recentMoodLogs: Array<{
    score: number;
    emotions: string[];
    note?: string;
    date: string;
  }>;
}

export interface MoodAnalysisResponse {
  trendOverview: string;
  recommendations: string[];
  copingStrategies: string[];
}

export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface AIChatRequest {
  patientName: string;
  messages: AIChatMessage[];
  context?: string;
}

export interface IAIGateway {
  summarizeSession(request: SessionSummaryRequest): Promise<SessionSummaryResponse>;
  analyzeMoodTrends(request: MoodAnalysisRequest): Promise<MoodAnalysisResponse>;
  chatCompanion(request: AIChatRequest): Promise<string>;
}
