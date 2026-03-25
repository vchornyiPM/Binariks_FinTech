import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Transaction } from '@/types/api.types';

interface TransactionRowProps {
  transaction: Transaction;
  onPress: () => void;
}

const TYPE_ICONS: Record<string, { name: string; color: string }> = {
  TRANSFER:  { name: 'paperplane.fill', color: '#1A56DB' },
  EXCHANGE:  { name: 'arrow.left.arrow.right.circle.fill', color: '#B45309' },
  TOP_UP:    { name: 'plus.circle.fill', color: '#10823B' },
  WITHDRAW:  { name: 'arrow.down.circle.fill', color: '#9B1C1C' },
};

export function TransactionRow({ transaction, onPress }: TransactionRowProps) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const iconConfig = TYPE_ICONS[transaction.type] ?? TYPE_ICONS.TRANSFER;
  const isPositive = transaction.amount > 0;
  const amountColor = isPositive ? colors.successGreen : colors.errorRed;
  const amountPrefix = isPositive ? '+' : '';
  const formattedDate = new Date(transaction.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const formattedAmount = `${amountPrefix}${Math.abs(transaction.amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconConfig.color + '20' }]}>
        <IconSymbol name={iconConfig.name as any} size={20} color={iconConfig.color} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.counterparty, { color: colors.textPrimary }]} numberOfLines={1}>
          {transaction.counterparty ?? transaction.type}
        </Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{formattedDate}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>{formattedAmount}</Text>
        <Text style={[styles.currency, { color: colors.textSecondary }]}>{transaction.currency}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1 },
  counterparty: { fontSize: 15, fontWeight: '500' },
  date: { fontSize: 13, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 15, fontWeight: '600' },
  currency: { fontSize: 13, marginTop: 2 },
});
