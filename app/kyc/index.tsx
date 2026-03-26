import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUIStore } from '@/stores/ui.store';
import { profileService } from '@/services/profile.service';
import { kycService, VERIFICATION_ITEMS, type KycVerificationItem, type KycDocStatus } from '@/services/kyc.service';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { KycStatus } from '@/types/api.types';

const DOC_STATUS_CONFIG: Record<KycDocStatus | 'not_started', { icon: string; color: string; label: string }> = {
  not_started:    { icon: 'circle',                   color: '#6B7280', label: 'Not submitted' },
  uploaded:       { icon: 'clock.fill',               color: '#B45309', label: 'Uploaded' },
  in_verification:{ icon: 'clock.fill',               color: '#B45309', label: 'Under review' },
  approved:       { icon: 'checkmark.circle.fill',    color: '#10823B', label: 'Approved' },
  rejected:       { icon: 'xmark.circle.fill',        color: '#9B1C1C', label: 'Rejected' },
};

const KYC_BANNER: Record<KycStatus, { bg: string; text: string; icon: string; label: string; sub: string }> = {
  VERIFIED:    { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark.seal.fill', label: 'Verified',     sub: 'Your identity has been verified.' },
  PENDING:     { bg: '#FEF3C7', text: '#92400E', icon: 'clock.badge.fill',    label: 'In Review',    sub: 'Your documents are being reviewed.' },
  NOT_STARTED: { bg: '#EFF6FF', text: '#1D4ED8', icon: 'person.crop.circle.badge.exclamationmark', label: 'Not Verified', sub: 'Submit your documents to get verified.' },
};

export default function KycScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { showToast } = useUIStore();

  const [kycStatus, setKycStatus] = useState<KycStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<KycVerificationItem | null>(null);

  const sheetRef = useRef<BottomSheet>(null);

  const load = useCallback(async () => {
    try {
      const status = await profileService.getKycStatus();
      setKycStatus(status);
    } catch {
      // keep null
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openUpload = useCallback((item: KycVerificationItem) => {
    setSelectedItem(item);
    sheetRef.current?.expand();
  }, []);

  const handleSimulateUpload = useCallback(() => {
    if (!selectedItem) return;
    Alert.alert(
      'Upload Document',
      `In a production app this would open your camera or photo library to upload your ${selectedItem.label}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Simulate Upload',
          onPress: async () => {
            setUploading(true);
            sheetRef.current?.close();
            // Simulate network delay for demo
            await new Promise((r) => setTimeout(r, 1200));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            showToast(`${selectedItem.label} submitted for review!`, 'success');
            setUploading(false);
            // Refresh KYC status
            load();
          },
        },
      ]
    );
  }, [selectedItem, showToast, load]);

  const banner = kycStatus ? KYC_BANNER[kycStatus] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Identity Verification</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryBlue} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
              tintColor={colors.primaryBlue} colors={[colors.primaryBlue]} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* KYC status banner */}
          {banner && (
            <View style={[styles.banner, { backgroundColor: banner.bg }]}>
              <IconSymbol name={banner.icon as any} size={28} color={banner.text} />
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: banner.text }]}>{banner.label}</Text>
                <Text style={[styles.bannerSub, { color: banner.text }]}>{banner.sub}</Text>
              </View>
            </View>
          )}

          {/* Checklist */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Required Documents</Text>
          <View style={[styles.listCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {VERIFICATION_ITEMS.map((item, i) => {
              const sc = DOC_STATUS_CONFIG.not_started; // simplified — no doc-level tracking
              const isLast = i === VERIFICATION_ITEMS.length - 1;
              return (
                <View
                  key={item.id}
                  style={[styles.itemRow, { borderBottomColor: colors.border }, isLast && { borderBottomWidth: 0 }]}
                >
                  <View style={[styles.itemIcon, { backgroundColor: colors.primaryBlue + '15' }]}>
                    <IconSymbol name={item.icon as any} size={18} color={colors.primaryBlue} />
                  </View>
                  <View style={styles.itemCenter}>
                    <Text style={[styles.itemLabel, { color: colors.textPrimary }]}>{item.label}</Text>
                    <Text style={[styles.itemDesc, { color: colors.textSecondary }]}>{item.description}</Text>
                    <View style={styles.itemStatus}>
                      <IconSymbol name={sc.icon as any} size={12} color={sc.color} />
                      <Text style={[styles.itemStatusText, { color: sc.color }]}>{sc.label}</Text>
                    </View>
                  </View>
                  {kycStatus !== 'VERIFIED' && (
                    <TouchableOpacity
                      style={[styles.uploadBtn, { backgroundColor: colors.primaryBlue }]}
                      onPress={() => openUpload(item)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.uploadBtnText}>Upload</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>

          {/* Info card */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <IconSymbol name="info.circle.fill" size={18} color={colors.primaryBlue} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Documents are reviewed by our compliance team within 1-2 business days. You'll be notified when your verification is complete.
            </Text>
          </View>

          {uploading && (
            <View style={styles.uploadingRow}>
              <ActivityIndicator color={colors.primaryBlue} />
              <Text style={[styles.uploadingText, { color: colors.textSecondary }]}>Submitting document…</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Upload bottom sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['45%']}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
        )}
        backgroundStyle={{ backgroundColor: colors.cardBg }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{selectedItem?.label}</Text>
          <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>{selectedItem?.description}</Text>

          <TouchableOpacity
            style={[styles.sheetOption, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={handleSimulateUpload}
            activeOpacity={0.8}
          >
            <IconSymbol name="camera.fill" size={22} color={colors.primaryBlue} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>Take a Photo</Text>
              <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>Use your camera</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sheetOption, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={handleSimulateUpload}
            activeOpacity={0.8}
          >
            <IconSymbol name="photo.fill" size={22} color={colors.primaryBlue} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>Choose from Library</Text>
              <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>Pick from your photos</Text>
            </View>
            <IconSymbol name="chevron.right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
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

  body: { padding: 20, gap: 16 },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 16, padding: 16,
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 16, fontWeight: '700' },
  bannerSub: { fontSize: 13, marginTop: 2 },

  sectionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

  listCard: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  itemCenter: { flex: 1, gap: 2 },
  itemLabel: { fontSize: 15, fontWeight: '600' },
  itemDesc: { fontSize: 12, lineHeight: 16 },
  itemStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  itemStatusText: { fontSize: 11, fontWeight: '600' },

  uploadBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  uploadBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },

  uploadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  uploadingText: { fontSize: 14 },

  // Bottom sheet
  sheet: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetSub: { fontSize: 14, marginTop: -4 },
  sheetOption: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 14, borderWidth: 1, padding: 16,
  },
  sheetOptionTitle: { fontSize: 15, fontWeight: '600' },
  sheetOptionSub: { fontSize: 12, marginTop: 2 },
});
