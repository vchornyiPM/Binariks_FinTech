import api from './api';

export interface OutflowCategory {
  categoryId: string;
  sum: number;
  percentage: number;
  numberOfOperations: number;
  currencyCode: string;
  currencySymbol: string;
}

export interface OutflowsResponse {
  records: OutflowCategory[];
}

export interface FundsFlowResponse {
  inflowSum: number;
  outflowSum: number;
  currencyCode: string;
  currencySymbol: string;
}

export interface CoinOverview {
  serial: string;
  name: string;
  balance: number;
  availableBalance: number;
  currency: { code: string; symbol: string };
}

export interface BalanceOverviewResponse {
  records: CoinOverview[];
}

export const reportingService = {
  async getOutflows(params: { from: string; to: string; currency?: string }): Promise<OutflowsResponse> {
    const { data } = await api.get('/v1/reporting/coins/outflows', { params });
    return data;
  },

  async getFundsFlow(params: { from: string; to: string; currency?: string }): Promise<FundsFlowResponse> {
    const { data } = await api.get('/v1/reporting/coins/funds-flows', { params });
    return data;
  },

  async getBalanceOverview(params?: { currency?: string }): Promise<BalanceOverviewResponse> {
    const { data } = await api.get('/v1/reporting/coins', { params });
    return data;
  },
};
