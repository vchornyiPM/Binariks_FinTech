import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { transactionsService } from '@/services/transactions.service';
import { useTxStore } from '@/stores/tx.store';
import type { Transaction } from '@/types/api.types';

const TYPE_LABELS: Record<string, string> = {
  TRANSFER: 'Transfer',
  EXCHANGE: 'Exchange',
  TOP_UP: 'Top-Up',
  WITHDRAW: 'Withdrawal',
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  processed:   { bg: '#D1FAE5', text: '#065F46' },
  new:         { bg: '#DBEAFE', text: '#1E40AF' },
  pending:     { bg: '#FEF3C7', text: '#92400E' },
  error:       { bg: '#FEE2E2', text: '#991B1B' },
  declined:    { bg: '#FEE2E2', text: '#991B1B' },
  canceled:    { bg: '#F3F4F6', text: '#6B7280' },
};

function statusColor(status: string) {
  return STATUS_COLORS[status.toLowerCase()] ?? { bg: '#F3F4F6', text: '#6B7280' };
}

export default function TransactionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];

  // Try to find in store first (instant display), then fetch
  const cached = useTxStore((s) => s.transactions.find((t) => t.id === id));
  const [tx, setTx] = useState<Transaction | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    if (cached || !id) return;
    setLoading(true);
    transactionsService.getTransaction(id)
      .then(setTx)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, cached]);

  const amountStr = tx
    ? `${tx.amount >= 0 ? '+' : ''}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${tx.currency}`
    : '';
  const amountColor = tx && tx.amount >= 0 ? colors.successGreen : colors.errorRed;

  const formattedDate = tx?.date
    ? new Date(tx.date).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  const typeLabel = tx ? (TYPE_LABELS[tx.type] ?? tx.type) : '';
  const sc = tx ? statusColor(tx.status) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: colors.primaryBlue }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Transaction</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primaryBlue} />
        </View>
      ) : !tx ? (
        <View style={styles.center}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>Transaction not found</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Amount hero */}
          <View style={[styles.heroCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <Text style={[styles.heroAmount, { color: amountColor }]}>{amountStr}</Text>
            <View style={styles.heroMeta}>
              <Text style={[styles.heroType, { color: colors.textSecondary }]}>{typeLabel}</Text>
              {sc && (
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                  <Text style={[styles.statusText, { color: sc.text }]}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1).toLowerCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Details */}
          <View style={[styles.detailsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <DetailRow label="Date" value={formattedDate} colors={colors} />
            <DetailRow label="Transaction ID" value={tx.id} mono colors={colors} />
            {tx.counterparty && (
              <DetailRow label="Category" value={tx.counterparty} colors={colors} />
            )}
            {tx.fee !== undefined && tx.fee !== null && (
              <DetailRow
                label="Fee"
                value={`${tx.fee.toFixed(2)} ${tx.currency}`}
                colors={colors}
                last={!tx.rawTransactions?.length}
              />
            )}
          </View>

          {/* Ledger entries */}
          {tx.rawTransactions && tx.rawTransactions.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Ledger Entries</Text>
              <View style={[styles.detailsCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                {(tx.rawTransactions as any[]).map((entry, idx) => {
                  const fromName = entry.from?.name ?? entry.from?.organizationName ?? entry.from?.serial ?? '';
                  const toName = entry.to?.name ?? entry.to?.organizationName ?? entry.to?.serial ?? '';
                  const currCode = entry.from?.currency?.code ?? entry.to?.currency?.code ?? tx.currency;
                  const label = fromName && toName ? `${fromName} → ${toName}` : (entry.type ?? '');
                  const value = `${(entry.amount ?? 0).toFixed(2)} ${currCode}`;
                  return (
                    <DetailRow
                      key={entry.id ?? idx}
                      label={label}
                      value={value}
                      colors={colors}
                      last={idx === tx.rawTransactions!.length - 1}
                    />
                  );
                })}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  colors: typeof Colors.light;
  mono?: boolean;
  last?: boolean;
}

function DetailRow({ label, value, colors, mono, last }: DetailRowProps) {
  return (
    <View
      style={[
        styles.detailRow,
        { borderBottomColor: colors.border },
        last && styles.detailRowLast,
      ]}
    >
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          { color: colors.textPrimary },
          mono && { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 12 },
        ]}
        numberOfLines={mono ? 2 : 1}
        adjustsFontSizeToFit={!mono}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backBtn: { width: 70 },
  backText: { fontSize: 17 },
  title: { fontSize: 17, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15 },
  content: { paddingHorizontal: 16, gap: 12 },
  heroCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  heroAmount: { fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroType: { fontSize: 15 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '500', marginTop: 4, paddingHorizontal: 4 },
  detailsCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { fontSize: 15, flexShrink: 0 },
  detailValue: { fontSize: 15, fontWeight: '500', flex: 1, textAlign: 'right' },
});
