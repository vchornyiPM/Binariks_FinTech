import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { UserProfile } from '@/types/api.types';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  organizationId: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string, organizationId: string, user: UserProfile) => Promise<void>;
  updateTokens: (token: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserProfile) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  organizationId: null,
  user: null,
  isAuthenticated: false,

  login: async (token, refreshToken, organizationId, user) => {
    await SecureStore.setItemAsync('jwt', token);
    await SecureStore.setItemAsync('jwt_refresh', refreshToken);
    await SecureStore.setItemAsync('org_id', organizationId);
    set({ token, refreshToken, organizationId, user, isAuthenticated: true });
  },

  updateTokens: async (token, refreshToken) => {
    await SecureStore.setItemAsync('jwt', token);
    await SecureStore.setItemAsync('jwt_refresh', refreshToken);
    set({ token, refreshToken });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('jwt');
    await SecureStore.deleteItemAsync('jwt_refresh');
    await SecureStore.deleteItemAsync('org_id');
    set({ token: null, refreshToken: null, organizationId: null, user: null, isAuthenticated: false });
  },

  setUser: (user) => set({ user }),

  hydrate: async () => {
    const token = await SecureStore.getItemAsync('jwt');
    const refreshToken = await SecureStore.getItemAsync('jwt_refresh');
    const organizationId = await SecureStore.getItemAsync('org_id');
    if (token) {
      set({ token, refreshToken, organizationId, isAuthenticated: true });
    }
  },
}));
