import { Easing } from 'react-native-reanimated';

export const IOSSpring = {
  standard: { damping: 18, stiffness: 300, mass: 1 },
  bouncy:   { damping: 12, stiffness: 350, mass: 0.8 },
  snappy:   { damping: 22, stiffness: 400, mass: 0.9 },
  gentle:   { damping: 25, stiffness: 200, mass: 1.2 },
};

export const IOSTiming = {
  easeOut:   { duration: 250, easing: Easing.out(Easing.cubic) },
  easeInOut: { duration: 350, easing: Easing.inOut(Easing.cubic) },
  fast:      { duration: 150, easing: Easing.out(Easing.quad) },
};
