import { DashboardSummary, PaymentRecord, DecisionRecord } from '../types';
import { mockDashboardSummary, mockDetailedPayments } from './mockData';

const delay = (ms: number = 200) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    await delay(180);
    return JSON.parse(JSON.stringify(mockDashboardSummary));
  },

  async getPayments(): Promise<{ items: PaymentRecord[]; total: number }> {
    await delay(150);
    return {
      items: JSON.parse(JSON.stringify(mockDetailedPayments)),
      total: mockDetailedPayments.length,
    };
  },

  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    await delay(150);
    const found = mockDetailedPayments.find((p) => p.id === id);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  },

  async getDecisions(): Promise<{ items: DecisionRecord[]; total: number }> {
    await delay(150);
    return {
      items: JSON.parse(JSON.stringify(mockDashboardSummary.recentDecisions)),
      total: mockDashboardSummary.recentDecisions.length,
    };
  },
};
