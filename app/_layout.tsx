import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth.store';
import { Toast } from '@/components/Toast';

function AuthGate() {
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();
  const { isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  // Hydrate once on mount
  useEffect(() => {
    useAuthStore.getState().hydrate().then(() => setHydrated(true));
  }, []);

  // Only navigate after navigator is mounted AND token hydration is done
  useEffect(() => {
    if (!navigationState?.key || !hydrated) return;

    const inAuthGroup = segments[0] === '(auth)';
    const authed = useAuthStore.getState().isAuthenticated;

    if (!authed && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (authed && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [navigationState?.key, hydrated, isAuthenticated, segments, router]);

  return null;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthGate />
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="send-money" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="transaction/[id]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="card/[id]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="profile/edit-person" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="profile/edit-address" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="invoices/index" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="invoices/create" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="invoices/[identifier]" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="analytics" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="cards/index" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="bank-accounts/index" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="top-up/bank" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="withdrawal/bank" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
      <Toast />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
