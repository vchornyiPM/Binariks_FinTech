import { create } from 'zustand';
import type { Transaction, TransactionFilters } from '@/types/api.types';

interface TxState {
  transactions: Transaction[];
  filters: TransactionFilters;
  total: number;
  loading: boolean;
  fetchTransactions: () => Promise<void>;
  loadMore: () => Promise<void>;
  setFilters: (filters: Partial<TransactionFilters>) => void;
  reset: () => void;
}

const defaultFilters: TransactionFilters = {
  pageNumber: 0,
  pageSize: 20,
};

export const useTxStore = create<TxState>((set, get) => ({
  transactions: [],
  filters: defaultFilters,
  total: 0,
  loading: false,

  fetchTransactions: async () => {
    set({ loading: true });
    try {
      const { transactionsService } = await import('@/services/transactions.service');
      const { filters } = get();
      const result = await transactionsService.getTransactions({ ...filters, pageNumber: 0 });
      set({ transactions: result.items, total: result.total, loading: false, filters: { ...filters, pageNumber: 0 } });
    } catch (err) {
      set({ loading: false });
      const { useUIStore } = await import('@/stores/ui.store');
      const msg = (err as any)?.response?.data?.message ?? (err as any)?.message ?? 'Failed to load transactions';
      useUIStore.getState().showToast(msg, 'error');
    }
  },

  loadMore: async () => {
    const { transactions, filters, total, loading } = get();
    if (loading || transactions.length >= total) return;
    set({ loading: true });
    try {
      const { transactionsService } = await import('@/services/transactions.service');
      const nextPage = filters.pageNumber + 1;
      const result = await transactionsService.getTransactions({ ...filters, pageNumber: nextPage });
      set({ transactions: [...transactions, ...result.items], loading: false, filters: { ...filters, pageNumber: nextPage } });
    } catch {
      set({ loading: false });
    }
  },

  setFilters: (newFilters) => {
    const { filters } = get();
    // Clear transactions list whenever filters change so the list refreshes
    set({ filters: { ...filters, ...newFilters, pageNumber: 0 }, transactions: [] });
  },

  reset: () => set({ transactions: [], filters: defaultFilters, total: 0, loading: false }),
}));
