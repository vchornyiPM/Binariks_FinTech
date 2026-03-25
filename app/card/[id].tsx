import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUIStore } from '@/stores/ui.store';
import { cardsService } from '@/services/cards.service';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { InSystemCard } from '@/types/api.types';

function maskCardNumber(num: string): string {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 4) return num;
  const last4 = digits.slice(-4);
  const groups = Math.ceil((digits.length - 4) / 4);
  const masked = Array(groups).fill('••••').join(' ');
  return `${masked} ${last4}`;
}

function statusColor(status: string, colors: typeof Colors.light) {
  switch (status.toLowerCase()) {
    case 'active': return { bg: '#D1FAE5', text: '#065F46' };
    case 'blocked': return { bg: '#FEF3C7', text: '#92400E' };
    case 'closed': return { bg: '#F3F4F6', text: colors.textSecondary };
    default: return { bg: '#F3F4F6', text: colors.textSecondary };
  }
}

export default function CardDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { showToast } = useUIStore();

  const [card, setCard] = useState<InSystemCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    cardsService.getCard(id)
      .then(setCard)
      .catch(() => showToast('Failed to load card.', 'error'))
      .finally(() => setLoading(false));
  }, [id, showToast]);

  const handleDelete = useCallback(() => {
    if (!card) return;
    Alert.alert(
      'Delete Card',
      `Delete card ending in ${card.number.slice(-4)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await cardsService.deleteCard(card.number);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              showToast('Card deleted.', 'success');
              router.back();
            } catch (err: any) {
              const msg = err?.response?.data?.message ?? 'Failed to delete card.';
              showToast(msg, 'error');
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [card, showToast, router]);

  const statusStyle = card ? statusColor(card.status, colors) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Card Details</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryBlue} style={{ marginTop: 60 }} />
      ) : !card ? (
        <View style={styles.emptyState}>
          <IconSymbol name="creditcard" size={40} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Card not found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Card visual */}
          <LinearGradient
            colors={['#1A56DB', '#0E4D99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardVisual}
          >
            {/* Card chip */}
            <View style={styles.chip}>
              <View style={styles.chipInner} />
            </View>

            {/* Card number */}
            <Text style={styles.cardNumber}>{maskCardNumber(card.number)}</Text>

            {/* Footer row */}
            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.cardFooterLabel}>LINKED WALLET</Text>
                <Text style={styles.cardFooterValue} numberOfLines={1}>{card.coinSerial}</Text>
              </View>
              {card.expiryDate && (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardFooterLabel}>EXPIRES</Text>
                  <Text style={styles.cardFooterValue}>{card.expiryDate}</Text>
                </View>
              )}
            </View>

            {/* Brand watermark */}
            <View style={styles.brandMark}>
              <View style={[styles.brandCircle, { opacity: 0.6 }]} />
              <View style={[styles.brandCircle, { marginLeft: -14, opacity: 0.9 }]} />
            </View>
          </LinearGradient>

          {/* Status + details */}
          <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <DetailRow
              label="Status"
              colors={colors}
              valueNode={
                statusStyle ? (
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {card.status.charAt(0).toUpperCase() + card.status.slice(1)}
                    </Text>
                  </View>
                ) : null
              }
            />
            <DetailRow label="Card number" value={maskCardNumber(card.number)} colors={colors} mono />
            <DetailRow label="Linked wallet" value={card.coinSerial} colors={colors} mono />
            {card.name && <DetailRow label="Card name" value={card.name} colors={colors} />}
            {card.expiryDate && <DetailRow label="Expires" value={card.expiryDate} colors={colors} last />}
            {!card.expiryDate && <DetailRow label="Card ID" value={card.id} colors={colors} mono last />}
          </View>

          {/* Delete */}
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.errorRed }]}
            onPress={handleDelete}
            disabled={deleting}
            activeOpacity={0.75}
          >
            {deleting
              ? <ActivityIndicator color={colors.errorRed} />
              : (
                <>
                  <IconSymbol name="trash" size={16} color={colors.errorRed} />
                  <Text style={[styles.deleteBtnText, { color: colors.errorRed }]}>Delete Card</Text>
                </>
              )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

interface DetailRowProps {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  colors: typeof Colors.light;
  mono?: boolean;
  last?: boolean;
}

function DetailRow({ label, value, valueNode, colors, mono, last }: DetailRowProps) {
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }, last && styles.detailRowLast]}>
      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{label}</Text>
      {valueNode ?? (
        <Text
          style={[styles.detailValue, { color: colors.textPrimary }, mono && styles.detailMono]}
          numberOfLines={1}
        >
          {value ?? '—'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  body: { padding: 20, gap: 16, paddingBottom: 40 },

  // Card visual
  cardVisual: {
    borderRadius: 20,
    padding: 24,
    height: 200,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  chip: {
    width: 36,
    height: 28,
    borderRadius: 5,
    backgroundColor: '#F5C518',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipInner: {
    width: 22,
    height: 18,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#C9A200',
  },
  cardNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  cardFooterLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  cardFooterValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 160,
  },
  brandMark: {
    position: 'absolute',
    right: 20,
    top: 20,
    flexDirection: 'row',
  },
  brandCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // Detail rows
  section: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  detailRowLast: { borderBottomWidth: 0 },
  detailLabel: { fontSize: 15 },
  detailValue: { fontSize: 15, fontWeight: '500', flex: 1, textAlign: 'right' },
  detailMono: { fontVariant: ['tabular-nums'] },

  // Status badge
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 13, fontWeight: '600' },

  // Delete button
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  deleteBtnText: { fontSize: 17, fontWeight: '600' },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 16 },
});
