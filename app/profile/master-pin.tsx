import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUIStore } from '@/stores/ui.store';
import { profileService } from '@/services/profile.service';
import { IconSymbol } from '@/components/ui/icon-symbol';

type PinStep = 'enter' | 'confirm';

const PIN_LENGTH = 4;

const PAD_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', '⌫'],
];

function PinDots({ value, length }: { value: string; length: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            value.length > i ? styles.dotFilled : styles.dotEmpty,
          ]}
        />
      ))}
    </View>
  );
}

export default function MasterPinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { showToast } = useUIStore();

  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [step, setStep] = useState<PinStep>('enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    profileService.getMasterPin()
      .then((result) => setIsActive(result.active))
      .catch(() => setIsActive(false))
      .finally(() => setLoadingStatus(false));
  }, []);

  const currentPin = step === 'enter' ? pin : confirmPin;
  const setCurrentPin = step === 'enter' ? setPin : setConfirmPin;

  const handleKey = useCallback((key: string) => {
    if (key === '⌫') {
      setError('');
      setCurrentPin((p) => p.slice(0, -1));
      return;
    }
    if (!key) return;
    setCurrentPin((p) => {
      if (p.length >= PIN_LENGTH) return p;
      const next = p + key;
      if (next.length === PIN_LENGTH && step === 'enter') {
        // Auto-advance to confirm step
        setTimeout(() => {
          setStep('confirm');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }, 80);
      }
      return next;
    });
  }, [step, setCurrentPin]);

  const handleSave = useCallback(async () => {
    if (pin !== confirmPin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      return;
    }
    setSaving(true);
    try {
      await profileService.setMasterPin(pin);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast('Master PIN set successfully!', 'success');
      router.back();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to set PIN.';
      showToast(msg, 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setPin('');
      setConfirmPin('');
      setStep('enter');
    } finally {
      setSaving(false);
    }
  }, [pin, confirmPin, showToast, router]);

  // Auto-submit when confirm PIN is full
  useEffect(() => {
    if (step === 'confirm' && confirmPin.length === PIN_LENGTH) {
      handleSave();
    }
  }, [confirmPin, step, handleSave]);

  const handleBack = useCallback(() => {
    if (step === 'confirm') {
      setStep('enter');
      setConfirmPin('');
      setError('');
    } else {
      router.back();
    }
  }, [step, router]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name={step === 'confirm' ? 'chevron.left' : 'xmark'} size={20} color={colors.primaryBlue} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Master PIN</Text>
        <View style={{ width: 28 }} />
      </View>

      {loadingStatus ? (
        <ActivityIndicator color={colors.primaryBlue} style={{ marginTop: 60 }} />
      ) : (
        <View style={[styles.body, { paddingBottom: insets.bottom + 16 }]}>
          {/* Status badge if already set */}
          {isActive && (
            <View style={[styles.activeBadge, { backgroundColor: colors.successGreen + '15' }]}>
              <IconSymbol name="checkmark.shield.fill" size={16} color={colors.successGreen} />
              <Text style={[styles.activeBadgeText, { color: colors.successGreen }]}>PIN is currently active</Text>
            </View>
          )}

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={[styles.instructionTitle, { color: colors.textPrimary }]}>
              {step === 'enter'
                ? isActive ? 'Enter new PIN' : 'Set your PIN'
                : 'Confirm your PIN'}
            </Text>
            <Text style={[styles.instructionSub, { color: colors.textSecondary }]}>
              {step === 'enter'
                ? 'Choose a 4-digit PIN to secure your transactions'
                : 'Enter the same PIN again to confirm'}
            </Text>
          </View>

          {/* PIN dots */}
          <PinDots value={currentPin} length={PIN_LENGTH} />

          {/* Error */}
          {!!error && (
            <Text style={[styles.errorText, { color: colors.errorRed }]}>{error}</Text>
          )}

          {/* Saving spinner */}
          {saving && (
            <ActivityIndicator color={colors.primaryBlue} style={{ marginTop: 8 }} />
          )}

          {/* Number pad */}
          <View style={styles.pad}>
            {PAD_KEYS.map((row, ri) => (
              <View key={ri} style={styles.padRow}>
                {row.map((key, ki) => (
                  <TouchableOpacity
                    key={`${ri}-${ki}`}
                    style={[
                      styles.padKey,
                      key === '' && { opacity: 0 },
                      key === '⌫' && styles.padKeyBackspace,
                    ]}
                    onPress={() => handleKey(key)}
                    disabled={!key || saving}
                    activeOpacity={0.6}
                  >
                    {key === '⌫' ? (
                      <IconSymbol name="delete.left" size={22} color={colors.textPrimary} />
                    ) : (
                      <Text style={[styles.padKeyText, { color: colors.textPrimary }]}>{key}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },

  body: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingTop: 32, paddingHorizontal: 20 },

  activeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  activeBadgeText: { fontSize: 13, fontWeight: '600' },

  instructions: { alignItems: 'center', gap: 6 },
  instructionTitle: { fontSize: 22, fontWeight: '700' },
  instructionSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  dotsRow: { flexDirection: 'row', gap: 20, alignItems: 'center' },
  dot: { width: 18, height: 18, borderRadius: 9 },
  dotEmpty: { borderWidth: 2, borderColor: '#D1D5DB', backgroundColor: 'transparent' },
  dotFilled: { backgroundColor: '#1A56DB' },

  errorText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  pad: { width: '100%', maxWidth: 300, gap: 8 },
  padRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  padKey: {
    flex: 1, height: 68, borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center', justifyContent: 'center',
  },
  padKeyBackspace: { backgroundColor: 'transparent' },
  padKeyText: { fontSize: 26, fontWeight: '400' },
});
