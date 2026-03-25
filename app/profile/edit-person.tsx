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
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUIStore } from '@/stores/ui.store';
import { profileService } from '@/services/profile.service';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function EditPersonScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { showToast } = useUIStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    profileService.getProfile().then((p) => {
      setFirstName(p.firstName ?? '');
      setLastName(p.lastName ?? '');
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    if (!firstName.trim() && !lastName.trim()) {
      showToast('Enter at least a first or last name.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await profileService.updatePerson({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast('Personal info updated.', 'success');
      router.back();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to update personal info.';
      showToast(msg, 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSaving(false);
    }
  }, [firstName, lastName, showToast, router]);

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
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Personal Info</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={colors.primaryBlue} />
            : <Text style={[styles.saveBtn, { color: colors.primaryBlue }]}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {loading ? (
          <ActivityIndicator color={colors.primaryBlue} style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>First name</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary, borderBottomColor: colors.border }]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="First name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                returnKeyType="next"
              />
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Last name</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary }]}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Last name"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Your name is used for identification and appears on transfers.
            </Text>
          </>
        )}
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
