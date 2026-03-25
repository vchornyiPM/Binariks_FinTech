import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUIStore } from '@/stores/ui.store';
import { invoiceService } from '@/services/invoice.service';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { TransactionRowSkeleton } from '@/components/SkeletonLoader';
import type { Invoice, InvoiceDirection } from '@/types/api.types';

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  initiated: { bg: '#EFF6FF', text: '#1D4ED8', label: 'Initiated' },
  pending:   { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
  approved:  { bg: '#D1FAE5', text: '#065F46', label: 'Approved' },
  paid:      { bg: '#D1FAE5', text: '#065F46', label: 'Paid' },
  declined:  { bg: '#FEE2E2', text: '#991B1B', label: 'Declined' },
  expired:   { bg: '#F3F4F6', text: '#6B7280', label: 'Expired' },
  hidden:    { bg: '#F3F4F6', text: '#6B7280', label: 'Hidden' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function InvoiceRow({ invoice, onPress, colors }: {
  invoice: Invoice;
  onPress: () => void;
  colors: typeof Colors.light;
}) {
  const status = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.hidden;
  const isIncoming = !!invoice.payerContact === false && !!invoice.merchantName;

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, { backgroundColor: colors.primaryBlue + '15' }]}>
        <IconSymbol name="doc.text.fill" size={18} color={colors.primaryBlue} />
      </View>
      <View style={styles.rowCenter}>
        <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>{invoice.name}</Text>
        <Text style={[styles.rowDate, { color: colors.textSecondary }]}>
          {invoice.payerContact ? `From: ${invoice.payerContact}` : invoice.merchantName ? `From: ${invoice.merchantName}` : formatDate(invoice.createdAt)}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={[styles.rowAmount, { color: colors.textPrimary }]} numberOfLines={1}>
          {invoice.currency.symbol}{invoice.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.text }]}>{status.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function InvoicesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { showToast } = useUIStore();

  const [direction, setDirection] = useState<InvoiceDirection>('incoming');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 20;

  const loadPage = useCallback(async (dir: InvoiceDirection, pageNum: number, append = false) => {
    try {
      const result = await invoiceService.viewInvoices(dir, pageNum, PAGE_SIZE);
      setInvoices((prev) => append ? [...prev, ...result.records] : result.records);
      setHasMore(result.records.length === PAGE_SIZE);
    } catch {
      showToast('Failed to load invoices.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    setLoading(true);
    setPage(0);
    loadPage(direction, 0, false).finally(() => setLoading(false));
  }, [direction, loadPage]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    await loadPage(direction, 0, false);
    setRefreshing(false);
  }, [direction, loadPage]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await loadPage(direction, nextPage, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, direction, loadPage]);

  const tabBarOffset = Platform.OS === 'ios' ? 84 : 64;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Invoices</Text>
        <TouchableOpacity
          onPress={() => router.push('/invoices/create' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol name="plus" size={22} color={colors.primaryBlue} />
        </TouchableOpacity>
      </View>

      {/* Direction tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {(['incoming', 'outgoing'] as InvoiceDirection[]).map((dir) => (
          <TouchableOpacity
            key={dir}
            style={[
              styles.tab,
              direction === dir && { borderBottomColor: colors.primaryBlue, borderBottomWidth: 2 },
            ]}
            onPress={() => setDirection(dir)}
            activeOpacity={0.75}
          >
            <Text style={[
              styles.tabText,
              { color: direction === dir ? colors.primaryBlue : colors.textSecondary },
            ]}>
              {dir === 'incoming' ? 'To Pay' : 'Sent'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={invoices}
        keyExtractor={(item) => item.identifier}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
            tintColor={colors.primaryBlue} colors={[colors.primaryBlue]} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingBottom: insets.bottom + tabBarOffset, flexGrow: 1 }}
        ListHeaderComponent={loading ? (
          <View style={[styles.listCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <TransactionRowSkeleton />
            <TransactionRowSkeleton />
            <TransactionRowSkeleton />
          </View>
        ) : null}
        ListEmptyComponent={!loading ? (
          <View style={styles.empty}>
            <IconSymbol name="doc.text" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {direction === 'incoming' ? 'No invoices to pay' : 'No invoices sent'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {direction === 'outgoing' && 'Tap + to request money from someone.'}
            </Text>
          </View>
        ) : null}
        ListFooterComponent={loadingMore ? (
          <ActivityIndicator color={colors.primaryBlue} style={{ paddingVertical: 16 }} />
        ) : null}
        renderItem={({ item, index }) => {
          const isLast = index === invoices.length - 1;
          return (
            <View style={index === 0 ? [styles.listCard, { backgroundColor: colors.cardBg, borderColor: colors.border }] : undefined}>
              <InvoiceRow
                invoice={item}
                colors={colors}
                onPress={() => router.push(`/invoices/${item.identifier}` as any)}
              />
              {isLast && <View style={{ height: 1 }} />}
            </View>
          );
        }}
        // Group all rows in one card
        ListHeaderComponentStyle={{ marginHorizontal: 16, marginTop: 12 }}
        style={{ marginHorizontal: 16, marginTop: 12 }}
      />
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

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 0,
  },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 15, fontWeight: '600' },

  listCard: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowCenter: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '600' },
  rowDate: { fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowAmount: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, textAlign: 'center' },
});
