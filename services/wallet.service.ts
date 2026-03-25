import api from './api';
import type { Coin, Currency } from '@/types/api.types';

interface CoinDto {
  id: string;
  serial: string;
  name?: string;
  amount: number;
  availableAmount: number;
  currency: { id?: string; code: string; symbol: string; name?: string };
  active: boolean;
  type: string;
  main?: boolean;
  organizationId: string;
}

interface CurrencyResp {
  id: string;
  code: string;
  symbol: string;
  name: string;
  active: boolean;
}

function mapCoin(c: CoinDto): Coin {
  return {
    coinSerial: c.serial,
    name: c.name ?? c.serial,
    type: c.type,
    balance: c.amount ?? 0,
    availableBalance: c.availableAmount ?? c.amount ?? 0,
    currency: c.currency as Currency,
    isMain: c.main ?? false,
  };
}

export const walletService = {
  async getCoins(organizationId: string): Promise<Coin[]> {
    const response = await api.get<{ coins: CoinDto[] }>(
      `/v1/organizations/${organizationId}/accounts`
    );
    return (response.data.coins ?? [])
      .filter((c) => c.active && c.type === 'client')
      .map(mapCoin);
  },

  async createWallet(organizationId: string, name: string, currencyId: string): Promise<Coin> {
    const response = await api.post<{ account: CoinDto }>(
      `/v1/organizations/${organizationId}/accounts`,
      { name, currencyId, type: 'client' }
    );
    return mapCoin(response.data.account);
  },

  async getCurrencies(): Promise<CurrencyResp[]> {
    const response = await api.get<{ records: CurrencyResp[] }>('/v1/currencies');
    return (response.data.records ?? []).filter((c) => c.active);
  },

  async renameWallet(serial: string, name: string): Promise<void> {
    await api.patch(`/v1/coins/${serial}`, { name });
  },

  async deleteWallet(serial: string): Promise<void> {
    await api.delete(`/v1/coins/${serial}`);
  },

  async setMainCoin(coinSerial: string): Promise<void> {
    await api.post('/v1/coins/set-main', { serial: coinSerial });
  },
};
