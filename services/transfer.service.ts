import api from './api';
import type { TransferCalculateResponse, TransferExecuteResponse } from '@/types/api.types';

export interface RecipientCoin {
  serial: string;
  ownerFullName: string;
  currency: { id: string; code: string; symbol: string };
}

interface TransferPayload {
  paymentTool: { type: 'coin'; srcValue: string; destValue: string };
  amount: number;
  description?: string;
}

interface RawCalculateResp {
  transactionAmount: number;
  senderAmountPush: number;
  recipientAmountPush: number;
  commissionAmountPush: number;
  currency: { id: string; code: string; symbol: string };
}

interface RawExecuteResp {
  process: { id: string; type: string; status: string };
}

export const transferService = {
  async calculateTransfer(
    srcCoinSerial: string,
    destCoinSerial: string,
    amount: number
  ): Promise<TransferCalculateResponse> {
    const payload: TransferPayload = {
      paymentTool: { type: 'coin', srcValue: srcCoinSerial, destValue: destCoinSerial },
      amount,
    };
    const response = await api.post<RawCalculateResp>('/v1/transfers/calculate', payload);
    const d = response.data;
    return {
      transactionAmount: d.transactionAmount,
      senderAmountPush: d.senderAmountPush,
      recipientAmountPush: d.recipientAmountPush,
      commissionAmountPush: d.commissionAmountPush,
      currency: d.currency,
    };
  },

  /** Look up recipient wallets by email/phone login or by wallet serial. */
  async lookupRecipient(loginOrSerial: string): Promise<RecipientCoin[]> {
    const isSerial = /^\d+$/.test(loginOrSerial.trim());
    const body = isSerial
      ? { serial: loginOrSerial.trim() }
      : { login: loginOrSerial.trim() };
    const response = await api.post<{ coins: RecipientCoin[] }>('/v1/coins/view', body);
    return response.data.coins ?? [];
  },

  async executeTransfer(
    srcCoinSerial: string,
    destCoinSerial: string,
    amount: number,
    description?: string
  ): Promise<TransferExecuteResponse> {
    const payload: TransferPayload = {
      paymentTool: { type: 'coin', srcValue: srcCoinSerial, destValue: destCoinSerial },
      amount,
      description,
    };
    const response = await api.post<RawExecuteResp>('/v1/transfers', payload);
    return response.data.process;
  },
};
