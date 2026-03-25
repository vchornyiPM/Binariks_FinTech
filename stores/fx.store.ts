import { create } from 'zustand';

interface FxState {
  rates: Record<string, number>;
  rateHistory: number[];
  lastUpdated: Date | null;
  loading: boolean;
  fetchRates: (inCoinSerial: string, outCoinSerial: string) => Promise<number | null>;
  reset: () => void;
}

export const useFxStore = create<FxState>((set, get) => ({
  rates: {},
  rateHistory: [],
  lastUpdated: null,
  loading: false,

  fetchRates: async (inCoinSerial, outCoinSerial) => {
    set({ loading: true });
    try {
      const { exchangeService } = await import('@/services/exchange.service');
      const rate = await exchangeService.getLiveRate(inCoinSerial, outCoinSerial);
      const key = `${inCoinSerial}_${outCoinSerial}`;
      const { rateHistory } = get();
      const newHistory = [...rateHistory, rate].slice(-10);
      set({
        rates: { ...get().rates, [key]: rate },
        rateHistory: newHistory,
        lastUpdated: new Date(),
        loading: false,
      });
      return rate;
    } catch {
      set({ loading: false });
      return null;
    }
  },

  reset: () => set({ rates: {}, rateHistory: [], lastUpdated: null, loading: false }),
}));
