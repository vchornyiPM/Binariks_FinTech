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
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTxStore } from '@/stores/tx.store';
import { TransactionRow } from '@/components/TransactionRow';
import { TransactionRowSkeleton } from '@/components/SkeletonLoader';

type FilterType = 'ALL' | 'TRANSFER' | 'EXCHANGE' | 'TOP_UP' | 'WITHDRAW';

/** Maps UI filter labels to the API's business-process type strings */
const FILTER_TYPES: Record<FilterType, string[] | undefined> = {
  ALL: undefined,
  TRANSFER: ['client_transaction_transfer'],
  EXCHANGE: ['client_transaction_exchange'],
  TOP_UP: ['client_transaction_topup', 'client_transaction_issue'],
  WITHDRAW: ['client_transaction_withdraw', 'client_transaction_redeem'],
};

const FILTERS: { label: string; value: FilterType }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Transfer', value: 'TRANSFER' },
  { label: 'Exchange', value: 'EXCHANGE' },
  { label: 'Top-Up', value: 'TOP_UP' },
  { label: 'Withdraw', value: 'WITHDRAW' },
];

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { transactions, loading, fetchTransactions, loadMore, setFilters } = useTxStore();
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const isFirstLoad = transactions.length === 0 && loading;
  const tabBarOffset = Platform.OS === 'ios' ? 83 : 60;

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleFilterChange = useCallback(
    (filter: FilterType) => {
      setActiveFilter(filter);
      setFilters({ types: FILTER_TYPES[filter] });
      fetchTransactions();
    },
    [setFilters, fetchTransactions]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, [fetchTransactions]);

  const handleEndReached = useCallback(() => {
    if (!loading) {
      loadMore();
    }
  }, [loading, loadMore]);

  const renderFooter = () => {
    if (!loading || transactions.length === 0) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primaryBlue} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Title */}
      <View style={[styles.titleRow, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>History</Text>
      </View>

      {/* Filter chips */}
      <FlatList
        data={FILTERS}
        horizontal
        keyExtractor={(item) => item.value}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        style={styles.filterScroll}
        renderItem={({ item }) => {
          const isActive = activeFilter === item.value;
          return (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive ? colors.primaryBlue : colors.cardBg,
                  borderColor: isActive ? colors.primaryBlue : colors.border,
                },
              ]}
              onPress={() => handleFilterChange(item.value)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.filterLabel,
                  { color: isActive ? '#fff' : colors.textSecondary },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* Transactions list */}
      {isFirstLoad ? (
        <View style={[styles.listCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {[1, 2, 3, 4, 5].map((k) => (
            <TransactionRowSkeleton key={k} />
          ))}
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions found</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.txList,
            { paddingBottom: insets.bottom + tabBarOffset },
          ]}
          style={[styles.listCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}
          renderItem={({ item }) => (
            <TransactionRow
              transaction={item}
              onPress={() => router.push(`/transaction/${item.id}` as any)}
            />
          )}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primaryBlue}
              colors={[colors.primaryBlue]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  titleRow: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  title: { fontSize: 34, fontWeight: '700' },
  filterScroll: { flexGrow: 0, marginBottom: 16 },
  filterList: { paddingHorizontal: 24, gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterLabel: { fontSize: 14, fontWeight: '500' },
  listCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    flex: 1,
  },
  txList: { flexGrow: 1 },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15 },
});
