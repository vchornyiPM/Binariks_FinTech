import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWalletStore } from '@/stores/wallet.store';
import { useUIStore } from '@/stores/ui.store';
import { transferService } from '@/services/transfer.service';
import type { RecipientCoin } from '@/services/transfer.service';
import type { Coin, TransferCalculateResponse } from '@/types/api.types';

type Mode = 'own' | 'external';

export default function SendMoneyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { coins, selectedCoin, fetchCoins } = useWalletStore();
  const { showToast } = useUIStore();

  const [mode, setMode] = useState<Mode>('own');

  // Shared
  const [fromCoin, setFromCoin] = useState<Coin | null>(selectedCoin ?? coins[0] ?? null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [calcResult, setCalcResult] = useState<TransferCalculateResponse | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);

  // Own-wallet mode
  const [toCoin, setToCoin] = useState<Coin | null>(null);

  // External mode
  const [recipientQuery, setRecipientQuery] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [recipientCoins, setRecipientCoins] = useState<RecipientCoin[] | null>(null);
  const [selectedRecipientCoin, setSelectedRecipientCoin] = useState<RecipientCoin | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const numericAmount = parseFloat(amount);
  const isAmountValid = !isNaN(numericAmount) && numericAmount > 0;
  const isInsufficient = isAmountValid && !!fromCoin && numericAmount > (fromCoin.availableBalance ?? fromCoin.balance);

  const destSerial = mode === 'own' ? (toCoin?.coinSerial ?? '') : (selectedRecipientCoin?.serial ?? '');
  const isDestValid = destSerial.length > 0 && destSerial !== fromCoin?.coinSerial;
  const canSend = isAmountValid && isDestValid && !!fromCoin && !isInsufficient;

  // Default toCoin to second wallet in own mode
  useEffect(() => {
    if (mode === 'own') {
      const other = coins.find((c) => c.coinSerial !== fromCoin?.coinSerial);
      setToCoin(other ?? null);
    }
  }, [mode, fromCoin, coins]);

  // Clear calc when inputs change
  useEffect(() => {
    setCalcResult(null);
  }, [amount, destSerial, fromCoin]);

  // Debounced fee calculation
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!isAmountValid || !isDestValid || !fromCoin) return;

    debounceRef.current = setTimeout(async () => {
      setCalculating(true);
      try {
        const result = await transferService.calculateTransfer(
          fromCoin.coinSerial,
          destSerial,
          numericAmount
        );
        setCalcResult(result);
      } catch {
        setCalcResult(null);
      } finally {
        setCalculating(false);
      }
    }, 600);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, destSerial, fromCoin?.coinSerial, isAmountValid, isDestValid, numericAmount]);

  const handleLookup = useCallback(async () => {
    const q = recipientQuery.trim();
    if (!q) return;
    setLookingUp(true);
    setRecipientCoins(null);
    setSelectedRecipientCoin(null);
    try {
      const results = await transferService.lookupRecipient(q);
      if (results.length === 0) {
        showToast('No wallets found for this recipient.', 'error');
      } else {
        setRecipientCoins(results);
        setSelectedRecipientCoin(results[0]);
      }
    } catch {
      showToast('Recipient not found.', 'error');
    } finally {
      setLookingUp(false);
    }
  }, [recipientQuery, showToast]);

  const handleExecute = useCallback(async () => {
    if (!canSend || !fromCoin) return;
    setExecuting(true);
    try {
      const result = await transferService.executeTransfer(
        fromCoin.coinSerial,
        destSerial,
        numericAmount,
        description.trim() || undefined
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTransferId(result.id);
      fetchCoins().catch(() => {});
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      const msg = e?.response?.data?.message ?? 'Transfer failed. Please try again.';
      showToast(msg, 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setExecuting(false);
    }
  }, [canSend, fromCoin, destSerial, numericAmount, description, showToast, fetchCoins]);

  // ── Success ────────────────────────────────────────────────────────────────
  if (transferId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.successInner, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
          <View style={[styles.successIcon, { backgroundColor: colors.successGreen + '20' }]}>
            <Text style={[styles.successCheckmark, { color: colors.successGreen }]}>✓</Text>
          </View>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Transfer Successful</Text>
          <Text style={[styles.successAmount, { color: colors.successGreen }]}>
            {numericAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {fromCoin?.currency.code}
          </Text>
          {calcResult && (
            <View style={[styles.summaryBox, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
              <SummaryRow label="Recipient received" value={`${calcResult.recipientAmountPush.toFixed(2)} ${calcResult.currency.code}`} colors={colors} />
              <SummaryRow label="Fee" value={`${calcResult.commissionAmountPush.toFixed(2)} ${calcResult.currency.code}`} colors={colors} />
              <SummaryRow label="Total deducted" value={`${Math.abs(calcResult.senderAmountPush).toFixed(2)} ${calcResult.currency.code}`} colors={colors} bold last />
            </View>
          )}
          <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primaryBlue }]} onPress={() => router.back()}>
            <Text style={styles.doneBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerSide}>
            <Text style={[styles.cancelText, { color: colors.primaryBlue }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Send Money</Text>
          <View style={styles.headerSide} />
        </View>

        {/* Mode tabs */}
        <View style={[styles.segmented, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.segment, mode === 'own' && { backgroundColor: colors.primaryBlue }]}
            onPress={() => setMode('own')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, { color: mode === 'own' ? '#fff' : colors.textSecondary }]}>My Wallets</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, mode === 'external' && { backgroundColor: colors.primaryBlue }]}
            onPress={() => setMode('external')}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, { color: mode === 'external' ? '#fff' : colors.textSecondary }]}>Send to Someone</Text>
          </TouchableOpacity>
        </View>

        {/* From */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>From</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {coins.map((coin) => {
                const active = fromCoin?.coinSerial === coin.coinSerial;
                return (
                  <TouchableOpacity
                    key={coin.coinSerial}
                    style={[styles.chip, { backgroundColor: active ? colors.primaryBlue : colors.cardBg, borderColor: active ? colors.primaryBlue : colors.border }]}
                    onPress={() => setFromCoin(coin)}
                  >
                    <Text style={[styles.chipTitle, { color: active ? '#fff' : colors.textPrimary }]}>{coin.name}</Text>
                    <Text style={[styles.chipSub, { color: active ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                      {coin.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {coin.currency.code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* To */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>To</Text>

          {mode === 'own' ? (
            // ── Own wallets picker ────────────────────────────────────────────
            coins.filter((c) => c.coinSerial !== fromCoin?.coinSerial).length === 0 ? (
              <View style={[styles.infoBox, { borderColor: colors.border }]}>
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  You need at least two wallets to transfer between them.
                </Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  {coins.filter((c) => c.coinSerial !== fromCoin?.coinSerial).map((coin) => {
                    const active = toCoin?.coinSerial === coin.coinSerial;
                    return (
                      <TouchableOpacity
                        key={coin.coinSerial}
                        style={[styles.chip, { backgroundColor: active ? colors.primaryBlue : colors.cardBg, borderColor: active ? colors.primaryBlue : colors.border }]}
                        onPress={() => setToCoin(coin)}
                      >
                        <Text style={[styles.chipTitle, { color: active ? '#fff' : colors.textPrimary }]}>{coin.name}</Text>
                        <Text style={[styles.chipSub, { color: active ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                          {coin.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {coin.currency.code}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )
          ) : (
            // ── Recipient lookup ──────────────────────────────────────────────
            <>
              <View style={styles.lookupRow}>
                <TextInput
                  style={[styles.lookupInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.cardBg }]}
                  value={recipientQuery}
                  onChangeText={(v) => {
                    setRecipientQuery(v);
                    setRecipientCoins(null);
                    setSelectedRecipientCoin(null);
                  }}
                  placeholder="Email, phone, or wallet serial"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handleLookup}
                />
                <TouchableOpacity
                  style={[styles.lookupBtn, { backgroundColor: recipientQuery.trim() ? colors.primaryBlue : colors.border }]}
                  onPress={handleLookup}
                  disabled={!recipientQuery.trim() || lookingUp}
                  activeOpacity={0.8}
                >
                  {lookingUp
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.lookupBtnText}>Find</Text>
                  }
                </TouchableOpacity>
              </View>

              {recipientCoins && recipientCoins.length > 0 && (
                <>
                  <Text style={[styles.recipientName, { color: colors.textSecondary }]}>
                    {recipientCoins[0].ownerFullName}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
                    <View style={styles.chipRow}>
                      {recipientCoins.map((rc) => {
                        const active = selectedRecipientCoin?.serial === rc.serial;
                        return (
                          <TouchableOpacity
                            key={rc.serial}
                            style={[styles.chip, { backgroundColor: active ? colors.primaryBlue : colors.cardBg, borderColor: active ? colors.primaryBlue : colors.border }]}
                            onPress={() => setSelectedRecipientCoin(rc)}
                          >
                            <Text style={[styles.chipTitle, { color: active ? '#fff' : colors.textPrimary }]}>{rc.currency.code}</Text>
                            <Text style={[styles.chipSub, { color: active ? 'rgba(255,255,255,0.8)' : colors.textSecondary }]}>
                              ···{rc.serial.slice(-4)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </>
              )}
            </>
          )}
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
          <View style={[styles.amountRow, { borderColor: isInsufficient ? colors.errorRed : colors.border, backgroundColor: colors.cardBg }]}>
            <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>{fromCoin?.currency.symbol ?? '$'}</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.textPrimary }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={[styles.currencyCode, { color: colors.textSecondary }]}>{fromCoin?.currency.code ?? 'USD'}</Text>
          </View>
          {isInsufficient && <Text style={[styles.errorText, { color: colors.errorRed }]}>Insufficient balance</Text>}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optional)</Text>
          <TextInput
            style={[styles.serialInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.cardBg }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Payment note"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Fee preview */}
        {isAmountValid && isDestValid && (
          <View style={[styles.feeCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            {calculating ? (
              <ActivityIndicator size="small" color={colors.primaryBlue} style={{ padding: 12 }} />
            ) : calcResult ? (
              <>
                <SummaryRow label="Amount" value={`${calcResult.transactionAmount.toFixed(2)} ${calcResult.currency.code}`} colors={colors} />
                <SummaryRow label="Fee" value={`${calcResult.commissionAmountPush.toFixed(2)} ${calcResult.currency.code}`} colors={colors} />
                <SummaryRow label="Total deducted" value={`${Math.abs(calcResult.senderAmountPush).toFixed(2)} ${calcResult.currency.code}`} colors={colors} bold last />
              </>
            ) : null}
          </View>
        )}

        {/* Send button */}
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: !canSend || executing ? colors.border : colors.primaryBlue }]}
          onPress={handleExecute}
          disabled={!canSend || executing}
          activeOpacity={0.85}
        >
          {executing ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendBtnText}>Send Money</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface SummaryRowProps {
  label: string;
  value: string;
  colors: typeof Colors.light;
  bold?: boolean;
  last?: boolean;
}

function SummaryRow({ label, value, colors, bold, last }: SummaryRowProps) {
  return (
    <View style={[
      styles.feeRow,
      !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    ]}>
      <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.feeVal, { color: bold ? colors.textPrimary : colors.textSecondary, fontWeight: bold ? '700' : '400' }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  successInner: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successCheckmark: { fontSize: 40, fontWeight: '700' },
  successTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  successAmount: { fontSize: 28, fontWeight: '700', marginBottom: 24, fontVariant: ['tabular-nums'] },
  summaryBox: { width: '100%', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 24 },
  doneBtn: { width: '100%', height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 20 },
  headerSide: { width: 70 },
  cancelText: { fontSize: 17 },
  title: { fontSize: 17, fontWeight: '600' },
  segmented: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 20,
    borderRadius: 12, borderWidth: 1, overflow: 'hidden', padding: 3, gap: 3,
  },
  segment: { flex: 1, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontSize: 14, fontWeight: '600' },
  section: { paddingHorizontal: 16, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 10 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 2 },
  chipTitle: { fontSize: 14, fontWeight: '600' },
  chipSub: { fontSize: 12 },
  infoBox: { borderRadius: 12, borderWidth: 1, padding: 16 },
  infoText: { fontSize: 14, lineHeight: 20 },
  lookupRow: { flexDirection: 'row', gap: 10 },
  lookupInput: { flex: 1, height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  lookupBtn: { height: 48, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  lookupBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  recipientName: { fontSize: 13, fontWeight: '500', marginTop: 10 },
  serialInput: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 15 },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, height: 60, gap: 8 },
  currencySymbol: { fontSize: 20 },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '600', fontVariant: ['tabular-nums'], padding: 0 },
  currencyCode: { fontSize: 16, fontWeight: '500' },
  errorText: { fontSize: 13, marginTop: 6 },
  feeCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', marginBottom: 20 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  feeLabel: { fontSize: 15 },
  feeVal: { fontSize: 15 },
  sendBtn: { marginHorizontal: 16, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  sendBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
