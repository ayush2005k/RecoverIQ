import axios from 'axios';
import {
  DashboardSummary,
  PaymentRecord,
  DecisionRecord,
  ScoreResponse,
  DecideResponse,
  ExecuteResponse,
  MetricsResponse,
} from '../types';
import { mockService } from './mockService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const FORCE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export const api = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    if (FORCE_MOCK) return mockService.getDashboardSummary();
    const response = await apiClient.get<DashboardSummary>('/dashboard/summary');
    return response.data;
  },

  async getPayments(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    priority?: string;
    failure_reason?: string;
    payment_method?: string;
  }): Promise<{ items: PaymentRecord[]; total: number }> {
    if (FORCE_MOCK) return mockService.getPayments();
    const response = await apiClient.get<{ items: PaymentRecord[]; total: number }>('/payments', {
      params,
    });
    return response.data;
  },

  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    if (FORCE_MOCK) return mockService.getPaymentById(id);
    const response = await apiClient.get<PaymentRecord>(`/payments/${id}`);
    return response.data;
  },

  async scorePayment(paymentId: string): Promise<ScoreResponse> {
    const response = await apiClient.post<ScoreResponse>(`/payments/${paymentId}/score`);
    return response.data;
  },

  async decidePayment(paymentId: string): Promise<DecideResponse> {
    const response = await apiClient.post<DecideResponse>(`/payments/${paymentId}/decide`);
    return response.data;
  },

  async executeSimulation(paymentId: string, actionType?: string): Promise<ExecuteResponse> {
    const response = await apiClient.post<ExecuteResponse>(
      `/payments/${paymentId}/execute`,
      { action_type: actionType },
      { params: actionType ? { action_type: actionType } : undefined }
    );
    return response.data;
  },

  async getDecisions(params?: {
    skip?: number;
    limit?: number;
    action?: string;
    policy_status?: string;
    execution_status?: string;
  }): Promise<{ items: DecisionRecord[]; total: number }> {
    if (FORCE_MOCK) return mockService.getDecisions();
    const response = await apiClient.get<{ items: DecisionRecord[]; total: number }>('/decisions', {
      params,
    });
    return response.data;
  },

  async getMetrics(): Promise<MetricsResponse> {
    const response = await apiClient.get<MetricsResponse>('/metrics');
    return response.data;
  },

  async seedData(count: number = 3000, seed: number = 42) {
    const response = await apiClient.post('/data/seed', null, {
      params: { count, seed },
    });
    return response.data;
  },
};
