import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWalletStore } from '@/stores/wallet.store';
import { useUIStore } from '@/stores/ui.store';
import { cardsService } from '@/services/cards.service';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { InSystemCard, Coin } from '@/types/api.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = SCREEN_WIDTH - 64;
const CARD_H = Math.round(CARD_W * 0.585);

function maskNumber(num: string): string {
  const digits = num.replace(/\D/g, '');
  if (digits.length < 4) return num;
  const last4 = digits.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

function statusConfig(status: string) {
  switch (status.toLowerCase()) {
    case 'active':  return { bg: 'rgba(16,130,59,0.15)', text: '#10823B', label: 'Active' };
    case 'blocked': return { bg: 'rgba(180,83,9,0.15)', text: '#B45309', label: 'Blocked' };
    case 'closed':  return { bg: 'rgba(107,114,128,0.15)', text: '#6B7280', label: 'Closed' };
    default:        return { bg: 'rgba(107,114,128,0.15)', text: '#6B7280', label: status };
  }
}

interface CardVisualProps {
  card: InSystemCard;
  walletName?: string;
  onPress: () => void;
  onLongPress: () => void;
}

function CardVisual({ card, walletName, onPress, onLongPress }: CardVisualProps) {
  const sc = statusConfig(card.status);
  return (
    <TouchableOpacity onPress={onPress} onLongPress={onLongPress} activeOpacity={0.9} delayLongPress={500}>
      <LinearGradient
        colors={['#1A56DB', '#0E4D99', '#0A3A7A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.cardVisual, { width: CARD_W, height: CARD_H }]}
      >
        {/* Top row */}
        <View style={styles.cardTop}>
          <Text style={styles.cardBrand}>SDK.Finance</Text>
          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>{sc.label}</Text>
          </View>
        </View>

        {/* Chip */}
        <View style={styles.chip}>
          <View style={styles.chipLeft} />
          <View style={styles.chipRight} />
        </View>

        {/* Card number */}
        <Text style={styles.cardNumber}>{maskNumber(card.number)}</Text>

        {/* Bottom row */}
        <View style={styles.cardBottom}>
          <View>
            <Text style={styles.cardMeta}>WALLET</Text>
            <Text style={styles.cardMetaValue} numberOfLines={1}>{walletName ?? card.coinSerial}</Text>
          </View>
          {card.expiryDate && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cardMeta}>EXPIRES</Text>
              <Text style={styles.cardMetaValue}>{card.expiryDate}</Text>
            </View>
          )}
        </View>

        {/* Decorative circle */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function CardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { coins } = useWalletStore();
  const { showToast } = useUIStore();

  const [cards, setCards] = useState<InSystemCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(coins[0] ?? null);

  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = ['40%'];

  const load = useCallback(async () => {
    try {
      const result = await cardsService.getMyCards();
      setCards(result);
    } catch {
      showToast('Failed to load cards.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openAddSheet = useCallback(() => {
    sheetRef.current?.expand();
  }, []);

  const handleCreate = useCallback(async () => {
    if (!selectedCoin) return;
    setCreating(true);
    try {
      const newCard = await cardsService.createCard(selectedCoin.coinSerial);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCards((prev) => [newCard, ...prev]);
      showToast('Card created successfully!', 'success');
      sheetRef.current?.close();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to create card.';
      showToast(msg, 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setCreating(false);
    }
  }, [selectedCoin, showToast]);

  const handleDelete = useCallback((card: InSystemCard) => {
    Alert.alert(
      'Delete Card',
      `Delete card ending in ${card.number.slice(-4)}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await cardsService.deleteCard(card.number);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              setCards((prev) => prev.filter((c) => c.id !== card.id));
              showToast('Card deleted.', 'success');
            } catch (err: any) {
              const msg = err?.response?.data?.message ?? 'Failed to delete card.';
              showToast(msg, 'error');
            }
          },
        },
      ]
    );
  }, [showToast]);

  const walletMap = Object.fromEntries(coins.map((c) => [c.coinSerial, c.name]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Cards</Text>
        <TouchableOpacity onPress={openAddSheet} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="plus" size={22} color={colors.primaryBlue} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primaryBlue} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
              tintColor={colors.primaryBlue} colors={[colors.primaryBlue]} />
          }
          showsVerticalScrollIndicator={false}
        >
          {cards.length === 0 ? (
            <View style={styles.empty}>
              <IconSymbol name="creditcard" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No cards yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Tap + to add a virtual card linked to one of your wallets.
              </Text>
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: colors.primaryBlue }]}
                onPress={openAddSheet}
                activeOpacity={0.85}
              >
                <IconSymbol name="plus" size={16} color="#fff" />
                <Text style={styles.addBtnText}>Add Card</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardList}>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                Tap to view details · Hold to delete
              </Text>
              {cards.map((card) => (
                <CardVisual
                  key={card.id}
                  card={card}
                  walletName={walletMap[card.coinSerial]}
                  onPress={() => router.push(`/card/${card.id}` as any)}
                  onLongPress={() => handleDelete(card)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Card Bottom Sheet */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
        )}
        backgroundStyle={{ backgroundColor: colors.cardBg }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Add New Card</Text>
          <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
            Select the wallet to link this card to:
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coinChips}>
            {coins.map((coin) => {
              const sel = selectedCoin?.coinSerial === coin.coinSerial;
              return (
                <TouchableOpacity
                  key={coin.coinSerial}
                  style={[styles.coinChip, {
                    backgroundColor: sel ? colors.primaryBlue : colors.background,
                    borderColor: sel ? colors.primaryBlue : colors.border,
                  }]}
                  onPress={() => setSelectedCoin(coin)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.coinChipCode, { color: sel ? '#fff' : colors.textPrimary }]}>
                    {coin.currency.code}
                  </Text>
                  <Text style={[styles.coinChipName, { color: sel ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]}
                    numberOfLines={1}>
                    {coin.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: creating ? colors.border : colors.primaryBlue }]}
            onPress={handleCreate}
            disabled={creating || !selectedCoin}
            activeOpacity={0.85}
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <IconSymbol name="creditcard.fill" size={17} color="#fff" />
                  <Text style={styles.createBtnText}>Create Card</Text>
                </>
              )}
          </TouchableOpacity>
        </BottomSheetView>
      </BottomSheet>
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

  body: { padding: 20, gap: 16, flexGrow: 1 },

  cardList: { alignItems: 'center', gap: 20 },
  hint: { fontSize: 12, marginBottom: 4 },

  // Card visual
  cardVisual: {
    borderRadius: 20, padding: 20,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBrand: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },

  chip: {
    flexDirection: 'row', width: 34, height: 26, borderRadius: 4,
    backgroundColor: '#D4A843', overflow: 'hidden', marginTop: 16,
  },
  chipLeft: { flex: 1, backgroundColor: '#C99A35' },
  chipRight: { flex: 1, backgroundColor: '#E0BC5A' },

  cardNumber: {
    color: '#fff', fontSize: 18, fontWeight: '600',
    letterSpacing: 2, marginTop: 16,
    fontVariant: ['tabular-nums'],
  },
  cardBottom: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', marginTop: 16,
  },
  cardMeta: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  cardMetaValue: { color: '#fff', fontSize: 13, fontWeight: '600', marginTop: 2 },

  decorCircle1: {
    position: 'absolute', right: -30, top: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute', right: 40, bottom: -50,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8,
  },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Bottom sheet
  sheet: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  sheetSubtitle: { fontSize: 14, marginTop: -8 },
  coinChips: { gap: 10, paddingVertical: 4 },
  coinChip: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, minWidth: 80, alignItems: 'center',
  },
  coinChipCode: { fontSize: 14, fontWeight: '700' },
  coinChipName: { fontSize: 11, marginTop: 2 },
  createBtn: {
    height: 52, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 4,
  },
  createBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
