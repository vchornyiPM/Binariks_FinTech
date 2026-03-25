// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<string, ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = SymbolViewProps['name'] | string;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING: IconMapping = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.down': 'expand-more',
  'clock.arrow.circlepath': 'history',
  'arrow.left.arrow.right.circle.fill': 'swap-horiz',
  'qrcode.viewfinder': 'qr-code-scanner',
  'person.crop.circle.fill': 'account-circle',
  'person.fill': 'person',
  'plus.circle.fill': 'add-circle',
  'plus': 'add',
  'arrow.down.circle.fill': 'arrow-circle-down',
  'arrow.up.right.circle.fill': 'arrow-circle-up',
  'arrow.up': 'arrow-upward',
  'arrow.down': 'arrow-downward',
  'ellipsis': 'more-horiz',
  'ellipsis.circle': 'more-horiz',
  'xmark.circle.fill': 'cancel',
  'checkmark.circle.fill': 'check-circle',
  'exclamationmark.triangle.fill': 'warning',
  'info.circle.fill': 'info',
  'gear': 'settings',
  'bell.fill': 'notifications',
  'creditcard.fill': 'credit-card',
  'arrow.clockwise': 'refresh',
  'arrow.down.left.circle.fill': 'arrow-circle-down',
  'arrow.triangle.2.circlepath.circle.fill': 'sync',
  'checkmark.seal.fill': 'verified',
  'hourglass.circle.fill': 'hourglass-empty',
  'exclamationmark.circle': 'error-outline',
  'doc.on.doc.fill': 'content-copy',
  'line.3.horizontal.decrease.circle': 'filter-list',
  'chart.bar.fill': 'bar-chart',
  'rectangle.portrait.and.arrow.right': 'logout',
  'camera.viewfinder': 'camera',
  'camera': 'camera-alt',
  'xmark': 'close',
  'checkmark': 'check',
  'briefcase.fill': 'work',
  'list.bullet': 'list',
  'pencil': 'edit',
  'lock.fill': 'lock',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const mappedName = MAPPING[name] ?? 'help-outline';
  return <MaterialIcons color={color} size={size} name={mappedName} style={style} />;
}
