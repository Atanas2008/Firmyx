import axios from 'axios';
import { clearTokens } from './auth';
import type {
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

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000');
const API_BASE = `${API_URL.replace(/\/$/, '')}/api`;

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Send httpOnly cookies with every request
});

// Handle 401 globally — skip redirect for auth endpoints and /me probe
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? '';
    const isAuthCheck = url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/me');
    if (error.response?.status === 401 && !isAuthCheck) {
      clearTokens();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('firmyx:auth-expired'));
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<User>('/auth/login', { email, password }),
  register: (data: RegisterData) =>
    apiClient.post<User>('/auth/register', data),

  me: () => apiClient.get<User>('/auth/me'),

  logout: () => apiClient.post('/auth/logout'),

  deleteAccount: () => apiClient.delete('/auth/account'),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.put('/auth/password', {
      current_password: currentPassword,
      new_password: newPassword,
    }),
};

// ─── Businesses ──────────────────────────────────────────────────────────────

export const businessApi = {
  list: (skip = 0, limit = 100) =>
    apiClient.get<{ items: Business[]; total: number; skip: number; limit: number; has_more: boolean }>(
      '/businesses', { params: { skip, limit } }
    ),
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
    apiClient.get<{ items: FinancialRecord[]; total: number; skip: number; limit: number; has_more: boolean }>(`/businesses/${businessId}/records`),
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
    apiClient.get<{ items: RiskAnalysis[]; total: number; skip: number; limit: number; has_more: boolean }>(`/businesses/${businessId}/analysis`),
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
    apiClient.get<{ items: Report[]; total: number; skip: number; limit: number; has_more: boolean }>(`/businesses/${businessId}/reports`),
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

// ─── Admin ───────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  analyses_count: number;
  is_unlocked: boolean;
  created_at: string;
}

export interface PaginatedAdminUsers {
  users: AdminUser[];
  total: number;
}

function adminHeaders() {
  const secret = typeof window !== 'undefined'
    ? localStorage.getItem('firmyx-admin-secret') ?? ''
    : '';
  return { 'X-Admin-Secret': secret };
}

export const adminApi = {
  listUsers: (skip = 0, limit = 50, search?: string) =>
    apiClient.get<PaginatedAdminUsers>('/admin/users', {
      params: { skip, limit, ...(search ? { search } : {}) },
      headers: adminHeaders(),
    }),
  deleteUser: (userId: string) =>
    apiClient.delete(`/admin/users/${userId}`, { headers: adminHeaders() }),
  changeEmail: (userId: string, newEmail: string) =>
    apiClient.put(`/admin/users/${userId}/email`, { new_email: newEmail }, { headers: adminHeaders() }),
  resetPassword: (userId: string, newPassword: string) =>
    apiClient.post(`/admin/users/${userId}/reset-password`, { new_password: newPassword }, { headers: adminHeaders() }),
  deactivateUser: (userId: string) =>
    apiClient.put(`/admin/users/${userId}/deactivate`, {}, { headers: adminHeaders() }),
  activateUser: (userId: string) =>
    apiClient.put(`/admin/users/${userId}/activate`, {}, { headers: adminHeaders() }),
  unlockUser: (userId: string) =>
    apiClient.put(`/admin/users/${userId}/unlock`, {}, { headers: adminHeaders() }),
  lockUser: (userId: string) =>
    apiClient.put(`/admin/users/${userId}/lock`, {}, { headers: adminHeaders() }),
};
