import api from './api';

export interface BankAccountDetails {
  fullName: string;
  bankAccountNumber?: string;
  iban?: string;
  bicOrSwift?: string;
}

export interface BankAccount {
  id: string;
  details: BankAccountDetails;
  status: 'pending' | 'rejected' | 'approved';
  coinSerial: string;
  isDefault: boolean;
  createdAt: string;
}

export interface FeeResult {
  transactionAmount: number;
  senderAmountPush: number;
  recipientAmountPush: number;
  commissionAmountPush: number;
  currency: { code: string; symbol: string };
}

interface BankAccountDto {
  id: string;
  details: BankAccountDetails;
  status: string;
  coinSerial?: string;
  isDefault?: boolean;
  createdAt: string;
}

function mapAccount(dto: BankAccountDto): BankAccount {
  return {
    id: dto.id,
    details: dto.details,
    status: (dto.status as BankAccount['status']) ?? 'pending',
    coinSerial: dto.coinSerial ?? '',
    isDefault: dto.isDefault ?? false,
    createdAt: dto.createdAt,
  };
}

export const bankAccountsService = {
  async getBankAccounts(): Promise<BankAccount[]> {
    const { data } = await api.get<{ records: BankAccountDto[] }>('/v1/my/bank-accounts');
    return (data.records ?? []).map(mapAccount);
  },

  async addBankAccount(
    coinSerial: string,
    params: { fullName: string; iban?: string; bankAccountNumber?: string }
  ): Promise<BankAccount> {
    const { data } = await api.post<{ bankAccountDetails: BankAccountDto }>(
      `/v1/my/bank-accounts/coin/${coinSerial}/with-bank`,
      params
    );
    return mapAccount(data.bankAccountDetails);
  },

  async deleteBankAccount(bankAccountId: string): Promise<void> {
    await api.delete(`/v1/my/bank-accounts/${bankAccountId}`);
  },

  async calculateTopUp(coinSerial: string, amount: number): Promise<FeeResult> {
    const { data } = await api.post<FeeResult>('/v1/bank-top-ups/calculate', { coinSerial, amount });
    return data;
  },

  async createTopUpRequest(coinSerial: string, amount: number, bankAccountId: string): Promise<void> {
    await api.post('/v1/bank-top-ups/create-request', { coinSerial, amount, bankAccountId });
  },

  async calculateWithdrawal(coinSerial: string, amount: number): Promise<FeeResult> {
    const { data } = await api.post<FeeResult>('/v1/bank-withdrawals/calculate', { coinSerial, amount });
    return data;
  },

  async createWithdrawalRequest(coinSerial: string, amount: number, bankAccountId: string): Promise<void> {
    await api.post('/v1/bank-withdrawals/create-request', { coinSerial, amount, bankAccountId });
  },
};
