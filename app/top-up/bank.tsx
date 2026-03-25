import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWalletStore } from '@/stores/wallet.store';
import { useUIStore } from '@/stores/ui.store';
import { bankAccountsService, type BankAccount, type FeeResult } from '@/services/bank-accounts.service';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Coin } from '@/types/api.types';

type Step = 1 | 2 | 3 | 'success';

function maskIban(iban: string): string {
  if (!iban || iban.length <= 8) return iban;
  return `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}`;
}

export default function TopUpBankScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { coins, fetchWallets } = useWalletStore();
  const { showToast } = useUIStore();

  const [step, setStep] = useState<Step>(1);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(coins[0] ?? null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(null);
  const [amount, setAmount] = useState('');
  const [feeResult, setFeeResult] = useState<FeeResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load bank accounts when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    setLoadingAccounts(true);
    bankAccountsService.getBankAccounts()
      .then((list) => {
        setBankAccounts(list.filter((a) => a.status === 'approved'));
        setSelectedAccount((prev) => prev ?? (list.find((a) => a.isDefault) ?? list[0] ?? null));
      })
      .catch(() => showToast('Failed to load bank accounts.', 'error'))
      .finally(() => setLoadingAccounts(false));
  }, [step, showToast]);

  // Fee calculation on step 3 when amount changes
  useEffect(() => {
    if (step !== 3 || !selectedCoin || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setFeeResult(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCalcLoading(true);
      try {
        const result = await bankAccountsService.calculateTopUp(selectedCoin.coinSerial, Number(amount));
        setFeeResult(result);
      } catch {
        setFeeResult(null);
      } finally {
        setCalcLoading(false);
      }
    }, 600);
  }, [step, selectedCoin, amount]);

  const handleSubmit = useCallback(async () => {
    if (!selectedCoin || !selectedAccount || !amount) return;
    setSubmitting(true);
    try {
      await bankAccountsService.createTopUpRequest(
        selectedCoin.coinSerial,
        Number(amount),
        selectedAccount.id
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      fetchWallets().catch(() => {});
      setStep('success');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Top-up request failed. Please try again.';
      showToast(msg, 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSubmitting(false);
    }
  }, [selectedCoin, selectedAccount, amount, fetchWallets, showToast]);

  const symbol = selectedCoin?.currency.symbol ?? '$';
  const numAmount = Number(amount);
  const totalDeducted = feeResult ? Math.abs(feeResult.senderAmountPush) : numAmount;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => (step === 1 || step === 'success') ? router.back() : setStep((s) => (s === 2 ? 1 : s === 3 ? 2 : s) as Step)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name={step === 'success' ? 'xmark' : 'chevron.left'} size={20} color={colors.primaryBlue} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Top Up via Bank</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Step indicator (steps 1-3 only) */}
        {step !== 'success' && (
          <View style={styles.stepRow}>
            {[1, 2, 3].map((s) => (
              <View key={s} style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  { backgroundColor: (step as number) >= s ? colors.primaryBlue : colors.border },
                ]} />
                {s < 3 && <View style={[styles.stepLine, { backgroundColor: (step as number) > s ? colors.primaryBlue : colors.border }]} />}
              </View>
            ))}
          </View>
        )}

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step 1 — Select wallet */}
          {step === 1 && (
            <>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Select wallet to top up</Text>
              <View style={[styles.listCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                {coins.map((coin, i) => {
                  const sel = selectedCoin?.coinSerial === coin.coinSerial;
                  return (
                    <TouchableOpacity
                      key={coin.coinSerial}
                      style={[styles.selectRow, { borderBottomColor: colors.border },
                        i === coins.length - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => setSelectedCoin(coin)}
                      activeOpacity={0.75}
                    >
                      <View style={styles.selectRowLeft}>
                        <Text style={[styles.selectRowCode, { color: colors.textPrimary }]}>{coin.currency.code}</Text>
                        <Text style={[styles.selectRowName, { color: colors.textSecondary }]}>{coin.name}</Text>
                      </View>
                      <View style={styles.selectRowRight}>
                        <Text style={[styles.selectRowBalance, { color: colors.textSecondary }]}>
                          {coin.currency.symbol}{coin.availableBalance.toFixed(2)}
                        </Text>
                        {sel && <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primaryBlue} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: selectedCoin ? colors.primaryBlue : colors.border }]}
                onPress={() => setStep(2)}
                disabled={!selectedCoin}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>Continue</Text>
                <IconSymbol name="chevron.right" size={16} color="#fff" />
              </TouchableOpacity>
            </>
          )}

          {/* Step 2 — Select bank account */}
          {step === 2 && (
            <>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Select source bank account</Text>
              {loadingAccounts ? (
                <ActivityIndicator color={colors.primaryBlue} style={{ marginTop: 32 }} />
              ) : bankAccounts.length === 0 ? (
                <View style={styles.empty}>
                  <IconSymbol name="building.columns" size={40} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No approved accounts</Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Add and get a bank account approved in Profile → Bank Accounts.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={[styles.listCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                    {bankAccounts.map((account, i) => {
                      const sel = selectedAccount?.id === account.id;
                      const display = account.details.iban ? maskIban(account.details.iban) : account.details.bankAccountNumber ?? '—';
                      return (
                        <TouchableOpacity
                          key={account.id}
                          style={[styles.selectRow, { borderBottomColor: colors.border },
                            i === bankAccounts.length - 1 && { borderBottomWidth: 0 }]}
                          onPress={() => setSelectedAccount(account)}
                          activeOpacity={0.75}
                        >
                          <View style={[styles.rowIcon, { backgroundColor: colors.primaryBlue + '15' }]}>
                            <IconSymbol name="building.columns.fill" size={16} color={colors.primaryBlue} />
                          </View>
                          <View style={styles.selectRowLeft}>
                            <Text style={[styles.selectRowCode, { color: colors.textPrimary }]} numberOfLines={1}>
                              {account.details.fullName}
                            </Text>
                            <Text style={[styles.selectRowName, { color: colors.textSecondary }]} numberOfLines={1}>
                              {display}
                            </Text>
                          </View>
                          {sel && <IconSymbol name="checkmark.circle.fill" size={20} color={colors.primaryBlue} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={[styles.nextBtn, { backgroundColor: selectedAccount ? colors.primaryBlue : colors.border }]}
                    onPress={() => setStep(3)}
                    disabled={!selectedAccount}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.nextBtnText}>Continue</Text>
                    <IconSymbol name="chevron.right" size={16} color="#fff" />
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {/* Step 3 — Amount + confirm */}
          {step === 3 && (
            <>
              <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Enter amount</Text>

              {/* Summary */}
              <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <SummaryRow label="To wallet" value={selectedCoin?.name ?? ''} colors={colors} />
                <SummaryRow
                  label="From account"
                  value={selectedAccount?.details.iban ? maskIban(selectedAccount.details.iban) : selectedAccount?.details.bankAccountNumber ?? ''}
                  colors={colors}
                  last
                />
              </View>

              {/* Amount input */}
              <View style={[styles.amountCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.amountCurrency, { color: colors.textSecondary }]}>
                  {selectedCoin?.currency.code}
                </Text>
                <TextInput
                  style={[styles.amountInput, { color: colors.textPrimary }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>

              {/* Fee preview */}
              {(calcLoading || feeResult) && (
                <View style={[styles.feeCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  {calcLoading ? (
                    <ActivityIndicator color={colors.primaryBlue} size="small" />
                  ) : feeResult ? (
                    <>
                      <FeeRow label="Top-up amount" value={`${symbol}${feeResult.transactionAmount.toFixed(2)}`} colors={colors} />
                      <FeeRow label="Fee" value={`${symbol}${Math.abs(feeResult.commissionAmountPush).toFixed(2)}`} colors={colors} />
                      <FeeRow label="You receive" value={`${symbol}${feeResult.recipientAmountPush.toFixed(2)}`} colors={colors} bold />
                    </>
                  ) : null}
                </View>
              )}

              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: (submitting || !amount || calcLoading) ? colors.border : colors.primaryBlue }]}
                onPress={handleSubmit}
                disabled={submitting || !amount || Number(amount) <= 0 || calcLoading}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : (
                    <>
                      <IconSymbol name="arrow.down.circle.fill" size={18} color="#fff" />
                      <Text style={styles.nextBtnText}>Confirm Top Up</Text>
                    </>
                  )}
              </TouchableOpacity>
            </>
          )}

          {/* Success */}
          {step === 'success' && (
            <View style={styles.successContainer}>
              <View style={[styles.successIcon, { backgroundColor: colors.successGreen + '20' }]}>
                <IconSymbol name="checkmark.circle.fill" size={56} color={colors.successGreen} />
              </View>
              <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Request Submitted!</Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                Your top-up request of {symbol}{numAmount.toFixed(2)} has been submitted. Funds will appear in your wallet once processed.
              </Text>
              <TouchableOpacity
                style={[styles.nextBtn, { backgroundColor: colors.primaryBlue }]}
                onPress={() => router.back()}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, colors, last }: { label: string; value: string; colors: typeof Colors.light; last?: boolean }) {
  return (
    <View style={[styles.summaryRow, { borderBottomColor: colors.border }, last && { borderBottomWidth: 0 }]}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.textPrimary }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function FeeRow({ label, value, colors, bold }: { label: string; value: string; colors: typeof Colors.light; bold?: boolean }) {
  return (
    <View style={styles.feeRow}>
      <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.feeValue, { color: bold ? colors.textPrimary : colors.textSecondary }, bold && styles.feeBold]}>
        {value}
      </Text>
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

  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 0 },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  stepLine: { width: 40, height: 2 },

  body: { padding: 20, gap: 16 },
  stepTitle: { fontSize: 20, fontWeight: '700' },

  listCard: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  selectRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  selectRowLeft: { flex: 1 },
  selectRowCode: { fontSize: 15, fontWeight: '600' },
  selectRowName: { fontSize: 13, marginTop: 1 },
  selectRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectRowBalance: { fontSize: 14, fontVariant: ['tabular-nums'] },

  summaryCard: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  summaryLabel: { fontSize: 14 },
  summaryValue: { fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },

  amountCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16, height: 72, gap: 8,
  },
  amountCurrency: { fontSize: 22, fontWeight: '600', width: 48 },
  amountInput: { flex: 1, fontSize: 36, fontWeight: '700', fontVariant: ['tabular-nums'] },

  feeCard: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    padding: 16, gap: 10,
  },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feeLabel: { fontSize: 14 },
  feeValue: { fontSize: 14, fontVariant: ['tabular-nums'] },
  feeBold: { fontWeight: '700' },

  nextBtn: {
    height: 52, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },

  empty: { alignItems: 'center', gap: 10, paddingTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  successContainer: { alignItems: 'center', gap: 16, paddingTop: 40 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 24, fontWeight: '700' },
  successSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
});
