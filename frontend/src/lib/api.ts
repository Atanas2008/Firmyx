import axios from 'axios';
import { getAccessToken, clearTokens } from './auth';
import type {
  AuthTokens,
  Business,
  CreateBusinessData,
  CreateRecordData,
  FinancialRecord,
  RegisterData,
  RiskAnalysis,
  Report,
  User,
  ForecastResult,
  ForecastScenario,
  MultiScenarioForecast,
  ScenarioAdjustments,
  ScenarioResult,
  ScenarioPreset,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';
const API_BASE = `${API_URL.replace(/\/$/, '')}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally — skip redirect for auth endpoints (login/register)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? '';
    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthTokens>('/auth/login', { email, password }),
  register: (data: RegisterData) =>
    apiClient.post<User>('/auth/register', data),

  me: () => apiClient.get<User>('/auth/me'),
};

// ─── Businesses ──────────────────────────────────────────────────────────────

export const businessApi = {
  list: () => apiClient.get<Business[]>('/businesses'),
  create: (data: CreateBusinessData) =>
    apiClient.post<Business>('/businesses', data),
  get: (id: string) => apiClient.get<Business>(`/businesses/${id}`),
  update: (id: string, data: Partial<CreateBusinessData>) =>
    apiClient.put<Business>(`/businesses/${id}`, data),
  delete: (id: string) => apiClient.delete(`/businesses/${id}`),
};

// ─── Financial Records ───────────────────────────────────────────────────────

export const financialApi = {
  list: (businessId: string) =>
    apiClient.get<FinancialRecord[]>(`/businesses/${businessId}/records`),
  create: (businessId: string, data: CreateRecordData) =>
    apiClient.post<FinancialRecord>(`/businesses/${businessId}/records`, data),
  delete: (businessId: string, recordId: string) =>
    apiClient.delete(`/businesses/${businessId}/records/${recordId}`),
  upload: (businessId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<FinancialRecord[]>(
      `/businesses/${businessId}/records/upload`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
};

// ─── Analysis ────────────────────────────────────────────────────────────────

export const analysisApi = {
  run: (businessId: string) =>
    apiClient.post<RiskAnalysis>(`/businesses/${businessId}/analyze`),
  runAllMonths: (businessId: string) =>
    apiClient.post<RiskAnalysis[]>(`/businesses/${businessId}/analyze/all-months`),
  runCombined: (businessId: string) =>
    apiClient.post<RiskAnalysis>(`/businesses/${businessId}/analyze/combined`),
  list: (businessId: string) =>
    apiClient.get<RiskAnalysis[]>(`/businesses/${businessId}/analysis`),
  get: (businessId: string, analysisId: string) =>
    apiClient.get<RiskAnalysis>(
      `/businesses/${businessId}/analysis/${analysisId}`
    ),
  forecast: (businessId: string, months: number = 12, scenario: ForecastScenario = 'baseline') =>
    apiClient.post<ForecastResult>(`/businesses/${businessId}/forecast`, { months, scenario }),
  forecastAllScenarios: (businessId: string, months: number = 12) =>
    apiClient.post<MultiScenarioForecast>(`/businesses/${businessId}/forecast/all-scenarios`, { months }),
  scenarioPresets: (businessId: string) =>
    apiClient.get<ScenarioPreset[]>(`/businesses/${businessId}/scenario/presets`),
  scenario: (businessId: string, adjustments: ScenarioAdjustments) =>
    apiClient.post<ScenarioResult>(`/businesses/${businessId}/scenario`, adjustments),
};

// ─── Reports ─────────────────────────────────────────────────────────────────

export const reportApi = {
  generate: (businessId: string, analysisId?: string) =>
    apiClient.post<Report>(`/businesses/${businessId}/reports`, {
      analysis_id: analysisId,
    }),
  list: (businessId: string) =>
    apiClient.get<Report[]>(`/businesses/${businessId}/reports`),
  download: (businessId: string, reportId: string) =>
    apiClient.get(`/businesses/${businessId}/reports/${reportId}/download`, {
      responseType: 'blob',
    }),
  downloadUrl: (businessId: string, reportId: string) =>
    `${API_BASE}/businesses/${businessId}/reports/${reportId}/download`,
};

// ─── AI Chat ─────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
  tokens_used: number | null;
}

export const chatApi = {
  send: (businessId: string, message: string, history: ChatMessage[]) =>
    apiClient.post<ChatResponse>(`/businesses/${businessId}/chat`, {
      message,
      history,
    }),
};

// ── Translation ────────────────────────────────────────────

export interface TranslateResponse {
  translations: string[];
}

export const translateApi = {
  translate: (texts: string[], target_language: string) =>
    apiClient.post<TranslateResponse>('/translate', {
      texts,
      target_language,
    }),
};
