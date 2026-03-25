import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWalletStore } from '@/stores/wallet.store';
import { useUIStore } from '@/stores/ui.store';
import { invoiceService } from '@/services/invoice.service';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Invoice, Coin } from '@/types/api.types';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  initiated: { bg: '#EFF6FF', text: '#1D4ED8', label: 'Initiated' },
  pending:   { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
  approved:  { bg: '#D1FAE5', text: '#065F46', label: 'Approved' },
  paid:      { bg: '#D1FAE5', text: '#065F46', label: 'Paid' },
  declined:  { bg: '#FEE2E2', text: '#991B1B', label: 'Declined' },
  expired:   { bg: '#F3F4F6', text: '#6B7280', label: 'Expired' },
  hidden:    { bg: '#F3F4F6', text: '#6B7280', label: 'Hidden' },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const { identifier } = useLocalSearchParams<{ identifier: string }>();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { coins } = useWalletStore();
  const { showToast } = useUIStore();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  // Pay flow
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(coins[0] ?? null);
  const [feeResult, setFeeResult] = useState<{ transactionAmount: number; commissionAmountPush: number; senderAmountPush: number } | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!identifier) return;
    invoiceService.getInvoice(identifier)
      .then(setInvoice)
      .catch(() => showToast('Failed to load invoice.', 'error'))
      .finally(() => setLoading(false));
  }, [identifier, showToast]);

  // Recalculate fee when wallet selection changes
  useEffect(() => {
    if (!invoice || !selectedCoin || !['initiated', 'pending', 'approved'].includes(invoice.status)) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCalcLoading(true);
      try {
        const result = await invoiceService.calculateFee(invoice.identifier, selectedCoin.coinSerial);
        setFeeResult({
          transactionAmount: result.transactionAmount,
          commissionAmountPush: result.commissionAmountPush,
          senderAmountPush: result.senderAmountPush,
        });
      } catch {
        setFeeResult(null);
      } finally {
        setCalcLoading(false);
      }
    }, 600);
  }, [invoice, selectedCoin]);

  const handlePay = useCallback(() => {
    if (!invoice || !selectedCoin) return;
    const total = feeResult ? Math.abs(feeResult.senderAmountPush) : invoice.totalPrice;
    Alert.alert(
      'Confirm Payment',
      `Pay ${invoice.currency.symbol}${total.toFixed(2)} ${invoice.currency.code} for "${invoice.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Pay',
          onPress: async () => {
            setPaying(true);
            try {
              await invoiceService.payInvoice(invoice.identifier, selectedCoin.coinSerial);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              setPaid(true);
              setInvoice((prev) => prev ? { ...prev, status: 'paid' } : prev);
              showToast('Invoice paid successfully!', 'success');
            } catch (err: any) {
              const msg = err?.response?.data?.message ?? 'Payment failed. Please try again.';
              showToast(msg, 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            } finally {
              setPaying(false);
            }
          },
        },
      ]
    );
  }, [invoice, selectedCoin, feeResult, showToast]);

  const canPay = invoice && ['initiated', 'pending', 'approved'].includes(invoice.status) && !!selectedCoin && !paid;
  const status = invoice ? (STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.hidden) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="chevron.left" size={20} color={colors.primaryBlue} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Invoice</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryBlue} style={{ marginTop: 60 }} />
      ) : !invoice ? (
        <View style={styles.empty}>
          <IconSymbol name="doc.text" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Invoice not found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Amount hero */}
          <View style={[styles.heroCard, { backgroundColor: colors.primaryBlue }]}>
            <Text style={styles.heroLabel}>{invoice.name}</Text>
            <Text style={styles.heroAmount}>
              {invoice.currency.symbol}{invoice.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text style={styles.heroCurrency}>{invoice.currency.code}</Text>
            {status && (
              <View style={[styles.heroBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.heroBadgeText}>{status.label}</Text>
              </View>
            )}
          </View>

          {/* Details */}
          <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <DetailRow label="Reference" value={`#${invoice.identifier}`} colors={colors} mono />
            {invoice.merchantName && <DetailRow label="From" value={invoice.merchantName} colors={colors} />}
            {invoice.payerContact && <DetailRow label="Payer contact" value={invoice.payerContact} colors={colors} />}
            {invoice.description && <DetailRow label="Note" value={invoice.description} colors={colors} />}
            <DetailRow label="Created" value={fmt(invoice.createdAt)} colors={colors} />
            <DetailRow label="Expires" value={fmt(invoice.expiresAt)} colors={colors} last />
          </View>

          {/* Pay section — only for payable invoices */}
          {canPay && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Pay from wallet</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {coins.map((coin) => {
                  const sel = selectedCoin?.coinSerial === coin.coinSerial;
                  return (
                    <TouchableOpacity
                      key={coin.coinSerial}
                      style={[styles.chip, {
                        backgroundColor: sel ? colors.primaryBlue : colors.cardBg,
                        borderColor: sel ? colors.primaryBlue : colors.border,
                      }]}
                      onPress={() => setSelectedCoin(coin)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipCurrency, { color: sel ? '#fff' : colors.textPrimary }]}>{coin.currency.code}</Text>
                      <Text style={[styles.chipBalance, { color: sel ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}>
                        {coin.currency.symbol}{coin.availableBalance.toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Fee card */}
              {(calcLoading || feeResult) && (
                <View style={[styles.feeCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                  {calcLoading ? (
                    <ActivityIndicator color={colors.primaryBlue} size="small" />
                  ) : feeResult ? (
                    <>
                      <FeeRow label="Invoice amount" value={`${invoice.currency.symbol}${feeResult.transactionAmount.toFixed(2)}`} colors={colors} />
                      <FeeRow label="Fee" value={`${invoice.currency.symbol}${feeResult.commissionAmountPush.toFixed(2)}`} colors={colors} />
                      <FeeRow
                        label="Total deducted"
                        value={`${invoice.currency.symbol}${Math.abs(feeResult.senderAmountPush).toFixed(2)}`}
                        colors={colors}
                        bold
                      />
                    </>
                  ) : null}
                </View>
              )}

              <TouchableOpacity
                style={[styles.payBtn, { backgroundColor: paying ? colors.border : colors.primaryBlue }]}
                onPress={handlePay}
                disabled={paying || calcLoading}
                activeOpacity={0.85}
              >
                {paying
                  ? <ActivityIndicator color="#fff" />
                  : (
                    <>
                      <IconSymbol name="creditcard.fill" size={18} color="#fff" />
                      <Text style={styles.payBtnText}>Pay Now</Text>
                    </>
                  )}
              </TouchableOpacity>
            </>
          )}

          {/* Paid success state */}
          {(paid || invoice.status === 'paid') && (
            <View style={[styles.paidBanner, { backgroundColor: colors.successGreen + '15', borderColor: colors.successGreen + '40' }]}>
              <IconSymbol name="checkmark.circle.fill" size={22} color={colors.successGreen} />
              <Text style={[styles.paidText, { color: colors.successGreen }]}>This invoice has been paid</Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function DetailRow({ label, value, colors, mono, last }: {
  label: string; value: string; colors: typeof Colors.light; mono?: boolean; last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }, last && styles.detailRowLast]}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.textPrimary }, mono && styles.mono]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function FeeRow({ label, value, colors, bold }: {
  label: string; value: string; colors: typeof Colors.light; bold?: boolean;
}) {
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
  body: { padding: 20, gap: 16, paddingBottom: 40 },

  heroCard: {
    borderRadius: 20, padding: 24, alignItems: 'center', gap: 4,
  },
  heroLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '500' },
  heroAmount: { color: '#fff', fontSize: 36, fontWeight: '700', fontVariant: ['tabular-nums'] },
  heroCurrency: { color: 'rgba(255,255,255,0.75)', fontSize: 16, fontWeight: '500' },
  heroBadge: { marginTop: 8, paddingHorizontal: 14, paddingVertical: 4, borderRadius: 20 },
  heroBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  section: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { fontSize: 15, flexShrink: 0 },
  detailValue: { fontSize: 15, fontWeight: '500', flex: 1, textAlign: 'right' },
  mono: { fontVariant: ['tabular-nums'] },

  sectionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  chipRow: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', minWidth: 80,
  },
  chipCurrency: { fontSize: 14, fontWeight: '700' },
  chipBalance: { fontSize: 11, marginTop: 2, fontVariant: ['tabular-nums'] },

  feeCard: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    padding: 16, gap: 10,
  },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  feeLabel: { fontSize: 14 },
  feeValue: { fontSize: 14, fontVariant: ['tabular-nums'] },
  feeBold: { fontWeight: '700' },

  payBtn: {
    height: 52, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  payBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },

  paidBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  paidText: { fontSize: 15, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 80 },
  emptyText: { fontSize: 16 },
});
