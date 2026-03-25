import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWalletStore } from '@/stores/wallet.store';
import { useTxStore } from '@/stores/tx.store';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { walletService } from '@/services/wallet.service';
import { TransactionRowSkeleton } from '@/components/SkeletonLoader';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Coin, Transaction } from '@/types/api.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.44);

interface CurrencyOption {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function txInitials(tx: Transaction): string {
  if (tx.counterparty) {
    const words = tx.counterparty.trim().split(/\s+/);
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return (words[0].slice(0, 2)).toUpperCase();
  }
  const map: Record<string, string> = { TRANSFER: 'TR', EXCHANGE: 'EX', TOP_UP: 'TU', WITHDRAW: 'WD' };
  return map[tx.type] ?? tx.type.slice(0, 2).toUpperCase();
}

function txAvatarColor(type: string): string {
  const map: Record<string, string> = {
    TRANSFER: '#1A56DB',
    EXCHANGE: '#B45309',
    TOP_UP: '#10823B',
    WITHDRAW: '#9B1C1C',
  };
  return map[type] ?? '#6B7280';
}

function formatTxDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function dateSectionLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const txDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (txDay.getTime() === today.getTime()) return 'Today';
  if (txDay.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(txs: Transaction[]): { label: string; items: Transaction[] }[] {
  const groups: Record<string, Transaction[]> = {};
  for (const tx of txs) {
    const label = dateSectionLabel(tx.date);
    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  }
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
}

function typeLabel(type: string): string {
  const map: Record<string, string> = { TRANSFER: 'Transfer', EXCHANGE: 'Exchange', TOP_UP: 'Top-Up', WITHDRAW: 'Withdrawal' };
  return map[type] ?? type;
}

// ─── Quick Action Button ────────────────────────────────────────────────────

interface QuickActionProps {
  label: string;
  icon: string;
  onPress: () => void;
  outlined?: boolean;
  color: string;
}

function QuickAction({ label, icon, onPress, outlined, color }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.qaItem} onPress={onPress} activeOpacity={0.75}>
      <View style={[
        styles.qaIconBox,
        outlined
          ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: color + '50' }
          : { backgroundColor: color },
      ]}>
        <IconSymbol name={icon as any} size={20} color={outlined ? color : '#fff'} />
      </View>
      <Text style={[styles.qaLabel, { color: outlined ? color : '#6B7280' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Wallet Grid Card ───────────────────────────────────────────────────────

function WalletGridCard({
  coin, isSelected, onPress, onEdit, colors,
}: {
  coin: Coin;
  isSelected: boolean;
  onPress: () => void;
  onEdit: () => void;
  colors: typeof Colors.light;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.walletCard,
        {
          backgroundColor: isSelected ? colors.primaryBlue : colors.cardBg,
          borderColor: isSelected ? colors.primaryBlue : colors.border,
          width: CARD_WIDTH,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.walletCardTop}>
        <View style={[styles.currencyBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.border }]}>
          <Text style={[styles.currencyBadgeText, { color: isSelected ? '#fff' : colors.textPrimary }]}>
            {coin.currency.code}
          </Text>
        </View>
        <TouchableOpacity onPress={onEdit} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <IconSymbol name="ellipsis" size={16} color={isSelected ? 'rgba(255,255,255,0.7)' : colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.walletBalance, { color: isSelected ? '#fff' : colors.textPrimary }]} numberOfLines={1}>
        {coin.currency.symbol}{coin.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </Text>
      <View style={styles.walletCardBottom}>
        <Text style={[styles.walletName, { color: isSelected ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]} numberOfLines={1}>
          {coin.name}
        </Text>
        {coin.isMain && (
          <View style={[styles.mainBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : colors.primaryBlue + '18' }]}>
            <Text style={[styles.mainBadgeText, { color: isSelected ? '#fff' : colors.primaryBlue }]}>★ Main</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { coins, selectedCoin, loading: walletLoading, fetchCoins, createWallet, renameWallet, deleteWallet, setMainWallet, setSelectedCoin } = useWalletStore();
  const { transactions, loading: txLoading, fetchTransactions } = useTxStore();
  const { user } = useAuthStore();
  const { showToast } = useUIStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showAddWallet, setShowAddWallet] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<string | null>(null);
  const [walletName, setWalletName] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  // Edit wallet modal
  const [editingCoin, setEditingCoin] = useState<Coin | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingMain, setSettingMain] = useState(false);

  // Currency selector for total balance
  const allCurrencyCodes = useMemo(() => [...new Set(coins.map((c) => c.currency.code))], [coins]);
  const [displayCurrency, setDisplayCurrency] = useState<string | null>(null);
  const activeCurrency = displayCurrency ?? allCurrencyCodes[0] ?? null;

  useEffect(() => {
    if (allCurrencyCodes.length > 0 && !displayCurrency) {
      setDisplayCurrency(allCurrencyCodes[0]);
    }
  }, [allCurrencyCodes, displayCurrency]);

  const cycleCurrency = useCallback(() => {
    if (allCurrencyCodes.length <= 1) return;
    const idx = allCurrencyCodes.indexOf(activeCurrency ?? '');
    setDisplayCurrency(allCurrencyCodes[(idx + 1) % allCurrencyCodes.length]);
  }, [allCurrencyCodes, activeCurrency]);

  const totalForCurrency = useMemo(() => {
    return coins
      .filter((c) => c.currency.code === activeCurrency)
      .reduce((sum, c) => sum + c.availableBalance, 0);
  }, [coins, activeCurrency]);

  const currencySymbol = useMemo(() => {
    return coins.find((c) => c.currency.code === activeCurrency)?.currency.symbol ?? '';
  }, [coins, activeCurrency]);

  const recentTransactions = transactions.slice(0, 10);
  const txGroups = useMemo(() => groupByDate(recentTransactions), [recentTransactions]);
  const tabBarOffset = Platform.OS === 'ios' ? 84 : 64;

  const loadData = useCallback(async () => {
    await Promise.all([fetchCoins(), fetchTransactions()]);
  }, [fetchCoins, fetchTransactions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleOpenAddWallet = useCallback(async () => {
    setShowAddWallet(true);
    setWalletName('');
    setSelectedCurrencyId(null);
    setLoadingCurrencies(true);
    try {
      const list = await walletService.getCurrencies();
      setCurrencies(list);
      if (list.length > 0) setSelectedCurrencyId(list[0].id);
    } catch {
      showToast('Failed to load currencies.', 'error');
      setShowAddWallet(false);
    } finally {
      setLoadingCurrencies(false);
    }
  }, [showToast]);

  const handleCreateWallet = useCallback(async () => {
    if (!walletName.trim()) { showToast('Enter a wallet name.', 'warning'); return; }
    if (!selectedCurrencyId) { showToast('Select a currency.', 'warning'); return; }
    setCreating(true);
    try {
      await createWallet(walletName.trim(), selectedCurrencyId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast('Wallet created!', 'success');
      setShowAddWallet(false);
    } catch {
      showToast('Failed to create wallet.', 'error');
    } finally {
      setCreating(false);
    }
  }, [walletName, selectedCurrencyId, createWallet, showToast]);

  const handleOpenEdit = useCallback((coin: Coin) => {
    setEditingCoin(coin);
    setEditName(coin.name);
  }, []);

  const handleRename = useCallback(async () => {
    if (!editingCoin || !editName.trim()) return;
    setSaving(true);
    try {
      await renameWallet(editingCoin.coinSerial, editName.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast('Wallet renamed.', 'success');
      setEditingCoin(null);
    } catch {
      showToast('Failed to rename wallet.', 'error');
    } finally {
      setSaving(false);
    }
  }, [editingCoin, editName, renameWallet, showToast]);

  const handleDelete = useCallback(() => {
    if (!editingCoin) return;
    Alert.alert(
      'Delete Wallet',
      editingCoin.balance > 0
        ? `"${editingCoin.name}" has a balance of ${editingCoin.balance.toFixed(2)} ${editingCoin.currency.code}. Transfer the balance first.`
        : `Delete "${editingCoin.name}"? This cannot be undone.`,
      editingCoin.balance > 0
        ? [{ text: 'OK' }]
        : [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete', style: 'destructive',
              onPress: async () => {
                setDeleting(true);
                try {
                  await deleteWallet(editingCoin.coinSerial);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  showToast('Wallet deleted.', 'success');
                  setEditingCoin(null);
                } catch (err: unknown) {
                  const e = err as { response?: { data?: { message?: string } } };
                  showToast(e?.response?.data?.message ?? 'Failed to delete wallet.', 'error');
                } finally {
                  setDeleting(false);
                }
              },
            },
          ]
    );
  }, [editingCoin, deleteWallet, showToast]);

  const handleSetMain = useCallback(async () => {
    if (!editingCoin || editingCoin.isMain) return;
    setSettingMain(true);
    try {
      await setMainWallet(editingCoin.coinSerial);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast(`"${editingCoin.name}" set as main wallet.`, 'success');
      setEditingCoin(null);
    } catch {
      showToast('Failed to set main wallet.', 'error');
    } finally {
      setSettingMain(false);
    }
  }, [editingCoin, setMainWallet, showToast]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.firstName ?? user?.name ?? 'there';
  const isFirstLoad = coins.length === 0 && walletLoading;

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + tabBarOffset }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh}
            tintColor={colors.primaryBlue} colors={[colors.primaryBlue]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting()},</Text>
            <Text style={[styles.userName, { color: colors.textPrimary }]}>{displayName}</Text>
          </View>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primaryBlue }]}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ── Balance Hero ────────────────────────────────────── */}
        <View style={[styles.balanceCard, { backgroundColor: colors.primaryBlue }]}>
          <View style={styles.balanceTopRow}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            {activeCurrency && (
              <TouchableOpacity style={styles.currencyPill} onPress={cycleCurrency} activeOpacity={0.8}>
                <Text style={styles.currencyPillText}>{activeCurrency}</Text>
                {allCurrencyCodes.length > 1 && (
                  <IconSymbol name="chevron.down" size={12} color="rgba(255,255,255,0.9)" />
                )}
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.balanceAmount}>
            {currencySymbol}{totalForCurrency.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
        </View>

        {/* ── Wallet Grid ─────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>My Wallets</Text>
          <TouchableOpacity onPress={handleOpenAddWallet} activeOpacity={0.7}>
            <View style={[styles.addBtn, { backgroundColor: colors.primaryBlue + '18' }]}>
              <IconSymbol name="plus" size={14} color={colors.primaryBlue} />
              <Text style={[styles.addBtnText, { color: colors.primaryBlue }]}>Add</Text>
            </View>
          </TouchableOpacity>
        </View>

        {isFirstLoad ? (
          <FlatList
            horizontal
            data={[0, 1, 2]}
            keyExtractor={(i) => String(i)}
            contentContainerStyle={styles.cardList}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            renderItem={() => (
              <View style={[styles.walletCardSkeleton, { backgroundColor: colors.cardBg, borderColor: colors.border }]} />
            )}
          />
        ) : coins.length === 0 ? (
          <TouchableOpacity
            style={[styles.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.primaryBlue }]}
            onPress={handleOpenAddWallet}
            activeOpacity={0.8}
          >
            <IconSymbol name="plus.circle.fill" size={28} color={colors.primaryBlue} />
            <Text style={[styles.emptyCardText, { color: colors.primaryBlue }]}>Create your first wallet</Text>
          </TouchableOpacity>
        ) : (
          <FlatList
            horizontal
            data={coins}
            keyExtractor={(item) => item.coinSerial}
            contentContainerStyle={styles.cardList}
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + 10}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <WalletGridCard
                coin={item}
                isSelected={selectedCoin?.coinSerial === item.coinSerial}
                onPress={() => {
                  setSelectedCoin(item);
                  if (Platform.OS === 'ios') Haptics.selectionAsync();
                }}
                onEdit={() => handleOpenEdit(item)}
                colors={colors}
              />
            )}
          />
        )}

        {/* ── Quick Actions ───────────────────────────────────── */}
        <View style={[styles.qaRow, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <QuickAction label="Send" icon="arrow.up" color={colors.primaryBlue}
            onPress={() => router.push('/send-money' as any)} />
          <QuickAction label="Add" icon="plus" color={colors.primaryBlue}
            onPress={handleOpenAddWallet} />
          <QuickAction label="Exchange" icon="arrow.left.arrow.right.circle.fill" color={colors.primaryBlue}
            onPress={() => router.push('/(tabs)/exchange' as any)} />
          <QuickAction label="Request" icon="arrow.down" color={colors.primaryBlue}
            onPress={() => router.push('/invoices/create' as any)} />
          <QuickAction label="Analytics" icon="chart.pie.fill" color={colors.primaryBlue} outlined
            onPress={() => router.push('/analytics' as any)} />
        </View>

        {/* ── Transactions ────────────────────────────────────── */}
        <View style={styles.txHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history' as any)}>
            <Text style={[styles.seeAll, { color: colors.primaryBlue }]}>See all</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.txCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          {txLoading && transactions.length === 0 ? (
            <>
              <TransactionRowSkeleton />
              <TransactionRowSkeleton />
              <TransactionRowSkeleton />
            </>
          ) : recentTransactions.length === 0 ? (
            <View style={styles.emptyTx}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No transactions yet</Text>
            </View>
          ) : (
            txGroups.map((group) => (
              <View key={group.label}>
                {/* Date separator */}
                <View style={[styles.dateSep, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.dateSepText, { color: colors.textSecondary }]}>{group.label}</Text>
                </View>

                {group.items.map((tx, idx) => {
                  const initials = txInitials(tx);
                  const avatarBg = txAvatarColor(tx.type);
                  const isPositive = tx.amount >= 0;
                  const amountStr = `${isPositive ? '+' : ''}${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${tx.currency}`;
                  const isLast = idx === group.items.length - 1;

                  return (
                    <TouchableOpacity
                      key={tx.id}
                      style={[
                        styles.txRow,
                        { borderBottomColor: colors.border },
                        isLast && styles.txRowLast,
                      ]}
                      onPress={() => router.push(`/transaction/${tx.id}` as any)}
                      activeOpacity={0.7}
                    >
                      {/* Avatar */}
                      <View style={[styles.txAvatar, { backgroundColor: avatarBg + '20' }]}>
                        <Text style={[styles.txAvatarText, { color: avatarBg }]}>{initials}</Text>
                      </View>

                      {/* Center */}
                      <View style={styles.txCenter}>
                        <Text style={[styles.txName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {tx.counterparty ?? typeLabel(tx.type)}
                        </Text>
                        <Text style={[styles.txType, { color: colors.textSecondary }]}>
                          {typeLabel(tx.type)} · {formatTxDate(tx.date)}
                        </Text>
                      </View>

                      {/* Amount */}
                      <Text style={[styles.txAmount, { color: isPositive ? colors.successGreen : colors.errorRed }]}>
                        {amountStr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Edit Wallet Modal ──────────────────────────────────── */}
      <Modal visible={!!editingCoin} transparent animationType="slide" onRequestClose={() => setEditingCoin(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setEditingCoin(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Edit Wallet</Text>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Wallet name</Text>
            <TextInput
              style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.cardBg }]}
              value={editName} onChangeText={setEditName}
              placeholder="Wallet name" placeholderTextColor={colors.textSecondary} autoFocus
            />
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: saving ? colors.border : colors.primaryBlue, marginBottom: 12 }]}
              onPress={handleRename} disabled={saving || !editName.trim()} activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Save Name</Text>}
            </TouchableOpacity>
            {!editingCoin?.isMain && (
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: colors.primaryBlue, marginBottom: 12 }]}
                onPress={handleSetMain} disabled={settingMain} activeOpacity={0.85}
              >
                {settingMain
                  ? <ActivityIndicator color={colors.primaryBlue} />
                  : <Text style={[styles.outlineBtnText, { color: colors.primaryBlue }]}>★ Set as Main Wallet</Text>}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: colors.errorRed }]}
              onPress={handleDelete} disabled={deleting} activeOpacity={0.85}
            >
              {deleting ? <ActivityIndicator color={colors.errorRed} /> : <Text style={[styles.outlineBtnText, { color: colors.errorRed }]}>Delete Wallet</Text>}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Add Wallet Modal ───────────────────────────────────── */}
      <Modal visible={showAddWallet} transparent animationType="slide" onRequestClose={() => setShowAddWallet(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setShowAddWallet(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.sheet, { backgroundColor: colors.background }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>New Wallet</Text>
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Wallet name</Text>
            <TextInput
              style={[styles.fieldInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.cardBg }]}
              value={walletName} onChangeText={setWalletName}
              placeholder="e.g. My EUR Wallet" placeholderTextColor={colors.textSecondary} autoFocus
            />
            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Currency</Text>
            {loadingCurrencies ? (
              <ActivityIndicator color={colors.primaryBlue} style={{ marginVertical: 16 }} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}
                style={styles.currencyScroll} contentContainerStyle={styles.currencyList}>
                {currencies.map((c) => {
                  const sel = selectedCurrencyId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.currencyChip, {
                        backgroundColor: sel ? colors.primaryBlue : colors.cardBg,
                        borderColor: sel ? colors.primaryBlue : colors.border,
                      }]}
                      onPress={() => setSelectedCurrencyId(c.id)}
                    >
                      <Text style={{ color: sel ? '#fff' : colors.textPrimary, fontWeight: '600', fontSize: 13 }}>{c.code}</Text>
                      <Text style={{ color: sel ? 'rgba(255,255,255,0.75)' : colors.textSecondary, fontSize: 11, marginTop: 2 }}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: creating ? colors.border : colors.primaryBlue }]}
              onPress={handleCreateWallet} disabled={creating} activeOpacity={0.85}
            >
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Create Wallet</Text>}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 20,
  },
  greeting: { fontSize: 13, fontWeight: '400' },
  userName: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Balance hero
  balanceCard: {
    marginHorizontal: 24, borderRadius: 20, padding: 20, marginBottom: 24,
    shadowColor: '#1A56DB', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 12, elevation: 6,
  },
  balanceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  balanceLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '500' },
  currencyPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  currencyPillText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  balanceAmount: { color: '#fff', fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },

  // Section headers
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  addBtnText: { fontSize: 13, fontWeight: '600' },

  // Wallet list
  cardList: { paddingHorizontal: 24, gap: 10, paddingBottom: 4, marginBottom: 16 },
  walletCard: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    padding: 14, gap: 6,
  },
  walletCardSkeleton: {
    width: CARD_WIDTH, height: 100, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
  },
  walletCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  currencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  currencyBadgeText: { fontSize: 12, fontWeight: '700' },
  walletBalance: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  walletCardBottom: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  walletName: { fontSize: 12 },
  mainBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  mainBadgeText: { fontSize: 10, fontWeight: '700' },
  emptyCard: {
    marginHorizontal: 24, height: 100, borderRadius: 16, borderWidth: 1.5,
    borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, gap: 8,
  },
  emptyCardText: { fontSize: 15, fontWeight: '600' },

  // Quick actions
  qaRow: {
    flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start',
    marginHorizontal: 24, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16, paddingHorizontal: 8, marginBottom: 24,
  },
  qaItem: { alignItems: 'center', gap: 6, flex: 1 },
  qaIconBox: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  qaLabel: { fontSize: 11, fontWeight: '500' },

  // Transactions
  txHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, marginBottom: 12,
  },
  seeAll: { fontSize: 15, fontWeight: '500' },
  txCard: {
    marginHorizontal: 24, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden', marginBottom: 16,
  },
  dateSep: {
    paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  dateSepText: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  txRowLast: { borderBottomWidth: 0 },
  txAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  txAvatarText: { fontSize: 14, fontWeight: '700' },
  txCenter: { flex: 1 },
  txName: { fontSize: 15, fontWeight: '600' },
  txType: { fontSize: 12, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700', textAlign: 'right', flexShrink: 0 },
  emptyTx: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 15 },

  // Modals
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  fieldInput: {
    height: 48, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, fontSize: 16, marginBottom: 16,
  },
  primaryBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  outlineBtn: { height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontSize: 17, fontWeight: '600' },
  currencyScroll: { flexGrow: 0, marginBottom: 24 },
  currencyList: { gap: 8 },
  currencyChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, alignItems: 'center', minWidth: 70,
  },
});
