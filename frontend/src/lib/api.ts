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
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: API_URL,
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

// Handle 401 globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
  login: (email: string, password: string) => {
    const form = new URLSearchParams();
    form.append('username', email);
    form.append('password', password);
    return apiClient.post<AuthTokens>('/auth/token', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  register: (data: RegisterData) =>
    apiClient.post<User>('/auth/register', data),

  me: () => apiClient.get<User>('/auth/me'),
};

// ─── Businesses ──────────────────────────────────────────────────────────────

export const businessApi = {
  list: () => apiClient.get<Business[]>('/businesses/'),
  create: (data: CreateBusinessData) =>
    apiClient.post<Business>('/businesses/', data),
  get: (id: string) => apiClient.get<Business>(`/businesses/${id}`),
  update: (id: string, data: Partial<CreateBusinessData>) =>
    apiClient.put<Business>(`/businesses/${id}`, data),
  delete: (id: string) => apiClient.delete(`/businesses/${id}`),
};

// ─── Financial Records ───────────────────────────────────────────────────────

export const financialApi = {
  list: (businessId: string) =>
    apiClient.get<FinancialRecord[]>(`/businesses/${businessId}/financials/`),
  create: (businessId: string, data: CreateRecordData) =>
    apiClient.post<FinancialRecord>(
      `/businesses/${businessId}/financials/`,
      data
    ),
  upload: (businessId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<FinancialRecord[]>(
      `/businesses/${businessId}/financials/upload`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },
};

// ─── Analysis ────────────────────────────────────────────────────────────────

export const analysisApi = {
  run: (businessId: string) =>
    apiClient.post<RiskAnalysis>(`/businesses/${businessId}/analysis/run`),
  list: (businessId: string) =>
    apiClient.get<RiskAnalysis[]>(`/businesses/${businessId}/analysis/`),
  get: (businessId: string, analysisId: string) =>
    apiClient.get<RiskAnalysis>(
      `/businesses/${businessId}/analysis/${analysisId}`
    ),
};

// ─── Reports ─────────────────────────────────────────────────────────────────

export const reportApi = {
  generate: (businessId: string) =>
    apiClient.post<Report>(`/businesses/${businessId}/reports/generate`),
  list: (businessId: string) =>
    apiClient.get<Report[]>(`/businesses/${businessId}/reports/`),
  downloadUrl: (businessId: string, reportId: string) =>
    `${API_URL}/businesses/${businessId}/reports/${reportId}/download`,
};
