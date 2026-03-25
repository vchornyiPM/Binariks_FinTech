import { TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { Coin } from '@/types/api.types';

interface WalletCardProps {
  coin: Coin;
  isSelected: boolean;
  onPress: () => void;
  onEdit?: () => void;
}

const CARD_WIDTH = Dimensions.get('window').width - 48;

export function WalletCard({ coin, isSelected, onPress, onEdit }: WalletCardProps) {
  const serialLast4 = coin.coinSerial.slice(-4);
  const formattedBalance = coin.balance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={[styles.container, isSelected && styles.selected]}
    >
      <LinearGradient
        colors={['#0E4D99', '#1A56DB']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.header}>
          <Text style={styles.name}>{coin.name}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.serial}>•••• {serialLast4}</Text>
            {onEdit && (
              <TouchableOpacity
                onPress={onEdit}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.moreBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.moreDots}>⋯</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.balanceContainer}>
          <Text style={styles.currency}>{coin.currency.code}</Text>
          <Text style={styles.balance}>{formattedBalance}</Text>
        </View>
        <Text style={styles.currencyName}>{coin.currency.name ?? coin.currency.code}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    marginRight: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  selected: {
    transform: [{ scale: 1.02 }],
  },
  gradient: {
    borderRadius: 16,
    padding: 20,
    height: 160,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  name: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '500' },
  serial: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  moreBtn: {
    paddingHorizontal: 4,
  },
  moreDots: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 20,
    lineHeight: 20,
    letterSpacing: 2,
  },
  balanceContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  currency: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  balance: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  currencyName: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
});
