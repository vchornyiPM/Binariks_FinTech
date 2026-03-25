import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWalletStore } from '@/stores/wallet.store';
import { useUIStore } from '@/stores/ui.store';
import { bankAccountsService, type BankAccount } from '@/services/bank-accounts.service';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Coin } from '@/types/api.types';

function maskIban(iban: string): string {
  if (iban.length <= 8) return iban;
  return `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}`;
}

function statusConfig(status: string) {
  switch (status) {
    case 'approved': return { bg: '#D1FAE5', text: '#065F46', label: 'Approved' };
    case 'pending':  return { bg: '#FEF3C7', text: '#92400E', label: 'Pending' };
    case 'rejected': return { bg: '#FEE2E2', text: '#991B1B', label: 'Rejected' };
    default:         return { bg: '#F3F4F6', text: '#6B7280', label: status };
  }
}

interface AccountRowProps {
  account: BankAccount;
  colors: typeof Colors.light;
  onDelete: () => void;
}

function AccountRow({ account, colors, onDelete }: AccountRowProps) {
  const sc = statusConfig(account.status);
  const display = account.details.iban
    ? maskIban(account.details.iban)
    : account.details.bankAccountNumber ?? '—';

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.rowIcon, { backgroundColor: colors.primaryBlue + '15' }]}>
        <IconSymbol name="building.columns.fill" size={18} color={colors.primaryBlue} />
      </View>
      <View style={styles.rowCenter}>
        <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>
          {account.details.fullName}
        </Text>
        <Text style={[styles.rowIban, { color: colors.textSecondary }]} numberOfLines={1}>
          {display}
        </Text>
        {account.isDefault && (
          <Text style={[styles.rowDefault, { color: colors.primaryBlue }]}>Default</Text>
        )}
      </View>
      <View style={styles.rowRight}>
        <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
          <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
        </View>
        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="trash" size={16} color={colors.errorRed} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function BankAccountsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { coins } = useWalletStore();
  const { showToast } = useUIStore();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add form
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(coins[0] ?? null);
  const [fullName, setFullName] = useState('');
  const [iban, setIban] = useState('');

  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = ['70%'];

  const load = useCallback(async () => {
    try {
      const result = await bankAccountsService.getBankAccounts();
      setAccounts(result);
    } catch {
      showToast('Failed to load bank accounts.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleAdd = useCallback(async () => {
    if (!selectedCoin) return;
    if (!fullName.trim()) { showToast('Full name is required.', 'warning'); return; }
    if (!iban.trim()) { showToast('IBAN is required.', 'warning'); return; }

    setSaving(true);
    try {
      const newAccount = await bankAccountsService.addBankAccount(selectedCoin.coinSerial, {
        fullName: fullName.trim(),
        iban: iban.trim().toUpperCase(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setAccounts((prev) => [newAccount, ...prev]);
      showToast('Bank account added!', 'success');
      sheetRef.current?.close();
      setFullName('');
      setIban('');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to add bank account.';
      showToast(msg, 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSaving(false);
    }
  }, [selectedCoin, fullName, iban, showToast]);

  const handleDelete = useCallback((account: BankAccount) => {
    Alert.alert(
      'Remove Bank Account',
      `Remove "${account.details.fullName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await bankAccountsService.deleteBankAccount(account.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              setAccounts((prev) => prev.filter((a) => a.id !== account.id));
              showToast('Bank account removed.', 'success');
            } catch (err: any) {
              const msg = err?.response?.data?.message ?? 'Failed to remove bank account.';
              showToast(msg, 'error');
            }
          },
        },
      ]
    );
  }, [showToast]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Bank Accounts</Text>
        <TouchableOpacity onPress={() => sheetRef.current?.expand()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="plus" size={22} color={colors.primaryBlue} />
        </TouchableOpacity>
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
          {accounts.length === 0 ? (
            <View style={styles.empty}>
              <IconSymbol name="building.columns" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No bank accounts</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Link a bank account to top up or withdraw funds.
              </Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primaryBlue }]}
                onPress={() => sheetRef.current?.expand()}
                activeOpacity={0.85}
              >
                <IconSymbol name="plus" size={16} color="#fff" />
                <Text style={styles.addBtnText}>Add Bank Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.listCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              {accounts.map((account, i) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  colors={colors}
                  onDelete={() => handleDelete(account)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Bank Account Bottom Sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior="extend"
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
        )}
        backgroundStyle={{ backgroundColor: colors.cardBg }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetScrollView
          contentContainerStyle={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Add Bank Account</Text>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Link to wallet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coinChips}>
            {coins.map((coin) => {
              const sel = selectedCoin?.coinSerial === coin.coinSerial;
              return (
                <TouchableOpacity
                  key={coin.coinSerial}
                  style={[styles.coinChip, {
                    backgroundColor: sel ? colors.primaryBlue : colors.background,
                    borderColor: sel ? colors.primaryBlue : colors.border,
                  }]}
                  onPress={() => setSelectedCoin(coin)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.coinChipCode, { color: sel ? '#fff' : colors.textPrimary }]}>
                    {coin.currency.code}
                  </Text>
                  <Text style={[styles.coinChipBalance, { color: sel ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}>
                    {coin.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Account holder name</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="e.g. John Smith"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
          />

          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>IBAN</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.background }]}
            value={iban}
            onChangeText={setIban}
            placeholder="e.g. DE89370400440532013000"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: saving ? colors.border : colors.primaryBlue }]}
            onPress={handleAdd}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>Add Account</Text>
            }
          </TouchableOpacity>
        </BottomSheetScrollView>
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

  body: { padding: 16, gap: 16, flexGrow: 1 },

  listCard: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowCenter: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowIban: { fontSize: 12, marginTop: 2, fontVariant: ['tabular-nums'] },
  rowDefault: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Bottom sheet
  sheet: { paddingHorizontal: 20, paddingTop: 8, gap: 12 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  coinChips: { gap: 8, paddingVertical: 4 },
  coinChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 12, borderWidth: 1, alignItems: 'center', minWidth: 72,
  },
  coinChipCode: { fontSize: 13, fontWeight: '700' },
  coinChipBalance: { fontSize: 11, marginTop: 2 },
  input: {
    height: 48, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, fontSize: 15,
  },
  saveBtn: {
    height: 52, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
