import { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { authService } from '@/services/auth.service';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { login } = useAuthStore();
  const { showToast } = useUIStore();

  const [email, setEmail] = useState(process.env.EXPO_PUBLIC_DEMO_EMAIL ?? '');
  const [password, setPassword] = useState(process.env.EXPO_PUBLIC_DEMO_PASSWORD ?? '');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      showToast('Please enter email and password.', 'error');
      return;
    }
    setLoading(true);
    try {
      const tokens = await authService.login(email, password);
      await login(tokens.token, tokens.refreshToken, tokens.organizationId, { id: tokens.user.id, email, name: tokens.user.name });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { message?: string; error?: string } } };
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      const status = err.response?.status;
      const apiMessage = err.response?.data?.message ?? err.response?.data?.error;
      const fallback = status === 401 ? 'Invalid email or password.' : 'Sign in failed. Please try again.';
      showToast(apiMessage ?? fallback, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.inner, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primaryBlue }]}>
            <Text style={styles.logoText}>SDK</Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>SDK.Finance</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Mobile Banking Demo</Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.cardBg }]}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.textSecondary}
            placeholder="your@email.com"
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.cardBg }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={colors.textSecondary}
            placeholder="Password"
          />

          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: loading ? colors.border : colors.primaryBlue },
              loading && styles.buttonDisabled,
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <View style={[styles.demoBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.demoText, { color: colors.textSecondary }]}>Demo Mode</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: { color: '#fff', fontSize: 22, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 15, fontWeight: '400' },
  form: { gap: 8 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 4, marginTop: 8 },
  input: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 17,
    marginBottom: 4,
  },
  button: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  footer: { alignItems: 'center', marginTop: 48 },
  demoBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  demoText: { fontSize: 13 },
});
