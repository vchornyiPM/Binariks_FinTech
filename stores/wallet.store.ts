import { create } from 'zustand';
import type { Coin } from '@/types/api.types';

interface WalletState {
  coins: Coin[];
  selectedCoin: Coin | null;
  loading: boolean;
  fetchCoins: () => Promise<void>;
  createWallet: (name: string, currencyId: string) => Promise<void>;
  renameWallet: (coinSerial: string, name: string) => Promise<void>;
  deleteWallet: (coinSerial: string) => Promise<void>;
  setMainWallet: (coinSerial: string) => Promise<void>;
  setSelectedCoin: (coin: Coin) => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  coins: [],
  selectedCoin: null,
  loading: false,

  fetchCoins: async () => {
    set({ loading: true });
    try {
      const { walletService } = await import('@/services/wallet.service');
      const { useAuthStore } = await import('@/stores/auth.store');
      const organizationId = useAuthStore.getState().organizationId;
      if (!organizationId) throw new Error('No organization ID');
      const coins = await walletService.getCoins(organizationId);
      set({ coins, selectedCoin: coins[0] ?? null, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createWallet: async (name, currencyId) => {
    const { walletService } = await import('@/services/wallet.service');
    const { useAuthStore } = await import('@/stores/auth.store');
    const organizationId = useAuthStore.getState().organizationId;
    if (!organizationId) throw new Error('No organization ID');
    const newCoin = await walletService.createWallet(organizationId, name, currencyId);
    const { coins } = get();
    set({ coins: [...coins, newCoin] });
  },

  renameWallet: async (coinSerial, name) => {
    const { walletService } = await import('@/services/wallet.service');
    await walletService.renameWallet(coinSerial, name);
    const { coins } = get();
    set({ coins: coins.map((c) => c.coinSerial === coinSerial ? { ...c, name } : c) });
  },

  deleteWallet: async (coinSerial) => {
    const { walletService } = await import('@/services/wallet.service');
    await walletService.deleteWallet(coinSerial);
    const { coins, selectedCoin } = get();
    const updated = coins.filter((c) => c.coinSerial !== coinSerial);
    set({
      coins: updated,
      selectedCoin: selectedCoin?.coinSerial === coinSerial ? (updated[0] ?? null) : selectedCoin,
    });
  },

  setMainWallet: async (coinSerial) => {
    const { walletService } = await import('@/services/wallet.service');
    await walletService.setMainCoin(coinSerial);
    const { coins } = get();
    set({ coins: coins.map((c) => ({ ...c, isMain: c.coinSerial === coinSerial })) });
  },

  setSelectedCoin: (coin) => set({ selectedCoin: coin }),

  reset: () => set({ coins: [], selectedCoin: null, loading: false }),
}));
