import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/auth.store';
import { useWalletStore } from '@/stores/wallet.store';
import { useTxStore } from '@/stores/tx.store';
import { useFxStore } from '@/stores/fx.store';
import { useUIStore } from '@/stores/ui.store';
import { profileService } from '@/services/profile.service';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { UserProfile, KycStatus } from '@/types/api.types';

const KYC_COLORS: Record<KycStatus, { bg: string; text: string; label: string }> = {
  VERIFIED:    { bg: '#D1FAE5', text: '#065F46', label: 'Verified' },
  PENDING:     { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
  NOT_STARTED: { bg: '#F3F4F6', text: '#6B7280', label: 'Not verified' },
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { user, logout } = useAuthStore();
  const { reset: resetWallet } = useWalletStore();
  const { reset: resetTx } = useTxStore();
  const { reset: resetFx } = useFxStore();
  const { showToast } = useUIStore();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Change password modal
  const [showPassword, setShowPassword] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  // Demo: 5-tap avatar easter egg
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tabBarOffset = Platform.OS === 'ios' ? 83 : 60;

  const loadProfile = useCallback(async () => {
    try {
      const [profileData, kyc] = await Promise.all([
        profileService.getProfile(),
        profileService.getKycStatus(),
      ]);
      setProfile(profileData);
      setKycStatus(kyc);
    } catch {
      // Fallback to auth store user
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  }, [loadProfile]);

  const handleChangePassword = useCallback(async () => {
    if (!currentPwd || !newPwd) {
      showToast('Fill in all fields.', 'warning');
      return;
    }
    if (newPwd !== confirmPwd) {
      showToast('New passwords do not match.', 'warning');
      return;
    }
    if (newPwd.length < 8) {
      showToast('Password must be at least 8 characters.', 'warning');
      return;
    }
    setChangingPwd(true);
    try {
      await profileService.changePassword(currentPwd, newPwd);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast('Password changed.', 'success');
      setShowPassword(false);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to change password.';
      showToast(msg, 'error');
    } finally {
      setChangingPwd(false);
    }
  }, [currentPwd, newPwd, confirmPwd, showToast]);

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          resetWallet();
          resetTx();
          resetFx();
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }, [logout, router, resetWallet, resetTx, resetFx]);

  const handleAvatarTap = useCallback(() => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    if (tapCount.current >= 5) {
      tapCount.current = 0;
      if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Demo Mode', 'SDK.Finance Mobile Banking demo.');
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);
    }
  }, []);

  const displayProfile = profile ?? user;
  const displayName = profile?.firstName && profile?.lastName
    ? `${profile.firstName} ${profile.lastName}`
    : profile?.name ?? user?.name ?? 'User';
  const displayEmail = profile?.email ?? user?.email ?? '';
  const kycConfig = kycStatus ? KYC_COLORS[kycStatus] : null;

  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + tabBarOffset }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
            tintColor={colors.primaryBlue} colors={[colors.primaryBlue]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Profile</Text>
        </View>

        {/* Avatar + Info */}
        <View style={[styles.profileCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <TouchableOpacity onPress={handleAvatarTap} activeOpacity={0.8}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryBlue }]}>
              <Text style={styles.avatarText}>{initials || '?'}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{displayName}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{displayEmail}</Text>

            {kycConfig && (
              <TouchableOpacity
                style={[styles.kycBadge, { backgroundColor: kycConfig.bg }]}
                onPress={() => router.push('/kyc/index' as any)}
                activeOpacity={0.75}
              >
                <Text style={[styles.kycText, { color: kycConfig.text }]}>KYC: {kycConfig.label}</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: colors.primaryBlue + '15' }]}
            onPress={() => router.push('/profile/edit-person' as any)}
            activeOpacity={0.75}
          >
            <IconSymbol name="pencil" size={14} color={colors.primaryBlue} />
            <Text style={[styles.editBtnText, { color: colors.primaryBlue }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Info rows */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <InfoRow label="Email" value={displayEmail} colors={colors} />
          {profile?.phone ? (
            <InfoRow label="Phone" value={profile.phone} colors={colors} />
          ) : null}
          {profile?.type ? (
            <InfoRow label="Account type" value={profile.type.charAt(0).toUpperCase() + profile.type.slice(1)} colors={colors} />
          ) : null}
          <InfoRow
            label="Account ID"
            value={displayProfile?.id ? `#${displayProfile.id.slice(0, 8)}` : '—'}
            colors={colors}
            last
          />
        </View>

        {/* Actions */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/invoices/index' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#1A56DB15' }]}>
                <IconSymbol name="doc.text.fill" size={16} color={colors.primaryBlue} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Invoices</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/cards/index' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#1A56DB15' }]}>
                <IconSymbol name="creditcard.fill" size={16} color={colors.primaryBlue} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>My Cards</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/bank-accounts/index' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#1A56DB15' }]}>
                <IconSymbol name="building.columns.fill" size={16} color={colors.primaryBlue} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Bank Accounts</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/top-up/bank' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#10823B15' }]}>
                <IconSymbol name="arrow.down.circle.fill" size={16} color={colors.successGreen} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Top Up via Bank</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/withdrawal/bank' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#9B1C1C15' }]}>
                <IconSymbol name="arrow.up.circle.fill" size={16} color={colors.errorRed} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Withdraw via Bank</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/profile/edit-person' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#1A56DB15' }]}>
                <IconSymbol name="person.fill" size={16} color={colors.primaryBlue} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Edit Personal Info</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/profile/edit-address' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#1A56DB15' }]}>
                <IconSymbol name="house.fill" size={16} color={colors.primaryBlue} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Edit Address</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/kyc/index' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#1A56DB15' }]}>
                <IconSymbol name="checkmark.shield.fill" size={16} color={colors.primaryBlue} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Identity Verification</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => router.push('/profile/master-pin' as any)}
            activeOpacity={0.75}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#1A56DB15' }]}>
                <IconSymbol name="lock.shield.fill" size={16} color={colors.primaryBlue} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Master PIN</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: colors.border }]}
            onPress={() => setShowPassword(true)}
            activeOpacity={0.75}
          >
            <View style={styles.actionRowLeft}>
              <View style={[styles.actionIcon, { backgroundColor: '#1A56DB15' }]}>
                <IconSymbol name="lock.fill" size={16} color={colors.primaryBlue} />
              </View>
              <Text style={[styles.actionLabel, { color: colors.textPrimary }]}>Change Password</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Sign out */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.errorRed }]}
          onPress={handleLogout}
          activeOpacity={0.75}
        >
          <Text style={[styles.logoutText, { color: colors.errorRed }]}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.demoBadgeContainer}>
          <View style={[styles.demoBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.demoText, { color: colors.textSecondary }]}>SDK.Finance Demo v1.0</Text>
          </View>
        </View>
      </ScrollView>

      {/* Change Password Modal */}
      <Modal visible={showPassword} transparent animationType="slide" onRequestClose={() => setShowPassword(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowPassword(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Change Password</Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Current password</Text>
            <TextInput
              style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.cardBg }]}
              value={currentPwd} onChangeText={setCurrentPwd}
              placeholder="Current password" placeholderTextColor={colors.textSecondary}
              secureTextEntry autoFocus
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>New password</Text>
            <TextInput
              style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.cardBg }]}
              value={newPwd} onChangeText={setNewPwd}
              placeholder="Min. 8 characters" placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Confirm new password</Text>
            <TextInput
              style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.cardBg }]}
              value={confirmPwd} onChangeText={setConfirmPwd}
              placeholder="Repeat new password" placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: changingPwd ? colors.border : colors.primaryBlue }]}
              onPress={handleChangePassword}
              disabled={changingPwd}
              activeOpacity={0.85}
            >
              {changingPwd
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Update Password</Text>
              }
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  colors: typeof Colors.light;
  last?: boolean;
}

function InfoRow({ label, value, colors, last }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.border }, last && styles.infoRowLast]}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, marginBottom: 24 },
  title: { fontSize: 34, fontWeight: '700' },
  profileCard: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    padding: 24, alignItems: 'center', marginBottom: 16, gap: 12,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  profileInfo: { alignItems: 'center', gap: 4 },
  profileName: { fontSize: 20, fontWeight: '700' },
  profileEmail: { fontSize: 15 },
  kycBadge: { marginTop: 6, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  kycText: { fontSize: 13, fontWeight: '600' },
  editBtn: {
    position: 'absolute', top: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  editBtnText: { fontSize: 13, fontWeight: '600' },
  section: {
    marginHorizontal: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden', marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 15 },
  infoValue: { fontSize: 15, fontWeight: '500', flex: 1, textAlign: 'right', marginLeft: 16 },
  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  actionRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 15 },
  logoutBtn: {
    marginHorizontal: 16, height: 52, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  logoutText: { fontSize: 17, fontWeight: '600' },
  demoBadgeContainer: { alignItems: 'center', marginBottom: 16 },
  demoBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
  demoText: { fontSize: 12 },
  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  fieldInput: {
    height: 48, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, fontSize: 16, marginBottom: 16,
  },
  primaryBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
