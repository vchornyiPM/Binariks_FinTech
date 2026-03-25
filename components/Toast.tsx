import { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUIStore } from '@/stores/ui.store';

const TYPE_COLORS = {
  success: '#10823B',
  error:   '#9B1C1C',
  warning: '#B45309',
  info:    '#1A56DB',
};

export function Toast() {
  const { toast, hideToast } = useUIStore();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (toast) {
      translateY.value = withSequence(
        withTiming(0, { duration: 300 }),
        withDelay(2400, withTiming(-100, { duration: 300 }))
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(2400, withTiming(0, { duration: 300 }, (finished) => {
          if (finished) runOnJS(hideToast)();
        }))
      );
    }
  }, [toast, translateY, opacity, hideToast]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!toast) return null;

  const bgColor = TYPE_COLORS[toast.type];

  return (
    <Animated.View
      style={[
        styles.container,
        animStyle,
        { top: insets.top + (Platform.OS === 'android' ? 8 : 4) },
        { backgroundColor: bgColor },
      ]}
    >
      <Text style={styles.text}>{toast.message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  text: { color: '#fff', fontSize: 15, fontWeight: '500', textAlign: 'center' },
});
