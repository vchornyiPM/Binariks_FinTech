import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: object;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}: SkeletonLoaderProps) {
  const colors = Colors[useColorScheme() ?? 'light'];
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width: width as number, height, borderRadius, backgroundColor: colors.border },
        animStyle,
        style,
      ]}
    />
  );
}

export function WalletCardSkeleton() {
  const colors = Colors[useColorScheme() ?? 'light'];
  return (
    <View style={[skeletonStyles.card, { backgroundColor: colors.border }]}>
      <SkeletonLoader width="40%" height={14} borderRadius={7} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="60%" height={28} borderRadius={10} style={{ marginBottom: 8 }} />
      <SkeletonLoader width="50%" height={12} borderRadius={6} />
    </View>
  );
}

export function TransactionRowSkeleton() {
  return (
    <View style={skeletonStyles.row}>
      <SkeletonLoader width={40} height={40} borderRadius={20} />
      <View style={skeletonStyles.rowContent}>
        <SkeletonLoader width="60%" height={14} borderRadius={7} style={{ marginBottom: 6 }} />
        <SkeletonLoader width="40%" height={12} borderRadius={6} />
      </View>
      <SkeletonLoader width={60} height={14} borderRadius={7} />
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    width: 280,
    height: 160,
    borderRadius: 16,
    padding: 20,
    marginRight: 12,
    justifyContent: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowContent: { flex: 1, gap: 4 },
});
