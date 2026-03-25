import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VictoryPie, VictoryBar, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWalletStore } from '@/stores/wallet.store';
import { reportingService, type OutflowCategory, type FundsFlowResponse } from '@/services/reporting.service';
import { IconSymbol } from '@/components/ui/icon-symbol';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Period = 'week' | 'month' | '3months';

const PERIOD_OPTIONS: { label: string; value: Period }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: '3 Months', value: '3months' },
];

const CHART_COLORS = [
  '#1A56DB', '#10823B', '#B45309', '#7C3AED', '#DB2777',
  '#0891B2', '#65A30D', '#EA580C', '#9333EA', '#E11D48',
];

const CATEGORY_LABELS: Record<string, string> = {
  client_transaction_transfer: 'Transfer',
  client_transaction_exchange: 'Exchange',
  client_transaction_withdraw: 'Withdraw',
  client_transaction_top_up: 'Top Up',
  client_transaction_fee: 'Fees',
  client_transaction_invoice: 'Invoice',
  other: 'Other',
};

function getCategoryLabel(id: string): string {
  return CATEGORY_LABELS[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function getDateRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  const from = new Date(now);
  if (period === 'week') from.setDate(now.getDate() - 7);
  else if (period === 'month') from.setMonth(now.getMonth() - 1);
  else from.setMonth(now.getMonth() - 3);
  return { from: from.toISOString().split('T')[0], to };
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { coins } = useWalletStore();

  const [period, setPeriod] = useState<Period>('month');
  const [outflows, setOutflows] = useState<OutflowCategory[]>([]);
  const [fundsFlow, setFundsFlow] = useState<FundsFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Use the primary coin's currency, or fall back to USD
  const currency = coins[0]?.currency.code ?? 'USD';
  const symbol = coins[0]?.currency.symbol ?? '$';

  const load = useCallback(async (p: Period) => {
    setLoading(true);
    const { from, to } = getDateRange(p);
    try {
      const [outflowData, flowData] = await Promise.all([
        reportingService.getOutflows({ from, to, currency }),
        reportingService.getFundsFlow({ from, to, currency }),
      ]);
      setOutflows(outflowData.records ?? []);
      setFundsFlow(flowData);
    } catch {
      setOutflows([]);
      setFundsFlow(null);
    } finally {
      setLoading(false);
    }
  }, [currency]);

  useEffect(() => {
    load(period);
  }, [period, load]);

  const hasData = outflows.length > 0;
  const totalOut = fundsFlow?.outflowSum ?? 0;
  const totalIn = fundsFlow?.inflowSum ?? 0;
  const net = totalIn - totalOut;

  // Build pie data
  const pieData = outflows.slice(0, 8).map((item, i) => ({
    x: getCategoryLabel(item.categoryId),
    y: Math.abs(item.sum),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  // Build bar data (simplified: inflow vs outflow as two bars)
  const barData = [
    { x: 'Inflow', y: totalIn, color: colors.successGreen },
    { x: 'Outflow', y: Math.abs(totalOut), color: colors.primaryBlue },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Analytics</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Period selector */}
      <View style={[styles.periodRow, { borderBottomColor: colors.border }]}>
        {PERIOD_OPTIONS.map((opt) => {
          const active = period === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.periodChip,
                { backgroundColor: active ? colors.primaryBlue : colors.cardBg, borderColor: active ? colors.primaryBlue : colors.border },
              ]}
              onPress={() => setPeriod(opt.value)}
              activeOpacity={0.75}
            >
              <Text style={[styles.periodChipText, { color: active ? '#fff' : colors.textSecondary }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryBlue} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary row */}
          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <SummaryItem label="Total In" value={`${symbol}${totalIn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color={colors.successGreen} />
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <SummaryItem label="Total Out" value={`${symbol}${Math.abs(totalOut).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color={colors.primaryBlue} />
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <SummaryItem
              label="Net"
              value={`${net >= 0 ? '+' : ''}${symbol}${net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              color={net >= 0 ? colors.successGreen : colors.errorRed}
            />
          </View>

          {!hasData ? (
            <View style={styles.empty}>
              <IconSymbol name="chart.pie" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No activity yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Make some transactions to see your spending breakdown.
              </Text>
            </View>
          ) : (
            <>
              {/* Donut chart */}
              <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Spending Breakdown</Text>
                <View style={styles.pieWrapper}>
                  <VictoryPie
                    data={pieData}
                    width={SCREEN_WIDTH - 64}
                    height={220}
                    innerRadius={60}
                    padAngle={2}
                    style={{
                      data: { fill: ({ datum }: any) => datum.color },
                      labels: { display: 'none' },
                    }}
                    labels={() => ''}
                  />
                  {/* Center label */}
                  <View style={styles.pieCenter}>
                    <Text style={[styles.pieCenterLabel, { color: colors.textSecondary }]}>Outflows</Text>
                    <Text style={[styles.pieCenterAmount, { color: colors.textPrimary }]}>
                      {symbol}{Math.abs(totalOut).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </Text>
                  </View>
                </View>

                {/* Legend */}
                <View style={styles.legend}>
                  {pieData.map((item) => (
                    <View key={item.x} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={[styles.legendLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.x}
                      </Text>
                      <Text style={[styles.legendValue, { color: colors.textPrimary }]}>
                        {symbol}{item.y.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Bar chart: inflow vs outflow */}
              <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Income vs Spending</Text>
                <VictoryChart
                  theme={VictoryTheme.material}
                  width={SCREEN_WIDTH - 64}
                  height={200}
                  padding={{ top: 20, bottom: 40, left: 60, right: 20 }}
                  domainPadding={{ x: 40 }}
                >
                  <VictoryAxis
                    style={{
                      axis: { stroke: colors.border },
                      tickLabels: { fill: colors.textSecondary, fontSize: 12 },
                      grid: { stroke: 'transparent' },
                    }}
                  />
                  <VictoryAxis
                    dependentAxis
                    style={{
                      axis: { stroke: colors.border },
                      tickLabels: { fill: colors.textSecondary, fontSize: 10 },
                      grid: { stroke: colors.border, strokeDasharray: '4,4', strokeOpacity: 0.5 },
                    }}
                    tickFormat={(t: number) => `${symbol}${t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}`}
                  />
                  <VictoryBar
                    data={barData}
                    style={{ data: { fill: ({ datum }: any) => datum.color, borderRadius: 4 } }}
                    cornerRadius={{ top: 4 }}
                    barWidth={48}
                  />
                </VictoryChart>

                {/* Legend */}
                <View style={[styles.barLegend]}>
                  <View style={styles.barLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.successGreen }]} />
                    <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Inflow</Text>
                  </View>
                  <View style={styles.barLegendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primaryBlue }]} />
                    <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>Outflow</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function SummaryItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryLabel, { color }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color }]} numberOfLines={1} adjustsFontSizeToFit>
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

  periodRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  periodChip: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  periodChipText: { fontSize: 14, fontWeight: '600' },

  body: { padding: 20, gap: 16 },

  summaryCard: {
    flexDirection: 'row', borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
  summaryDivider: { width: StyleSheet.hairlineWidth },
  summaryLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  summaryValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },

  section: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    padding: 16, gap: 12, overflow: 'hidden',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  pieWrapper: { alignItems: 'center', position: 'relative' },
  pieCenter: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
  },
  pieCenterLabel: { fontSize: 12, fontWeight: '500' },
  pieCenterAmount: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },

  legend: { gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  legendLabel: { flex: 1, fontSize: 13 },
  legendValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },

  barLegend: { flexDirection: 'row', gap: 20, justifyContent: 'center' },
  barLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  empty: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
