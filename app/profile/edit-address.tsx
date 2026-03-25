import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUIStore } from '@/stores/ui.store';
import { profileService } from '@/services/profile.service';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function EditAddressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { showToast } = useUIStore();

  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [zip, setZip] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!country.trim() && !city.trim() && !street.trim() && !zip.trim()) {
      showToast('Enter at least one address field.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await profileService.updateAddress({
        country: country.trim() || undefined,
        city: city.trim() || undefined,
        street: street.trim() || undefined,
        zip: zip.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast('Address updated.', 'success');
      router.back();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update address.';
      showToast(msg, 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSaving(false);
    }
  }, [country, city, street, zip, showToast, router]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Address</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={colors.primaryBlue} />
            : <Text style={[styles.saveBtn, { color: colors.primaryBlue }]}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {([
            { label: 'Country', value: country, setter: setCountry, placeholder: 'e.g. United States', caps: 'words' as const },
            { label: 'City',    value: city,    setter: setCity,    placeholder: 'e.g. New York',      caps: 'words' as const },
            { label: 'Street',  value: street,  setter: setStreet,  placeholder: 'e.g. 123 Main St',   caps: 'sentences' as const },
            { label: 'ZIP / Postal code', value: zip, setter: setZip, placeholder: 'e.g. 10001', caps: 'characters' as const },
          ] as const).map((field, idx, arr) => (
            <View key={field.label}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{field.label}</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary }]}
                value={field.value}
                onChangeText={field.setter}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textSecondary}
                autoCapitalize={field.caps}
                returnKeyType={idx < arr.length - 1 ? 'next' : 'done'}
                onSubmitEditing={idx === arr.length - 1 ? handleSave : undefined}
              />
              {idx < arr.length - 1 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
            </View>
          ))}
        </View>

        <Text style={[styles.hint, { color: colors.textSecondary }]}>
          Your address may be required for compliance and KYC verification.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  saveBtn: { fontSize: 17, fontWeight: '600' },
  body: { padding: 20, gap: 12 },
  section: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  fieldLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldInput: { fontSize: 16, paddingVertical: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  hint: { fontSize: 13, lineHeight: 18, paddingHorizontal: 4 },
});
