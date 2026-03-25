import api from './api';
import type { ExchangeCalculateResponse } from '@/types/api.types';

interface ExchangeCalcApiResponse {
  topUpAmount: number;
  withdrawAmount: number;
  exchangeRate: {
    id: string;
    rate: number;
    inCurrency: { id: string; code: string; symbol: string };
    outCurrency: { id: string; code: string; symbol: string };
  };
}

interface ExchangeExecuteApiResponse {
  process: { id: string; type: string; status: string };
}

function mapCalcResponse(data: ExchangeCalcApiResponse, sentAmount: number): ExchangeCalculateResponse {
  return {
    toAmount: data.topUpAmount,
    fee: Math.max(0, data.withdrawAmount - sentAmount),
    rate: data.exchangeRate.rate,
  };
}

export const exchangeService = {
  /** Fetch live rate for a coin pair by calculating a 1-unit exchange. */
  async getLiveRate(inCoinSerial: string, outCoinSerial: string): Promise<number> {
    const response = await api.post<ExchangeCalcApiResponse>('/v1/exchange/calculator', {
      inCoinSerial,
      outCoinSerial,
      exchangeType: 'sell',
      amount: 1,
    });
    return response.data.exchangeRate.rate;
  },

  async calculateExchange(
    inCoinSerial: string,
    outCoinSerial: string,
    amount: number
  ): Promise<ExchangeCalculateResponse> {
    const response = await api.post<ExchangeCalcApiResponse>('/v1/exchange/calculator', {
      inCoinSerial,
      outCoinSerial,
      exchangeType: 'sell',
      amount,
    });
    return mapCalcResponse(response.data, amount);
  },

  async executeExchange(
    inCoinSerial: string,
    outCoinSerial: string,
    amount: number
  ): Promise<{ id: string }> {
    const response = await api.post<ExchangeExecuteApiResponse>('/v1/exchange', {
      inCoinSerial,
      outCoinSerial,
      exchangeType: 'sell',
      amount,
    });
    return response.data.process;
  },
};
