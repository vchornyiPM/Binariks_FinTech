import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useWalletStore } from '@/stores/wallet.store';
import { useUIStore } from '@/stores/ui.store';
import { invoiceService } from '@/services/invoice.service';
import { IconSymbol } from '@/components/ui/icon-symbol';
import type { Invoice } from '@/types/api.types';

// Default expiry = 7 days from now
function defaultExpiry(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString();
}

export default function CreateInvoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = Colors[useColorScheme() ?? 'light'];
  const { coins } = useWalletStore();
  const { showToast } = useUIStore();

  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdInvoice, setCreatedInvoice] = useState<Invoice | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [payerContact, setPayerContact] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCoinSerial, setSelectedCoinSerial] = useState<string>(coins[0]?.coinSerial ?? '');
  const [creating, setCreating] = useState(false);

  const selectedCoin = useMemo(
    () => coins.find((c) => c.coinSerial === selectedCoinSerial) ?? coins[0],
    [coins, selectedCoinSerial]
  );

  const numericAmount = parseFloat(amount.replace(',', '.'));
  const isAmountValid = !isNaN(numericAmount) && numericAmount > 0;
  const canCreate = name.trim().length > 0 && isAmountValid && !!selectedCoin;

  const handleCreate = useCallback(async () => {
    if (!canCreate || !selectedCoin) return;
    setCreating(true);
    try {
      const invoice = await invoiceService.createInvoice({
        name: name.trim(),
        recipientCoin: selectedCoin.coinSerial,
        amount: numericAmount,
        expiresAt: defaultExpiry(),
        payerContact: payerContact.trim() || undefined,
        description: description.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCreatedInvoice(invoice);
      setStep('success');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to create invoice.';
      showToast(msg, 'error');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setCreating(false);
    }
  }, [canCreate, selectedCoin, name, numericAmount, payerContact, description, showToast]);

  // ─── Success screen ─────────────────────────────────────────────────────────
  if (step === 'success' && createdInvoice) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Invoice Created</Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.successBody}>
          <View style={[styles.successIcon, { backgroundColor: colors.successGreen + '20' }]}>
            <IconSymbol name="checkmark.circle.fill" size={56} color={colors.successGreen} />
          </View>
          <Text style={[styles.successTitle, { color: colors.textPrimary }]}>Invoice Sent!</Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            {createdInvoice.payerContact
              ? `A request has been sent to ${createdInvoice.payerContact}.`
              : 'Your invoice has been created successfully.'}
          </Text>

          <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
            <SummaryRow label="Invoice" value={createdInvoice.name} colors={colors} />
            <SummaryRow
              label="Amount"
              value={`${createdInvoice.currency.symbol}${createdInvoice.totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${createdInvoice.currency.code}`}
              colors={colors}
            />
            <SummaryRow label="Status" value={createdInvoice.status} colors={colors} />
            <SummaryRow label="Reference" value={`#${createdInvoice.identifier}`} colors={colors} mono last />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primaryBlue }]}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.primaryBlue }]}
            onPress={() => router.replace('/invoices' as any)}
            activeOpacity={0.85}
          >
            <Text style={[styles.outlineBtnText, { color: colors.primaryBlue }]}>View All Invoices</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Form screen ────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <IconSymbol name="xmark" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Request Money</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Receive-to wallet selector */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Receive to</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {coins.map((coin) => {
            const sel = coin.coinSerial === selectedCoinSerial;
            return (
              <TouchableOpacity
                key={coin.coinSerial}
                style={[styles.chip, {
                  backgroundColor: sel ? colors.primaryBlue : colors.cardBg,
                  borderColor: sel ? colors.primaryBlue : colors.border,
                }]}
                onPress={() => setSelectedCoinSerial(coin.coinSerial)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipCurrency, { color: sel ? '#fff' : colors.textPrimary }]}>{coin.currency.code}</Text>
                <Text style={[styles.chipName, { color: sel ? 'rgba(255,255,255,0.75)' : colors.textSecondary }]} numberOfLines={1}>
                  {coin.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Invoice name */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Invoice name *</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.textPrimary }]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Payment for services"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="next"
          />
        </View>

        {/* Amount */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Amount *</Text>
          <View style={styles.amountRow}>
            <Text style={[styles.currencySymbol, { color: colors.textSecondary }]}>
              {selectedCoin?.currency.symbol ?? ''}
            </Text>
            <TextInput
              style={[styles.amountInput, { color: isAmountValid || !amount ? colors.textPrimary : colors.errorRed }]}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
            <Text style={[styles.currencyCode, { color: colors.textSecondary }]}>
              {selectedCoin?.currency.code ?? ''}
            </Text>
          </View>
        </View>

        {/* Payer contact (optional) */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Send request to (optional)</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.textPrimary }]}
            value={payerContact}
            onChangeText={setPayerContact}
            placeholder="Email or phone number"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
          <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
            A payment request will be sent to this contact.
          </Text>
        </View>

        {/* Note (optional) */}
        <View style={[styles.section, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Note (optional)</Text>
          <TextInput
            style={[styles.fieldInput, { color: colors.textPrimary }]}
            value={description}
            onChangeText={setDescription}
            placeholder="What's this for?"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
          />
        </View>

        <Text style={[styles.expiryNote, { color: colors.textSecondary }]}>
          Invoice expires in 7 days.
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: canCreate && !creating ? colors.primaryBlue : colors.border }]}
          onPress={handleCreate}
          disabled={!canCreate || creating}
          activeOpacity={0.85}
        >
          {creating
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.primaryBtnText}>Create Invoice</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SummaryRow({ label, value, colors, mono, last }: {
  label: string; value: string; colors: typeof Colors.light; mono?: boolean; last?: boolean;
}) {
  return (
    <View style={[summaryStyles.row, { borderBottomColor: colors.border }, last && summaryStyles.rowLast]}>
      <Text style={[summaryStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[summaryStyles.value, { color: colors.textPrimary }, mono && summaryStyles.mono]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  rowLast: { borderBottomWidth: 0 },
  label: { fontSize: 15 },
  value: { fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'right' },
  mono: { fontVariant: ['tabular-nums'] },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, paddingTop: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontWeight: '600' },

  body: { padding: 20, gap: 12, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: -4 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1, minWidth: 80, alignItems: 'center',
  },
  chipCurrency: { fontSize: 14, fontWeight: '700' },
  chipName: { fontSize: 11, marginTop: 2 },

  section: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16, paddingVertical: 12, gap: 4,
  },
  fieldLabel: { fontSize: 12, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.4 },
  fieldInput: { fontSize: 16, paddingVertical: 8 },
  fieldHint: { fontSize: 12, marginTop: 2 },

  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  currencySymbol: { fontSize: 22, fontWeight: '300' },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '600', fontVariant: ['tabular-nums'] },
  currencyCode: { fontSize: 16, fontWeight: '500' },

  expiryNote: { fontSize: 13, textAlign: 'center', marginTop: -4 },

  primaryBtn: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  outlineBtn: { height: 52, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  outlineBtnText: { fontSize: 17, fontWeight: '600' },

  // Success
  successBody: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 16 },
  successIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 26, fontWeight: '700' },
  successSubtitle: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  summaryCard: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16, width: '100%',
  },
});
