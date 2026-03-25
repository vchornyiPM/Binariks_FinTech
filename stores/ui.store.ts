import { create } from 'zustand';
import type { ToastConfig } from '@/types/api.types';

interface UIState {
  toast: ToastConfig | null;
  showToast: (message: string, type?: ToastConfig['type']) => void;
  hideToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toast: null,
  showToast: (message, type = 'info') => set({ toast: { message, type } }),
  hideToast: () => set({ toast: null }),
}));
