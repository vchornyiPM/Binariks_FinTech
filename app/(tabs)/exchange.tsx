import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFxStore } from '@/stores/fx.store';
import { useWalletStore } from '@/stores/wallet.store';
import { useUIStore } from '@/stores/ui.store';
import { exchangeService } from '@/services/exchange.service';
import type { Coin } from '@/types/api.types';

export default function ExchangeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { rateHistory, fetchRates } = useFxStore();
  const { coins, fetchCoins } = useWalletStore();
  const { showToast } = useUIStore();

  const [fromCoin, setFromCoin] = useState<Coin | null>(null);
  const [toCoin, setToCoin] = useState<Coin | null>(null);
  const [amount, setAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [calcResult, setCalcResult] = useState<{ toAmount: number; fee: number; rate: number } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabBarOffset = Platform.OS === 'ios' ? 83 : 60;

  // Default coin selection once coins load; keep local copies in sync with store updates
  useEffect(() => {
    if (fromCoin) {
      const updated = coins.find((c) => c.coinSerial === fromCoin.coinSerial);
      if (updated) setFromCoin(updated);
    } else if (coins.length >= 1) {
      setFromCoin(coins[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coins]);

  useEffect(() => {
    if (toCoin) {
      const updated = coins.find((c) => c.coinSerial === toCoin.coinSerial);
      if (updated) setToCoin(updated);
    } else if (coins.length >= 2) {
      setToCoin(coins[1]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coins]);

  const fromCurrency = fromCoin?.currency.code ?? '';
  const toCurrency = toCoin?.currency.code ?? '';

  const refreshRate = useCallback(async () => {
    if (!fromCoin?.coinSerial || !toCoin?.coinSerial || fromCoin.coinSerial === toCoin.coinSerial) return;
    const rate = await fetchRates(fromCoin.coinSerial, toCoin.coinSerial);
    if (rate !== null) {
      setCurrentRate(rate);
      setLastUpdated(new Date());
    }
  }, [fromCoin?.coinSerial, toCoin?.coinSerial, fetchRates]);

  // Clear stale history when pair changes
  useEffect(() => {
    setCurrentRate(null);
    setLastUpdated(null);
    useFxStore.getState().reset();
  }, [fromCoin?.coinSerial, toCoin?.coinSerial]);

  useFocusEffect(
    useCallback(() => {
      refreshRate();
      pollingRef.current = setInterval(refreshRate, 30_000);
      return () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      };
    }, [refreshRate])
  );

  const handleAmountChange = useCallback(
    (text: string) => {
      setAmount(text);
      setToAmount('');
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const numericValue = parseFloat(text);
      if (!text || isNaN(numericValue) || numericValue <= 0) return;
      if (!fromCoin?.coinSerial || !toCoin?.coinSerial) return;

      debounceRef.current = setTimeout(async () => {
        setCalculating(true);
        try {
          const result = await exchangeService.calculateExchange(
            fromCoin.coinSerial,
            toCoin.coinSerial,
            numericValue
          );
          setToAmount(result.toAmount.toFixed(2));
          setCalcResult(result);
        } catch {
          // silent
        } finally {
          setCalculating(false);
        }
      }, 500);
    },
    [fromCoin, toCoin]
  );

  const swapCoins = useCallback(() => {
    setFromCoin(toCoin);
    setToCoin(fromCoin);
    setAmount('');
    setToAmount('');
    setCalcResult(null);
  }, [fromCoin, toCoin]);

  const handleExchangeNow = useCallback(() => {
    if (!amount || !calcResult) {
      showToast('Enter an amount to exchange.', 'warning');
      return;
    }
    if (!fromCoin || !toCoin) {
      showToast('Select source and destination wallets.', 'warning');
      return;
    }
    setShowConfirm(true);
  }, [amount, calcResult, fromCoin, toCoin, showToast]);

  const executeExchange = useCallback(async () => {
    if (!fromCoin?.coinSerial || !toCoin?.coinSerial || !calcResult) return;
    setExecuting(true);
    setShowConfirm(false);
    try {
      await exchangeService.executeExchange(
        fromCoin.coinSerial,
        toCoin.coinSerial,
        parseFloat(amount)
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await fetchCoins();
      showToast(`Exchanged ${amount} ${fromCurrency} → ${toAmount} ${toCurrency}`, 'success');
      setAmount('');
      setToAmount('');
      setCalcResult(null);
    } catch {
      showToast('Exchange failed. Please try again.', 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setExecuting(false);
    }
  }, [fromCoin, toCoin, amount, toAmount, fromCurrency, toCurrency, calcResult, showToast, fetchCoins]);

  const formattedRate = currentRate
    ? `1 ${fromCurrency} = ${currentRate.toFixed(4)} ${toCurrency}`
    : fromCurrency && toCurrency ? 'Loading rate...' : '—';

  const formattedUpdated = lastUpdated
    ? lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  useEffect(() => {
    if (showConfirm && calcResult) {
      Alert.alert(
        'Confirm Exchange',
        `${amount} ${fromCurrency} → ${calcResult.toAmount.toFixed(2)} ${toCurrency}\nFee: ${calcResult.fee.toFixed(2)} ${fromCurrency}\nRate: ${calcResult.rate.toFixed(4)}`,
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setShowConfirm(false) },
          { text: 'Exchange', onPress: executeExchange },
        ]
      );
    }
  }, [showConfirm, calcResult, amount, fromCurrency, toCurrency, executeExchange]);

  const otherCoins = (exclude: Coin | null) =>
    coins.filter((c) => c.coinSerial !== exclude?.coinSerial);

  if (coins.length === 0) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary }}>No wallets found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + tabBarOffset }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Exchange</Text>
      </View>

      {/* Live Rate Banner */}
      <View style={[styles.rateBanner, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.rateLabel, { color: colors.textSecondary }]}>Live Rate</Text>
          <Text style={[styles.rateValue, { color: colors.textPrimary }]}>{formattedRate}</Text>
        </View>
        <View style={styles.rateRight}>
          {formattedUpdated && (
            <Text style={[styles.rateUpdated, { color: colors.textSecondary }]}>{formattedUpdated}</Text>
          )}
          <View style={[styles.liveIndicator, { backgroundColor: colors.successGreen }]} />
        </View>
      </View>

      {/* Rate sparkline */}
      {rateHistory.length >= 2 && (
        <View style={[styles.sparklineContainer, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.sparklineLabel, { color: colors.textSecondary }]}>Rate history</Text>
          <View style={styles.sparkline}>
            {rateHistory.map((r, i) => {
              const maxRate = Math.max(...rateHistory);
              const minRate = Math.min(...rateHistory);
              const range = maxRate - minRate || 1;
              const heightPercent = ((r - minRate) / range) * 60 + 10;
              return (
                <View key={i} style={[styles.sparklineBar, { height: heightPercent, backgroundColor: colors.primaryBlue }]} />
              );
            })}
          </View>
        </View>
      )}

      {/* Exchange Form */}
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <View style={styles.currencyRow}>
          <View style={[styles.currencyBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.currencyCode, { color: colors.textPrimary }]}>{fromCurrency || '—'}</Text>
          </View>
          <TextInput
            style={[styles.amountInput, { color: colors.textPrimary }]}
            value={amount}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        <TouchableOpacity
          style={[styles.swapBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={swapCoins}
          activeOpacity={0.7}
        >
          <Text style={[styles.swapIcon, { color: colors.primaryBlue }]}>⇅</Text>
        </TouchableOpacity>

        <View style={[styles.currencyRow, styles.toRow]}>
          <View style={[styles.currencyBadge, { backgroundColor: colors.border }]}>
            <Text style={[styles.currencyCode, { color: colors.textPrimary }]}>{toCurrency || '—'}</Text>
          </View>
          <View style={styles.toAmountContainer}>
            {calculating ? (
              <ActivityIndicator size="small" color={colors.primaryBlue} />
            ) : (
              <Text style={[styles.toAmount, { color: toAmount ? colors.successGreen : colors.textSecondary }]}>
                {toAmount || '0.00'}
              </Text>
            )}
          </View>
        </View>

        {calcResult && (
          <View style={[styles.feeRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.feeLabel, { color: colors.textSecondary }]}>Fee</Text>
            <Text style={[styles.feeValue, { color: colors.textSecondary }]}>
              {calcResult.fee.toFixed(2)} {fromCurrency}
            </Text>
          </View>
        )}
      </View>

      {/* Wallet pickers */}
      <View style={styles.walletPickers}>
        <View style={styles.pickerGroup}>
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>From wallet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
            {coins.map((c) => {
              const isSelected = fromCoin?.coinSerial === c.coinSerial;
              return (
                <TouchableOpacity
                  key={c.coinSerial}
                  style={[
                    styles.pickerChip,
                    {
                      backgroundColor: isSelected ? colors.primaryBlue : colors.cardBg,
                      borderColor: isSelected ? colors.primaryBlue : colors.border,
                    },
                  ]}
                  onPress={() => { setFromCoin(c); setAmount(''); setToAmount(''); setCalcResult(null); }}
                >
                  <Text style={{ color: isSelected ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                    {c.currency.code}
                  </Text>
                  <Text style={{ color: isSelected ? 'rgba(255,255,255,0.75)' : colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                    {c.availableBalance.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.pickerGroup, { marginTop: 12 }]}>
          <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>To wallet</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
            {otherCoins(fromCoin).map((c) => {
              const isSelected = toCoin?.coinSerial === c.coinSerial;
              return (
                <TouchableOpacity
                  key={c.coinSerial}
                  style={[
                    styles.pickerChip,
                    {
                      backgroundColor: isSelected ? colors.primaryBlue : colors.cardBg,
                      borderColor: isSelected ? colors.primaryBlue : colors.border,
                    },
                  ]}
                  onPress={() => { setToCoin(c); setAmount(''); setToAmount(''); setCalcResult(null); }}
                >
                  <Text style={{ color: isSelected ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: '600' }}>
                    {c.currency.code}
                  </Text>
                  <Text style={{ color: isSelected ? 'rgba(255,255,255,0.75)' : colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                    {c.availableBalance.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Exchange Button */}
      <TouchableOpacity
        style={[
          styles.exchangeBtn,
          { backgroundColor: executing || !amount || !fromCoin || !toCoin ? colors.border : colors.primaryBlue },
        ]}
        onPress={handleExchangeNow}
        disabled={executing || !amount || !fromCoin || !toCoin}
        activeOpacity={0.85}
      >
        {executing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.exchangeBtnText}>Exchange Now</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, marginBottom: 20 },
  title: { fontSize: 34, fontWeight: '700' },
  rateBanner: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  rateValue: { fontSize: 17, fontWeight: '600' },
  rateRight: { alignItems: 'flex-end', gap: 6 },
  rateUpdated: { fontSize: 11 },
  liveIndicator: { width: 8, height: 8, borderRadius: 4 },
  sparklineContainer: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 12,
  },
  sparklineLabel: { fontSize: 11, marginBottom: 8 },
  sparkline: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 70 },
  sparklineBar: { flex: 1, borderRadius: 2, minHeight: 4 },
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 16,
  },
  currencyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toRow: { marginTop: 8 },
  currencyBadge: {
    width: 64,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyCode: { fontSize: 15, fontWeight: '700' },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '600', fontVariant: ['tabular-nums'] },
  toAmountContainer: { flex: 1, justifyContent: 'center' },
  toAmount: { fontSize: 28, fontWeight: '600', fontVariant: ['tabular-nums'] },
  swapBtn: {
    alignSelf: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  swapIcon: { fontSize: 20, fontWeight: '600' },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  feeLabel: { fontSize: 14 },
  feeValue: { fontSize: 14 },
  walletPickers: { marginHorizontal: 16, marginBottom: 20 },
  pickerGroup: {},
  pickerLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  pickerScroll: { flexGrow: 0 },
  pickerChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 64,
  },
  exchangeBtn: {
    marginHorizontal: 16,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  exchangeBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
